#!/bin/bash

# Architecture Check Bypass Script
# Delegates to fraud-checker theme for actual logic

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Path to fraud-checker theme - use existing Python scripts for now
FRAUD_CHECKER_PATH="$PROJECT_ROOT/layer/themes/fraud-checker/scripts"

echo "🔧 Starting Architecture Refactoring Check"
echo "==========================================="

# Check if fraud-checker scripts exist
if [ ! -d "$FRAUD_CHECKER_PATH" ]; then
    echo "Error: Fraud-checker scripts not found at $FRAUD_CHECKER_PATH"
    exit 1
fi

# Run comprehensive analysis
echo ""
echo "1. Running fraud detection analysis..."
if [ -f "$FRAUD_CHECKER_PATH/fix-all-frauds.py" ]; then
    python3 "$FRAUD_CHECKER_PATH/fix-all-frauds.py" --check-only
else
    echo "⚠️  fix-all-frauds.py not found"
fi

echo ""
echo "2. Running MFTOD compliance check..."
if [ -f "$FRAUD_CHECKER_PATH/MFTOD-compliant.sh" ]; then
    bash "$FRAUD_CHECKER_PATH/MFTOD-compliant.sh"
else
    echo "⚠️  MFTOD-compliant.sh not found"
fi

echo ""
echo "3. Architecture analysis complete"
echo "Check the fraud detection output above for issues to refactor."