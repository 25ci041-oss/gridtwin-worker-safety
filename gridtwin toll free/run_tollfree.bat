@echo off
title GRIDTWIN Toll-Free IVR Service
echo ========================================================
echo     GRIDTWIN TOLL-FREE IVR & AUTOMATED HELPLINE
echo ========================================================
echo.
echo Starting IVR Webhook Server & Web Simulator...
echo.

cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python was not found in your PATH.
    echo Please install Python 3.10+ or ensure it is in your system PATH.
    pause
    exit /b 1
)

REM Run the FastAPI Toll-Free Server on port 5001
python app.py

pause

