#!/bin/bash

# Run Project Quality Scanner
# This script runs the comprehensive quality and fraud detection scanner

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(cd "$THEME_DIR/../../../.." && pwd)"

echo "🔍 Project Quality Scanner"
echo "========================="
echo "Project Root: $PROJECT_ROOT"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo "⚠️  ts-node not found. Installing..."
    npm install -g ts-node typescript
fi

# Run the scanner
echo "Starting comprehensive project scan..."
ts-node "$THEME_DIR/src/cli/project-quality-scanner.ts" "$@"

exit $?