#!/usr/bin/env python3
"""
Migrated from: run_demo.sh
Auto-generated Python - 2025-08-16T04:57:27.793Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("==================================================")
    print("DeepSeek R1 Test Generator Demo")
    print("==================================================")
    # Check if Ollama is installed
    subprocess.run("if ! command -v ollama &> /dev/null; then", shell=True)
    print("❌ Ollama is not installed!")
    print("")
    print("To install Ollama:")
    print("  curl -fsSL https://ollama.ai/install.sh | sh")
    print("")
    print("After installing, run:")
    print("  ollama pull deepseek-r1:7b")
    sys.exit(1)
    # Check if DeepSeek R1 is available
    subprocess.run("if ! ollama list | grep -q "deepseek-r1:7b"; then", shell=True)
    print("❌ DeepSeek R1 model not found!")
    print("")
    print("To download the model (4GB):")
    print("  ollama pull deepseek-r1:7b")
    print("")
    print("This will download the DeepSeek R1 7B model.")
    sys.exit(1)
    print("✅ Ollama and DeepSeek R1 are ready!")
    print("")
    # Run the test generator
    print("Generating tests for StringUtils class...")
    subprocess.run("python3 ../test_generator_simple.py StringUtils.h -c StringUtils.cpp -o tests_generated -v", shell=True)
    print("")
    print("==================================================")
    print("Demo Complete!")
    print("==================================================")
    print("")
    print("Generated test file: tests_generated/StringUtilsTest.cpp")
    print("")
    print("To compile and run the tests:")
    print("  g++ -std=c++14 tests_generated/StringUtilsTest.cpp StringUtils.cpp -lgtest -lgtest_main -pthread -o run_tests")
    print("  ./run_tests")

if __name__ == "__main__":
    main()