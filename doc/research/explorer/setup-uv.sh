#!/bin/bash

# Setup script for Explorer project using uv
# Migrates from pip to uv for Python dependency management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "   Explorer Setup with UV"
echo "=========================================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source "$HOME/.cargo/env"
fi

echo "✅ UV is available: $(uv --version)"

# Create virtual environment
echo "🔧 Creating virtual environment..."
uv venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies from pyproject.toml
echo "📦 Installing dependencies..."
uv pip install -e .

# Install development dependencies
echo "📦 Installing development dependencies..."
uv pip install -e ".[dev]"

# Verify installation
echo ""
echo "🔍 Verifying installation..."
python3 -c "import mcp; print('✅ MCP SDK installed')"
python3 -c "import yaml; print('✅ PyYAML installed')"

echo ""
echo "=========================================="
echo "✅ Explorer setup complete with UV!"
echo ""
echo "To activate the environment, run:"
echo "  source $SCRIPT_DIR/.venv/bin/activate"
echo ""
echo "To run Explorer:"
echo "  python3 scripts/explorer.py"
echo "=========================================="