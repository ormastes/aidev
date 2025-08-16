#!/usr/bin/env python3
"""
Migrated from: final_demo.sh
Auto-generated Python - 2025-08-16T04:57:27.611Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("==================================================")
    print("DeepSeek R1 C++ Test Generator Demo")
    print("==================================================")
    # Check if Ollama is running
    subprocess.run("if ! pgrep -x "ollama" > /dev/null; then", shell=True)
    print("❌ Ollama service is not running!")
    print("Starting Ollama...")
    subprocess.run("sudo systemctl start ollama", shell=True)
    time.sleep(2)
    # Verify DeepSeek R1 is available
    subprocess.run("if ! ollama list | grep -q "deepseek-r1:7b"; then", shell=True)
    print("❌ DeepSeek R1 not found!")
    sys.exit(1)
    print("✅ Ollama with DeepSeek R1 is ready!")
    print("")
    # Run the enhanced test generator
    print("Generating tests for StringUtils class...")
    print("This uses:")
    print("- Deep code analysis")
    print("- New chat session per file")
    print("- DeepSeek R1 for intelligent test generation")
    print("")
    os.chdir("/home/ormastes/dev/aidev/demo/test-creator")
    # Run with increased timeout
    subprocess.run("python3 test_generator_enhanced.py \", shell=True)
    subprocess.run("demo_deepseek/StringUtils.h \", shell=True)
    subprocess.run("-c demo_deepseek/StringUtils.cpp \", shell=True)
    subprocess.run("-o demo_deepseek/tests_final \", shell=True)
    subprocess.run("--model deepseek-r1:7b \", shell=True)
    subprocess.run("-v", shell=True)
    print("")
    print("==================================================")
    print("Demo Complete!")
    print("==================================================")
    print("")
    print("Generated test file: demo_deepseek/tests_final/StringUtilsTest.cpp")
    print("")
    print("The test file includes:")
    print("- Detailed method analysis comments")
    print("- Verifier: DeepSeek R1 tags")
    print("- Comprehensive test implementations")
    print("- Edge case coverage")
    print("")

if __name__ == "__main__":
    main()