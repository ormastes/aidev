#!/usr/bin/env python3
"""
Migrated from: setup_ollama_clean.sh
Auto-generated Python - 2025-08-16T04:57:27.584Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔧 Setting up Ollama Clean Response Tool...")
    # Create convenient shell function
    subprocess.run("cat >> ~/.bashrc << 'EOF'", shell=True)
    # Ollama Clean - Query without thinking tags
    subprocess.run("ollama-clean() {", shell=True)
    subprocess.run("python3 /home/ormastes/dev/aidev/ollama_clean.py "$@"", shell=True)
    subprocess.run("}", shell=True)
    # Ollama Chat Clean - Interactive chat without thinking
    subprocess.run("ollama-chat() {", shell=True)
    subprocess.run("python3 /home/ormastes/dev/aidev/ollama_clean.py --chat "$@"", shell=True)
    subprocess.run("}", shell=True)
    # Quick DeepSeek query
    subprocess.run("deepseek() {", shell=True)
    subprocess.run("python3 /home/ormastes/dev/aidev/ollama_clean.py "$1" --model deepseek-r1:32b", shell=True)
    subprocess.run("}", shell=True)
    # DeepSeek with thinking shown
    subprocess.run("deepseek-think() {", shell=True)
    subprocess.run("python3 /home/ormastes/dev/aidev/ollama_clean.py "$1" --model deepseek-r1:32b --show-thinking", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("✅ Setup complete!")
    print("")
    print("Available commands (restart shell or run 'source ~/.bashrc'):")
    print("  ollama-clean 'prompt'           # Query without thinking tags")
    print("  ollama-chat                     # Interactive chat mode")
    print("  deepseek 'prompt'               # Quick DeepSeek query")
    print("  deepseek-think 'prompt'         # DeepSeek with thinking shown")
    print("")
    print("Direct usage:")
    print("  ./ollama_clean.py 'prompt'                    # Basic query")
    print("  ./ollama_clean.py --chat                      # Chat mode")
    print("  ./ollama_clean.py -t 'prompt'                 # Show thinking")
    print("  echo 'prompt' | ./ollama_clean.py             # Pipe input")

if __name__ == "__main__":
    main()