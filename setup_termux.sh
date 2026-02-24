#!/bin/bash

# Universal Downloader - Termux Setup Script
# Run this on your Android device inside Termux!

echo "=== Universal Downloader Android Setup ==="
echo "Requesting Storage Access..."
termux-setup-storage
sleep 2

echo "Updating packages..."
pkg update -y && pkg upgrade -y

echo "Installing dependencies (Python, FFmpeg, Git, OpenSSL, Rust, Build Essentials, wget, libcrypt, etc)..."
pkg install python ffmpeg git openssl rust binutils build-essential libffi pkg-config wget libcrypt libjpeg-turbo -y

# Ensure we are in the project directory (where this script is located)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Ensure execution permissions for scripts
chmod +x setup_termux.sh start_android.sh start_app.sh run_localhost.sh

# Anti-storage warning (Termux can't execute in /sdcard)
if [[ "$(pwd)" == *"/sdcard"* ]] || [[ "$(pwd)" == *"/storage/emulated"* ]]; then
    echo "WARNING: You are running this script from shared storage (/sdcard)."
    echo "Termux cannot execute scripts or run virtual environments in shared storage due to Android permissions."
    echo "Please move this folder to Termux home directory: mv $(pwd) \$HOME/"
    exit 1
fi

echo "Working directory: $(pwd)"

# Check if requirements exist before proceeding
if [ ! -f "worker/requirements.txt" ]; then
    echo "ERROR: worker/requirements.txt not found!"
    echo "Make sure you are running this script from inside the 'Downloader_Universal' folder."
    exit 1
fi


echo "Setting up Python Virtual Environment..."
# Remove existing venv to ensure clean installation
if [ -d "worker/venv" ]; then
    echo "Removing old virtual environment to apply new settings..."
    rm -rf worker/venv
fi

python -m venv worker/venv

echo "Upgrading base Python build tools..."
./worker/venv/bin/pip install --upgrade pip setuptools wheel build

echo "Installing pre-built Android wheels for pydantic-core..."
# Use pre-built wheels specifically for Termux Android provided by Eutalix
./worker/venv/bin/pip install "pydantic-core" --extra-index-url https://eutalix.github.io/android-pydantic-core/simple/

echo "Installing remaining Python Libraries..."
./worker/venv/bin/pip install -r worker/requirements.txt

echo "Setup Complete!"
echo "To start the downloader, run:"
echo "./start_android.sh"


