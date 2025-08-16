#!/usr/bin/env python3
"""
Migrated from: demo_retry.sh
Auto-generated Python - 2025-08-16T04:57:27.735Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Demo script for Mock-less Test Creator with LLM Retry
    subprocess.run("set -euo pipefail", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}=== Mock-less Test Creator with LLM Retry Demo ===${NC}"
    print("This demo shows compilation-verified test generation with up to 10 LLM retries")
    subprocess.run("echo", shell=True)
    # Clean up previous demo files
    print("-e ")${BLUE}Cleaning up previous demo files...${NC}"
    subprocess.run("rm -f tests/*Test.cpp tests/*Test.cpp.backup", shell=True)
    # Check if Ollama is running
    print("-e ")${BLUE}Checking Ollama service...${NC}"
    subprocess.run("if ! pgrep -x "ollama" > /dev/null; then", shell=True)
    print("-e ")${YELLOW}Starting Ollama service...${NC}"
    subprocess.run("ollama serve &", shell=True)
    time.sleep(3)
    # Ensure we have the right model
    print("-e ")${BLUE}Checking DeepSeek R1 model...${NC}"
    subprocess.run("ollama list | grep deepseek-r1 || {", shell=True)
    print("-e ")${YELLOW}Pulling DeepSeek R1 model...${NC}"
    subprocess.run("ollama pull deepseek-r1:7b", shell=True)
    subprocess.run("}", shell=True)
    # Setup directories and files
    print("-e ")${BLUE}Setting up test environment...${NC}"
    Path("src tests").mkdir(parents=True, exist_ok=True)
    # Create a more complex Calculator with potential compilation challenges
    subprocess.run("cat > src/Calculator.h << 'EOF'", shell=True)
    # pragma once
    # include <vector>
    # include <string>
    # include <stdexcept>
    # include <memory>
    subprocess.run("class Calculator {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("class CalculatorException : public std::runtime_error {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("explicit CalculatorException(const std::string& message)", shell=True)
    subprocess.run(": std::runtime_error(message) {}", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("Calculator();", shell=True)
    subprocess.run("virtual ~Calculator();", shell=True)
    subprocess.run("// Basic operations", shell=True)
    subprocess.run("int add(int a, int b) const;", shell=True)
    subprocess.run("int subtract(int a, int b) const;", shell=True)
    subprocess.run("int multiply(int a, int b) const;", shell=True)
    subprocess.run("double divide(int a, int b) const;", shell=True)
    subprocess.run("// Advanced operations", shell=True)
    subprocess.run("long factorial(int n) const;", shell=True)
    subprocess.run("double power(double base, int exponent) const;", shell=True)
    subprocess.run("bool isPrime(int number) const;", shell=True)
    subprocess.run("// Memory operations", shell=True)
    subprocess.run("void store(double value);", shell=True)
    subprocess.run("double recall() const;", shell=True)
    subprocess.run("void clearMemory();", shell=True)
    subprocess.run("// History operations", shell=True)
    subprocess.run("void addToHistory(const std::string& operation, double result);", shell=True)
    subprocess.run("std::vector<std::string> getHistory() const;", shell=True)
    subprocess.run("void clearHistory();", shell=True)
    subprocess.run("// Configuration", shell=True)
    subprocess.run("void setPrecision(int digits);", shell=True)
    subprocess.run("int getPrecision() const;", shell=True)
    subprocess.run("private:", shell=True)
    subprocess.run("double memory_value;", shell=True)
    subprocess.run("std::vector<std::string> calculation_history;", shell=True)
    subprocess.run("int precision_digits;", shell=True)
    subprocess.run("bool memory_initialized;", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("EOF", shell=True)
    # Create a simple Logger class
    subprocess.run("cat > src/Logger.h << 'EOF'", shell=True)
    # pragma once
    # include <string>
    # include <vector>
    subprocess.run("class Logger {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("enum LogLevel { DEBUG = 0, INFO = 1, WARNING = 2, ERROR = 3 };", shell=True)
    subprocess.run("Logger(const std::string& filename = "");", shell=True)
    subprocess.run("virtual ~Logger();", shell=True)
    subprocess.run("void log(const std::string& message, LogLevel level = INFO);", shell=True)
    subprocess.run("void debug(const std::string& message);", shell=True)
    subprocess.run("void info(const std::string& message);", shell=True)
    subprocess.run("void warning(const std::string& message);", shell=True)
    subprocess.run("void error(const std::string& message);", shell=True)
    subprocess.run("void setLogLevel(LogLevel level);", shell=True)
    subprocess.run("LogLevel getLogLevel() const;", shell=True)
    subprocess.run("std::vector<std::string> getRecentLogs(int count = 10) const;", shell=True)
    subprocess.run("void clearLogs();", shell=True)
    subprocess.run("bool isEnabled() const;", shell=True)
    subprocess.run("void setEnabled(bool enabled);", shell=True)
    subprocess.run("private:", shell=True)
    subprocess.run("std::string log_filename;", shell=True)
    subprocess.run("LogLevel current_level;", shell=True)
    subprocess.run("bool enabled;", shell=True)
    subprocess.run("std::vector<std::string> recent_logs;", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("EOF", shell=True)
    # Create empty test files (input)
    print("-e ")${YELLOW}Creating empty input test files...${NC}"
    subprocess.run("touch tests/CalculatorTest.cpp", shell=True)
    subprocess.run("touch tests/LoggerTest.cpp", shell=True)
    print("Input test files:")
    print("📁 tests/CalculatorTest.cpp - $(wc -c < tests/CalculatorTest.cpp) bytes (empty)")
    print("📁 tests/LoggerTest.cpp - $(wc -c < tests/LoggerTest.cpp) bytes (empty)")
    # Make the retry test creator executable
    subprocess.run("chmod +x test_creator_retry.py", shell=True)
    # Install requests if not available
    print("-e ")${BLUE}Checking Python dependencies...${NC}"
    subprocess.run("python3 -c "import requests" 2>/dev/null || {", shell=True)
    print("-e ")${YELLOW}Installing requests library...${NC}"
    subprocess.run("uv uv pip install requests || python3 -m uv pip install requests", shell=True)
    subprocess.run("}", shell=True)
    # Run the mock-less test creator with retry
    print("-e ")${GREEN}Starting Mock-less Test Creator with LLM Retry...${NC}"
    print("-e ")${YELLOW}Key Features:${NC}"
    print("• 🚫 Mock-less approach - uses real objects, not mocks")
    print("• 🔄 Up to 10 LLM retry attempts on compilation failure")
    print("• ✅ Compilation verification for each attempt")
    print("• 📊 Clear input/output size tracking")
    print("• 🎯 DeepSeek R1 learns from build errors")
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Running test generation with compilation verification...${NC}"
    # Note: We don't have a working build system set up, so we'll demonstrate without build command
    # In a real scenario, you would use: --build-command "cmake --build build"
    subprocess.run("python3 test_creator_retry.py \", shell=True)
    subprocess.run("src \", shell=True)
    subprocess.run("tests \", shell=True)
    subprocess.run("--max-retries 3 \", shell=True)
    subprocess.run("--verbose", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}Demo completed!${NC}"
    print("-e ")${BLUE}Results:${NC}"
    print("📁 Output test files:")
    print("📄 tests/CalculatorTest.cpp - $(wc -c < tests/CalculatorTest.cpp) bytes")
    print("📄 tests/LoggerTest.cpp - $(wc -c < tests/LoggerTest.cpp) bytes")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}=== INPUT vs OUTPUT Comparison ===${NC}"
    print("📥 INPUT: Empty test files (0 bytes each)")
    print("📤 OUTPUT: LLM-generated comprehensive test suites")
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Generated test preview (CalculatorTest.cpp):${NC}"
    subprocess.run("head -25 tests/CalculatorTest.cpp 2>/dev/null | head -20 || echo "File not generated"", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Generated test preview (LoggerTest.cpp):${NC}"
    subprocess.run("head -25 tests/LoggerTest.cpp 2>/dev/null | head -20 || echo "File not generated"", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}Demo Summary:${NC}"
    print("✅ Mock-less approach demonstrated")
    print("✅ LLM retry mechanism implemented")
    print("✅ Input/output tracking shown")
    print("✅ Compilation verification ready (add --build-command for full demo)")
    print("✅ DeepSeek R1 generates comprehensive, compilable test code")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}To enable full compilation verification, run:${NC}"
    print("python3 test_creator_retry.py src tests --build-command 'your_build_command' --max-retries 10")

if __name__ == "__main__":
    main()