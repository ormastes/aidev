#!/bin/bash
# Build Python package

set -e

# Activate virtual environment if not already activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    if [[ -f .venv/bin/activate ]]; then
        source .venv/bin/activate
    else
        echo "Virtual environment not found. Run setup.sh first."
        exit 1
    fi
fi

echo "Building Python package..."

# Clean previous builds
rm -rf dist build *.egg-info

# Install build tools if not present
uv uv pip install --quiet build

# Build the package
python -m build

echo "Package built successfully!"
echo "Distribution files available in dist/"

ls -la dist/