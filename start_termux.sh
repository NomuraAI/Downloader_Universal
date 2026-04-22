#!/bin/bash
# Universal Downloader - Termux Launcher
# This script starts the download engine on Android/Termux

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Universal Downloader Engine (Termux) ==="

# Set Unbuffered output for real-time logs
export PYTHONUNBUFFERED=1

# Check if venv exists
if [ ! -f "worker/venv/bin/python" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please run ./setup_termux.sh first."
    exit 1
fi

# Run the worker
echo "Starting worker..."
./worker/venv/bin/python worker/worker.py
