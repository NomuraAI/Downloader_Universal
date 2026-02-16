#!/bin/bash

# Universal Downloader - Termux Setup Script
# Run this on your Android device inside Termux!

echo "=== Universal Downloader Android Setup ==="
echo "Requesting Storage Access..."
termux-setup-storage
sleep 2

echo "Updating packages..."
pkg update -y && pkg upgrade -y

echo "Installing dependencies (Python, FFmpeg, Git, OpenSSL, Rust)..."
pkg install python ffmpeg git openssl rust binutils -y

# Ensure we are in the project directory (where this script is located)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "Working directory: $(pwd)"

# Check if requirements exist before proceeding
if [ ! -f "worker/requirements.txt" ]; then
    echo "ERROR: worker/requirements.txt not found!"
    echo "Make sure you are running this script from inside the 'Downloader_Universal' folder."
    exit 1
fi


echo "Setting up Python Virtual Environment..."
if [ ! -d "worker/venv" ]; then
    python -m venv worker/venv
fi

echo "Installing Python Libraries..."
./worker/venv/bin/pip install --upgrade pip
./worker/venv/bin/pip install -r worker/requirements.txt

echo "Setup Complete!"
echo "To start the downloader, run:"
echo "./start_android.sh"


