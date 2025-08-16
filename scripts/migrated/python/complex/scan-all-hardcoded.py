#!/usr/bin/env python3
"""
Migrated from: scan-all-hardcoded.sh
Auto-generated Python - 2025-08-16T04:57:27.764Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("=== COMPLETE SCAN: ALL Hardcoded Ports/Localhost Outside Security Theme ===")
    print("============================================================")
    print("")
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("📊 Scanning entire codebase for hardcoded network references...")
    print("")
    # Count total violations
    subprocess.run("TOTAL_TS=$(find . -name "*.ts" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/portal_security/*" -exec grep -l "localhost:[0-9]\|:3[0-9][0-9][0-9]\|:4[0-9][0-9][0-9]\|:5[0-9][0-9][0-9]\|:8[0-9][0-9][0-9]" {} \; 2>/dev/null | wc -l)", shell=True)
    subprocess.run("TOTAL_JS=$(find . -name "*.js" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/portal_security/*" -exec grep -l "localhost:[0-9]\|:3[0-9][0-9][0-9]\|:4[0-9][0-9][0-9]\|:5[0-9][0-9][0-9]\|:8[0-9][0-9][0-9]" {} \; 2>/dev/null | wc -l)", shell=True)
    print("-e ")${YELLOW}Total TypeScript files with hardcoded ports:${NC} $TOTAL_TS"
    print("-e ")${YELLOW}Total JavaScript files with hardcoded ports:${NC} $TOTAL_JS"
    print("")
    print("-e ")${RED}❌ VIOLATIONS - Files with hardcoded ports NOT using security module:${NC}"
    print("==================================================================")
    print("")
    print("Test Files:")
    print("-----------")
    for file in [test/system/*.spec.ts test/*.spec.ts; do]:
    if -f "$file" :; then
    subprocess.run("if grep -q "localhost:[0-9]\|3456\|3457\|3410\|3458" "$file" 2>/dev/null; then", shell=True)
    subprocess.run("if ! grep -q "TestPortManager" "$file" 2>/dev/null; then", shell=True)
    print("-e ")${RED}❌${NC} $(basename $file)"
    subprocess.run("grep "localhost:[0-9]\|3456\|3457\|3410" "$file" 2>/dev/null | head -1 | sed 's/^/     /'", shell=True)
    print("")
    print("JavaScript Files:")
    print("-----------------")
    for file in [*.js test/*.js; do]:
    if -f "$file" ] && [ "$file" != "server.js" :; then
    subprocess.run("if grep -q "localhost:[0-9]\|3456\|3457" "$file" 2>/dev/null; then", shell=True)
    print("-e ")${RED}❌${NC} $file"
    subprocess.run("grep "localhost:[0-9]\|3456" "$file" 2>/dev/null | head -1 | sed 's/^/     /'", shell=True)
    print("")
    print("Configuration/Helper Files:")
    print("---------------------------")
    for file in [test/helpers/test-config.ts features/step_definitions/portal_steps.ts run-system-tests.ts; do]:
    if -f "$file" :; then
    subprocess.run("if grep -q "3456\|3457\|3410\|localhost:[0-9]" "$file" 2>/dev/null; then", shell=True)
    subprocess.run("if ! grep -q "TestPortManager\|EnhancedPortManager" "$file" 2>/dev/null; then", shell=True)
    print("-e ")${RED}❌${NC} $file"
    subprocess.run("grep "3456\|3457\|localhost:[0-9]" "$file" 2>/dev/null | head -1 | sed 's/^/     /'", shell=True)
    print("")
    print("-e ")${GREEN}✅ COMPLIANT - Files properly using security module:${NC}"
    print("====================================================")
    for file in [server.ts server.js server-postgres.ts config/app.config.ts playwright.config.ts; do]:
    if -f "$file" :; then
    subprocess.run("if grep -q "EnhancedPortManager\|TestPortManager" "$file" 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✅${NC} $file"
    print("")
    print("📋 Other Hardcoded Network References:")
    print("--------------------------------------")
    # Check for IP addresses
    print("")
    print("IP Addresses found:")
    subprocess.run("grep -r "127\.0\.0\.1\|192\.168\|10\.0\.\|172\.\|0\.0\.0\.0" . \", shell=True)
    subprocess.run("--include="*.ts" --include="*.js" --include="*.json" \", shell=True)
    subprocess.run("--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \", shell=True)
    subprocess.run("--exclude-dir=portal_security 2>/dev/null | head -5", shell=True)
    # Check for other common ports
    print("")
    print("Other common ports (8080, 8000, 5000, etc.):")
    subprocess.run("grep -r ":8080\|:8000\|:5000\|:4200\|:4000\|:9000" . \", shell=True)
    subprocess.run("--include="*.ts" --include="*.js" \", shell=True)
    subprocess.run("--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \", shell=True)
    subprocess.run("--exclude-dir=portal_security 2>/dev/null | head -5", shell=True)
    print("")
    print("==================================================================")
    print("-e ")${YELLOW}📊 SUMMARY${NC}"
    print("==================================================================")
    print("")
    subprocess.run("VIOLATIONS=$(find . \( -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/portal_security/*" -exec grep -l "localhost:[0-9]\|3456\|3457\|3410" {} \; 2>/dev/null | while read file; do", shell=True)
    subprocess.run("if ! grep -q "TestPortManager\|EnhancedPortManager" "$file" 2>/dev/null; then", shell=True)
    print("$file")
    subprocess.run("done | wc -l)", shell=True)
    subprocess.run("COMPLIANT=$(find . \( -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" ! -path "*/dist/*" -exec grep -l "TestPortManager\|EnhancedPortManager" {} \; 2>/dev/null | wc -l)", shell=True)
    print("-e ")Total files with violations: ${RED}$VIOLATIONS${NC}"
    print("-e ")Total compliant files: ${GREEN}$COMPLIANT${NC}"
    if $VIOLATIONS -gt 0 :; then
    print("")
    print("-e ")${RED}⚠️  WARNING: $VIOLATIONS files still have hardcoded ports/localhost!${NC}"
    print("-e ")${YELLOW}All ports and domains MUST go through the security module.${NC}"
    else:
    print("")
    print("-e ")${GREEN}✅ EXCELLENT! No hardcoded ports found outside security module!${NC}"

if __name__ == "__main__":
    main()