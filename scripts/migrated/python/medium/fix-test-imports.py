#!/usr/bin/env python3
"""
Migrated from: fix-test-imports.sh
Auto-generated Python - 2025-08-16T04:57:27.601Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔧 Updating all test files to use TestPortManager from infra_test-as-manual")
    print("==========================================================================")
    print("")
    # Files to update
    subprocess.run("FILES=(", shell=True)
    subprocess.run(""validate-test-security.ts"", shell=True)
    subprocess.run(""playwright.config.secure.ts"", shell=True)
    subprocess.run(""secure-test-runner.ts"", shell=True)
    subprocess.run(""playwright.config.ts"", shell=True)
    subprocess.run(""test/security-issues.spec.ts"", shell=True)
    subprocess.run(""test/deployment-tests.spec.ts"", shell=True)
    subprocess.run(""test/system/file-management.spec.ts"", shell=True)
    subprocess.run(""test/system/accessibility-system.spec.ts"", shell=True)
    subprocess.run(""test/system/portal-system-fixed.spec.ts"", shell=True)
    subprocess.run(""test/system/portal-system.spec.ts"", shell=True)
    subprocess.run(""test/system/mcp-integration-system.spec.ts"", shell=True)
    subprocess.run(""test/system/web-comprehensive-system.spec.ts"", shell=True)
    subprocess.run(""test/system/embedded-apps-simple.spec.ts"", shell=True)
    subprocess.run(""test/system/embedded-apps-system.spec.ts"", shell=True)
    subprocess.run(""test/system/cross-browser-compatibility.spec.ts"", shell=True)
    subprocess.run(""test/system/performance-load-testing.spec.ts"", shell=True)
    subprocess.run(""test/system/data-import-export-system.spec.ts"", shell=True)
    subprocess.run(""test/system/release-deployment-system.spec.ts"", shell=True)
    subprocess.run(""test/system/realtime-updates-system.spec.ts"", shell=True)
    subprocess.run(""test/system/security-advanced.spec.ts"", shell=True)
    subprocess.run(""test/system/web-app-system.spec.ts"", shell=True)
    subprocess.run(""test/system/notifications.spec.ts"", shell=True)
    subprocess.run(""test/helpers/test-config.ts"", shell=True)
    subprocess.run(""features/step_definitions/portal_steps.ts"", shell=True)
    subprocess.run(")", shell=True)
    # JavaScript files
    subprocess.run("JS_FILES=(", shell=True)
    subprocess.run(""test-backend-api.js"", shell=True)
    subprocess.run(""test-portal-simple.js"", shell=True)
    subprocess.run(""test_web_link.js"", shell=True)
    subprocess.run(")", shell=True)
    print("Updating TypeScript files...")
    for file in ["${FILES[@]}"; do]:
    if -f "$file" :; then
    print("  Updating: $file")
    # Replace portal_security imports with infra_test-as-manual
    if [ "$file" == test/system/* ]:; then
    # For files in test/system/ directory (5 levels up)
    subprocess.run("sed -i "s|from '../../../../../portal_security/children/TestPortManager'|from '../../../../../infra_test-as-manual/pipe'|g" "$file"", shell=True)
    elif [ "$file" == test/* ]:; then
    # For files in test/ directory (4 levels up)
    subprocess.run("sed -i "s|from '../../../../portal_security/children/TestPortManager'|from '../../../../infra_test-as-manual/pipe'|g" "$file"", shell=True)
    elif [ "$file" == features/step_definitions/* ]:; then
    # For feature files (6 levels up)
    subprocess.run("sed -i "s|from '../../../../../../portal_security/children/TestPortManager'|from '../../../../../../infra_test-as-manual/pipe'|g" "$file"", shell=True)
    else:
    # For root level files (3 levels up)
    subprocess.run("sed -i "s|from '../../../portal_security/children/TestPortManager'|from '../../../infra_test-as-manual/pipe'|g" "$file"", shell=True)
    # Also update if it's importing from portal_security/pipe
    subprocess.run("sed -i "s|from '[^']*portal_security/pipe'|from '../../../infra_test-as-manual/pipe'|g" "$file"", shell=True)
    print("")
    print("Updating JavaScript files...")
    for file in ["${JS_FILES[@]}"; do]:
    if -f "$file" :; then
    print("  Updating: $file")
    # Replace require statements
    subprocess.run("sed -i "s|require('../../../../portal_security/children/TestPortManager')|require('../../../../infra_test-as-manual/pipe')|g" "$file"", shell=True)
    subprocess.run("sed -i "s|require('[^']*portal_security/children/TestPortManager')|require('../../../../infra_test-as-manual/pipe')|g" "$file"", shell=True)
    print("")
    print("✅ All files updated to use TestPortManager from infra_test-as-manual/pipe")
    print("")
    print("Note: The infra_test-as-manual theme acts as the intermediary between tests and the security theme.")
    print("This ensures all test port allocation goes through the proper test infrastructure.")

if __name__ == "__main__":
    main()