#!/usr/bin/env bun
/**
 * Migrated from: demo_llm.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.688Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Demo script for LLM-Enhanced Test Creator with DeepSeek R1
  await $`set -euo pipefail`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}=== LLM-Enhanced Test Creator Demo with DeepSeek R1 ===${NC}"
  console.log("This demo shows intelligent C++ test generation using Ollama DeepSeek R1");
  await $`echo`;
  // Check if Ollama is running
  console.log("-e ");${BLUE}Checking Ollama service...${NC}"
  await $`if ! pgrep -x "ollama" > /dev/null; then`;
  console.log("-e ");${YELLOW}Starting Ollama service...${NC}"
  await $`ollama serve &`;
  await Bun.sleep(3 * 1000);
  }
  // Check if DeepSeek R1 model is available
  console.log("-e ");${BLUE}Checking for DeepSeek R1 model...${NC}"
  await $`if ! ollama list | grep -q "deepseek-r1"; then`;
  console.log("-e ");${YELLOW}DeepSeek R1 model not found. Pulling it now...${NC}"
  console.log("This may take several minutes...");
  await $`ollama pull deepseek-r1:7b`;
  }
  // Create build directory and configure CMake (if available)
  console.log("-e ");${BLUE}Setting up build environment...${NC}"
  await mkdir("build", { recursive: true });
  // Try to configure with CMake if available
  await $`if command -v cmake &> /dev/null; then`;
  process.chdir("build");
  console.log("-e ");${BLUE}Configuring CMake with compile_commands.json...${NC}"
  await $`cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .. || echo "CMake configuration skipped"`;
  process.chdir("..");
  } else {
  console.log("-e ");${YELLOW}CMake not available, proceeding without compile_commands.json${NC}"
  }
  // Ensure example source files exist
  console.log("-e ");${BLUE}Setting up comprehensive example files...${NC}"
  await mkdir("src tests", { recursive: true });
  // Create a more complex Calculator class for better LLM demonstration
  await $`cat > src/Calculator.h << 'EOF'`;
  // pragma once
  // include <vector>
  // include <string>
  // include <stdexcept>
  await $`/**`;
  await $`* A comprehensive calculator class with various mathematical operations`;
  await $`* This class demonstrates different types of methods for LLM test generation`;
  await $`*/`;
  await $`class Calculator {`;
  await $`public:`;
  await $`Calculator();`;
  await $`virtual ~Calculator();`;
  // Basic arithmetic operations
  await $`virtual int add(int a, int b) const;`;
  await $`virtual int subtract(int a, int b) const;`;
  await $`virtual int multiply(int a, int b) const;`;
  await $`virtual double divide(int a, int b) const;`;
  // Advanced operations
  await $`virtual long factorial(int n) const;`;
  await $`virtual double power(double base, int exponent) const;`;
  await $`virtual bool isPrime(int number) const;`;
  // Memory operations
  await $`virtual void store(double value);`;
  await $`virtual double recall() const;`;
  await $`virtual void clearMemory();`;
  // History operations
  await $`virtual void addToHistory(const std::string& operation, double result);`;
  await $`virtual std::vector<std::string> getHistory() const;`;
  await $`virtual void clearHistory();`;
  // Configuration
  await $`virtual void setPrecision(int digits);`;
  await $`virtual int getPrecision() const;`;
  // Error handling
  await $`class CalculatorException : public std::runtime_error {`;
  await $`public:`;
  await $`explicit CalculatorException(const std::string& message)`;
  await $`: std::runtime_error(message) {}`;
  await $`};`;
  await $`private:`;
  await $`double memory_value;`;
  await $`std::vector<std::string> calculation_history;`;
  await $`int precision_digits;`;
  await $`bool memory_initialized;`;
  await $`};`;
  await $`EOF`;
  await $`cat > src/Calculator.cpp << 'EOF'`;
  // include "Calculator.h"
  // include <cmath>
  // include <sstream>
  // include <iomanip>
  await $`Calculator::Calculator()`;
  await $`: memory_value(0.0), precision_digits(2), memory_initialized(false) {}`;
  await $`Calculator::~Calculator() {}`;
  await $`int Calculator::add(int a, int b) const {`;
  await $`return a + b;`;
  await $`}`;
  await $`int Calculator::subtract(int a, int b) const {`;
  await $`return a - b;`;
  await $`}`;
  await $`int Calculator::multiply(int a, int b) const {`;
  await $`return a * b;`;
  await $`}`;
  await $`double Calculator::divide(int a, int b) const {`;
  await $`if (b == 0) {`;
  await $`throw CalculatorException("Division by zero");`;
  await $`}`;
  await $`return static_cast<double>(a) / b;`;
  await $`}`;
  await $`long Calculator::factorial(int n) const {`;
  await $`if (n < 0) {`;
  await $`throw CalculatorException("Factorial of negative number");`;
  await $`}`;
  await $`if (n > 20) {`;
  await $`throw CalculatorException("Factorial too large");`;
  await $`}`;
  await $`long result = 1;`;
  await $`for (int i = 2; i <= n; ++i) {`;
  await $`result *= i;`;
  await $`}`;
  await $`return result;`;
  await $`}`;
  await $`double Calculator::power(double base, int exponent) const {`;
  await $`return std::pow(base, exponent);`;
  await $`}`;
  await $`bool Calculator::isPrime(int number) const {`;
  await $`if (number < 2) return false;`;
  await $`if (number == 2) return true;`;
  await $`if (number % 2 == 0) return false;`;
  await $`for (int i = 3; i * i <= number; i += 2) {`;
  await $`if (number % i == 0) return false;`;
  await $`}`;
  await $`return true;`;
  await $`}`;
  await $`void Calculator::store(double value) {`;
  await $`memory_value = value;`;
  await $`memory_initialized = true;`;
  await $`}`;
  await $`double Calculator::recall() const {`;
  await $`if (!memory_initialized) {`;
  await $`throw CalculatorException("Memory not initialized");`;
  await $`}`;
  await $`return memory_value;`;
  await $`}`;
  await $`void Calculator::clearMemory() {`;
  await $`memory_value = 0.0;`;
  await $`memory_initialized = false;`;
  await $`}`;
  await $`void Calculator::addToHistory(const std::string& operation, double result) {`;
  await $`std::ostringstream oss;`;
  await $`oss << std::fixed << std::setprecision(precision_digits)`;
  await $`<< operation << " = " << result;`;
  await $`calculation_history.push_back(oss.str());`;
  await $`}`;
  await $`std::vector<std::string> Calculator::getHistory() const {`;
  await $`return calculation_history;`;
  await $`}`;
  await $`void Calculator::clearHistory() {`;
  await $`calculation_history.clear();`;
  await $`}`;
  await $`void Calculator::setPrecision(int digits) {`;
  await $`if (digits < 0 || digits > 10) {`;
  await $`throw CalculatorException("Invalid precision");`;
  await $`}`;
  await $`precision_digits = digits;`;
  await $`}`;
  await $`int Calculator::getPrecision() const {`;
  await $`return precision_digits;`;
  await $`}`;
  await $`EOF`;
  // Create a simple Logger class as well
  await $`cat > src/Logger.h << 'EOF'`;
  // pragma once
  // include <string>
  // include <vector>
  // include <fstream>
  await $`/**`;
  await $`* A logging utility class for demonstration`;
  await $`*/`;
  await $`class Logger {`;
  await $`public:`;
  await $`enum LogLevel {`;
  await $`DEBUG = 0,`;
  await $`INFO = 1,`;
  await $`WARNING = 2,`;
  await $`ERROR = 3`;
  await $`};`;
  await $`Logger(const std::string& filename = "");`;
  await $`virtual ~Logger();`;
  await $`virtual void log(const std::string& message, LogLevel level = INFO);`;
  await $`virtual void debug(const std::string& message);`;
  await $`virtual void info(const std::string& message);`;
  await $`virtual void warning(const std::string& message);`;
  await $`virtual void error(const std::string& message);`;
  await $`virtual void setLogLevel(LogLevel level);`;
  await $`virtual LogLevel getLogLevel() const;`;
  await $`virtual std::vector<std::string> getRecentLogs(int count = 10) const;`;
  await $`virtual void clearLogs();`;
  await $`virtual bool isEnabled() const;`;
  await $`virtual void setEnabled(bool enabled);`;
  await $`private:`;
  await $`std::string log_filename;`;
  await $`std::ofstream log_file;`;
  await $`LogLevel current_level;`;
  await $`bool enabled;`;
  await $`std::vector<std::string> recent_logs;`;
  await $`std::string levelToString(LogLevel level) const;`;
  await $`std::string getCurrentTimestamp() const;`;
  await $`};`;
  await $`EOF`;
  // Create empty test files for LLM to enhance
  console.log("-e ");${YELLOW}Creating empty test files for LLM enhancement...${NC}"
  await mkdir("tests", { recursive: true });
  await $`touch tests/CalculatorTest.cpp`;
  await $`touch tests/LoggerTest.cpp`;
  // Make the LLM test creator executable
  await $`chmod +x test_creator_llm.py`;
  // Install requests if not available
  console.log("-e ");${BLUE}Checking Python dependencies...${NC}"
  await $`python3 -c "import requests" 2>/dev/null || {`;
  console.log("-e ");${YELLOW}Installing requests library...${NC}"
  await $`uv uv pip install requests || python3 -m uv pip install requests`;
  await $`}`;
  // Run the LLM-enhanced test creator
  console.log("-e ");${GREEN}Starting LLM-Enhanced Test Creator with DeepSeek R1...${NC}"
  console.log("-e ");${YELLOW}This will:${NC}"
  console.log("1. Scan tests/ directory for *Test.cpp files");
  console.log("2. Find corresponding source files in src/ directory");
  console.log("3. Use DeepSeek R1 to generate comprehensive test implementations");
  console.log("4. Create intelligent test cases with edge cases and error handling");
  console.log("5. Verify tests are properly formatted and structured");
  await $`echo`;
  console.log("-e ");${BLUE}Starting LLM test generation process...${NC}"
  await $`python3 test_creator_llm.py \`;
  await $`src \`;
  await $`tests \`;
  await $`--build-dir build \`;
  await $`--llm \`;
  await $`--verbose`;
  await $`echo`;
  console.log("-e ");${GREEN}LLM Demo completed!${NC}"
  console.log("-e ");${BLUE}Check the results:${NC}"
  console.log("- Enhanced test files in: tests/");
  console.log("- CalculatorTest.cpp - Comprehensive tests for all Calculator methods");
  console.log("- LoggerTest.cpp - Tests for logging functionality");
  console.log("- Build output: build/");
  console.log("- Compile database: build/compile_commands.json (if CMake available)");
  // Show the generated test content
  await $`echo`;
  console.log("-e ");${BLUE}Generated test content preview:${NC}"
  console.log("-e ");${YELLOW}=== CalculatorTest.cpp (first 30 lines) ===${NC}"
  await $`head -30 tests/CalculatorTest.cpp 2>/dev/null || echo "File not generated"`;
  await $`echo`;
  console.log("-e ");${YELLOW}=== LoggerTest.cpp (first 30 lines) ===${NC}"
  await $`head -30 tests/LoggerTest.cpp 2>/dev/null || echo "File not generated"`;
  // Attempt to build if CMake is available
  await $`if command -v cmake &> /dev/null && [ -f "build/Makefile" ]; then`;
  await $`echo`;
  console.log("-e ");${BLUE}Attempting to build the project...${NC}"
  await $`cmake --build build 2>/dev/null && echo -e "${GREEN}Build successful!${NC}" || echo -e "${YELLOW}Build may need CMakeLists.txt configuration${NC}"`;
  }
  await $`echo`;
  console.log("-e ");${GREEN}Demo completed! The LLM has generated intelligent, comprehensive test cases.${NC}"
  console.log("-e ");${BLUE}Features demonstrated:${NC}"
  console.log("✓ Automatic test discovery and source mapping");
  console.log("✓ LLM-powered test case generation using DeepSeek R1");
  console.log("✓ Comprehensive test coverage with edge cases");
  console.log("✓ Error handling and exception testing");
  console.log("✓ GTest/GMock best practices");
  console.log("✓ Build verification and validation");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}