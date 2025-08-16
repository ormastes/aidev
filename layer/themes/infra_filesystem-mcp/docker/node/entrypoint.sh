#!/bin/bash
set -e

echo "Node.js Test Environment"
echo "Node version: $(node --version)"
echo "bun --version: $(bun --version)"
echo "TypeScript version: $(tsc --version)"

# Execute passed command or default
if [ $# -eq 0 ]; then
    echo "Running default tests..."
    cd /workspace
    ./run_system_tests.sh --filter typescript
else
    exec "$@"
fi