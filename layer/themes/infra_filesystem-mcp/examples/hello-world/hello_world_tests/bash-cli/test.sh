#!/bin/bash
output=$(./hello.sh)
if echo "$output" | grep -q "Hello from Bash!"; then
    echo "Test passed!"
    exit 0
else
    echo "Test failed!"
    exit 1
fi
