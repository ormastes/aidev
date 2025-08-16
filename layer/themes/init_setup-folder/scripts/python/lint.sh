#!/bin/bash
# Lint and format Python code

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

echo "Running Python linters and formatters..."

# Format with black
echo "Formatting with black..."
black src tests features --check --diff

# Lint with ruff
echo "Linting with ruff..."
ruff check src tests features

# Type check with mypy
echo "Type checking with mypy..."
mypy src

echo "Linting complete!"