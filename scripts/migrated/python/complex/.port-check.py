#!/usr/bin/env python3
"""
Migrated from: .port-check.sh
Auto-generated Python - 2025-08-16T04:57:27.790Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Port Check Script - Prevents port conflicts
    # Run this before starting any service
    subprocess.run("PORTAL_PORT=3456", shell=True)
    subprocess.run("GUI_PORT=3457", shell=True)
    subprocess.run("PORTAL_RANGE_START=3456", shell=True)
    subprocess.run("PORTAL_RANGE_END=3499", shell=True)
    print("🔍 AI Dev Portal - Port Conflict Checker")
    print("=========================================")
    # Function to check if port is in use
    subprocess.run("check_port() {", shell=True)
    subprocess.run("local port=$1", shell=True)
    subprocess.run("local service=$2", shell=True)
    subprocess.run("if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then", shell=True)
    print("✅ Port $port: IN USE - $service running")
    subprocess.run("return 0", shell=True)
    else:
    print("⚠️  Port $port: AVAILABLE - $service not running")
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Check main services
    subprocess.run("check_port $PORTAL_PORT "AI Dev Portal"", shell=True)
    subprocess.run("check_port $GUI_PORT "GUI Selection Service"", shell=True)
    # Check for unauthorized port usage
    print("")
    print("🔍 Checking for unauthorized services in portal range ($PORTAL_RANGE_START-$PORTAL_RANGE_END):")
    for port in [$(seq $PORTAL_RANGE_START $PORTAL_RANGE_END); do]:
    subprocess.run("if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then", shell=True)
    subprocess.run("process=$(lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | tail -n 1 | awk '{print $1}')", shell=True)
    subprocess.run("case $port in", shell=True)
    subprocess.run("3456)", shell=True)
    subprocess.run("[ "$process" != "node" ] && echo "⚠️ WARNING: Non-node process on portal port 3456: $process"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("3457)", shell=True)
    # GUI service port
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("⚠️ WARNING: Unexpected service on port $port: $process")
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    print("")
    print("📋 Port Allocation Rules:")
    print("  - 3456: AI Dev Portal (PRIMARY)")
    print("  - 3457: GUI Selection Service")
    print("  - 3458-3499: Reserved for portal services")
    print("")
    print("✅ Check complete. Ensure all services use assigned ports.")

if __name__ == "__main__":
    main()