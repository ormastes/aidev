#!/usr/bin/env bash
# Test health check wrapper - delegates to Python implementation
# Maximum 10 lines for security compliance

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check Python and run implementation
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required"
    exit 1
fi
exec python3 "$SCRIPT_DIR/test-health-check.py" "$@"