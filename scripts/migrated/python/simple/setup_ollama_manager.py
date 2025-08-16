#!/usr/bin/env python3
"""
Migrated from: setup_ollama_manager.sh
Auto-generated Python - 2025-08-16T04:57:27.584Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup script for Ollama Manager
    print("🚀 Setting up Ollama Manager...")
    # Make the Python script executable
    subprocess.run("chmod +x ollama_manager.py", shell=True)
    # Test the script
    print("📋 Testing basic functionality...")
    subprocess.run("python3 ollama_manager.py --list", shell=True)
    subprocess.run("python3 ollama_manager.py --gpu-status", shell=True)
    # Option 1: Run as systemd service (requires sudo)
    print("")
    print("To install as systemd service (auto-start on boot):")
    print("  sudo cp ollama-manager.service /etc/systemd/system/")
    print("  sudo systemctl daemon-reload")
    print("  sudo systemctl enable ollama-manager@$USER")
    print("  sudo systemctl start ollama-manager@$USER")
    print("")
    # Option 2: Run in background
    print("To run in background now:")
    print("  nohup python3 ollama_manager.py --monitor --timeout 60 > ollama_manager.log 2>&1 &")
    print("")
    # Option 3: Run in screen/tmux
    print("To run in screen session:")
    print("  screen -dmS ollama-manager python3 ollama_manager.py --monitor --timeout 60")
    print("")
    print("✅ Setup complete!")
    print("")
    print("Available commands:")
    print("  ./ollama_manager.py --list                    # List loaded models")
    print("  ./ollama_manager.py --gpu-status              # Show GPU memory")
    print("  ./ollama_manager.py --unload MODEL_NAME       # Manually unload model")
    print("  ./ollama_manager.py --monitor --timeout 60    # Start monitoring")
    print("  ./ollama_manager.py --query 'Your prompt'     # Query with parsed response")

if __name__ == "__main__":
    main()