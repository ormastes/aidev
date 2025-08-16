#!/bin/bash

# Fraud Check Bypass Script
# Delegates to fraud-checker theme for actual logic

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Path to fraud-checker theme
FRAUD_CHECKER_PATH="$PROJECT_ROOT/layer/themes/fraud-checker/scripts/check-architecture-logic.sh"

# Check if the fraud-checker logic script exists
if [ ! -f "$FRAUD_CHECKER_PATH" ]; then
    echo "Error: Architecture check logic not found at $FRAUD_CHECKER_PATH"
    echo "Please ensure fraud-checker theme is properly installed."
    exit 1
fi

# Run the fraud detection logic
exec bash "$FRAUD_CHECKER_PATH" fraud "$@"