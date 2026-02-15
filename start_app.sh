#!/bin/bash

# Configuration
PROJECT_DIR="/run/media/bapperida/DATA BAPPERIDA/PROJEK APPS/Downloader_Universal"
APP_URL="https://downloader-universal-mu.vercel.app"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Universal Downloader Launcher ===${NC}"

# Navigate to project directory
cd "$PROJECT_DIR" || { echo "Directory not found!"; exit 1; }

echo -e "${GREEN}[1/2] Starting Download Engine (Worker)...${NC}"
# Activate venv and run worker in background
./worker/venv/bin/python worker/worker.py &
WORKER_PID=$!

# Wait a second to ensure it started
sleep 2

echo -e "${GREEN}[2/2] Opening Web Application...${NC}"
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
