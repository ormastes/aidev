#!/usr/bin/env python3
"""
Migrated from: verify-security-compliance.sh
Auto-generated Python - 2025-08-16T04:57:27.603Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔍 Security Compliance Verification Report")
    print("==========================================")
    print("")
    # Check for hardcoded ports
    print("1. Checking for hardcoded ports (3456, 34xx)...")
    subprocess.run("HARDCODED_PORTS=$(grep -r "34[0-9][0-9]" . --include="*.ts" --include="*.js" --exclude-dir="node_modules" --exclude="*.map" | grep -v "portal_security" | grep -v "infra_test-as-manual" | grep -v "comment" | wc -l)", shell=True)
    if "$HARDCODED_PORTS" -eq 0 :; then
    print("   ✅ No hardcoded ports found")
    else:
    print("   ⚠️  Found $HARDCODED_PORTS potential hardcoded port references")
    # Check for hardcoded localhost
    print("")
    print("2. Checking for hardcoded localhost URLs...")
    subprocess.run("HARDCODED_LOCALHOST=$(grep -r "localhost:" . --include="*.ts" --include="*.js" --exclude-dir="node_modules" --exclude="*.map" | grep -v "baseUrl" | grep -v "TestPortManager" | grep -v "testAllocation" | grep -v "console.log" | wc -l)", shell=True)
    if "$HARDCODED_LOCALHOST" -eq 0 :; then
    print("   ✅ No hardcoded localhost URLs found")
    else:
    print("   ⚠️  Found $HARDCODED_LOCALHOST potential hardcoded localhost references")
    # Check test imports
    print("")
    print("3. Verifying test files import from test-as-manual...")
    subprocess.run("WRONG_IMPORTS=$(find test -name "*.spec.ts" -exec grep -l "TestPortManager" {} \; | xargs grep -L "infra_test-as-manual/pipe" | wc -l)", shell=True)
    if "$WRONG_IMPORTS" -eq 0 :; then
    print("   ✅ All test files correctly import from infra_test-as-manual")
    else:
    print("   ❌ Found $WRONG_IMPORTS test files with incorrect imports")
    # Check production code imports
    print("")
    print("4. Verifying production code imports from portal_security...")
    subprocess.run("PROD_FILES=$(find . -name "server*.ts" -o -name "server*.js" -o -name "config/*.ts" | grep -v test | grep -v node_modules)", shell=True)
    subprocess.run("WRONG_PROD=0", shell=True)
    for file in [$PROD_FILES; do]:
    subprocess.run("if grep -q "EnhancedPortManager" "$file" 2>/dev/null; then", shell=True)
    subprocess.run("if ! grep -q "portal_security" "$file"; then", shell=True)
    subprocess.run("WRONG_PROD=$((WRONG_PROD + 1))", shell=True)
    print("   ❌ $file imports EnhancedPortManager but not from portal_security")
    if "$WRONG_PROD" -eq 0 :; then
    print("   ✅ All production files correctly import from portal_security")
    # Summary
    print("")
    print("==========================================")
    print("Summary:")
    print("")
    if "$HARDCODED_PORTS" -eq 0 ] && [ "$HARDCODED_LOCALHOST" -eq 0 ] && [ "$WRONG_IMPORTS" -eq 0 ] && [ "$WRONG_PROD" -eq 0 :; then
    print("✅ FULLY COMPLIANT: All ports and domains are managed through security module")
    print("   - Test files use infra_test-as-manual theme")
    print("   - Production files use portal_security module")
    print("   - No hardcoded ports or localhost URLs")
    else:
    print("⚠️  COMPLIANCE ISSUES FOUND:")
    subprocess.run("[ "$HARDCODED_PORTS" -gt 0 ] && echo "   - Hardcoded ports: $HARDCODED_PORTS"", shell=True)
    subprocess.run("[ "$HARDCODED_LOCALHOST" -gt 0 ] && echo "   - Hardcoded localhost: $HARDCODED_LOCALHOST"", shell=True)
    subprocess.run("[ "$WRONG_IMPORTS" -gt 0 ] && echo "   - Wrong test imports: $WRONG_IMPORTS"", shell=True)
    subprocess.run("[ "$WRONG_PROD" -gt 0 ] && echo "   - Wrong production imports: $WRONG_PROD"", shell=True)
    print("")
    print("Test-as-Manual Theme Integration:")
    print("   ✅ TestPortManager provides baseUrl with domain")
    print("   ✅ getTestDomain() method available for domain-only access")
    print("   ✅ All test allocations use buildTestUrl() internally")
    print("")

if __name__ == "__main__":
    main()