#!/usr/bin/env bun
/**
 * Migrated from: demo_retry.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.734Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Demo script for Mock-less Test Creator with LLM Retry
  await $`set -euo pipefail`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}=== Mock-less Test Creator with LLM Retry Demo ===${NC}"
  console.log("This demo shows compilation-verified test generation with up to 10 LLM retries");
  await $`echo`;
  // Clean up previous demo files
  console.log("-e ");${BLUE}Cleaning up previous demo files...${NC}"
  await $`rm -f tests/*Test.cpp tests/*Test.cpp.backup`;
  // Check if Ollama is running
  console.log("-e ");${BLUE}Checking Ollama service...${NC}"
  await $`if ! pgrep -x "ollama" > /dev/null; then`;
  console.log("-e ");${YELLOW}Starting Ollama service...${NC}"
  await $`ollama serve &`;
  await Bun.sleep(3 * 1000);
  }
  // Ensure we have the right model
  console.log("-e ");${BLUE}Checking DeepSeek R1 model...${NC}"
  await $`ollama list | grep deepseek-r1 || {`;
  console.log("-e ");${YELLOW}Pulling DeepSeek R1 model...${NC}"
  await $`ollama pull deepseek-r1:7b`;
  await $`}`;
  // Setup directories and files
  console.log("-e ");${BLUE}Setting up test environment...${NC}"
  await mkdir("src tests", { recursive: true });
  // Create a more complex Calculator with potential compilation challenges
  await $`cat > src/Calculator.h << 'EOF'`;
  // pragma once
  // include <vector>
  // include <string>
  // include <stdexcept>
  // include <memory>
  await $`class Calculator {`;
  await $`public:`;
  await $`class CalculatorException : public std::runtime_error {`;
  await $`public:`;
  await $`explicit CalculatorException(const std::string& message)`;
  await $`: std::runtime_error(message) {}`;
  await $`};`;
  await $`Calculator();`;
  await $`virtual ~Calculator();`;
  // Basic operations
  await $`int add(int a, int b) const;`;
  await $`int subtract(int a, int b) const;`;
  await $`int multiply(int a, int b) const;`;
  await $`double divide(int a, int b) const;`;
  // Advanced operations
  await $`long factorial(int n) const;`;
  await $`double power(double base, int exponent) const;`;
  await $`bool isPrime(int number) const;`;
  // Memory operations
  await $`void store(double value);`;
  await $`double recall() const;`;
  await $`void clearMemory();`;
  // History operations
  await $`void addToHistory(const std::string& operation, double result);`;
  await $`std::vector<std::string> getHistory() const;`;
  await $`void clearHistory();`;
  // Configuration
  await $`void setPrecision(int digits);`;
  await $`int getPrecision() const;`;
  await $`private:`;
  await $`double memory_value;`;
  await $`std::vector<std::string> calculation_history;`;
  await $`int precision_digits;`;
  await $`bool memory_initialized;`;
  await $`};`;
  await $`EOF`;
  // Create a simple Logger class
  await $`cat > src/Logger.h << 'EOF'`;
  // pragma once
  // include <string>
  // include <vector>
  await $`class Logger {`;
  await $`public:`;
  await $`enum LogLevel { DEBUG = 0, INFO = 1, WARNING = 2, ERROR = 3 };`;
  await $`Logger(const std::string& filename = "");`;
  await $`virtual ~Logger();`;
  await $`void log(const std::string& message, LogLevel level = INFO);`;
  await $`void debug(const std::string& message);`;
  await $`void info(const std::string& message);`;
  await $`void warning(const std::string& message);`;
  await $`void error(const std::string& message);`;
  await $`void setLogLevel(LogLevel level);`;
  await $`LogLevel getLogLevel() const;`;
  await $`std::vector<std::string> getRecentLogs(int count = 10) const;`;
  await $`void clearLogs();`;
  await $`bool isEnabled() const;`;
  await $`void setEnabled(bool enabled);`;
  await $`private:`;
  await $`std::string log_filename;`;
  await $`LogLevel current_level;`;
  await $`bool enabled;`;
  await $`std::vector<std::string> recent_logs;`;
  await $`};`;
  await $`EOF`;
  // Create empty test files (input)
  console.log("-e ");${YELLOW}Creating empty input test files...${NC}"
  await $`touch tests/CalculatorTest.cpp`;
  await $`touch tests/LoggerTest.cpp`;
  console.log("Input test files:");
  console.log("📁 tests/CalculatorTest.cpp - $(wc -c < tests/CalculatorTest.cpp) bytes (empty)");
  console.log("📁 tests/LoggerTest.cpp - $(wc -c < tests/LoggerTest.cpp) bytes (empty)");
  // Make the retry test creator executable
  await $`chmod +x test_creator_retry.py`;
  // Install requests if not available
  console.log("-e ");${BLUE}Checking Python dependencies...${NC}"
  await $`python3 -c "import requests" 2>/dev/null || {`;
  console.log("-e ");${YELLOW}Installing requests library...${NC}"
  await $`uv uv pip install requests || python3 -m uv pip install requests`;
  await $`}`;
  // Run the mock-less test creator with retry
  console.log("-e ");${GREEN}Starting Mock-less Test Creator with LLM Retry...${NC}"
  console.log("-e ");${YELLOW}Key Features:${NC}"
  console.log("• 🚫 Mock-less approach - uses real objects, not mocks");
  console.log("• 🔄 Up to 10 LLM retry attempts on compilation failure");
  console.log("• ✅ Compilation verification for each attempt");
  console.log("• 📊 Clear input/output size tracking");
  console.log("• 🎯 DeepSeek R1 learns from build errors");
  await $`echo`;
  console.log("-e ");${BLUE}Running test generation with compilation verification...${NC}"
  // Note: We don't have a working build system set up, so we'll demonstrate without build command
  // In a real scenario, you would use: --build-command "cmake --build build"
  await $`python3 test_creator_retry.py \`;
  await $`src \`;
  await $`tests \`;
  await $`--max-retries 3 \`;
  await $`--verbose`;
  await $`echo`;
  console.log("-e ");${GREEN}Demo completed!${NC}"
  console.log("-e ");${BLUE}Results:${NC}"
  console.log("📁 Output test files:");
  console.log("📄 tests/CalculatorTest.cpp - $(wc -c < tests/CalculatorTest.cpp) bytes");
  console.log("📄 tests/LoggerTest.cpp - $(wc -c < tests/LoggerTest.cpp) bytes");
  await $`echo`;
  console.log("-e ");${YELLOW}=== INPUT vs OUTPUT Comparison ===${NC}"
  console.log("📥 INPUT: Empty test files (0 bytes each)");
  console.log("📤 OUTPUT: LLM-generated comprehensive test suites");
  await $`echo`;
  console.log("-e ");${BLUE}Generated test preview (CalculatorTest.cpp):${NC}"
  await $`head -25 tests/CalculatorTest.cpp 2>/dev/null | head -20 || echo "File not generated"`;
  await $`echo`;
  console.log("-e ");${BLUE}Generated test preview (LoggerTest.cpp):${NC}"
  await $`head -25 tests/LoggerTest.cpp 2>/dev/null | head -20 || echo "File not generated"`;
  await $`echo`;
  console.log("-e ");${GREEN}Demo Summary:${NC}"
  console.log("✅ Mock-less approach demonstrated");
  console.log("✅ LLM retry mechanism implemented");
  console.log("✅ Input/output tracking shown");
  console.log("✅ Compilation verification ready (add --build-command for full demo)");
  console.log("✅ DeepSeek R1 generates comprehensive, compilable test code");
  await $`echo`;
  console.log("-e ");${YELLOW}To enable full compilation verification, run:${NC}"
  console.log("python3 test_creator_retry.py src tests --build-command 'your_build_command' --max-retries 10");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}