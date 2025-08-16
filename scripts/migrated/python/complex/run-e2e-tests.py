#!/usr/bin/env python3
"""
Migrated from: run-e2e-tests.sh
Auto-generated Python - 2025-08-16T04:57:27.792Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🧪 Running Improved E2E System Tests for AI Dev Portal")
    print("==========================================")
    # Port must come from environment
    if -z "$PORT" :; then
    print("❌ ERROR: PORT environment variable is required")
    print("Port must be allocated by portal_security theme")
    sys.exit(1)
    # Set test environment
    os.environ["TEST_URL"] = ""http://localhost:$PORT""
    os.environ["HEADLESS"] = ""true""
    # Check if server is running
    print("✅ Checking if server is running on port $PORT...")
    subprocess.run("curl -s http://localhost:$PORT/api/health > /dev/null 2>&1", shell=True)
    if $? -ne 0 :; then
    print("❌ Server is not running on port $PORT")
    print("Please start the server first with: ./deploy.sh release")
    sys.exit(1)
    print("✅ Server is running")
    # Create test directories
    Path("tests/screenshots/e2e-improved").mkdir(parents=True, exist_ok=True)
    # Run the improved E2E tests
    print("")
    print("🚀 Starting Playwright tests...")
    print("")
    subprocess.run("bunx playwright test tests/system/portal-e2e-improved.test.ts \", shell=True)
    subprocess.run("--reporter=list \", shell=True)
    subprocess.run("--workers=1 \", shell=True)
    subprocess.run("--timeout=60000 \", shell=True)
    subprocess.run("--retries=1", shell=True)
    subprocess.run("TEST_RESULT=$?", shell=True)
    print("")
    print("==========================================")
    if $TEST_RESULT -eq 0 :; then
    print("✅ All E2E tests passed successfully!")
    print("")
    print("📸 Screenshots saved in: tests/screenshots/e2e-improved/")
    print("📄 Test report saved in: tests/screenshots/e2e-improved/test-report.md")
    else:
    print("❌ Some tests failed. Check the output above for details.")
    print("")
    print("📸 Debug screenshots saved in: tests/screenshots/e2e-improved/")
    print("")
    print("To run tests in headed mode (with browser visible), use:")
    print("HEADLESS=false $0")
    subprocess.run("exit $TEST_RESULT", shell=True)

if __name__ == "__main__":
    main()