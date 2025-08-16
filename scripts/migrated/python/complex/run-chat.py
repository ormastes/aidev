#!/usr/bin/env python3
"""
Migrated from: run-chat.sh
Auto-generated Python - 2025-08-16T04:57:27.789Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Chat Interface Launcher
    print("🤖 AI Chat Launcher")
    print("===================")
    print("")
    # Check if Ollama is running
    subprocess.run("OLLAMA_STATUS="❌ Not running"", shell=True)
    subprocess.run("DEEPSEEK_STATUS="❌ Not installed"", shell=True)
    subprocess.run("if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then", shell=True)
    subprocess.run("OLLAMA_STATUS="✅ Running"", shell=True)
    # Check for DeepSeek model
    subprocess.run("if curl -s http://localhost:11434/api/tags | grep -q "deepseek"; then", shell=True)
    subprocess.run("DEEPSEEK_STATUS="✅ Available"", shell=True)
    print("Status:")
    print("  Ollama: $OLLAMA_STATUS")
    print("  DeepSeek R1: $DEEPSEEK_STATUS")
    print("")
    # Check which mode to use
    print("Select chat mode:")
    print("1) Claude Only (Always works)")
    print("2) DeepSeek R1 Only (Requires Ollama)")
    print("3) Hybrid Mode (Both Claude + DeepSeek) ← RECOMMENDED")
    print("4) Quick Test (Test all modes)")
    print("")
    subprocess.run("read -p "Enter choice [1-4]: " choice", shell=True)
    subprocess.run("case $choice in", shell=True)
    subprocess.run("1)", shell=True)
    print("Starting Claude simulation chat...")
    subprocess.run("node chat-with-claude.js", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("2)", shell=True)
    print("Starting DeepSeek R1 chat...")
    subprocess.run("node chat-with-local-llm.js", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("3)", shell=True)
    print("Starting hybrid chat (Claude + DeepSeek)...")
    subprocess.run("node chat-hybrid.js", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("4)", shell=True)
    print("Running quick test...")
    subprocess.run("node chat-hybrid.js --test", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("Starting hybrid mode (recommended)...")
    subprocess.run("node chat-hybrid.js", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()