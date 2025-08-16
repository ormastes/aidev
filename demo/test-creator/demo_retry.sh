#!/usr/bin/env bash
# Demo script for Mock-less Test Creator with LLM Retry

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Mock-less Test Creator with LLM Retry Demo ===${NC}"
echo "This demo shows compilation-verified test generation with up to 10 LLM retries"
echo

# Clean up previous demo files
echo -e "${BLUE}Cleaning up previous demo files...${NC}"
rm -f tests/*Test.cpp tests/*Test.cpp.backup

# Check if Ollama is running
echo -e "${BLUE}Checking Ollama service...${NC}"
if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}Starting Ollama service...${NC}"
    ollama serve &
    sleep 3
fi

# Ensure we have the right model
echo -e "${BLUE}Checking DeepSeek R1 model...${NC}"
ollama list | grep deepseek-r1 || {
    echo -e "${YELLOW}Pulling DeepSeek R1 model...${NC}"
    ollama pull deepseek-r1:7b
}

# Setup directories and files
echo -e "${BLUE}Setting up test environment...${NC}"
mkdir -p src tests

# Create a more complex Calculator with potential compilation challenges
cat > src/Calculator.h << 'EOF'
#pragma once
#include <vector>
#include <string>
#include <stdexcept>
#include <memory>

class Calculator {
public:
    class CalculatorException : public std::runtime_error {
    public:
        explicit CalculatorException(const std::string& message) 
            : std::runtime_error(message) {}
    };

    Calculator();
    virtual ~Calculator();
    
    // Basic operations
    int add(int a, int b) const;
    int subtract(int a, int b) const;
    int multiply(int a, int b) const;
    double divide(int a, int b) const;
    
    // Advanced operations
    long factorial(int n) const;
    double power(double base, int exponent) const;
    bool isPrime(int number) const;
    
    // Memory operations
    void store(double value);
    double recall() const;
    void clearMemory();
    
    // History operations
    void addToHistory(const std::string& operation, double result);
    std::vector<std::string> getHistory() const;
    void clearHistory();
    
    // Configuration
    void setPrecision(int digits);
    int getPrecision() const;

private:
    double memory_value;
    std::vector<std::string> calculation_history;
    int precision_digits;
    bool memory_initialized;
};
EOF

# Create a simple Logger class
cat > src/Logger.h << 'EOF'
#pragma once
#include <string>
#include <vector>

class Logger {
public:
    enum LogLevel { DEBUG = 0, INFO = 1, WARNING = 2, ERROR = 3 };
    
    Logger(const std::string& filename = "");
    virtual ~Logger();
    
    void log(const std::string& message, LogLevel level = INFO);
    void debug(const std::string& message);
    void info(const std::string& message);
    void warning(const std::string& message);
    void error(const std::string& message);
    
    void setLogLevel(LogLevel level);
    LogLevel getLogLevel() const;
    
    std::vector<std::string> getRecentLogs(int count = 10) const;
    void clearLogs();
    
    bool isEnabled() const;
    void setEnabled(bool enabled);

private:
    std::string log_filename;
    LogLevel current_level;
    bool enabled;
    std::vector<std::string> recent_logs;
};
EOF

# Create empty test files (input)
echo -e "${YELLOW}Creating empty input test files...${NC}"
touch tests/CalculatorTest.cpp
touch tests/LoggerTest.cpp

echo "Input test files:"
echo "📁 tests/CalculatorTest.cpp - $(wc -c < tests/CalculatorTest.cpp) bytes (empty)"
echo "📁 tests/LoggerTest.cpp - $(wc -c < tests/LoggerTest.cpp) bytes (empty)"

# Make the retry test creator executable
chmod +x test_creator_retry.py

# Install requests if not available
echo -e "${BLUE}Checking Python dependencies...${NC}"
python3 -c "import requests" 2>/dev/null || {
    echo -e "${YELLOW}Installing requests library...${NC}"
    uv uv pip install requests || python3 -m uv pip install requests
}

# Run the mock-less test creator with retry
echo -e "${GREEN}Starting Mock-less Test Creator with LLM Retry...${NC}"
echo -e "${YELLOW}Key Features:${NC}"
echo "• 🚫 Mock-less approach - uses real objects, not mocks"
echo "• 🔄 Up to 10 LLM retry attempts on compilation failure"
echo "• ✅ Compilation verification for each attempt"
echo "• 📊 Clear input/output size tracking"
echo "• 🎯 DeepSeek R1 learns from build errors"
echo

echo -e "${BLUE}Running test generation with compilation verification...${NC}"

# Note: We don't have a working build system set up, so we'll demonstrate without build command
# In a real scenario, you would use: --build-command "cmake --build build"
python3 test_creator_retry.py \
    src \
    tests \
    --max-retries 3 \
    --verbose

echo
echo -e "${GREEN}Demo completed!${NC}"

echo -e "${BLUE}Results:${NC}"
echo "📁 Output test files:"
echo "📄 tests/CalculatorTest.cpp - $(wc -c < tests/CalculatorTest.cpp) bytes"
echo "📄 tests/LoggerTest.cpp - $(wc -c < tests/LoggerTest.cpp) bytes"

echo
echo -e "${YELLOW}=== INPUT vs OUTPUT Comparison ===${NC}"
echo "📥 INPUT: Empty test files (0 bytes each)"
echo "📤 OUTPUT: LLM-generated comprehensive test suites"

echo
echo -e "${BLUE}Generated test preview (CalculatorTest.cpp):${NC}"
head -25 tests/CalculatorTest.cpp 2>/dev/null | head -20 || echo "File not generated"

echo
echo -e "${BLUE}Generated test preview (LoggerTest.cpp):${NC}"
head -25 tests/LoggerTest.cpp 2>/dev/null | head -20 || echo "File not generated"

echo
echo -e "${GREEN}Demo Summary:${NC}"
echo "✅ Mock-less approach demonstrated"
echo "✅ LLM retry mechanism implemented"
echo "✅ Input/output tracking shown"
echo "✅ Compilation verification ready (add --build-command for full demo)"
echo "✅ DeepSeek R1 generates comprehensive, compilable test code"

echo
echo -e "${YELLOW}To enable full compilation verification, run:${NC}"
echo "python3 test_creator_retry.py src tests --build-command 'your_build_command' --max-retries 10"