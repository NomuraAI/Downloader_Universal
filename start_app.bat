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
    echo [INFO] Updating pip...
    python -m pip install --upgrade pip
    echo [INFO] Installing requirements...
    :: REMOVED >nul 2>&1 to see progress/errors
    pip install -r worker\requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies. Please check your internet connection.
        pause
        exit /b
    )
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
:: Use the venv's python explicitly to ensure it's used
"%PROJECT_DIR%worker\venv\Scripts\python.exe" worker\worker.py

pause
