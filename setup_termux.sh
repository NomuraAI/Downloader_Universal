#!/bin/bash

# Universal Downloader - Termux Setup Script
# Run this on your Android device inside Termux!

echo "=== Universal Downloader Android Setup ==="
echo "Requesting Storage Access..."
termux-setup-storage
sleep 2

echo "Updating packages..."
pkg update -y && pkg upgrade -y

echo "Installing dependencies (Python, FFmpeg, Git, OpenSSL)..."
pkg install python ffmpeg git openssl -y

# Navigate to home
cd $HOME

# Check if repo exists, if not clone it (Assuming user needs to clone or copy)
# For now, we assume this script is inside the folder user copied.
# But if coming from git:
# git clone <YOUR_REPO_URL> downloader
# cd downloader

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

# Create a start script for Android specifically
cat <<EOF > start_android.sh
#!/bin/bash
echo "Starting Universal Downloader Node..."
export PYTHONUNBUFFERED=1
./worker/venv/bin/python worker/worker.py
EOF

chmod +x start_android.sh
