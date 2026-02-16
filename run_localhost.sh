#!/bin/bash

# Configuration
PROJECT_DIR="$(pwd)"
VENV_DIR="worker/venv"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Universal Downloader Localhost Launcher ===${NC}"

# 1. Setup Python Environment
echo -e "${GREEN}[1/3] Setting up Python Environment...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Upgrade pip and install requirements
"$VENV_DIR/bin/pip" install --upgrade pip > /dev/null
"$VENV_DIR/bin/pip" install -r worker/requirements.txt > /dev/null

# 2. Start Worker
echo -e "${GREEN}[2/3] Starting Download Engine (Worker)...${NC}"
pkill -f "worker/worker.py" 2>/dev/null

export PYTHONUNBUFFERED=1
"$VENV_DIR/bin/python" worker/worker.py &
WORKER_PID=$!

# 3. Start Frontend
echo -e "${GREEN}[3/3] Starting Frontend (Vite)...${NC}"
echo -e "${BLUE} > Access the app at: http://localhost:5173${NC}"

# Trap for cleanup
cleanup() {
    echo -e "\n${BLUE}Stopping Engine...${NC}"
    kill $WORKER_PID 2>/dev/null
    exit
}
trap cleanup SIGINT

# Run Vite (interactive)
npm run dev

# Cleanup when Vite exits
cleanup
