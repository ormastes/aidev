#!/bin/bash
set -e

echo "C++ Test Environment"
echo "Clang version: $(clang --version | head -n1)"
echo "CMake version: $(cmake --version | head -n1)"
echo "Ninja version: $(ninja --version)"
echo "Mold version: $(mold --version | head -n1)"

# Execute passed command or default
if [ $# -eq 0 ]; then
    echo "Running default tests..."
    cd /workspace
    ./run_system_tests.sh --filter cpp
else
    exec "$@"
fi