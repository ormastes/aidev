#!/usr/bin/env python3
"""
Migrated from: check-architecture-logic.sh
Auto-generated Python - 2025-08-16T04:57:27.700Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Architecture Check Logic for Fraud Checker Theme
    # This contains all the actual checking logic for architecture compliance
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("MAGENTA='\033[0;35m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Get the script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("THEME_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$THEME_ROOT/../../.." && pwd )"", shell=True)
    # Parse command line arguments
    subprocess.run("CHECK_TYPE="${1:-all}"  # all, layer-imports, pipe-compliance, mftod", shell=True)
    # Track errors
    subprocess.run("TOTAL_ERRORS=0", shell=True)
    # Function to check layer imports
    subprocess.run("check_layer_imports() {", shell=True)
    print("-e ")${CYAN}=====================================${NC}"
    print("-e ")${CYAN}Layer Import Violation Check${NC}"
    print("-e ")${CYAN}=====================================${NC}"
    print("")
    subprocess.run("local errors=0", shell=True)
    # Define layer hierarchy
    print("-e ")${BLUE}Layer Hierarchy:${NC}"
    print("  ui → ui_logic → application → domain → core")
    print("  external → domain only")
    print("")
    # Check all TypeScript files
    for ts_file in [$(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -E "(src|layer)" | grep -v node_modules | grep -v dist | grep -v coverage); do]:
    # Determine which layer this file belongs to
    subprocess.run("local file_layer=""", shell=True)
    subprocess.run("if echo "$ts_file" | grep -q "/core/"; then", shell=True)
    subprocess.run("file_layer="core"", shell=True)
    subprocess.run("elif echo "$ts_file" | grep -q "/domain/"; then", shell=True)
    subprocess.run("file_layer="domain"", shell=True)
    subprocess.run("elif echo "$ts_file" | grep -q "/application/"; then", shell=True)
    subprocess.run("file_layer="application"", shell=True)
    subprocess.run("elif echo "$ts_file" | grep -q "/ui_logic/"; then", shell=True)
    subprocess.run("file_layer="ui_logic"", shell=True)
    subprocess.run("elif echo "$ts_file" | grep -q "/ui/"; then", shell=True)
    subprocess.run("file_layer="ui"", shell=True)
    subprocess.run("elif echo "$ts_file" | grep -q "/external/"; then", shell=True)
    subprocess.run("file_layer="external"", shell=True)
    if -n "$file_layer" :; then
    # Check imports in the file
    subprocess.run("case "$file_layer" in", shell=True)
    subprocess.run(""core")", shell=True)
    # Core cannot import from any other layer
    subprocess.run("if grep -E "from ['\"][^'\"]*/(domain|application|ui_logic|ui|external)/" "$ts_file" > /dev/null 2>&1; then", shell=True)
    print("-e ")${RED}❌ Layer violation in $ts_file: core importing from higher layers${NC}"
    subprocess.run("((errors++))", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""domain")", shell=True)
    # Domain cannot import from application, ui_logic, ui
    subprocess.run("if grep -E "from ['\"][^'\"]*/(application|ui_logic|ui)/" "$ts_file" > /dev/null 2>&1; then", shell=True)
    print("-e ")${RED}❌ Layer violation in $ts_file: domain importing from higher layers${NC}"
    subprocess.run("((errors++))", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""application")", shell=True)
    # Application cannot import from ui_logic, ui
    subprocess.run("if grep -E "from ['\"][^'\"]*/(ui_logic|ui)/" "$ts_file" > /dev/null 2>&1; then", shell=True)
    print("-e ")${RED}❌ Layer violation in $ts_file: application importing from higher layers${NC}"
    subprocess.run("((errors++))", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""external")", shell=True)
    # External should only import from domain
    subprocess.run("if grep -E "from ['\"][^'\"]*/(ui_logic|ui|application)/" "$ts_file" > /dev/null 2>&1; then", shell=True)
    print("-e ")${RED}❌ Layer violation in $ts_file: external importing from presentation layers${NC}"
    subprocess.run("((errors++))", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    if $errors -eq 0 :; then
    print("-e ")${GREEN}✅ No layer import violations found${NC}"
    else:
    print("-e ")${RED}Found $errors layer import violations${NC}"
    subprocess.run("TOTAL_ERRORS=$((TOTAL_ERRORS + errors))", shell=True)
    subprocess.run("return $errors", shell=True)
    subprocess.run("}", shell=True)
    # Function to check pipe compliance
    subprocess.run("check_pipe_compliance() {", shell=True)
    print("-e ")${CYAN}=====================================${NC}"
    print("-e ")${CYAN}Pipe Gateway Compliance Check${NC}"
    print("-e ")${CYAN}=====================================${NC}"
    print("")
    subprocess.run("local errors=0", shell=True)
    # Check all pipe/index.ts files exist
    for layer_dir in [$(find "$PROJECT_ROOT" -type d -name "src" | grep -v node_modules | grep -v dist); do]:
    for layer in [core domain application ui_logic ui external; do]:
    if -d "$layer_dir/$layer" :; then
    if ! -f "$layer_dir/$layer/pipe/index.ts" :; then
    print("-e ")${RED}❌ Missing pipe gateway: $layer_dir/$layer/pipe/index.ts${NC}"
    subprocess.run("((errors++))", shell=True)
    else:
    # Check if pipe/index.ts has exports
    subprocess.run("if ! grep -E "^export" "$layer_dir/$layer/pipe/index.ts" > /dev/null 2>&1; then", shell=True)
    print("-e ")${YELLOW}⚠️  Empty pipe gateway: $layer_dir/$layer/pipe/index.ts${NC}"
    # Check theme pipe gateways
    for theme_dir in ["$PROJECT_ROOT"/layer/themes/*/; do]:
    if -d "$theme_dir" :; then
    subprocess.run("theme_name=$(basename "$theme_dir")", shell=True)
    if ! -f "$theme_dir/pipe/index.ts" :; then
    print("-e ")${RED}❌ Missing theme pipe gateway: $theme_name/pipe/index.ts${NC}"
    subprocess.run("((errors++))", shell=True)
    # Check for bypassed pipe imports
    print("-e ")${BLUE}Checking for bypassed pipe imports...${NC}"
    for ts_file in [$(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v coverage); do]:
    # Skip pipe files themselves
    subprocess.run("if echo "$ts_file" | grep -q "/pipe/"; then", shell=True)
    subprocess.run("continue", shell=True)
    # Check for imports that go directly into layer subdirectories
    subprocess.run("if grep -E "from ['\"][^'\"]*/src/(core|domain|application|ui_logic|ui|external)/[^/]+/[^'\"]+['\"]" "$ts_file" > /dev/null 2>&1; then", shell=True)
    print("-e ")${RED}❌ Bypassed pipe import in $ts_file${NC}"
    subprocess.run("((errors++))", shell=True)
    if $errors -eq 0 :; then
    print("-e ")${GREEN}✅ All pipe gateways are compliant${NC}"
    else:
    print("-e ")${RED}Found $errors pipe compliance issues${NC}"
    subprocess.run("TOTAL_ERRORS=$((TOTAL_ERRORS + errors))", shell=True)
    subprocess.run("return $errors", shell=True)
    subprocess.run("}", shell=True)
    # Function to check MFTOD compliance
    subprocess.run("check_mftod_compliance() {", shell=True)
    print("-e ")${CYAN}=====================================${NC}"
    print("-e ")${CYAN}Mock-Free Test-Oriented Development Check${NC}"
    print("-e ")${CYAN}=====================================${NC}"
    print("")
    # Run the MFTOD compliance script
    if -f "$SCRIPT_DIR/MFTOD-compliant.sh" :; then
    subprocess.run("bash "$SCRIPT_DIR/MFTOD-compliant.sh"", shell=True)
    subprocess.run("return $?", shell=True)
    else:
    print("-e ")${YELLOW}⚠️  MFTOD compliance script not found${NC}"
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Function to run fraud detection
    subprocess.run("run_fraud_detection() {", shell=True)
    print("-e ")${CYAN}=====================================${NC}"
    print("-e ")${CYAN}Fraud Detection Analysis${NC}"
    print("-e ")${CYAN}=====================================${NC}"
    print("")
    # Run Python fraud checkers
    if -f "$SCRIPT_DIR/fix-all-frauds.py" :; then
    print("-e ")${BLUE}Running comprehensive fraud detection...${NC}"
    subprocess.run("python3 "$SCRIPT_DIR/fix-all-frauds.py" --check-only", shell=True)
    # Run TypeScript fraud checker if available
    if -f "$SCRIPT_DIR/check-fraud.ts" :; then
    print("-e ")${BLUE}Running TypeScript fraud analysis...${NC}"
    os.chdir(""$THEME_ROOT" && npm run check-fraud -- --architecture")
    subprocess.run("}", shell=True)
    # Main execution based on check type
    subprocess.run("case "$CHECK_TYPE" in", shell=True)
    subprocess.run(""layer-imports")", shell=True)
    subprocess.run("check_layer_imports", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""pipe-compliance")", shell=True)
    subprocess.run("check_pipe_compliance", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""mftod")", shell=True)
    subprocess.run("check_mftod_compliance", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""fraud")", shell=True)
    subprocess.run("run_fraud_detection", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""all")", shell=True)
    subprocess.run("check_layer_imports", shell=True)
    print("")
    subprocess.run("check_pipe_compliance", shell=True)
    print("")
    subprocess.run("check_mftod_compliance", shell=True)
    print("")
    subprocess.run("run_fraud_detection", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("-e ")${RED}Unknown check type: $CHECK_TYPE${NC}"
    print("Usage: $0 [all|layer-imports|pipe-compliance|mftod|fraud]")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Summary
    print("")
    print("-e ")${CYAN}=====================================${NC}"
    print("-e ")${CYAN}Architecture Check Summary${NC}"
    print("-e ")${CYAN}=====================================${NC}"
    if $TOTAL_ERRORS -eq 0 :; then
    print("-e ")${GREEN}✅ All architecture checks passed!${NC}"
    else:
    print("-e ")${RED}❌ Found $TOTAL_ERRORS architecture issues${NC}"
    # Offer to run fixes
    print("")
    print("-e ")${BLUE}Run automated fixes? (y/n)${NC}"
    subprocess.run("read -r response", shell=True)
    if [ "$response" =~ ^[Yy]$ ]:; then
    if -f "$SCRIPT_DIR/fix-all-frauds.py" :; then
    subprocess.run("python3 "$SCRIPT_DIR/fix-all-frauds.py" --architecture", shell=True)
    if -f "$SCRIPT_DIR/fix-working-on-pattern.py" :; then
    subprocess.run("python3 "$SCRIPT_DIR/fix-working-on-pattern.py"", shell=True)
    subprocess.run("exit $TOTAL_ERRORS", shell=True)

if __name__ == "__main__":
    main()