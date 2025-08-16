#!/bin/bash

# Build and test script for GTest CTest demo

echo "=== GTest CTest Integration Demo ==="
echo

# Check if build directory exists
if [ -d "build" ]; then
    echo "Cleaning existing build directory..."
    rm -rf build
fi

# Create build directory
echo "Creating build directory..."
mkdir build
cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Debug

# Build the project
echo "Building project..."
cmake --build . --config Debug

# List available tests
echo
echo "=== Available CTest tests ==="
ctest --show-only=json-v1 | python3 -m json.tool | grep -E '"name"|"command"' | head -20

# Run all tests
echo
echo "=== Running all tests ==="
ctest --output-on-failure -V

# Run specific test by name
echo
echo "=== Running specific test: MathOperationsTest.AddPositiveNumbers ==="
ctest -R "MathOperationsTest.AddPositiveNumbers" -V

# Show test results summary
echo
echo "=== Test Summary ==="
ctest --show-only=json-v1 | python3 -c "
import json
import sys
data = json.load(sys.stdin)
if 'tests' in data:
    print(f'Total tests discovered: {len(data[\"tests\"])}')
    suites = set()
    for test in data['tests']:
        if '.' in test['name']:
            suite = test['name'].split('.')[0]
            suites.add(suite)
    print(f'Test suites: {len(suites)}')
    for suite in sorted(suites):
        suite_tests = [t for t in data['tests'] if t['name'].startswith(suite + '.')]
        print(f'  - {suite}: {len(suite_tests)} tests')
"

echo
echo "=== Demo complete ==="
echo "To use with VSCode extension:"
echo "1. Open the demo/gtest-example folder in VSCode"
echo "2. Open Test Explorer (testing icon in sidebar)"
echo "3. Look for 'CTest GTest' controller"
echo "4. Click refresh to discover tests"
echo "5. Run individual tests or all tests"