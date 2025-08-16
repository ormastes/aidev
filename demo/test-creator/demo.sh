#!/usr/bin/env bash
# Demo script for Enhanced Test Creator

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Enhanced Test Creator Demo ===${NC}"
echo "This demo shows automated C++ test generation using CMake integration"
echo

# Create build directory and configure CMake
echo -e "${BLUE}Setting up build environment...${NC}"
mkdir -p build
cd build

# Configure with CMake to generate compile_commands.json
echo -e "${BLUE}Configuring CMake with compile_commands.json...${NC}"
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..
cd ..

# Ensure example source files exist
echo -e "${BLUE}Setting up example files...${NC}"
mkdir -p src tests

# Create example Calculator source files if they don't exist
if [ ! -f "src/Calculator.h" ]; then
    cat > src/Calculator.h << 'EOF'
#pragma once

class Calculator {
public:
    Calculator();
    virtual ~Calculator();
    
    virtual int add(int a, int b) const;
    virtual int subtract(int a, int b) const;
    virtual int multiply(int a, int b) const;
    virtual double divide(int a, int b) const;
    
private:
    bool initialized;
};
EOF
fi

if [ ! -f "src/Calculator.cpp" ]; then
    cat > src/Calculator.cpp << 'EOF'
#include "Calculator.h"
#include <stdexcept>

Calculator::Calculator() : initialized(true) {}

Calculator::~Calculator() {}

int Calculator::add(int a, int b) const {
    return a + b;
}

int Calculator::subtract(int a, int b) const {
    return a - b;
}

int Calculator::multiply(int a, int b) const {
    return a * b;
}

double Calculator::divide(int a, int b) const {
    if (b == 0) {
        throw std::invalid_argument("Division by zero");
    }
    return static_cast<double>(a) / b;
}
EOF
fi

# Create example test file if it doesn't exist
if [ ! -f "tests/CalculatorTest.cpp" ]; then
    echo -e "${YELLOW}Creating example test file...${NC}"
    mkdir -p tests
    touch tests/CalculatorTest.cpp
fi

# Make the enhanced test creator executable
chmod +x test_creator_enhanced.py

# Run the enhanced test creator
echo -e "${GREEN}Starting Enhanced Test Creator...${NC}"
echo -e "${YELLOW}This will:${NC}"
echo "1. Scan tests/ directory for *Test.cpp files"
echo "2. Find corresponding source files in src/ directory"
echo "3. Use compile_commands.json for compilation information"
echo "4. Generate or enhance test files"
echo "5. Verify tests build successfully"
echo

python3 test_creator_enhanced.py \
    src \
    tests \
    --build-dir build \
    --build-command "cmake --build build" \
    --verbose

echo
echo -e "${GREEN}Demo completed!${NC}"
echo -e "${BLUE}Check the results:${NC}"
echo "- Test files in: tests/"
echo "- Build output: build/"
echo "- Compile database: build/compile_commands.json"

# Build the project
echo
echo -e "${BLUE}Building the project...${NC}"
cmake --build build

# Run the tests if they exist
if [ -f "build/Makefile" ] || [ -f "build/build.ninja" ]; then
    echo
    echo -e "${BLUE}Running the generated tests...${NC}"
    cd build && ctest --verbose --output-on-failure || echo "Tests completed (some may have failed - this is expected for demo)"
else
    echo
    echo -e "${YELLOW}Build system not ready for test execution${NC}"
    echo "You can manually run the tests after setting up your CMakeLists.txt"
fi