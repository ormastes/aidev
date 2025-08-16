#!/usr/bin/env python3
"""
Migrated from: build-web.sh
Auto-generated Python - 2025-08-16T04:57:27.796Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🚀 Building Mate Dealer for Web...")
    # Install dependencies if needed
    if ! -d "node_modules" :; then
    print("📦 Installing dependencies...")
    subprocess.run("npm install", shell=True)
    # Build for web
    print("🔨 Building web version...")
    subprocess.run("bunx expo build:web", shell=True)
    # Copy to GUI selector public directory
    print("📋 Copying to GUI selector...")
    subprocess.run("DEST_DIR="../../portal_gui-selector/user-stories/023-gui-selector-server/public/mate-dealer"", shell=True)
    shutil.rmtree("$DEST_DIR", ignore_errors=True)
    Path("$DEST_DIR").mkdir(parents=True, exist_ok=True)
    shutil.copy2("-r web-build/*", "$DEST_DIR/")
    print("✅ Build complete! Access at: http://localhost:3256/mate-dealer/")

if __name__ == "__main__":
    main()