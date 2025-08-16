#!/usr/bin/env bun
/**
 * Migrated from: migrate-to-uv.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.729Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Migrate existing pip/requirements.txt projects to UV
  await $`set -e`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}═══════════════════════════════════════════${NC}"
  console.log("-e ");${BLUE}      Pip to UV Migration Script           ${NC}"
  console.log("-e ");${BLUE}═══════════════════════════════════════════${NC}"
  console.log("");
  // Check if UV is installed
  await $`if ! command -v uv >/dev/null 2>&1; then`;
  console.log("-e ");${RED}UV is not installed. Running setup script...${NC}"
  await $`./scripts/setup-uv.sh`;
  }
  // Find all requirements.txt files
  console.log("-e ");${YELLOW}Searching for requirements.txt files...${NC}"
  await $`REQUIREMENTS_FILES=$(find . -name "requirements*.txt" -type f 2>/dev/null | grep -v node_modules | grep -v .venv)`;
  if ([ -z "$REQUIREMENTS_FILES" ]) {; then
  console.log("-e ");${YELLOW}No requirements.txt files found.${NC}"
  } else {
  console.log("-e ");${GREEN}Found requirements files:${NC}"
  console.log("$REQUIREMENTS_FILES");
  console.log("");
  // Process each requirements file
  for (const REQ_FILE of [$REQUIREMENTS_FILES; do]) {
  await $`DIR=$(dirname "$REQ_FILE")`;
  await $`FILENAME=$(basename "$REQ_FILE")`;
  console.log("-e ");${BLUE}Processing: $REQ_FILE${NC}"
  // Create lock file
  await $`LOCK_FILE="${REQ_FILE%.txt}.lock"`;
  console.log("-e ");  Creating lock file: ${LOCK_FILE}"
  process.chdir(""$DIR"");
  await $`uv pip compile "$FILENAME" -o "$(basename "$LOCK_FILE")" 2>/dev/null || {`;
  console.log("-e ");${YELLOW}  Warning: Could not create lock file for $REQ_FILE${NC}"
  await $`}`;
  process.chdir("- > /dev/null");
  // Create uv.toml if it doesn't exist
  await $`UV_TOML="$DIR/uv.toml"`;
  if ([ ! -f "$UV_TOML" ]) {; then
  console.log("-e ");  Creating uv.toml configuration"
  await $`cat > "$UV_TOML" << EOF`;
  // UV Configuration
  await $`[tool.uv]`;
  await $`python = ">=3.10"`;
  await $`venv = ".venv"`;
  await $`[tool.uv.pip]`;
  await $`index-url = "https://pypi.org/simple"`;
  await $`compile = true`;
  await $`EOF`;
  }
  }
  }
  // Convert pyproject.toml projects
  console.log("-e ");\n${YELLOW}Searching for pyproject.toml files...${NC}"
  await $`PYPROJECT_FILES=$(find . -name "pyproject.toml" -type f 2>/dev/null | grep -v node_modules | grep -v .venv)`;
  if ([ -z "$PYPROJECT_FILES" ]) {; then
  console.log("-e ");${YELLOW}No pyproject.toml files found.${NC}"
  } else {
  console.log("-e ");${GREEN}Found pyproject.toml files:${NC}"
  console.log("$PYPROJECT_FILES");
  console.log("");
  for (const PROJ_FILE of [$PYPROJECT_FILES; do]) {
  await $`DIR=$(dirname "$PROJ_FILE")`;
  console.log("-e ");${BLUE}Processing: $PROJ_FILE${NC}"
  // Check if UV configuration exists
  await $`if grep -q "\[tool.uv\]" "$PROJ_FILE"; then`;
  console.log("-e ");  ${GREEN}✓ UV configuration already exists${NC}"
  } else {
  console.log("-e ");  Adding UV configuration to pyproject.toml"
  await $`cat >> "$PROJ_FILE" << 'EOF'`;
  await $`[tool.uv]`;
  await $`python = ">=3.10"`;
  await $`venv = ".venv"`;
  await $`compile = true`;
  await $`[tool.uv.pip]`;
  await $`index-url = "https://pypi.org/simple"`;
  await $`EOF`;
  }
  // Create virtual environment if needed
  if ([ ! -d "$DIR/.venv" ]) {; then
  console.log("-e ");  Creating virtual environment"
  process.chdir(""$DIR"");
  await $`uv venv .venv`;
  process.chdir("- > /dev/null");
  }
  }
  }
  // Update shell scripts
  console.log("-e ");\n${YELLOW}Updating shell scripts...${NC}"
  await $`SHELL_SCRIPTS=$(find . -name "*.sh" -type f 2>/dev/null | grep -v node_modules | grep -v .venv | grep -v migrate-to-uv.sh)`;
  await $`UPDATED_COUNT=0`;
  for (const SCRIPT of [$SHELL_SCRIPTS; do]) {
  await $`if grep -q "uv pip install\|uv pip install" "$SCRIPT" 2>/dev/null; then`;
  console.log("-e ");${BLUE}Updating: $SCRIPT${NC}"
  // Create backup
  await copyFile(""$SCRIPT" "${SCRIPT}.bak.$(date", "+%Y%m%d)"");
  // Replace pip commands (except those already using uv)
  await $`sed -i.tmp 's/\buv pip install/uv uv pip install/g' "$SCRIPT"`;
  await $`sed -i.tmp 's/\buv pip install/uv uv pip install/g' "$SCRIPT"`;
  await $`sed -i.tmp 's/python -m uv pip install/uv uv pip install/g' "$SCRIPT"`;
  await $`sed -i.tmp 's/python3 -m uv pip install/uv uv pip install/g' "$SCRIPT"`;
  // Remove temp files
  await $`rm -f "${SCRIPT}.tmp"`;
  await $`((UPDATED_COUNT++))`;
  }
  }
  console.log("-e ");${GREEN}Updated $UPDATED_COUNT shell scripts${NC}"
  // Create migration report
  await $`REPORT_FILE="uv-migration-report.md"`;
  console.log("-e ");\n${YELLOW}Generating migration report...${NC}"
  await $`cat > "$REPORT_FILE" << EOF`;
  // UV Migration Report
  await $`Generated: $(date)`;
  // # Summary
  await $`The project has been migrated from pip to UV package manager.`;
  // # Changes Made
  // ## Requirements Files Processed
  await $`$(echo "$REQUIREMENTS_FILES" | wc -l) requirements.txt files found and processed`;
  // ## Lock Files Created
  await $`Lock files have been generated for reproducible builds.`;
  // ## Configuration Files
  await $`- Main uv.toml created at project root`;
  await $`- Individual uv.toml files created for subprojects`;
  // ## Scripts Updated
  await $`$UPDATED_COUNT shell scripts updated to use UV commands`;
  // # Next Steps
  await $`1. Review and test the changes`;
  await $`2. Commit the new configuration files`;
  await $`3. Update CI/CD pipelines to use UV`;
  await $`4. Remove backup files after verification`;
  // # Performance Improvements
  await $`Expected improvements with UV:`;
  await $`- 10-100x faster package installation`;
  await $`- Parallel downloads and installations`;
  await $`- Better dependency resolution`;
  await $`- Reduced memory usage`;
  // # Commands Reference
  // ## Old (pip)
  await $`\`\`\`bash`;
  await $`uv pip install package`;
  await $`uv pip install -r requirements.txt`;
  await $`python -m venv .venv`;
  await $`\`\`\``;
  // ## New (uv)
  await $`\`\`\`bash`;
  await $`uv uv pip install package`;
  await $`uv uv pip install -r requirements.txt`;
  await $`uv venv .venv`;
  await $`\`\`\``;
  // # Resources
  await $`- [UV Documentation](https://github.com/astral-sh/uv)`;
  await $`- [Project UV Configuration](./uv.toml)`;
  await $`- [Setup Script](./scripts/setup-uv.sh)`;
  await $`EOF`;
  console.log("-e ");${GREEN}Migration report saved to: $REPORT_FILE${NC}"
  // Summary
  console.log("-e ");\n${BLUE}═══════════════════════════════════════════${NC}"
  console.log("-e ");${GREEN}       Migration Complete! 🚀              ${NC}"
  console.log("-e ");${BLUE}═══════════════════════════════════════════${NC}"
  console.log("");
  console.log("-e ");${GREEN}✓${NC} Requirements files converted"
  console.log("-e ");${GREEN}✓${NC} Lock files created"
  console.log("-e ");${GREEN}✓${NC} UV configurations added"
  console.log("-e ");${GREEN}✓${NC} Shell scripts updated"
  console.log("-e ");${GREEN}✓${NC} Migration report generated"
  console.log("");
  console.log("-e ");${YELLOW}Important:${NC}"
  console.log("-e ");  1. Review the changes in modified files"
  console.log("-e ");  2. Test package installations with UV"
  console.log("-e ");  3. Update CI/CD configurations"
  console.log("-e ");  4. Remove *.bak.* backup files after verification"
  console.log("");
  console.log("-e ");${BLUE}To install packages in any project:${NC}"
  console.log("-e ");  cd <project-directory>"
  console.log("-e ");  uv venv .venv"
  console.log("-e ");  source .venv/bin/activate"
  console.log("-e ");  uv uv pip install -r requirements.txt"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}