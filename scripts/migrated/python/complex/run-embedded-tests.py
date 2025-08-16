#!/usr/bin/env python3
"""
Migrated from: run-embedded-tests.sh
Auto-generated Python - 2025-08-16T04:57:27.725Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🚀 AI Dev Portal - Embedded Apps System Test Runner")
    print("==================================================")
    print("")
    # Configuration - Port must come from environment
    if -z "$PORT" :; then
    print("❌ ERROR: PORT environment variable is required")
    print("Port must be allocated by portal_security theme")
    sys.exit(1)
    os.environ["TEST_URL"] = ""${TEST_URL:-http://localhost:$PORT}""
    os.environ["HEADLESS"] = ""${HEADLESS:-true}""
    os.environ["FAIL_FAST"] = ""${FAIL_FAST:-false}""
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("--exclude)", shell=True)
    os.environ["EXCLUDE_APPS"] = ""$2""
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--headed)", shell=True)
    os.environ["HEADLESS"] = ""false""
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--fail-fast)", shell=True)
    os.environ["FAIL_FAST"] = ""true""
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--help)", shell=True)
    print("Usage: $0 [options]")
    print("")
    print("Options:")
    print("  --exclude <apps>    Comma-separated list of apps to exclude")
    print("                      Example: --exclude 'Terminal Embed,Mobile Preview'")
    print("  --headed            Run tests with browser visible")
    print("  --fail-fast         Stop on first test failure")
    print("  --help              Show this help message")
    print("")
    print("Environment Variables:")
    print("  TEST_URL            Portal URL (default: http://localhost:3457)")
    print("  EXCLUDE_APPS        Apps to exclude from testing")
    print("  HEADLESS            Run headless (default: true)")
    print("  FAIL_FAST           Stop on first failure (default: false)")
    print("")
    print("Examples:")
    print("  # Test all embedded apps")
    print("  $0")
    print("")
    print("  # Exclude terminal and run with visible browser")
    print("  $0 --exclude 'Terminal Embed' --headed")
    print("")
    print("  # Fail fast on first error")
    print("  $0 --fail-fast")
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("Unknown option: $1")
    print("Use --help for usage information")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Check if server is running
    print("✅ Checking if AI Dev Portal is running on ${TEST_URL}...")
    subprocess.run("curl -s "${TEST_URL}/api/health" > /dev/null 2>&1", shell=True)
    if $? -ne 0 :; then
    print("❌ Server is not running on ${TEST_URL}")
    print("Please start the server first with: ./deploy.sh release")
    sys.exit(1)
    print("✅ Server is running")
    print("")
    # Display test configuration
    print("📋 Test Configuration:")
    print("  - Base URL: ${TEST_URL}")
    print("  - Headless: ${HEADLESS}")
    print("  - Fail Fast: ${FAIL_FAST}")
    if -n "${EXCLUDE_APPS}" :; then
    print("  - Excluded Apps: ${EXCLUDE_APPS}")
    else:
    print("  - Testing: All embedded apps")
    print("")
    # Create directories
    Path("tests/screenshots/embedded-apps").mkdir(parents=True, exist_ok=True)
    # List of embedded apps that will be tested
    print("🔍 Embedded Apps to Test:")
    print("  1. Mobile Preview (iframe-based)")
    print("  2. Mate Dealer App (direct embed)")
    print("  3. Terminal Embed (WebSocket)")
    print("  4. Theme Preview (nested iframes)")
    print("")
    # Run the comprehensive test suite
    print("🧪 Starting Embedded Apps System Tests...")
    print("==========================================")
    print("")
    # Run Playwright tests
    subprocess.run("bunx playwright test tests/system/portal-with-embedded-apps.test.ts \", shell=True)
    subprocess.run("--reporter=list \", shell=True)
    subprocess.run("--workers=1 \", shell=True)
    subprocess.run("--timeout=60000 \", shell=True)
    subprocess.run("--retries=1", shell=True)
    subprocess.run("TEST_RESULT=$?", shell=True)
    print("")
    print("==========================================")
    if $TEST_RESULT -eq 0 :; then
    print("✅ All embedded app tests passed successfully!")
    print("")
    print("📊 Test Results:")
    print("  - Portal integration: ✅")
    print("  - Iframe interactions: ✅")
    print("  - Click handling: ✅")
    print("  - Cross-origin communication: ✅")
    print("  - WebSocket connections: ✅")
    print("")
    print("📸 Screenshots saved in: tests/screenshots/embedded-apps/")
    print("📄 Test report: tests/screenshots/embedded-apps/test-report.md")
    else:
    print("❌ Some embedded app tests failed")
    print("")
    print("📸 Debug screenshots saved in: tests/screenshots/embedded-apps/")
    print("")
    print("Common issues and fixes:")
    print("  - Iframe clicking: Check CSP headers and iframe sandbox attributes")
    print("  - WebSocket errors: Verify terminal server is running")
    print("  - Cross-origin: Check CORS configuration")
    print("")
    print("💡 Tips:")
    print("  - Run with visible browser: $0 --headed")
    print("  - Exclude specific apps: $0 --exclude 'Terminal Embed'")
    print("  - Stop on first failure: $0 --fail-fast")
    print("")
    # Generate summary report
    if $TEST_RESULT -eq 0 :; then
    subprocess.run("cat > tests/screenshots/embedded-apps/summary.txt << EOF", shell=True)
    subprocess.run("AI Dev Portal - Embedded Apps Test Summary", shell=True)
    subprocess.run("==========================================", shell=True)
    subprocess.run("Date: $(date)", shell=True)
    subprocess.run("Status: PASSED ✅", shell=True)
    subprocess.run("Tested Apps:", shell=True)
    subprocess.run("- Mobile Preview: PASSED", shell=True)
    subprocess.run("- Mate Dealer: PASSED", shell=True)
    subprocess.run("- Terminal Embed: PASSED", shell=True)
    subprocess.run("- Theme Preview: PASSED", shell=True)
    subprocess.run("Features Verified:", shell=True)
    subprocess.run("- Iframe click handling", shell=True)
    subprocess.run("- Cross-origin messaging", shell=True)
    subprocess.run("- WebSocket connections", shell=True)
    subprocess.run("- Dynamic content loading", shell=True)
    subprocess.run("- Nested iframe interactions", shell=True)
    subprocess.run("Test Duration: Check playwright output above", shell=True)
    subprocess.run("EOF", shell=True)
    else:
    subprocess.run("cat > tests/screenshots/embedded-apps/summary.txt << EOF", shell=True)
    subprocess.run("AI Dev Portal - Embedded Apps Test Summary", shell=True)
    subprocess.run("==========================================", shell=True)
    subprocess.run("Date: $(date)", shell=True)
    subprocess.run("Status: FAILED ❌", shell=True)
    subprocess.run("Check the test output and screenshots for details.", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("exit $TEST_RESULT", shell=True)

if __name__ == "__main__":
    main()