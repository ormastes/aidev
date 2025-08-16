#!/bin/bash
#
# Core fraud checker script that delegates to the infra_fraud-checker theme
# Falls back to basic checker if theme checker fails
#

set -e

# Determine project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRAUD_CHECKER_THEME="$PROJECT_ROOT/layer/themes/infra_fraud-checker"
BASIC_CHECKER="$FRAUD_CHECKER_THEME/scripts/run-basic-fraud-check.ts"

echo "🔍 Starting Fraud Check..."

# Check if the basic checker exists
if [ ! -f "$BASIC_CHECKER" ]; then
    echo "⚠️  Warning: Basic fraud checker not found at $BASIC_CHECKER"
fi

# Check if the fraud-checker theme exists
if [ -d "$FRAUD_CHECKER_THEME" ]; then
    THEME_SCRIPT="$FRAUD_CHECKER_THEME/scripts/run-fraud-check.ts"
    
    if [ -f "$THEME_SCRIPT" ]; then
        # Try to run with bun first
        if command -v bun &> /dev/null; then
            echo "Attempting to run theme fraud checker with Bun..."
            cd "$FRAUD_CHECKER_THEME"
            if bun "$THEME_SCRIPT" "$@" 2>/dev/null; then
                exit 0
            else
                echo "⚠️  Theme fraud checker failed with Bun"
            fi
        fi
        
        # Try with Node.js
        if command -v node &> /dev/null; then
            echo "Attempting to run theme fraud checker with Node.js..."
            cd "$FRAUD_CHECKER_THEME"
            if node "$THEME_SCRIPT" "$@" 2>/dev/null; then
                exit 0
            else
                echo "⚠️  Theme fraud checker failed with Node.js"
            fi
        fi
    fi
fi

# Fallback to basic checker
if [ -f "$BASIC_CHECKER" ]; then
    echo "Using basic fraud checker..."
    if command -v bun &> /dev/null; then
        bun "$BASIC_CHECKER" "$PROJECT_ROOT"
    elif command -v node &> /dev/null; then
        npx ts-node "$BASIC_CHECKER" "$PROJECT_ROOT"
    else
        echo "❌ Error: Neither bun nor node is available"
        exit 1
    fi
else
    echo "❌ Error: No fraud checker available"
    echo "   Neither the theme checker nor basic checker could be run."
    exit 1
fi