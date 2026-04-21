#!/bin/bash

# Configuration
# Use absolute path to project root to ensure it works from any directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR" || exit 1

VENV_DIR="worker/venv"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Universal Downloader Localhost Launcher ===${NC}"

# 0. Check for Node and NPM
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: NPM is not installed. Please install NPM first.${NC}"
    exit 1
fi

# 1. Setup Python Environment
echo -e "${GREEN}[1/4] Setting up Python Environment...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Upgrade pip and install requirements
echo "Checking Python dependencies..."
"$VENV_DIR/bin/pip" install --upgrade pip > /dev/null 2>&1
"$VENV_DIR/bin/pip" install -r worker/requirements.txt > /dev/null 2>&1

# 2. Setup Node Environment
echo -e "${GREEN}[2/4] Setting up Node Environment (Vite)...${NC}"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
    echo -e "${BLUE}Vite or node_modules not found. Running npm install...${NC}"
    npm install
else
    echo "Node dependencies are already installed."
fi

# 3. Start Worker
echo -e "${GREEN}[3/4] Starting Download Engine (Worker)...${NC}"
pkill -f "worker/worker.py" 2>/dev/null

export PYTHONUNBUFFERED=1
"$VENV_DIR/bin/python" worker/worker.py &
WORKER_PID=$!

# 4. Start Frontend
echo -e "${GREEN}[4/4] Starting Frontend (Vite)...${NC}"
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
