#!/usr/bin/env python3
"""
Migrated from: migrate-to-uv.sh
Auto-generated Python - 2025-08-16T04:57:27.729Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Migrate existing pip/requirements.txt projects to UV
    subprocess.run("set -e", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}═══════════════════════════════════════════${NC}"
    print("-e ")${BLUE}      Pip to UV Migration Script           ${NC}"
    print("-e ")${BLUE}═══════════════════════════════════════════${NC}"
    print("")
    # Check if UV is installed
    subprocess.run("if ! command -v uv >/dev/null 2>&1; then", shell=True)
    print("-e ")${RED}UV is not installed. Running setup script...${NC}"
    subprocess.run("./scripts/setup-uv.sh", shell=True)
    # Find all requirements.txt files
    print("-e ")${YELLOW}Searching for requirements.txt files...${NC}"
    subprocess.run("REQUIREMENTS_FILES=$(find . -name "requirements*.txt" -type f 2>/dev/null | grep -v node_modules | grep -v .venv)", shell=True)
    if [ -z "$REQUIREMENTS_FILES" ]:; then
    print("-e ")${YELLOW}No requirements.txt files found.${NC}"
    else:
    print("-e ")${GREEN}Found requirements files:${NC}"
    print("$REQUIREMENTS_FILES")
    print("")
    # Process each requirements file
    for REQ_FILE in [$REQUIREMENTS_FILES; do]:
    subprocess.run("DIR=$(dirname "$REQ_FILE")", shell=True)
    subprocess.run("FILENAME=$(basename "$REQ_FILE")", shell=True)
    print("-e ")${BLUE}Processing: $REQ_FILE${NC}"
    # Create lock file
    subprocess.run("LOCK_FILE="${REQ_FILE%.txt}.lock"", shell=True)
    print("-e ")  Creating lock file: ${LOCK_FILE}"
    os.chdir(""$DIR"")
    subprocess.run("uv pip compile "$FILENAME" -o "$(basename "$LOCK_FILE")" 2>/dev/null || {", shell=True)
    print("-e ")${YELLOW}  Warning: Could not create lock file for $REQ_FILE${NC}"
    subprocess.run("}", shell=True)
    os.chdir("- > /dev/null")
    # Create uv.toml if it doesn't exist
    subprocess.run("UV_TOML="$DIR/uv.toml"", shell=True)
    if [ ! -f "$UV_TOML" ]:; then
    print("-e ")  Creating uv.toml configuration"
    subprocess.run("cat > "$UV_TOML" << EOF", shell=True)
    # UV Configuration
    subprocess.run("[tool.uv]", shell=True)
    subprocess.run("python = ">=3.10"", shell=True)
    subprocess.run("venv = ".venv"", shell=True)
    subprocess.run("[tool.uv.pip]", shell=True)
    subprocess.run("index-url = "https://pypi.org/simple"", shell=True)
    subprocess.run("compile = true", shell=True)
    subprocess.run("EOF", shell=True)
    # Convert pyproject.toml projects
    print("-e ")\n${YELLOW}Searching for pyproject.toml files...${NC}"
    subprocess.run("PYPROJECT_FILES=$(find . -name "pyproject.toml" -type f 2>/dev/null | grep -v node_modules | grep -v .venv)", shell=True)
    if [ -z "$PYPROJECT_FILES" ]:; then
    print("-e ")${YELLOW}No pyproject.toml files found.${NC}"
    else:
    print("-e ")${GREEN}Found pyproject.toml files:${NC}"
    print("$PYPROJECT_FILES")
    print("")
    for PROJ_FILE in [$PYPROJECT_FILES; do]:
    subprocess.run("DIR=$(dirname "$PROJ_FILE")", shell=True)
    print("-e ")${BLUE}Processing: $PROJ_FILE${NC}"
    # Check if UV configuration exists
    subprocess.run("if grep -q "\[tool.uv\]" "$PROJ_FILE"; then", shell=True)
    print("-e ")  ${GREEN}✓ UV configuration already exists${NC}"
    else:
    print("-e ")  Adding UV configuration to pyproject.toml"
    subprocess.run("cat >> "$PROJ_FILE" << 'EOF'", shell=True)
    subprocess.run("[tool.uv]", shell=True)
    subprocess.run("python = ">=3.10"", shell=True)
    subprocess.run("venv = ".venv"", shell=True)
    subprocess.run("compile = true", shell=True)
    subprocess.run("[tool.uv.pip]", shell=True)
    subprocess.run("index-url = "https://pypi.org/simple"", shell=True)
    subprocess.run("EOF", shell=True)
    # Create virtual environment if needed
    if [ ! -d "$DIR/.venv" ]:; then
    print("-e ")  Creating virtual environment"
    os.chdir(""$DIR"")
    subprocess.run("uv venv .venv", shell=True)
    os.chdir("- > /dev/null")
    # Update shell scripts
    print("-e ")\n${YELLOW}Updating shell scripts...${NC}"
    subprocess.run("SHELL_SCRIPTS=$(find . -name "*.sh" -type f 2>/dev/null | grep -v node_modules | grep -v .venv | grep -v migrate-to-uv.sh)", shell=True)
    subprocess.run("UPDATED_COUNT=0", shell=True)
    for SCRIPT in [$SHELL_SCRIPTS; do]:
    subprocess.run("if grep -q "uv pip install\|uv pip install" "$SCRIPT" 2>/dev/null; then", shell=True)
    print("-e ")${BLUE}Updating: $SCRIPT${NC}"
    # Create backup
    shutil.copy2(""$SCRIPT" "${SCRIPT}.bak.$(date", "+%Y%m%d)"")
    # Replace pip commands (except those already using uv)
    subprocess.run("sed -i.tmp 's/\buv pip install/uv uv pip install/g' "$SCRIPT"", shell=True)
    subprocess.run("sed -i.tmp 's/\buv pip install/uv uv pip install/g' "$SCRIPT"", shell=True)
    subprocess.run("sed -i.tmp 's/python -m uv pip install/uv uv pip install/g' "$SCRIPT"", shell=True)
    subprocess.run("sed -i.tmp 's/python3 -m uv pip install/uv uv pip install/g' "$SCRIPT"", shell=True)
    # Remove temp files
    subprocess.run("rm -f "${SCRIPT}.tmp"", shell=True)
    subprocess.run("((UPDATED_COUNT++))", shell=True)
    print("-e ")${GREEN}Updated $UPDATED_COUNT shell scripts${NC}"
    # Create migration report
    subprocess.run("REPORT_FILE="uv-migration-report.md"", shell=True)
    print("-e ")\n${YELLOW}Generating migration report...${NC}"
    subprocess.run("cat > "$REPORT_FILE" << EOF", shell=True)
    # UV Migration Report
    subprocess.run("Generated: $(date)", shell=True)
    # # Summary
    subprocess.run("The project has been migrated from pip to UV package manager.", shell=True)
    # # Changes Made
    # ## Requirements Files Processed
    subprocess.run("$(echo "$REQUIREMENTS_FILES" | wc -l) requirements.txt files found and processed", shell=True)
    # ## Lock Files Created
    subprocess.run("Lock files have been generated for reproducible builds.", shell=True)
    # ## Configuration Files
    subprocess.run("- Main uv.toml created at project root", shell=True)
    subprocess.run("- Individual uv.toml files created for subprojects", shell=True)
    # ## Scripts Updated
    subprocess.run("$UPDATED_COUNT shell scripts updated to use UV commands", shell=True)
    # # Next Steps
    subprocess.run("1. Review and test the changes", shell=True)
    subprocess.run("2. Commit the new configuration files", shell=True)
    subprocess.run("3. Update CI/CD pipelines to use UV", shell=True)
    subprocess.run("4. Remove backup files after verification", shell=True)
    # # Performance Improvements
    subprocess.run("Expected improvements with UV:", shell=True)
    subprocess.run("- 10-100x faster package installation", shell=True)
    subprocess.run("- Parallel downloads and installations", shell=True)
    subprocess.run("- Better dependency resolution", shell=True)
    subprocess.run("- Reduced memory usage", shell=True)
    # # Commands Reference
    # ## Old (pip)
    subprocess.run("\`\`\`bash", shell=True)
    subprocess.run("uv pip install package", shell=True)
    subprocess.run("uv pip install -r requirements.txt", shell=True)
    subprocess.run("python -m venv .venv", shell=True)
    subprocess.run("\`\`\`", shell=True)
    # ## New (uv)
    subprocess.run("\`\`\`bash", shell=True)
    subprocess.run("uv uv pip install package", shell=True)
    subprocess.run("uv uv pip install -r requirements.txt", shell=True)
    subprocess.run("uv venv .venv", shell=True)
    subprocess.run("\`\`\`", shell=True)
    # # Resources
    subprocess.run("- [UV Documentation](https://github.com/astral-sh/uv)", shell=True)
    subprocess.run("- [Project UV Configuration](./uv.toml)", shell=True)
    subprocess.run("- [Setup Script](./scripts/setup-uv.sh)", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}Migration report saved to: $REPORT_FILE${NC}"
    # Summary
    print("-e ")\n${BLUE}═══════════════════════════════════════════${NC}"
    print("-e ")${GREEN}       Migration Complete! 🚀              ${NC}"
    print("-e ")${BLUE}═══════════════════════════════════════════${NC}"
    print("")
    print("-e ")${GREEN}✓${NC} Requirements files converted"
    print("-e ")${GREEN}✓${NC} Lock files created"
    print("-e ")${GREEN}✓${NC} UV configurations added"
    print("-e ")${GREEN}✓${NC} Shell scripts updated"
    print("-e ")${GREEN}✓${NC} Migration report generated"
    print("")
    print("-e ")${YELLOW}Important:${NC}"
    print("-e ")  1. Review the changes in modified files"
    print("-e ")  2. Test package installations with UV"
    print("-e ")  3. Update CI/CD configurations"
    print("-e ")  4. Remove *.bak.* backup files after verification"
    print("")
    print("-e ")${BLUE}To install packages in any project:${NC}"
    print("-e ")  cd <project-directory>"
    print("-e ")  uv venv .venv"
    print("-e ")  source .venv/bin/activate"
    print("-e ")  uv uv pip install -r requirements.txt"

if __name__ == "__main__":
    main()