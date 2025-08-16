#!/usr/bin/env python3
"""
Migrated from: start-release.sh
Auto-generated Python - 2025-08-16T04:57:27.623Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Start Story Reporter Server in Release Mode with AI Dev Portal Integration
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("STORY_REPORTER_DIR="$PROJECT_ROOT/layer/themes/story-reporter/release/server"", shell=True)
    print("=== Starting Story Reporter Server (Release Mode) ===")
    print("Port: 3401")
    print("Theme: AI Dev Portal")
    # Navigate to story reporter directory
    os.chdir(""$STORY_REPORTER_DIR"")
    # Install dependencies if needed
    if ! -d "node_modules" :; then
    print("Installing dependencies...")
    subprocess.run("npm install", shell=True)
    # Set environment to release
    os.environ["NODE_ENV"] = "release"
    os.environ["PORT"] = "3401"
    # Start the server
    print("Starting Story Reporter server on port 3401...")
    subprocess.run("node src/simple-server.js", shell=True)

if __name__ == "__main__":
    main()