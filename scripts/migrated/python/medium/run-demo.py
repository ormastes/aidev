#!/usr/bin/env python3
"""
Migrated from: run-demo.sh
Auto-generated Python - 2025-08-16T04:57:27.616Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Story Reporter + AI Dev Portal Demo Runner
    print("================================================")
    print("Story Reporter + AI Dev Portal Integration Demo")
    print("================================================")
    print("")
    # Set environment variables (optional)
    os.environ["AI_DEV_PORTAL_HOST"] = "${AI_DEV_PORTAL_HOST:-localhost}"
    os.environ["AI_DEV_PORTAL_PORT"] = "${AI_DEV_PORTAL_PORT:-3456}"
    print("Configuration:")
    print("- AI Dev Portal Host: $AI_DEV_PORTAL_HOST")
    print("- AI Dev Portal Port: $AI_DEV_PORTAL_PORT")
    print("")
    # Check if ai_dev_portal is running
    print("Checking AI Dev Portal connection...")
    subprocess.run("nc -z $AI_DEV_PORTAL_HOST $AI_DEV_PORTAL_PORT 2>/dev/null", shell=True)
    if $? -eq 0 :; then
    print("✓ AI Dev Portal is running")
    else:
    print("⚠ AI Dev Portal is not running (demo will simulate responses)")
    print("")
    # Run the story reporter
    print("Starting Story Reporter...")
    print("------------------------")
    subprocess.run("node story-reporter.js", shell=True)
    # Check if report was generated
    subprocess.run("REPORT_FILE=$(ls -t story-report-*.json 2>/dev/null | head -1)", shell=True)
    if -n "$REPORT_FILE" :; then
    print("")
    print("Latest report file: $REPORT_FILE")
    print("")
    print("Report contents:")
    print("----------------")
    subprocess.run("cat "$REPORT_FILE"", shell=True)
    print("")
    print("Demo completed!")

if __name__ == "__main__":
    main()