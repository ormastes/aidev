#!/usr/bin/env python3
"""
Migrated from: batch-fix-tests.sh
Auto-generated Python - 2025-08-16T04:57:27.614Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔧 Batch fixing all test files to use TestPortManager")
    print("=====================================================")
    print("")
    # List of test files that need fixing
    subprocess.run("TEST_FILES=(", shell=True)
    subprocess.run(""test/system/accessibility-system.spec.ts"", shell=True)
    subprocess.run(""test/system/cross-browser-compatibility.spec.ts"", shell=True)
    subprocess.run(""test/system/data-import-export-system.spec.ts"", shell=True)
    subprocess.run(""test/system/embedded-apps-simple.spec.ts"", shell=True)
    subprocess.run(""test/system/file-management.spec.ts"", shell=True)
    subprocess.run(""test/system/mcp-integration-system.spec.ts"", shell=True)
    subprocess.run(""test/system/notifications.spec.ts"", shell=True)
    subprocess.run(""test/system/performance-load-testing.spec.ts"", shell=True)
    subprocess.run(""test/system/portal-system-fixed.spec.ts"", shell=True)
    subprocess.run(""test/system/realtime-updates-system.spec.ts"", shell=True)
    subprocess.run(""test/system/release-deployment-system.spec.ts"", shell=True)
    subprocess.run(""test/system/security-advanced.spec.ts"", shell=True)
    subprocess.run(""test/system/web-comprehensive-system.spec.ts"", shell=True)
    subprocess.run(""test/deployment-tests.spec.ts"", shell=True)
    subprocess.run(""test/security-issues.spec.ts"", shell=True)
    subprocess.run(")", shell=True)
    for file in ["${TEST_FILES[@]}"; do]:
    if -f "$file" :; then
    print("Fixing: $file")
    # Check if file already has TestPortManager import
    subprocess.run("if ! grep -q "TestPortManager" "$file"; then", shell=True)
    # Add import at the beginning after playwright import
    subprocess.run("sed -i "/^import.*playwright/a import { TestPortManager } from '../../../../../portal_security/children/TestPortManager';" "$file"", shell=True)
    # Replace hardcoded URLs with dynamic ones
    subprocess.run("sed -i "s/const PORTAL_URL = 'http:\/\/localhost:3456';/let PORTAL_URL: string;/g" "$file"", shell=True)
    subprocess.run("sed -i "s/const BASE_URL = 'http:\/\/localhost:3456';/let BASE_URL: string;/g" "$file"", shell=True)
    print("  ✅ Updated URL declarations")
    else:
    print("  ❌ File not found: $file")
    print("")
    print("Note: Files need manual updates for beforeAll/afterAll hooks to allocate/release ports")

if __name__ == "__main__":
    main()