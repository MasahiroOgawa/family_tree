@echo off
REM Family Tree Application Launcher (Windows)
REM This script sets up and runs the family tree web application

echo.
echo 🌳 Family Tree Application
echo ==========================
echo.

REM Check if uv is installed
where uv >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ uv is not installed.
    echo.
    echo Please install uv first:
    echo   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    echo.
    echo Or visit: https://docs.astral.sh/uv/
    exit /b 1
)

echo ✓ uv is installed

REM Check if virtual environment exists, create if not
if not exist ".venv" (
    echo 📦 Creating virtual environment and installing dependencies...
    uv sync
) else (
    echo ✓ Virtual environment exists
)

echo.
echo 🚀 Starting Flask server...
echo    Server will be available at: http://localhost:5000
echo.
echo    Press Ctrl+C to stop the server
echo.

REM Run the application
uv run python backend/app.py
