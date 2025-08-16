#!/bin/bash
set -e

echo "Python Test Environment"
echo "Python version: $(python --version)"
echo "pip version: $(pip --version)"
echo "uv version: $(uv --version 2>/dev/null || echo 'not installed')"

# Execute passed command or default
if [ $# -eq 0 ]; then
    echo "Running default tests..."
    cd /workspace
    ./run_system_tests.sh --filter python
else
    exec "$@"
fi