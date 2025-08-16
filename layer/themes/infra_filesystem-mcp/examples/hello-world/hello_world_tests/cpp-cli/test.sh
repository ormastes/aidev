#!/bin/bash
set -e

# Build with new toolchain
./build.sh

# Run the executable
if [ -f build/hello ]; then
    output=$(./build/hello)
elif [ -f hello ]; then
    # Fallback to old Makefile build
    make clean && make
    output=$(./hello)
else
    echo "Error: No executable found"
    exit 1
fi

if echo "$output" | grep -q "Hello from C++"; then
    echo "Test passed!"
    exit 0
else
    echo "Test failed!"
    exit 1
fi
