#!/bin/bash
#
# Wrapper script that delegates to the fraud-checker theme
# All fraud checking logic is consolidated in layer/themes/infra_fraud-checker
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRAUD_CHECKER_THEME="$PROJECT_ROOT/layer/themes/infra_fraud-checker"

# Check if the fraud-checker theme exists
if [ ! -d "$FRAUD_CHECKER_THEME" ]; then
    echo "❌ Error: Fraud checker theme not found at $FRAUD_CHECKER_THEME"
    exit 1
fi

# Delegate to the theme's fraud checker
cd "$FRAUD_CHECKER_THEME"

# Use bun if available, otherwise fall back to node
if command -v bun &> /dev/null; then
    bun scripts/run-fraud-check.ts "$@"
else
    echo "⚠️  Bun not found, using Node.js..."
    node scripts/run-fraud-check.ts "$@"
fi