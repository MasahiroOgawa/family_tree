#!/bin/bash

# Family Tree Application Launcher
# This script sets up and runs the family tree web application

set -e

echo "🌳 Family Tree Application"
echo "=========================="
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed."
    echo ""
    echo "Please install uv first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo ""
    echo "Or visit: https://docs.astral.sh/uv/"
    exit 1
fi

echo "✓ uv is installed"

# Check if virtual environment exists, create if not
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment and installing dependencies..."
    uv sync
else
    echo "✓ Virtual environment exists"
fi

echo ""
echo "🚀 Starting Flask server..."
echo "   Server will be available at: http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""

# Run the application
uv run python backend/app.py
