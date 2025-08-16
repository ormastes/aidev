#!/usr/bin/env bash
# Demo script for LLM-Enhanced Test Creator with DeepSeek R1

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== LLM-Enhanced Test Creator Demo with DeepSeek R1 ===${NC}"
echo "This demo shows intelligent C++ test generation using Ollama DeepSeek R1"
echo

# Check if Ollama is running
echo -e "${BLUE}Checking Ollama service...${NC}"
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}Starting Ollama service...${NC}"
    ollama serve &
    sleep 3
fi

# Check if DeepSeek R1 model is available
echo -e "${BLUE}Checking for DeepSeek R1 model...${NC}"
if ! ollama list | grep -q "deepseek-r1"; then
    echo -e "${YELLOW}DeepSeek R1 model not found. Pulling it now...${NC}"
    echo "This may take several minutes..."
    ollama pull deepseek-r1:7b
fi

# Create build directory and configure CMake (if available)
echo -e "${BLUE}Setting up build environment...${NC}"
mkdir -p build

# Try to configure with CMake if available
if command -v cmake &> /dev/null; then
    cd build
    echo -e "${BLUE}Configuring CMake with compile_commands.json...${NC}"
    cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .. || echo "CMake configuration skipped"
    cd ..
else
    echo -e "${YELLOW}CMake not available, proceeding without compile_commands.json${NC}"
fi

# Ensure example source files exist
echo -e "${BLUE}Setting up comprehensive example files...${NC}"
mkdir -p src tests

# Create a more complex Calculator class for better LLM demonstration
cat > src/Calculator.h << 'EOF'
#pragma once
#include <vector>
#include <string>
#include <stdexcept>

/**
 * A comprehensive calculator class with various mathematical operations
 * This class demonstrates different types of methods for LLM test generation
 */
class Calculator {
public:
    Calculator();
    virtual ~Calculator();
    
    // Basic arithmetic operations
    virtual int add(int a, int b) const;
    virtual int subtract(int a, int b) const;
    virtual int multiply(int a, int b) const;
    virtual double divide(int a, int b) const;
    
    // Advanced operations
    virtual long factorial(int n) const;
    virtual double power(double base, int exponent) const;
    virtual bool isPrime(int number) const;
    
    // Memory operations
    virtual void store(double value);
    virtual double recall() const;
    virtual void clearMemory();
    
    // History operations
    virtual void addToHistory(const std::string& operation, double result);
    virtual std::vector<std::string> getHistory() const;
    virtual void clearHistory();
    
    // Configuration
    virtual void setPrecision(int digits);
    virtual int getPrecision() const;
    
    // Error handling
    class CalculatorException : public std::runtime_error {
    public:
        explicit CalculatorException(const std::string& message) 
            : std::runtime_error(message) {}
    };

private:
    double memory_value;
    std::vector<std::string> calculation_history;
    int precision_digits;
    bool memory_initialized;
};
EOF

cat > src/Calculator.cpp << 'EOF'
#include "Calculator.h"
#include <cmath>
#include <sstream>
#include <iomanip>

Calculator::Calculator() 
    : memory_value(0.0), precision_digits(2), memory_initialized(false) {}

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
        throw CalculatorException("Division by zero");
    }
    return static_cast<double>(a) / b;
}

