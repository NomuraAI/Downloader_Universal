#!/bin/bash

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_URL="http://localhost:5173"

# Ensure node/npm are in PATH if installed via NVM or standard locations
if [ -d "$HOME/.nvm/versions/node" ]; then
    NODE_BIN=$(find "$HOME/.nvm/versions/node" -maxdepth 2 -name "bin" 2>/dev/null | tail -n 1)
    if [ -n "$NODE_BIN" ]; then
        export PATH="$NODE_BIN:$PATH"
    fi
fi

# Export Download root folder for the user (even if run as sudo)
REAL_USER="${SUDO_USER:-$USER}"
USER_HOME=$(eval echo "~$REAL_USER")
if command -v xdg-user-dir &> /dev/null && [ -z "$SUDO_USER" ]; then
    DOWNLOAD_DIR="$(xdg-user-dir DOWNLOAD 2>/dev/null)"
fi
if [ -z "$DOWNLOAD_DIR" ] || [ ! -d "$DOWNLOAD_DIR" ]; then
    DOWNLOAD_DIR="$USER_HOME/Downloads"
fi
export DOWNLOAD_ROOT="$DOWNLOAD_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Universal Downloader Launcher (Localhost Mode) ===${NC}"

# Navigate to project directory
cd "$PROJECT_DIR" || { echo "Directory not found!"; exit 1; }

echo -e "${GREEN}[1/4] Checking Node.js Dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

echo -e "${GREEN}[2/4] Setting up Python Environment...${NC}"
VENV_DIR="worker/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR" || { echo "Failed to create venv! Please install python-venv"; exit 1; }
fi

echo "Updating dependencies (Checking for yt-dlp updates)..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install --upgrade -r worker/requirements.txt

# Clear yt-dlp cache to resolve potential bot-detection/403 errors
echo "Cleaning downloader cache..."
"$VENV_DIR/bin/yt-dlp" --rm-cache-dir > /dev/null 2>&1

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${BLUE}Warning: ffmpeg not found. Some formats (like 1080p+) might fail to merge audio/video.${NC}"
    echo -e "Please install ffmpeg using your package manager (e.g., sudo pacman -S ffmpeg)"
fi

echo -e "${GREEN}[3/4] Starting Download Engine (Worker)...${NC}"

# Kill any existing workers to prevent duplicates
pkill -f "worker/worker.py" 2>/dev/null

# Activate venv and run worker in background
export PYTHONUNBUFFERED=1
"$VENV_DIR/bin/python" worker/worker.py &
WORKER_PID=$!

# Wait a second to ensure it started
sleep 2

# Check if worker is still running
if ! kill -0 $WORKER_PID 2>/dev/null; then
    echo -e "${BLUE}Error: Worker failed to start. Check logs above.${NC}"
    exit 1
fi

echo -e "${GREEN}[4/4] Starting Web Application (Localhost)...${NC}"
npx vite --host localhost --port 5173 &
VITE_PID=$!

sleep 2

# Open browser if xdg-open available
if command -v xdg-open &> /dev/null; then
    xdg-open "$APP_URL" > /dev/null 2>&1
fi

echo -e "${BLUE}---------------------------------------${NC}"
echo -e "   App is running in Localhost Mode!"
echo -e "   - Worker PID: $WORKER_PID"
echo -e "   - Vite Server PID: $VITE_PID"
echo -e "   - Interface: $APP_URL"
echo -e "${BLUE}---------------------------------------${NC}"
echo -e "Press [CTRL+C] to stop the engine."

# Helper to kill worker and vite on script exit
cleanup() {
    echo -e "\n${BLUE}Stopping Engine and Server...${NC}"
    kill $WORKER_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Keep script running to maintain the worker and frontend server
wait $WORKER_PID $VITE_PID

