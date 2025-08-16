#!/usr/bin/env python3
"""
Migrated from: setup_deepseek_r1.sh
Auto-generated Python - 2025-08-16T04:57:27.773Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup script for DeepSeek R1 Test Generator Demo
    print("==========================================")
    print("DeepSeek R1 Test Generator Setup")
    print("==========================================")
    # Check if running on Linux/Mac
    if [ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]:; then
    print("✓ Compatible OS detected: $OSTYPE")
    else:
    print("⚠ Warning: This script is designed for Linux/Mac. Windows users should use WSL.")
    # Step 1: Check Python
    print("-e ")\n[1/5] Checking Python installation..."
    subprocess.run("if command -v python3 &> /dev/null; then", shell=True)
    subprocess.run("PYTHON_VERSION=$(python3 --version)", shell=True)
    print("✓ Python installed: $PYTHON_VERSION")
    else:
    print("✗ Python 3 not found. Please install Python 3.8 or higher.")
    sys.exit(1)
    # Step 2: Install Python dependencies
    print("-e ")\n[2/5] Installing Python dependencies..."
    subprocess.run("uv pip install --user libclang 2>/dev/null || echo "⚠ libclang installation failed (optional)"", shell=True)
    # Step 3: Check/Install Ollama
    print("-e ")\n[3/5] Checking Ollama installation..."
    subprocess.run("if command -v ollama &> /dev/null; then", shell=True)
    print("✓ Ollama is already installed")
    else:
    print("✗ Ollama not found. Installing...")
    print("Please visit https://ollama.ai for installation instructions")
    print("")
    print("Quick install for Linux/Mac:")
    print("curl -fsSL https://ollama.ai/install.sh | sh")
    print("")
    subprocess.run("read -p "Press Enter after installing Ollama to continue..."", shell=True)
    # Step 4: Pull DeepSeek R1 model
    print("-e ")\n[4/5] Pulling DeepSeek R1 model..."
    subprocess.run("if command -v ollama &> /dev/null; then", shell=True)
    print("This will download the DeepSeek R1 7B model (~4GB)")
    subprocess.run("read -p "Continue? (y/n) " -n 1 -r", shell=True)
    subprocess.run("echo", shell=True)
    if [ $REPLY =~ ^[Yy]$ ]:; then
    subprocess.run("ollama pull deepseek-r1:7b", shell=True)
    if $? -eq 0 :; then
    print("✓ DeepSeek R1 model downloaded successfully")
    else:
    print("✗ Failed to download model. Please check your internet connection.")
    else:
    print("⚠ Skipping model download. You'll need to run: ollama pull deepseek-r1:7b")
    else:
    print("⚠ Ollama not available. Skipping model download.")
    # Step 5: Verify setup
    print("-e ")\n[5/5] Verifying setup..."
    print("Checking components:")
    # Check Python
    subprocess.run("python3 -c "print('✓ Python: OK')" 2>/dev/null || echo "✗ Python: FAILED"", shell=True)
    # Check Ollama
    subprocess.run("if command -v ollama &> /dev/null; then", shell=True)
    print("✓ Ollama: OK")
    # Check if model is available
    subprocess.run("if ollama list | grep -q "deepseek-r1:7b"; then", shell=True)
    print("✓ DeepSeek R1 Model: OK")
    else:
    print("✗ DeepSeek R1 Model: NOT FOUND")
    else:
    print("✗ Ollama: NOT FOUND")
    # Check test generator
    if -f "../test_case_generator_llm.py" :; then
    print("✓ Test Generator: OK")
    else:
    print("✗ Test Generator: NOT FOUND")
    print("-e ")\n=========================================="
    print("Setup Complete!")
    print("==========================================")
    print("")
    print("To run the demo:")
    print("  ./run_demo.sh")
    print("")
    print("To manually test:")
    print("  python3 ../test_case_generator_llm.py -t src -m mocks -o output")
    print("")

if __name__ == "__main__":
    main()