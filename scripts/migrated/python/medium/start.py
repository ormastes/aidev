#!/usr/bin/env python3
"""
Migrated from: start.sh
Auto-generated Python - 2025-08-16T04:57:27.623Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🌟 Starting AI Dev Portal")
    print("=========================")
    # Check if node_modules exists
    if ! -d "node_modules" :; then
    print("📦 Installing dependencies...")
    subprocess.run("npm install --production", shell=True)
    # Initialize database if needed
    if ! -f "data/ai_dev_portal.db" :; then
    print("🗄️ Initializing database...")
    subprocess.run("node init-db.js", shell=True)
    # Start the server
    print("🚀 Starting server on port 3400...")
    print("📍 Access the portal at: http://localhost:3400")
    print("👤 Demo users: admin, developer, tester (password: demo123)")
    print("")
    print("Press Ctrl+C to stop the server")
    subprocess.run("node server.js", shell=True)

if __name__ == "__main__":
    main()