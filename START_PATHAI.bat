@echo off
setlocal
cd /d "%~dp0"
title PathAI Launcher

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON=py"
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python was not found. Install Python 3.10 or newer from https://www.python.org/downloads/
        pause
        exit /b 1
    )
    set "PYTHON=python"
)

if not exist ".env" (
    if exist ".env.example" copy ".env.example" ".env" >nul
)

echo Installing/checking required packages...
%PYTHON% -m pip install -r requirements.txt
if errorlevel 1 (
    echo Package installation failed. Check your internet connection and Python installation.
    pause
    exit /b 1
)

echo.
echo Starting PathAI...
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:5000"
%PYTHON% app.py
pause
