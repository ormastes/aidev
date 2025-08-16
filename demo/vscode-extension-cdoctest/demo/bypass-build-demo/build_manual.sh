#!/bin/bash

# Manual build script for bypass-build-demo (when cmake is not available)

echo "=== Manual Build Script for Bypass Build Demo ==="

# Create build directory
mkdir -p build
cd build

echo "Building hello_world executable..."
g++ -std=c++17 -I../include ../src/main.cpp ../src/hello.cpp -o hello_world

echo "Building hello_tests executable..."  
g++ -std=c++17 -I../include ../src/test_main.cpp ../src/hello.cpp -o hello_tests

echo "Testing executables..."

echo "--- Testing hello_world ---"
./hello_world

echo ""
echo "--- Testing hello_tests (list tests) ---"
./hello_tests GetTcList:

echo ""
echo "--- Testing hello_tests (run specific test) ---"
./hello_tests "TC/HelloSuite::BasicGreeting"

echo ""
echo "=== Build and Test Complete ==="
echo "Executables created:"
ls -la hello_world hello_tests