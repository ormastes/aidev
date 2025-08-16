#!/usr/bin/env python3
"""
Migrated from: test-fixed-login.sh
Auto-generated Python - 2025-08-16T04:57:27.608Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🌐 AI Dev Portal - Fixed Login Test")
    print("==================================")
    print("")
    print("This will open a working login page that connects to your API.")
    print("")
    print("📍 Make sure the server is running on port 3456")
    print("📍 The fixed login page will open in your browser")
    print("")
    # Get the directory of this script
    subprocess.run("DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    # Check if server is running
    subprocess.run("if lsof -i :3456 > /dev/null 2>&1; then", shell=True)
    print("✅ Server is running on port 3456")
    else:
    print("❌ Server is NOT running on port 3456!")
    print("   Please start the server first:")
    print("   cd /home/ormastes/dev/aidev/layer/themes/portal_aidev/release/ai_dev_portal_release")
    print("   PORT=3456 node server.js")
    sys.exit(1)
    print("")
    print("Opening the fixed login page...")
    print("")
    # Try different ways to open the browser
    subprocess.run("if command -v xdg-open > /dev/null; then", shell=True)
    subprocess.run("xdg-open "file://$DIR/fixed-login.html"", shell=True)
    subprocess.run("elif command -v open > /dev/null; then", shell=True)
    subprocess.run("open "file://$DIR/fixed-login.html"", shell=True)
    subprocess.run("elif command -v start > /dev/null; then", shell=True)
    subprocess.run("start "file://$DIR/fixed-login.html"", shell=True)
    else:
    print("Could not open browser automatically.")
    print("")
    print("📋 Please open this file manually in your browser:")
    print("   file://$DIR/fixed-login.html")
    print("")
    print("🔑 Login credentials:")
    print("   Username: admin")
    print("   Password: demo123")
    print("")
    print("This page will:")
    print("1. Show a working login form")
    print("2. Call the API at http://localhost:3456/api/login")
    print("3. Display the dashboard after successful login")
    print("4. Show any errors if login fails")
    print("")

if __name__ == "__main__":
    main()