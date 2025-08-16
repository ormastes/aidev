#!/usr/bin/env bun
/**
 * Migrated from: fix-port-security.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.748Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🔒 Port Security Violation Scanner");
  console.log("==================================");
  console.log("");
  console.log("This script identifies files that bypass the security module for port management.");
  console.log("");
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  // Counters
  await $`TOTAL_FILES=0`;
  await $`VIOLATIONS=0`;
  await $`COMPLIANT=0`;
  // Arrays to store results
  await $`declare -a VIOLATION_FILES`;
  await $`declare -a COMPLIANT_FILES`;
  console.log("🔍 Scanning for port security violations...");
  console.log("");
  // Function to check if file uses security module
  await $`check_security_compliance() {`;
  await $`local file=$1`;
  await $`local filename=$(basename "$file")`;
  // Skip node_modules and dist
  if ([ "$file" == *"node_modules"* ]] || [[ "$file" == *"dist"* ]) {; then
  await $`return`;
  }
  await $`TOTAL_FILES=$((TOTAL_FILES + 1))`;
  // Check if file contains hardcoded ports
  await $`if grep -q "3456\|3457\|3410\|3400\|3401\|localhost:[0-9]" "$file" 2>/dev/null; then`;
  // Check if it imports security module
  await $`if grep -q "TestPortManager\|EnhancedPortManager\|portal_security" "$file" 2>/dev/null; then`;
  await $`COMPLIANT=$((COMPLIANT + 1))`;
  await $`COMPLIANT_FILES+=("$file")`;
  console.log("-e ");${GREEN}✅ COMPLIANT${NC}: $filename (uses security module)"
  } else {
  await $`VIOLATIONS=$((VIOLATIONS + 1))`;
  await $`VIOLATION_FILES+=("$file")`;
  console.log("-e ");${RED}❌ VIOLATION${NC}: $filename"
  // Show specific violations
  await $`grep -n "3456\|3457\|3410\|localhost:[0-9]" "$file" 2>/dev/null | head -2 | while read -r line; do`;
  console.log("     Line $line");
  }
  }
  }
  await $`}`;
  // Check TypeScript files
  console.log("📁 Checking TypeScript files...");
  console.log("-------------------------------");
  for (const file of [$(find . -name "*.ts" -type f 2>/dev/null); do]) {
  await $`check_security_compliance "$file"`;
  }
  console.log("");
  console.log("📁 Checking JavaScript files...");
  console.log("--------------------------------");
  for (const file of [$(find . -name "*.js" -type f 2>/dev/null); do]) {
  await $`check_security_compliance "$file"`;
  }
  console.log("");
  console.log("==================================");
  console.log("📊 Security Compliance Report");
  console.log("==================================");
  console.log("");
  console.log("-e ");Total Files Scanned: ${BLUE}$TOTAL_FILES${NC}"
  console.log("-e ");Security Violations: ${RED}$VIOLATIONS${NC}"
  console.log("-e ");Compliant Files:     ${GREEN}$COMPLIANT${NC}"
  console.log("");
  if ($VIOLATIONS -gt 0 ) {; then
  await $`COMPLIANCE_RATE=$((COMPLIANT * 100 / (VIOLATIONS + COMPLIANT)))`;
  console.log("-e ");Compliance Rate: ${YELLOW}${COMPLIANCE_RATE}%${NC}"
  console.log("");
  console.log("-e ");${RED}⚠️  SECURITY RISK: $VIOLATIONS files bypass port security!${NC}"
  console.log("");
  console.log("Files requiring immediate fix:");
  console.log("-------------------------------");
  for (const file of ["${VIOLATION_FILES[@]}"; do]) {
  console.log("  - $(basename $file)");
  }
  console.log("");
  console.log("🔧 How to fix violations:");
  console.log("------------------------");
  console.log("");
  console.log("1. For TEST files, add at the top:");
  console.log("-e ");${BLUE}import { TestPortManager } from '../../../portal_security/children/TestPortManager';${NC}"
  console.log("-e ");${BLUE}const testManager = TestPortManager.getInstance();${NC}"
  console.log("-e ");${BLUE}const port = await testManager.allocateTestPort('test-name');${NC}"
  console.log("-e ");${BLUE}const BASE_URL = \`http://localhost:\${port}\`;${NC}"
  console.log("");
  console.log("2. For PRODUCTION files, add:");
  console.log("-e ");${BLUE}import { EnhancedPortManager } from '../../../portal_security/pipe';${NC}"
  console.log("-e ");${BLUE}const portManager = EnhancedPortManager.getInstance();${NC}"
  console.log("-e ");${BLUE}const PORT = await portManager.allocatePort('app-name', 3456);${NC}"
  console.log("");
  console.log("3. For CONFIG files:");
  console.log("-e ");${BLUE}// Don't hardcode ports, get them from security module${NC}"
  console.log("-e ");${BLUE}export async function getSecurePort(serviceName: string, defaultPort: number) {${NC}"
  console.log("-e ");${BLUE}  const portManager = EnhancedPortManager.getInstance();${NC}"
  console.log("-e ");${BLUE}  return await portManager.allocatePort(serviceName, defaultPort);${NC}"
  console.log("-e ");${BLUE}}${NC}"
  } else {
  console.log("-e ");${GREEN}✅ All files are compliant with security requirements!${NC}"
  }
  console.log("");
  console.log("🔒 Security Best Practices:");
  console.log("--------------------------");
  console.log("• NEVER hardcode ports directly");
  console.log("• ALWAYS use TestPortManager for tests");
  console.log("• ALWAYS use EnhancedPortManager for production");
  console.log("• Ports should be allocated dynamically");
  console.log("• Release ports after use in tests");
  console.log("");
  if ($COMPLIANT -gt 0 ) {; then
  console.log("✅ Compliant files (good examples):");
  console.log("-----------------------------------");
  for (const file of ["${COMPLIANT_FILES[@]}"; do]) {
  console.log("  - $(basename $file)");
  }
  }
  console.log("");
  console.log("📚 Documentation:");
  console.log("----------------");
  console.log("See gen/doc/security-port-audit.md for detailed analysis");
  console.log("");
  // Exit with error if violations found
  if ($VIOLATIONS -gt 0 ) {; then
  process.exit(1);
  } else {
  process.exit(0);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}