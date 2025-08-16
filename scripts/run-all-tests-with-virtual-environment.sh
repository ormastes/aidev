#!/bin/bash

# Virtual Environment Test Runner
# Automatically runs tests in virtual environment with safety checks
# This is a wrapper around run-all-tests.sh with virtual mode enabled by default

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_SCRIPT="$SCRIPT_DIR/run-all-tests.sh"

# Check if base script exists
if [ ! -f "$BASE_SCRIPT" ]; then
    echo -e "${YELLOW}[WARNING]${NC} Base script not found: $BASE_SCRIPT"
    exit 1
fi

# Display virtual environment banner
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       ${GREEN}Virtual Environment Test Runner${BLUE}                    ║${NC}"
echo -e "${BLUE}║       Running tests in isolated environment              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Default to virtual mode with skip-dangerous
VIRTUAL_ARGS="--virtual --skip-dangerous"

# Parse arguments to check if user is overriding virtual mode
OVERRIDE_VIRTUAL=false
ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-virtual)
            echo -e "${YELLOW}[WARNING]${NC} Disabling virtual environment mode"
            VIRTUAL_ARGS=""
            OVERRIDE_VIRTUAL=true
            shift
            ;;
        --allow-dangerous)
            echo -e "${YELLOW}[WARNING]${NC} Allowing dangerous operations in virtual environment"
            VIRTUAL_ARGS="--virtual"
            shift
            ;;
        --help|-h)
            echo "Virtual Environment Test Runner"
            echo ""
            echo "This script runs tests in a virtual environment by default for safety."
            echo ""
            echo "Special Options:"
            echo "  --no-virtual        Disable virtual environment (not recommended)"
            echo "  --allow-dangerous   Allow dangerous operations in virtual mode"
            echo ""
            echo "All other options are passed to run-all-tests.sh:"
            echo ""
            # Show help from base script
            "$BASE_SCRIPT" --help
            exit 0
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

# Check Docker availability for virtual mode
if [ "$OVERRIDE_VIRTUAL" = false ]; then
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}[WARNING]${NC} Docker not available. Tests will run in subprocess isolation."
        echo -e "${YELLOW}[WARNING]${NC} For better isolation, please install Docker."
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 1
        fi
    else
        echo -e "${GREEN}[INFO]${NC} Docker detected. Tests will run in containerized environment."
    fi
fi

# Execute the base script with virtual arguments and user arguments
exec "$BASE_SCRIPT" $VIRTUAL_ARGS "${ARGS[@]}"