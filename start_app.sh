#!/bin/bash

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_URL="https://downloader-universal-mu.vercel.app"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Universal Downloader Launcher ===${NC}"

# Navigate to project directory
cd "$PROJECT_DIR" || { echo "Directory not found!"; exit 1; }


echo -e "${GREEN}[1/3] Setting up Python Environment...${NC}"
VENV_DIR="worker/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR" || { echo "Failed to create venv! Please install python-venv (sudo pacman -S python)"; exit 1; }
fi

echo "Updating dependencies (Checking for yt-dlp updates)..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install --upgrade -r worker/requirements.txt

# Clear yt-dlp cache to resolve potential bot-detection/403 errors
echo "Cleaning downloader cache..."
"$VENV_DIR/bin/yt-dlp" --rm-cache-dir > /dev/null 2>&1

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${BLUE}Warning: ffmpeg not found. Some formats might fail to merge.${NC}"
    echo -e "Install it with: sudo pacman -S ffmpeg"
fi

echo -e "${GREEN}[2/3] Starting Download Engine (Worker)...${NC}"

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

echo -e "${GREEN}[3/3] Opening Web Application...${NC}"
xdg-open "$APP_URL" > /dev/null 2>&1

echo -e "${BLUE}---------------------------------------${NC}"
echo -e "   App is running!"
echo -e "   - Worker PID: $WORKER_PID"
echo -e "   - Interface: $APP_URL"
echo -e "${BLUE}---------------------------------------${NC}"
echo -e "Press [CTRL+C] to stop the engine."

# Helper to kill worker on script exit
cleanup() {
    echo -e "\n${BLUE}Stopping Engine...${NC}"
    kill $WORKER_PID
    exit
}
trap cleanup SIGINT

# Keep script running to maintain the worker
wait $WORKER_PID
