#!/bin/bash
set -e

echo "GUI Test Environment"
echo "Display: $DISPLAY"
echo "X11 status: $(xdpyinfo -display $DISPLAY 2>/dev/null | head -n1 || echo 'not running')"

# Start window manager
fluxbox &

# Execute passed command or default
if [ $# -eq 0 ]; then
    echo "Running default GUI tests..."
    cd /workspace
    ./run_system_tests.sh --filter gui
else
    exec "$@"
fi