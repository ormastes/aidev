#!/usr/bin/env python3
"""
Migrated from: demo_llm.sh
Auto-generated Python - 2025-08-16T04:57:27.688Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Demo script for LLM-Enhanced Test Creator with DeepSeek R1
    subprocess.run("set -euo pipefail", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}=== LLM-Enhanced Test Creator Demo with DeepSeek R1 ===${NC}"
    print("This demo shows intelligent C++ test generation using Ollama DeepSeek R1")
    subprocess.run("echo", shell=True)
    # Check if Ollama is running
    print("-e ")${BLUE}Checking Ollama service...${NC}"
    subprocess.run("if ! pgrep -x "ollama" > /dev/null; then", shell=True)
    print("-e ")${YELLOW}Starting Ollama service...${NC}"
    subprocess.run("ollama serve &", shell=True)
    time.sleep(3)
    # Check if DeepSeek R1 model is available
    print("-e ")${BLUE}Checking for DeepSeek R1 model...${NC}"
    subprocess.run("if ! ollama list | grep -q "deepseek-r1"; then", shell=True)
    print("-e ")${YELLOW}DeepSeek R1 model not found. Pulling it now...${NC}"
    print("This may take several minutes...")
    subprocess.run("ollama pull deepseek-r1:7b", shell=True)
    # Create build directory and configure CMake (if available)
    print("-e ")${BLUE}Setting up build environment...${NC}"
    Path("build").mkdir(parents=True, exist_ok=True)
    # Try to configure with CMake if available
    subprocess.run("if command -v cmake &> /dev/null; then", shell=True)
    os.chdir("build")
    print("-e ")${BLUE}Configuring CMake with compile_commands.json...${NC}"
    subprocess.run("cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .. || echo "CMake configuration skipped"", shell=True)
    os.chdir("..")
    else:
    print("-e ")${YELLOW}CMake not available, proceeding without compile_commands.json${NC}"
    # Ensure example source files exist
    print("-e ")${BLUE}Setting up comprehensive example files...${NC}"
    Path("src tests").mkdir(parents=True, exist_ok=True)
    # Create a more complex Calculator class for better LLM demonstration
    subprocess.run("cat > src/Calculator.h << 'EOF'", shell=True)
    # pragma once
    # include <vector>
    # include <string>
    # include <stdexcept>
    subprocess.run("/**", shell=True)
    subprocess.run("* A comprehensive calculator class with various mathematical operations", shell=True)
    subprocess.run("* This class demonstrates different types of methods for LLM test generation", shell=True)
    subprocess.run("*/", shell=True)
    subprocess.run("class Calculator {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("Calculator();", shell=True)
    subprocess.run("virtual ~Calculator();", shell=True)
    subprocess.run("// Basic arithmetic operations", shell=True)
    subprocess.run("virtual int add(int a, int b) const;", shell=True)
    subprocess.run("virtual int subtract(int a, int b) const;", shell=True)
    subprocess.run("virtual int multiply(int a, int b) const;", shell=True)
    subprocess.run("virtual double divide(int a, int b) const;", shell=True)
    subprocess.run("// Advanced operations", shell=True)
    subprocess.run("virtual long factorial(int n) const;", shell=True)
    subprocess.run("virtual double power(double base, int exponent) const;", shell=True)
    subprocess.run("virtual bool isPrime(int number) const;", shell=True)
    subprocess.run("// Memory operations", shell=True)
    subprocess.run("virtual void store(double value);", shell=True)
    subprocess.run("virtual double recall() const;", shell=True)
    subprocess.run("virtual void clearMemory();", shell=True)
    subprocess.run("// History operations", shell=True)
    subprocess.run("virtual void addToHistory(const std::string& operation, double result);", shell=True)
    subprocess.run("virtual std::vector<std::string> getHistory() const;", shell=True)
    subprocess.run("virtual void clearHistory();", shell=True)
    subprocess.run("// Configuration", shell=True)
    subprocess.run("virtual void setPrecision(int digits);", shell=True)
    subprocess.run("virtual int getPrecision() const;", shell=True)
    subprocess.run("// Error handling", shell=True)
    subprocess.run("class CalculatorException : public std::runtime_error {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("explicit CalculatorException(const std::string& message)", shell=True)
    subprocess.run(": std::runtime_error(message) {}", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("private:", shell=True)
    subprocess.run("double memory_value;", shell=True)
    subprocess.run("std::vector<std::string> calculation_history;", shell=True)
    subprocess.run("int precision_digits;", shell=True)
    subprocess.run("bool memory_initialized;", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > src/Calculator.cpp << 'EOF'", shell=True)
    # include "Calculator.h"
    # include <cmath>
    # include <sstream>
    # include <iomanip>
    subprocess.run("Calculator::Calculator()", shell=True)
    subprocess.run(": memory_value(0.0), precision_digits(2), memory_initialized(false) {}", shell=True)
    subprocess.run("Calculator::~Calculator() {}", shell=True)
    subprocess.run("int Calculator::add(int a, int b) const {", shell=True)
    subprocess.run("return a + b;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("int Calculator::subtract(int a, int b) const {", shell=True)
    subprocess.run("return a - b;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("int Calculator::multiply(int a, int b) const {", shell=True)
    subprocess.run("return a * b;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("double Calculator::divide(int a, int b) const {", shell=True)
    subprocess.run("if (b == 0) {", shell=True)
    subprocess.run("throw CalculatorException("Division by zero");", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("return static_cast<double>(a) / b;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("long Calculator::factorial(int n) const {", shell=True)
    subprocess.run("if (n < 0) {", shell=True)
    subprocess.run("throw CalculatorException("Factorial of negative number");", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("if (n > 20) {", shell=True)
    subprocess.run("throw CalculatorException("Factorial too large");", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("long result = 1;", shell=True)
    subprocess.run("for (int i = 2; i <= n; ++i) {", shell=True)
    subprocess.run("result *= i;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("return result;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("double Calculator::power(double base, int exponent) const {", shell=True)
    subprocess.run("return std::pow(base, exponent);", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("bool Calculator::isPrime(int number) const {", shell=True)
    subprocess.run("if (number < 2) return false;", shell=True)
    subprocess.run("if (number == 2) return true;", shell=True)
    subprocess.run("if (number % 2 == 0) return false;", shell=True)
    subprocess.run("for (int i = 3; i * i <= number; i += 2) {", shell=True)
    subprocess.run("if (number % i == 0) return false;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("return true;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("void Calculator::store(double value) {", shell=True)
    subprocess.run("memory_value = value;", shell=True)
    subprocess.run("memory_initialized = true;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("double Calculator::recall() const {", shell=True)
    subprocess.run("if (!memory_initialized) {", shell=True)
    subprocess.run("throw CalculatorException("Memory not initialized");", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("return memory_value;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("void Calculator::clearMemory() {", shell=True)
    subprocess.run("memory_value = 0.0;", shell=True)
    subprocess.run("memory_initialized = false;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("void Calculator::addToHistory(const std::string& operation, double result) {", shell=True)
    subprocess.run("std::ostringstream oss;", shell=True)
    subprocess.run("oss << std::fixed << std::setprecision(precision_digits)", shell=True)
    subprocess.run("<< operation << " = " << result;", shell=True)
    subprocess.run("calculation_history.push_back(oss.str());", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("std::vector<std::string> Calculator::getHistory() const {", shell=True)
    subprocess.run("return calculation_history;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("void Calculator::clearHistory() {", shell=True)
    subprocess.run("calculation_history.clear();", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("void Calculator::setPrecision(int digits) {", shell=True)
    subprocess.run("if (digits < 0 || digits > 10) {", shell=True)
    subprocess.run("throw CalculatorException("Invalid precision");", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("precision_digits = digits;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("int Calculator::getPrecision() const {", shell=True)
    subprocess.run("return precision_digits;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Create a simple Logger class as well
    subprocess.run("cat > src/Logger.h << 'EOF'", shell=True)
    # pragma once
    # include <string>
    # include <vector>
    # include <fstream>
    subprocess.run("/**", shell=True)
    subprocess.run("* A logging utility class for demonstration", shell=True)
    subprocess.run("*/", shell=True)
    subprocess.run("class Logger {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("enum LogLevel {", shell=True)
    subprocess.run("DEBUG = 0,", shell=True)
    subprocess.run("INFO = 1,", shell=True)
    subprocess.run("WARNING = 2,", shell=True)
    subprocess.run("ERROR = 3", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("Logger(const std::string& filename = "");", shell=True)
    subprocess.run("virtual ~Logger();", shell=True)
    subprocess.run("virtual void log(const std::string& message, LogLevel level = INFO);", shell=True)
    subprocess.run("virtual void debug(const std::string& message);", shell=True)
    subprocess.run("virtual void info(const std::string& message);", shell=True)
    subprocess.run("virtual void warning(const std::string& message);", shell=True)
    subprocess.run("virtual void error(const std::string& message);", shell=True)
    subprocess.run("virtual void setLogLevel(LogLevel level);", shell=True)
    subprocess.run("virtual LogLevel getLogLevel() const;", shell=True)
    subprocess.run("virtual std::vector<std::string> getRecentLogs(int count = 10) const;", shell=True)
    subprocess.run("virtual void clearLogs();", shell=True)
    subprocess.run("virtual bool isEnabled() const;", shell=True)
    subprocess.run("virtual void setEnabled(bool enabled);", shell=True)
    subprocess.run("private:", shell=True)
    subprocess.run("std::string log_filename;", shell=True)
    subprocess.run("std::ofstream log_file;", shell=True)
    subprocess.run("LogLevel current_level;", shell=True)
    subprocess.run("bool enabled;", shell=True)
    subprocess.run("std::vector<std::string> recent_logs;", shell=True)
    subprocess.run("std::string levelToString(LogLevel level) const;", shell=True)
    subprocess.run("std::string getCurrentTimestamp() const;", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("EOF", shell=True)
    # Create empty test files for LLM to enhance
    print("-e ")${YELLOW}Creating empty test files for LLM enhancement...${NC}"
    Path("tests").mkdir(parents=True, exist_ok=True)
    subprocess.run("touch tests/CalculatorTest.cpp", shell=True)
    subprocess.run("touch tests/LoggerTest.cpp", shell=True)
    # Make the LLM test creator executable
    subprocess.run("chmod +x test_creator_llm.py", shell=True)
    # Install requests if not available
    print("-e ")${BLUE}Checking Python dependencies...${NC}"
    subprocess.run("python3 -c "import requests" 2>/dev/null || {", shell=True)
    print("-e ")${YELLOW}Installing requests library...${NC}"
    subprocess.run("uv uv pip install requests || python3 -m uv pip install requests", shell=True)
    subprocess.run("}", shell=True)
    # Run the LLM-enhanced test creator
    print("-e ")${GREEN}Starting LLM-Enhanced Test Creator with DeepSeek R1...${NC}"
    print("-e ")${YELLOW}This will:${NC}"
    print("1. Scan tests/ directory for *Test.cpp files")
    print("2. Find corresponding source files in src/ directory")
    print("3. Use DeepSeek R1 to generate comprehensive test implementations")
    print("4. Create intelligent test cases with edge cases and error handling")
    print("5. Verify tests are properly formatted and structured")
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Starting LLM test generation process...${NC}"
    subprocess.run("python3 test_creator_llm.py \", shell=True)
    subprocess.run("src \", shell=True)
    subprocess.run("tests \", shell=True)
    subprocess.run("--build-dir build \", shell=True)
    subprocess.run("--llm \", shell=True)
    subprocess.run("--verbose", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}LLM Demo completed!${NC}"
    print("-e ")${BLUE}Check the results:${NC}"
    print("- Enhanced test files in: tests/")
    print("- CalculatorTest.cpp - Comprehensive tests for all Calculator methods")
    print("- LoggerTest.cpp - Tests for logging functionality")
    print("- Build output: build/")
    print("- Compile database: build/compile_commands.json (if CMake available)")
    # Show the generated test content
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Generated test content preview:${NC}"
    print("-e ")${YELLOW}=== CalculatorTest.cpp (first 30 lines) ===${NC}"
    subprocess.run("head -30 tests/CalculatorTest.cpp 2>/dev/null || echo "File not generated"", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}=== LoggerTest.cpp (first 30 lines) ===${NC}"
    subprocess.run("head -30 tests/LoggerTest.cpp 2>/dev/null || echo "File not generated"", shell=True)
    # Attempt to build if CMake is available
    subprocess.run("if command -v cmake &> /dev/null && [ -f "build/Makefile" ]; then", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${BLUE}Attempting to build the project...${NC}"
    subprocess.run("cmake --build build 2>/dev/null && echo -e "${GREEN}Build successful!${NC}" || echo -e "${YELLOW}Build may need CMakeLists.txt configuration${NC}"", shell=True)
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}Demo completed! The LLM has generated intelligent, comprehensive test cases.${NC}"
    print("-e ")${BLUE}Features demonstrated:${NC}"
    print("✓ Automatic test discovery and source mapping")
    print("✓ LLM-powered test case generation using DeepSeek R1")
    print("✓ Comprehensive test coverage with edge cases")
    print("✓ Error handling and exception testing")
    print("✓ GTest/GMock best practices")
    print("✓ Build verification and validation")

if __name__ == "__main__":
    main()