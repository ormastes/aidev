#!/usr/bin/env python3
"""
Migrated from: start-coordinator.sh
Auto-generated Python - 2025-08-16T04:57:27.781Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Quick start script for the coordinator-claude-agent
    # Automatically detects authentication and starts the coordinator
    subprocess.run("set -e", shell=True)
    print("🚀 Coordinator Claude Agent - Quick Start")
    print("========================================")
    # Check if built
    if ! -f "./dist/index.js" :; then
    print("📦 Building coordinator...")
    subprocess.run("npm run build", shell=True)
    # Make executable if needed
    if ! -x "./dist/index.js" :; then
    subprocess.run("chmod +x ./dist/index.js", shell=True)
    # Check authentication status
    print("")
    print("🔍 Checking authentication...")
    subprocess.run("node test-auth.js", shell=True)
    # Ask user how they want to start
    print("")
    print("🎯 How would you like to start the coordinator?")
    print("1. Auto-detect authentication (recommended)")
    print("2. Use API key")
    print("3. Use local auth only")
    print("4. Exit")
    print("")
    subprocess.run("read -p "Choose option (1-4): " choice", shell=True)
    subprocess.run("case $choice in", shell=True)
    subprocess.run("1)", shell=True)
    print("")
    print("🚀 Starting with auto-detected authentication...")
    subprocess.run("./dist/index.js start", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("2)", shell=True)
    subprocess.run("read -p "Enter your Claude API key: " api_key", shell=True)
    if -z "$api_key" :; then
    print("❌ No API key provided")
    sys.exit(1)
    print("")
    print("🚀 Starting with API key authentication...")
    subprocess.run("./dist/index.js start --api-key "$api_key"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("3)", shell=True)
    print("")
    print("🚀 Starting with local authentication only...")
    subprocess.run("if ./dist/index.js start --no-local-auth 2>/dev/null; then", shell=True)
    print("✅ Started successfully")
    else:
    print("❌ Local authentication failed. Try option 2 with an API key.")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("4)", shell=True)
    print("👋 Goodbye!")
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("❌ Invalid option. Please choose 1-4.")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()