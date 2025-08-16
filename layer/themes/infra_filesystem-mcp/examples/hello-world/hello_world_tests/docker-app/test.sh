#!/bin/bash
docker build -t hello-docker . 2>/dev/null
output=$(docker run --rm hello-docker 2>/dev/null)
if echo "$output" | grep -q "Hello from Docker!"; then
    echo "Test passed!"
    exit 0
else
    echo "Test failed!"
    exit 1
fi
