#!/usr/bin/env python3
"""
Migrated from: fix-localhost-urls.sh
Auto-generated Python - 2025-08-16T04:57:27.619Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Fix localhost URLs in test files to use baseUrl from TestPortManager
    print("🔧 Fixing localhost URLs in test files...")
    # Fix TypeScript test files
    for file in [test/system/*.spec.ts test/*.spec.ts; do]:
    if -f "$file" :; then
    print("Processing: $file")
    # Replace localhost URL construction with baseUrl from allocation
    subprocess.run("sed -i "s/PORTAL_URL = \`http:\/\/localhost:\${testPort}\`;/PORTAL_URL = testAllocation.baseUrl;/g" "$file"", shell=True)
    subprocess.run("sed -i "s/BASE_URL = \`http:\/\/localhost:\${testPort}\`;/BASE_URL = testAllocation.baseUrl;/g" "$file"", shell=True)
    # Update the allocateTestPort pattern to registerTestSuite
    subprocess.run("sed -i "s/const testPort = await testManager\.allocateTestPort('\([^']*\)');/const testAllocation = await testManager.registerTestSuite({ suiteName: '\1', testType: 'e2e', framework: 'playwright' });/g" "$file"", shell=True)
    # Update releasePort to releaseTestPort
    subprocess.run("sed -i "s/await testManager\.releasePort(testPort);/await testManager.releaseTestPort(testAllocation.appId);/g" "$file"", shell=True)
    # Fix testPort references to use testAllocation.port
    subprocess.run("sed -i "s/port: testPort,/port: testAllocation.port,/g" "$file"", shell=True)
    subprocess.run("sed -i "s/testPort}/testAllocation.port}/g" "$file"", shell=True)
    # Fix run-system-tests.ts
    if -f "run-system-tests.ts" :; then
    print("Processing: run-system-tests.ts")
    subprocess.run("sed -i "s/process\.env\.PORTAL_URL = \`http:\/\/localhost:\${testAllocation\.port}\`;/process.env.PORTAL_URL = testAllocation.baseUrl;/g" "run-system-tests.ts"", shell=True)
    subprocess.run("sed -i "s/http\.get(\`http:\/\/localhost:\${port}\`, /http.get(testAllocation.baseUrl, /g" "run-system-tests.ts"", shell=True)
    # Fix fix-all-violations.ts
    if -f "fix-all-violations.ts" :; then
    print("Processing: fix-all-violations.ts")
    subprocess.run("sed -i "s/PORTAL_URL = \`http:\/\/localhost:\${testPort}\`;/PORTAL_URL = testAllocation.baseUrl;/g" "fix-all-violations.ts"", shell=True)
    subprocess.run("sed -i "s/BASE_URL = \`http:\/\/localhost:\${testPort}\`;/BASE_URL = testAllocation.baseUrl;/g" "fix-all-violations.ts"", shell=True)
    print("✅ Localhost URLs fixed to use TestPortManager baseUrl!")

if __name__ == "__main__":
    main()