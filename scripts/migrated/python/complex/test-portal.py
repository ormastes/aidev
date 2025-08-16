#!/usr/bin/env python3
"""
Migrated from: test-portal.sh
Auto-generated Python - 2025-08-16T04:57:27.791Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("Starting AI Dev Portal test...")
    # Start the server
    subprocess.run("node dist/server.js &", shell=True)
    subprocess.run("SERVER_PID=$!", shell=True)
    # Wait for server to start
    time.sleep(2)
    # Check if server is running
    subprocess.run("if ! curl -s http://localhost:3000/api/health > /dev/null; then", shell=True)
    print("❌ Server failed to start")
    subprocess.run("kill $SERVER_PID 2>/dev/null", shell=True)
    sys.exit(1)
    print("✅ Server started successfully on port 3000")
    print("")
    print("Portal features added:")
    print("✅ Left panel navigation with sections:")
    print("   - Projects, Features, Feature Progress, Tasks")
    print("   - GUI Selector, Story Reporter, Test Manual")
    print("")
    print("✅ Top selector bars for:")
    print("   - Theme filtering")
    print("   - Epic filtering")
    print("   - App filtering")
    print("")
    print("✅ Feature Progress Monitor showing:")
    print("   - Total features count")
    print("   - In Progress features count")
    print("   - Completed features count")
    print("   - Pending tasks count")
    print("   - Progress bars for each feature")
    print("")
    print("✅ Service integration frames for:")
    print("   - GUI Selector (http://localhost:3456)")
    print("   - Story Reporter (/services/story-reporter)")
    print("   - Test Manual (/services/manual)")
    print("")
    print("✅ VFS API endpoint for reading:")
    print("   - /api/vfs/FEATURE.vf.json")
    print("   - /api/vfs/TASK_QUEUE.vf.json")
    print("   - /api/vfs/NAME_ID.vf.json")
    print("")
    print("🌐 Portal is running at: http://localhost:3000")
    print("   Login with: admin/demo123, developer/demo123, or tester/demo123")
    print("")
    print("Press Ctrl+C to stop the server...")
    # Wait for user to stop
    subprocess.run("wait $SERVER_PID", shell=True)

if __name__ == "__main__":
    main()