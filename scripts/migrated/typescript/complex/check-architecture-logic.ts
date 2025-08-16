#!/usr/bin/env bun
/**
 * Migrated from: check-architecture-logic.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.700Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Architecture Check Logic for Fraud Checker Theme
  // This contains all the actual checking logic for architecture compliance
  await $`set -e`;
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`BLUE='\033[0;34m'`;
  await $`CYAN='\033[0;36m'`;
  await $`MAGENTA='\033[0;35m'`;
  await $`NC='\033[0m' # No Color`;
  // Get the script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`THEME_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$THEME_ROOT/../../.." && pwd )"`;
  // Parse command line arguments
  await $`CHECK_TYPE="${1:-all}"  # all, layer-imports, pipe-compliance, mftod`;
  // Track errors
  await $`TOTAL_ERRORS=0`;
  // Function to check layer imports
  await $`check_layer_imports() {`;
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("-e ");${CYAN}Layer Import Violation Check${NC}"
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("");
  await $`local errors=0`;
  // Define layer hierarchy
  console.log("-e ");${BLUE}Layer Hierarchy:${NC}"
  console.log("  ui → ui_logic → application → domain → core");
  console.log("  external → domain only");
  console.log("");
  // Check all TypeScript files
  for (const ts_file of [$(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -E "(src|layer)" | grep -v node_modules | grep -v dist | grep -v coverage); do]) {
  // Determine which layer this file belongs to
  await $`local file_layer=""`;
  await $`if echo "$ts_file" | grep -q "/core/"; then`;
  await $`file_layer="core"`;
  await $`elif echo "$ts_file" | grep -q "/domain/"; then`;
  await $`file_layer="domain"`;
  await $`elif echo "$ts_file" | grep -q "/application/"; then`;
  await $`file_layer="application"`;
  await $`elif echo "$ts_file" | grep -q "/ui_logic/"; then`;
  await $`file_layer="ui_logic"`;
  await $`elif echo "$ts_file" | grep -q "/ui/"; then`;
  await $`file_layer="ui"`;
  await $`elif echo "$ts_file" | grep -q "/external/"; then`;
  await $`file_layer="external"`;
  }
  if (-n "$file_layer" ) {; then
  // Check imports in the file
  await $`case "$file_layer" in`;
  await $`"core")`;
  // Core cannot import from any other layer
  await $`if grep -E "from ['\"][^'\"]*/(domain|application|ui_logic|ui|external)/" "$ts_file" > /dev/null 2>&1; then`;
  console.log("-e ");${RED}❌ Layer violation in $ts_file: core importing from higher layers${NC}"
  await $`((errors++))`;
  }
  await $`;;`;
  await $`"domain")`;
  // Domain cannot import from application, ui_logic, ui
  await $`if grep -E "from ['\"][^'\"]*/(application|ui_logic|ui)/" "$ts_file" > /dev/null 2>&1; then`;
  console.log("-e ");${RED}❌ Layer violation in $ts_file: domain importing from higher layers${NC}"
  await $`((errors++))`;
  }
  await $`;;`;
  await $`"application")`;
  // Application cannot import from ui_logic, ui
  await $`if grep -E "from ['\"][^'\"]*/(ui_logic|ui)/" "$ts_file" > /dev/null 2>&1; then`;
  console.log("-e ");${RED}❌ Layer violation in $ts_file: application importing from higher layers${NC}"
  await $`((errors++))`;
  }
  await $`;;`;
  await $`"external")`;
  // External should only import from domain
  await $`if grep -E "from ['\"][^'\"]*/(ui_logic|ui|application)/" "$ts_file" > /dev/null 2>&1; then`;
  console.log("-e ");${RED}❌ Layer violation in $ts_file: external importing from presentation layers${NC}"
  await $`((errors++))`;
  }
  await $`;;`;
  await $`esac`;
  }
  }
  if ($errors -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ No layer import violations found${NC}"
  } else {
  console.log("-e ");${RED}Found $errors layer import violations${NC}"
  await $`TOTAL_ERRORS=$((TOTAL_ERRORS + errors))`;
  }
  await $`return $errors`;
  await $`}`;
  // Function to check pipe compliance
  await $`check_pipe_compliance() {`;
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("-e ");${CYAN}Pipe Gateway Compliance Check${NC}"
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("");
  await $`local errors=0`;
  // Check all pipe/index.ts files exist
  for (const layer_dir of [$(find "$PROJECT_ROOT" -type d -name "src" | grep -v node_modules | grep -v dist); do]) {
  for (const layer of [core domain application ui_logic ui external; do]) {
  if (-d "$layer_dir/$layer" ) {; then
  if (! -f "$layer_dir/$layer/pipe/index.ts" ) {; then
  console.log("-e ");${RED}❌ Missing pipe gateway: $layer_dir/$layer/pipe/index.ts${NC}"
  await $`((errors++))`;
  } else {
  // Check if pipe/index.ts has exports
  await $`if ! grep -E "^export" "$layer_dir/$layer/pipe/index.ts" > /dev/null 2>&1; then`;
  console.log("-e ");${YELLOW}⚠️  Empty pipe gateway: $layer_dir/$layer/pipe/index.ts${NC}"
  }
  }
  }
  }
  }
  // Check theme pipe gateways
  for (const theme_dir of ["$PROJECT_ROOT"/layer/themes/*/; do]) {
  if (-d "$theme_dir" ) {; then
  await $`theme_name=$(basename "$theme_dir")`;
  if (! -f "$theme_dir/pipe/index.ts" ) {; then
  console.log("-e ");${RED}❌ Missing theme pipe gateway: $theme_name/pipe/index.ts${NC}"
  await $`((errors++))`;
  }
  }
  }
  // Check for bypassed pipe imports
  console.log("-e ");${BLUE}Checking for bypassed pipe imports...${NC}"
  for (const ts_file of [$(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v coverage); do]) {
  // Skip pipe files themselves
  await $`if echo "$ts_file" | grep -q "/pipe/"; then`;
  await $`continue`;
  }
  // Check for imports that go directly into layer subdirectories
  await $`if grep -E "from ['\"][^'\"]*/src/(core|domain|application|ui_logic|ui|external)/[^/]+/[^'\"]+['\"]" "$ts_file" > /dev/null 2>&1; then`;
  console.log("-e ");${RED}❌ Bypassed pipe import in $ts_file${NC}"
  await $`((errors++))`;
  }
  }
  if ($errors -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ All pipe gateways are compliant${NC}"
  } else {
  console.log("-e ");${RED}Found $errors pipe compliance issues${NC}"
  await $`TOTAL_ERRORS=$((TOTAL_ERRORS + errors))`;
  }
  await $`return $errors`;
  await $`}`;
  // Function to check MFTOD compliance
  await $`check_mftod_compliance() {`;
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("-e ");${CYAN}Mock-Free Test-Oriented Development Check${NC}"
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("");
  // Run the MFTOD compliance script
  if (-f "$SCRIPT_DIR/MFTOD-compliant.sh" ) {; then
  await $`bash "$SCRIPT_DIR/MFTOD-compliant.sh"`;
  await $`return $?`;
  } else {
  console.log("-e ");${YELLOW}⚠️  MFTOD compliance script not found${NC}"
  await $`return 1`;
  }
  await $`}`;
  // Function to run fraud detection
  await $`run_fraud_detection() {`;
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("-e ");${CYAN}Fraud Detection Analysis${NC}"
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("");
  // Run Python fraud checkers
  if (-f "$SCRIPT_DIR/fix-all-frauds.py" ) {; then
  console.log("-e ");${BLUE}Running comprehensive fraud detection...${NC}"
  await $`python3 "$SCRIPT_DIR/fix-all-frauds.py" --check-only`;
  }
  // Run TypeScript fraud checker if available
  if (-f "$SCRIPT_DIR/check-fraud.ts" ) {; then
  console.log("-e ");${BLUE}Running TypeScript fraud analysis...${NC}"
  process.chdir(""$THEME_ROOT" && npm run check-fraud -- --architecture");
  }
  await $`}`;
  // Main execution based on check type
  await $`case "$CHECK_TYPE" in`;
  await $`"layer-imports")`;
  await $`check_layer_imports`;
  await $`;;`;
  await $`"pipe-compliance")`;
  await $`check_pipe_compliance`;
  await $`;;`;
  await $`"mftod")`;
  await $`check_mftod_compliance`;
  await $`;;`;
  await $`"fraud")`;
  await $`run_fraud_detection`;
  await $`;;`;
  await $`"all")`;
  await $`check_layer_imports`;
  console.log("");
  await $`check_pipe_compliance`;
  console.log("");
  await $`check_mftod_compliance`;
  console.log("");
  await $`run_fraud_detection`;
  await $`;;`;
  await $`*)`;
  console.log("-e ");${RED}Unknown check type: $CHECK_TYPE${NC}"
  console.log("Usage: $0 [all|layer-imports|pipe-compliance|mftod|fraud]");
  process.exit(1);
  await $`;;`;
  await $`esac`;
  // Summary
  console.log("");
  console.log("-e ");${CYAN}=====================================${NC}"
  console.log("-e ");${CYAN}Architecture Check Summary${NC}"
  console.log("-e ");${CYAN}=====================================${NC}"
  if ($TOTAL_ERRORS -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ All architecture checks passed!${NC}"
  } else {
  console.log("-e ");${RED}❌ Found $TOTAL_ERRORS architecture issues${NC}"
  // Offer to run fixes
  console.log("");
  console.log("-e ");${BLUE}Run automated fixes? (y/n)${NC}"
  await $`read -r response`;
  if ([ "$response" =~ ^[Yy]$ ]) {; then
  if (-f "$SCRIPT_DIR/fix-all-frauds.py" ) {; then
  await $`python3 "$SCRIPT_DIR/fix-all-frauds.py" --architecture`;
  }
  if (-f "$SCRIPT_DIR/fix-working-on-pattern.py" ) {; then
  await $`python3 "$SCRIPT_DIR/fix-working-on-pattern.py"`;
  }
  }
  }
  await $`exit $TOTAL_ERRORS`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}