#!/bin/bash
# Setup Python environment with uv

set -e

echo "Setting up Python environment..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.local/bin/env
fi

# Create virtual environment
echo "Creating virtual environment..."
uv venv

# Install dependencies
echo "Installing dependencies..."
uv uv pip install -e .
uv uv pip install -e ".[dev,test,docs]"

echo "Python environment setup complete!"
echo "Activate with: source .venv/bin/activate"