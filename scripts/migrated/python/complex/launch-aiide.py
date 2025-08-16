#!/usr/bin/env python3
"""
Migrated from: launch-aiide.sh
Auto-generated Python - 2025-08-16T04:57:27.790Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # AIIDE Launch Script
    # Starts both the backend server and frontend development server
    print("🚀 Launching AIIDE - AI Integrated Development Environment")
    print("===========================================================")
    # Check if node_modules exists
    if ! -d "node_modules" :; then
    print("📦 Installing dependencies...")
    subprocess.run("npm install", shell=True)
    # Check environment variables
    if ! -f ".env" :; then
    print("⚠️  No .env file found. Creating from template...")
    shutil.copy2(".env.example", ".env")
    print("✅ Created .env file. Please configure your API keys.")
    # Start backend server in background
    print("🔧 Starting backend server...")
    subprocess.run("npm run server &", shell=True)
    subprocess.run("SERVER_PID=$!", shell=True)
    # Wait for server to be ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(3)
    # Check if server is running
    subprocess.run("if ! curl -s http://localhost:3457/api/providers > /dev/null; then", shell=True)
    print("❌ Backend server failed to start")
    subprocess.run("kill $SERVER_PID 2>/dev/null", shell=True)
    sys.exit(1)
    print("✅ Backend server running on http://localhost:3457")
    # Start frontend dev server
    print("🎨 Starting frontend development server...")
    subprocess.run("npm run dev &", shell=True)
    subprocess.run("FRONTEND_PID=$!", shell=True)
    # Wait for frontend to be ready
    time.sleep(5)
    print("")
    print("✅ AIIDE is running!")
    print("")
    print("📍 Frontend: http://localhost:5173")
    print("📍 Backend:  http://localhost:3457")
    print("📍 API Docs: http://localhost:3457/api-docs")
    print("")
    print("Press Ctrl+C to stop all services")
    # Function to handle cleanup
    subprocess.run("cleanup() {", shell=True)
    print("")
    print("🛑 Stopping AIIDE services...")
    subprocess.run("kill $SERVER_PID 2>/dev/null", shell=True)
    subprocess.run("kill $FRONTEND_PID 2>/dev/null", shell=True)
    print("✅ AIIDE stopped")
    sys.exit(0)
    subprocess.run("}", shell=True)
    # Set up trap to handle Ctrl+C
    subprocess.run("trap cleanup SIGINT SIGTERM", shell=True)
    # Wait for processes
    subprocess.run("wait $SERVER_PID $FRONTEND_PID", shell=True)

if __name__ == "__main__":
    main()