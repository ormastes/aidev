#!/usr/bin/env python3
"""
Migrated from: run-tests.sh
Auto-generated Python - 2025-08-16T04:57:27.582Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Test Runner - NO HARDCODED PORTS
    # Uses test-as-manual theme to get ports from portal_security
    print("🧪 Running Tests with Proper Port Management")
    print("============================================")
    print("🔒 Using test-as-manual → portal_security theme chain")
    print("")
    # DO NOT SET PORT HERE - it will be allocated by test theme
    # The test will request port from test-as-manual theme
    # Check if server is already running
    if -n "$TEST_URL" :; then
    print("✅ Using existing server at: $TEST_URL")
    else:
    print("📋 Tests will allocate ports via test-as-manual theme")
    # Create test directories
    Path("tests/screenshots/feature-coverage-no-hardcode").mkdir(parents=True, exist_ok=True)
    # Run the tests that use test-as-manual theme
    print("")
    print("🚀 Starting Playwright tests (ports managed by test theme)...")
    print("")
    subprocess.run("bunx playwright test tests/system/feature-coverage-no-hardcode.test.ts \", shell=True)
    subprocess.run("--reporter=list \", shell=True)
    subprocess.run("--workers=1 \", shell=True)
    subprocess.run("--timeout=60000 \", shell=True)
    subprocess.run("--retries=1", shell=True)
    subprocess.run("TEST_RESULT=$?", shell=True)
    print("")
    print("============================================")
    if $TEST_RESULT -eq 0 :; then
    print("✅ All tests passed!")
    print("✅ No hardcoded ports used")
    print("✅ All ports managed through test-as-manual → portal_security")
    print("")
    print("📸 Screenshots: tests/screenshots/feature-coverage-no-hardcode/")
    print("📄 Coverage report: tests/screenshots/feature-coverage-no-hardcode/click-coverage-report.md")
    else:
    print("❌ Some tests failed")
    print("")
    print("📸 Debug screenshots: tests/screenshots/feature-coverage-no-hardcode/")
    print("")
    print("💡 Port Management:")
    print("  - No hardcoded ports (3456, 3457, etc.)")
    print("  - All ports allocated by test-as-manual theme")
    print("  - Security managed by portal_security theme")
    print("")
    subprocess.run("exit $TEST_RESULT", shell=True)

if __name__ == "__main__":
    main()