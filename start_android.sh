#!/bin/bash
echo "Starting Universal Downloader Node..."

# Ensure we are in the right directory (optional safety)
# cd "$(dirname "$0")"

# Set Unbuffered output for real-time logs
export PYTHONUNBUFFERED=1

# FORCE Android Storage Path
export DOWNLOAD_ROOT="/storage/emulated/0/Download/UniversalDownloader"

# Check if venv exists
if [ ! -f "worker/venv/bin/python" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please run ./setup_termux.sh first."
    exit 1
fi

# Run the worker
./worker/venv/bin/python worker/worker.py