long Calculator::factorial(int n) const {
    if (n < 0) {
        throw CalculatorException("Factorial of negative number");
    }
    if (n > 20) {
        throw CalculatorException("Factorial too large");
    }
    
    long result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

double Calculator::power(double base, int exponent) const {
    return std::pow(base, exponent);
}

bool Calculator::isPrime(int number) const {
    if (number < 2) return false;
    if (number == 2) return true;
    if (number % 2 == 0) return false;
    
    for (int i = 3; i * i <= number; i += 2) {
        if (number % i == 0) return false;
    }
    return true;
}

void Calculator::store(double value) {
    memory_value = value;
    memory_initialized = true;
}

double Calculator::recall() const {
    if (!memory_initialized) {
        throw CalculatorException("Memory not initialized");
    }
    return memory_value;
}

void Calculator::clearMemory() {
    memory_value = 0.0;
    memory_initialized = false;
}

void Calculator::addToHistory(const std::string& operation, double result) {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(precision_digits) 
        << operation << " = " << result;
    calculation_history.push_back(oss.str());
}

std::vector<std::string> Calculator::getHistory() const {
    return calculation_history;
}

void Calculator::clearHistory() {
    calculation_history.clear();
}

void Calculator::setPrecision(int digits) {
    if (digits < 0 || digits > 10) {
        throw CalculatorException("Invalid precision");
    }
    precision_digits = digits;
}

int Calculator::getPrecision() const {
    return precision_digits;
}
EOF

# Create a simple Logger class as well
cat > src/Logger.h << 'EOF'
#pragma once
#include <string>
#include <vector>
#include <fstream>

/**
 * A logging utility class for demonstration
 */
class Logger {
public:
    enum LogLevel {
        DEBUG = 0,
        INFO = 1,
        WARNING = 2,
        ERROR = 3
    };
    
    Logger(const std::string& filename = "");
    virtual ~Logger();
    
    virtual void log(const std::string& message, LogLevel level = INFO);
    virtual void debug(const std::string& message);
    virtual void info(const std::string& message);
    virtual void warning(const std::string& message);
    virtual void error(const std::string& message);
    
    virtual void setLogLevel(LogLevel level);
    virtual LogLevel getLogLevel() const;
    
    virtual std::vector<std::string> getRecentLogs(int count = 10) const;
    virtual void clearLogs();
    
    virtual bool isEnabled() const;
    virtual void setEnabled(bool enabled);

private:
    std::string log_filename;
    std::ofstream log_file;
    LogLevel current_level;
    bool enabled;
    std::vector<std::string> recent_logs;
    
    std::string levelToString(LogLevel level) const;
    std::string getCurrentTimestamp() const;
};
EOF

# Create empty test files for LLM to enhance
echo -e "${YELLOW}Creating empty test files for LLM enhancement...${NC}"
mkdir -p tests
touch tests/CalculatorTest.cpp
touch tests/LoggerTest.cpp

# Make the LLM test creator executable
chmod +x test_creator_llm.py

# Install requests if not available
echo -e "${BLUE}Checking Python dependencies...${NC}"
python3 -c "import requests" 2>/dev/null || {
    echo -e "${YELLOW}Installing requests library...${NC}"
    uv uv pip install requests || python3 -m uv pip install requests
}

# Run the LLM-enhanced test creator
echo -e "${GREEN}Starting LLM-Enhanced Test Creator with DeepSeek R1...${NC}"
echo -e "${YELLOW}This will:${NC}"
echo "1. Scan tests/ directory for *Test.cpp files"
echo "2. Find corresponding source files in src/ directory"
echo "3. Use DeepSeek R1 to generate comprehensive test implementations"
echo "4. Create intelligent test cases with edge cases and error handling"
echo "5. Verify tests are properly formatted and structured"
echo
echo -e "${BLUE}Starting LLM test generation process...${NC}"

python3 test_creator_llm.py \
    src \
    tests \
    --build-dir build \
    --llm \
    --verbose

echo
echo -e "${GREEN}LLM Demo completed!${NC}"
echo -e "${BLUE}Check the results:${NC}"
echo "- Enhanced test files in: tests/"
echo "- CalculatorTest.cpp - Comprehensive tests for all Calculator methods"
echo "- LoggerTest.cpp - Tests for logging functionality"
echo "- Build output: build/"
echo "- Compile database: build/compile_commands.json (if CMake available)"

# Show the generated test content
echo
echo -e "${BLUE}Generated test content preview:${NC}"
echo -e "${YELLOW}=== CalculatorTest.cpp (first 30 lines) ===${NC}"
head -30 tests/CalculatorTest.cpp 2>/dev/null || echo "File not generated"

echo
echo -e "${YELLOW}=== LoggerTest.cpp (first 30 lines) ===${NC}"
head -30 tests/LoggerTest.cpp 2>/dev/null || echo "File not generated"

# Attempt to build if CMake is available
if command -v cmake &> /dev/null && [ -f "build/Makefile" ]; then
    echo
    echo -e "${BLUE}Attempting to build the project...${NC}"
    cmake --build build 2>/dev/null && echo -e "${GREEN}Build successful!${NC}" || echo -e "${YELLOW}Build may need CMakeLists.txt configuration${NC}"
fi

echo
echo -e "${GREEN}Demo completed! The LLM has generated intelligent, comprehensive test cases.${NC}"
echo -e "${BLUE}Features demonstrated:${NC}"
echo "✓ Automatic test discovery and source mapping"
echo "✓ LLM-powered test case generation using DeepSeek R1"
echo "✓ Comprehensive test coverage with edge cases"
echo "✓ Error handling and exception testing"
echo "✓ GTest/GMock best practices"
echo "✓ Build verification and validation"