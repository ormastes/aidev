#!/usr/bin/env python3
"""
Migrated from: fix-test-credentials.sh
Auto-generated Python - 2025-08-16T04:57:27.608Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔐 Fixing hardcoded credentials in test files...")
    print("=============================================")
    # Count initial violations
    subprocess.run("INITIAL_COUNT=$(grep -r "'admin'\\|'demo123'\\|'tester'\\|'test123'" test --include="*.spec.ts" --include="*.js" | wc -l)", shell=True)
    print("Found $INITIAL_COUNT hardcoded credential references")
    # Fix TypeScript test files
    for file in [test/**/*.spec.ts test/*.spec.ts; do]:
    if -f "$file" :; then
    print("Processing: $file")
    # Check if file already imports credentials
    subprocess.run("if ! grep -q "getTestCredentials" "$file"; then", shell=True)
    # Add import if TestPortManager is already imported
    subprocess.run("if grep -q "import.*TestPortManager.*from.*infra_test-as-manual" "$file"; then", shell=True)
    subprocess.run("sed -i "s/import { TestPortManager/import { TestPortManager, getTestCredentials/g" "$file"", shell=True)
    # Replace hardcoded admin credentials
    subprocess.run("sed -i "s/await page\.fill('#username', 'admin');/const adminCreds = getTestCredentials('admin');\n    await page.fill('#username', adminCreds.username);/g" "$file"", shell=True)
    subprocess.run("sed -i "s/await page\.fill('#password', 'demo123');/await page.fill('#password', adminCreds.password);/g" "$file"", shell=True)
    # Replace inline admin credentials
    subprocess.run("sed -i "s/'admin'/'adminCreds.username'/g" "$file" 2>/dev/null || true", shell=True)
    subprocess.run("sed -i "s/'demo123'/'adminCreds.password'/g" "$file" 2>/dev/null || true", shell=True)
    # Replace hardcoded tester credentials
    subprocess.run("sed -i "s/await page\.fill('#username', 'tester');/const userCreds = getTestCredentials('user');\n    await page.fill('#username', userCreds.username);/g" "$file"", shell=True)
    subprocess.run("sed -i "s/await page\.fill('#password', 'test123');/await page.fill('#password', userCreds.password);/g" "$file"", shell=True)
    # Fix JavaScript test files
    for file in [test-*.js; do]:
    if -f "$file" :; then
    print("Processing: $file")
    # Add credential import if not present
    subprocess.run("if ! grep -q "getTestCredentials" "$file"; then", shell=True)
    subprocess.run("if grep -q "TestPortManager" "$file"; then", shell=True)
    subprocess.run("sed -i "s/const { TestPortManager }/const { TestPortManager, getTestCredentials }/g" "$file"", shell=True)
    # Replace hardcoded credentials in JS files
    subprocess.run("sed -i "s/username: 'admin'/username: getTestCredentials('admin').username/g" "$file"", shell=True)
    subprocess.run("sed -i "s/password: 'demo123'/password: getTestCredentials('admin').password/g" "$file"", shell=True)
    subprocess.run("sed -i "s/username: 'tester'/username: getTestCredentials('user').username/g" "$file"", shell=True)
    subprocess.run("sed -i "s/password: 'test123'/password: getTestCredentials('user').password/g" "$file"", shell=True)
    # Count remaining violations
    subprocess.run("FINAL_COUNT=$(grep -r "'admin'\\|'demo123'\\|'tester'\\|'test123'" test --include="*.spec.ts" --include="*.js" 2>/dev/null | wc -l)", shell=True)
    print("")
    print("=============================================")
    print("✅ Credential fixing complete!")
    print("   Initial violations: $INITIAL_COUNT")
    print("   Remaining violations: $FINAL_COUNT")
    print("   Fixed: $((INITIAL_COUNT - FINAL_COUNT)) references")
    if "$FINAL_COUNT" -gt 0 :; then
    print("")
    print("⚠️  Some hardcoded credentials remain. Manual review needed for:")
    subprocess.run("grep -r "'admin'\\|'demo123'\\|'tester'\\|'test123'" test --include="*.spec.ts" --include="*.js" 2>/dev/null | cut -d: -f1 | sort -u", shell=True)

if __name__ == "__main__":
    main()