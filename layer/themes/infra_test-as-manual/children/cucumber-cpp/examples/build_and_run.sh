#!/bin/bash
# Build and run Cucumber-CPP examples

echo "============================================"
echo "  Building Cucumber-CPP Examples"
echo "============================================"

# Create build directory
mkdir -p build
cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake ..

# Build the examples
echo "Building examples..."
make -j4

echo ""
echo "============================================"
echo "  Running Simple Demo"
echo "============================================"
if [ -f simple_demo ]; then
    ./simple_demo
else
    echo "simple_demo not found, building separately..."
    g++ -std=c++17 ../simple_demo.cpp ../../src/gherkin_parser.cpp ../../src/manual_generator.cpp -I../../include -o simple_demo
    ./simple_demo
fi

echo ""
echo "============================================"
echo "  Running Manual Test Generator"
echo "============================================"
if [ -f manual_test_example ]; then
    ./manual_test_example
else
    echo "Manual test example not built"
fi

echo ""
echo "============================================"
echo "  Generated Files"
echo "============================================"
ls -la *.md *.html *.json 2>/dev/null || echo "No documentation files generated yet"

echo ""
echo "============================================"
echo "  Build Complete!"
echo "============================================"