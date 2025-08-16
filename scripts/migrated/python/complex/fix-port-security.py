#!/usr/bin/env python3
"""
Migrated from: fix-port-security.sh
Auto-generated Python - 2025-08-16T04:57:27.748Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔒 Port Security Violation Scanner")
    print("==================================")
    print("")
    print("This script identifies files that bypass the security module for port management.")
    print("")
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Counters
    subprocess.run("TOTAL_FILES=0", shell=True)
    subprocess.run("VIOLATIONS=0", shell=True)
    subprocess.run("COMPLIANT=0", shell=True)
    # Arrays to store results
    subprocess.run("declare -a VIOLATION_FILES", shell=True)
    subprocess.run("declare -a COMPLIANT_FILES", shell=True)
    print("🔍 Scanning for port security violations...")
    print("")
    # Function to check if file uses security module
    subprocess.run("check_security_compliance() {", shell=True)
    subprocess.run("local file=$1", shell=True)
    subprocess.run("local filename=$(basename "$file")", shell=True)
    # Skip node_modules and dist
    if [ "$file" == *"node_modules"* ]] || [[ "$file" == *"dist"* ]:; then
    subprocess.run("return", shell=True)
    subprocess.run("TOTAL_FILES=$((TOTAL_FILES + 1))", shell=True)
    # Check if file contains hardcoded ports
    subprocess.run("if grep -q "3456\|3457\|3410\|3400\|3401\|localhost:[0-9]" "$file" 2>/dev/null; then", shell=True)
    # Check if it imports security module
    subprocess.run("if grep -q "TestPortManager\|EnhancedPortManager\|portal_security" "$file" 2>/dev/null; then", shell=True)
    subprocess.run("COMPLIANT=$((COMPLIANT + 1))", shell=True)
    subprocess.run("COMPLIANT_FILES+=("$file")", shell=True)
    print("-e ")${GREEN}✅ COMPLIANT${NC}: $filename (uses security module)"
    else:
    subprocess.run("VIOLATIONS=$((VIOLATIONS + 1))", shell=True)
    subprocess.run("VIOLATION_FILES+=("$file")", shell=True)
    print("-e ")${RED}❌ VIOLATION${NC}: $filename"
    # Show specific violations
    subprocess.run("grep -n "3456\|3457\|3410\|localhost:[0-9]" "$file" 2>/dev/null | head -2 | while read -r line; do", shell=True)
    print("     Line $line")
    subprocess.run("}", shell=True)
    # Check TypeScript files
    print("📁 Checking TypeScript files...")
    print("-------------------------------")
    for file in [$(find . -name "*.ts" -type f 2>/dev/null); do]:
    subprocess.run("check_security_compliance "$file"", shell=True)
    print("")
    print("📁 Checking JavaScript files...")
    print("--------------------------------")
    for file in [$(find . -name "*.js" -type f 2>/dev/null); do]:
    subprocess.run("check_security_compliance "$file"", shell=True)
    print("")
    print("==================================")
    print("📊 Security Compliance Report")
    print("==================================")
    print("")
    print("-e ")Total Files Scanned: ${BLUE}$TOTAL_FILES${NC}"
    print("-e ")Security Violations: ${RED}$VIOLATIONS${NC}"
    print("-e ")Compliant Files:     ${GREEN}$COMPLIANT${NC}"
    print("")
    if $VIOLATIONS -gt 0 :; then
    subprocess.run("COMPLIANCE_RATE=$((COMPLIANT * 100 / (VIOLATIONS + COMPLIANT)))", shell=True)
    print("-e ")Compliance Rate: ${YELLOW}${COMPLIANCE_RATE}%${NC}"
    print("")
    print("-e ")${RED}⚠️  SECURITY RISK: $VIOLATIONS files bypass port security!${NC}"
    print("")
    print("Files requiring immediate fix:")
    print("-------------------------------")
    for file in ["${VIOLATION_FILES[@]}"; do]:
    print("  - $(basename $file)")
    print("")
    print("🔧 How to fix violations:")
    print("------------------------")
    print("")
    print("1. For TEST files, add at the top:")
    print("-e ")${BLUE}import { TestPortManager } from '../../../portal_security/children/TestPortManager';${NC}"
    print("-e ")${BLUE}const testManager = TestPortManager.getInstance();${NC}"
    print("-e ")${BLUE}const port = await testManager.allocateTestPort('test-name');${NC}"
    print("-e ")${BLUE}const BASE_URL = \`http://localhost:\${port}\`;${NC}"
    print("")
    print("2. For PRODUCTION files, add:")
    print("-e ")${BLUE}import { EnhancedPortManager } from '../../../portal_security/pipe';${NC}"
    print("-e ")${BLUE}const portManager = EnhancedPortManager.getInstance();${NC}"
    print("-e ")${BLUE}const PORT = await portManager.allocatePort('app-name', 3456);${NC}"
    print("")
    print("3. For CONFIG files:")
    print("-e ")${BLUE}// Don't hardcode ports, get them from security module${NC}"
    print("-e ")${BLUE}export async function getSecurePort(serviceName: string, defaultPort: number) {${NC}"
    print("-e ")${BLUE}  const portManager = EnhancedPortManager.getInstance();${NC}"
    print("-e ")${BLUE}  return await portManager.allocatePort(serviceName, defaultPort);${NC}"
    print("-e ")${BLUE}}${NC}"
    else:
    print("-e ")${GREEN}✅ All files are compliant with security requirements!${NC}"
    print("")
    print("🔒 Security Best Practices:")
    print("--------------------------")
    print("• NEVER hardcode ports directly")
    print("• ALWAYS use TestPortManager for tests")
    print("• ALWAYS use EnhancedPortManager for production")
    print("• Ports should be allocated dynamically")
    print("• Release ports after use in tests")
    print("")
    if $COMPLIANT -gt 0 :; then
    print("✅ Compliant files (good examples):")
    print("-----------------------------------")
    for file in ["${COMPLIANT_FILES[@]}"; do]:
    print("  - $(basename $file)")
    print("")
    print("📚 Documentation:")
    print("----------------")
    print("See gen/doc/security-port-audit.md for detailed analysis")
    print("")
    # Exit with error if violations found
    if $VIOLATIONS -gt 0 :; then
    sys.exit(1)
    else:
    sys.exit(0)

if __name__ == "__main__":
    main()