#!/bin/bash
# Run Python tests with coverage

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

echo "Running Python tests with coverage..."

# Run pytest with coverage
pytest \
    --cov=src \
    --cov-branch \
    --cov-report=term-missing \
    --cov-report=html \
    --cov-report=json \
    -v

# Run coverage analyzer
echo "Analyzing coverage metrics..."
python src/coverage_analyzer.py

# Run BDD tests with behave
echo "Running BDD tests..."
behave --junit --junit-directory test-results/behave

echo "Tests complete!"