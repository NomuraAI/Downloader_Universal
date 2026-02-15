@echo off
TITLE Universal Downloader Worker
COLOR 0A

:: Configuration
set "PROJECT_DIR=%~dp0"
set "APP_URL=https://downloader-universal-mu.vercel.app"

echo =======================================
echo      Universal Downloader Launcher     
echo             (Windows Edition)
echo =======================================

cd /d "%PROJECT_DIR%"

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python from python.org
    pause
    exit /b
)

:: Check/Create Virtual Environment
if not exist "worker\venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv worker\venv
)

:: Install Dependencies
if exist "worker\venv\Scripts\activate.bat" (
    call worker\venv\Scripts\activate.bat
    echo [INFO] Installing requirements...
    pip install -r worker\requirements.txt >nul 2>&1
) else (
    echo [ERROR] Virtual environment seems broken.
    pause
    exit /b
)

:: Open Web App
echo [INFO] Opening Web Application...
start "" "%APP_URL%"

:: Run Worker
echo.
echo [INFO] Starting Worker...
echo Logs will appear below. Do not close this window.
echo ---------------------------------------
python worker\worker.py

pause
