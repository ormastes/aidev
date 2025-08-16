#!/usr/bin/env python3
"""
Migrated from: cleanup-root-files.sh
Auto-generated Python - 2025-08-16T04:57:27.599Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Cleanup script to move misplaced files from root directory
    # According to CLAUDE.md rules: No files should be created on root
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    print("-e ")${YELLOW}Checking for files that violate root directory rules...${NC}"
    # Move documentation files to gen/doc/
    subprocess.run("DOCS=(*.md)", shell=True)
    for doc in ["${DOCS[@]}"; do]:
    # Skip allowed root files
    if [ "$doc" == "CLAUDE.md" || "$doc" == "README.md" || "$doc" == "*.md" ]:; then
    subprocess.run("continue", shell=True)
    if [ -f "$doc" ]:; then
    print("-e ")${RED}Found misplaced doc: $doc${NC}"
    shutil.move(""$doc"", "gen/doc/")
    print("-e ")${GREEN}Moved $doc to gen/doc/${NC}"
    # Move screenshot/image files to temp/
    subprocess.run("IMAGES=(*.png *.jpg *.jpeg *.gif)", shell=True)
    for img in ["${IMAGES[@]}"; do]:
    if [ -f "$img" ]:; then
    print("-e ")${RED}Found misplaced image: $img${NC}"
    Path("temp/test-screenshots").mkdir(parents=True, exist_ok=True)
    shutil.move(""$img"", "temp/test-screenshots/")
    print("-e ")${GREEN}Moved $img to temp/test-screenshots/${NC}"
    # Move test files to temp/
    subprocess.run("TEST_FILES=(test-*.js test-*.ts)", shell=True)
    for test in ["${TEST_FILES[@]}"; do]:
    if [ -f "$test" ]:; then
    print("-e ")${RED}Found misplaced test file: $test${NC}"
    Path("temp/test-scripts").mkdir(parents=True, exist_ok=True)
    shutil.move(""$test"", "temp/test-scripts/")
    print("-e ")${GREEN}Moved $test to temp/test-scripts/${NC}"
    # Check for other unexpected files
    print("-e ")${YELLOW}Checking for other unexpected root files...${NC}"
    # List allowed files
    subprocess.run("ALLOWED_FILES=(", shell=True)
    subprocess.run(""CLAUDE.md"", shell=True)
    subprocess.run(""README.md"", shell=True)
    subprocess.run(""FEATURE.vf.json"", shell=True)
    subprocess.run(""TASK_QUEUE.vf.json"", shell=True)
    subprocess.run(""FILE_STRUCTURE.vf.json"", shell=True)
    subprocess.run(""NAME_ID.vf.json"", shell=True)
    subprocess.run(""package.json"", shell=True)
    subprocess.run(""package-lock.json"", shell=True)
    subprocess.run(""tsconfig.json"", shell=True)
    subprocess.run("".gitignore"", shell=True)
    subprocess.run("".prettierrc"", shell=True)
    subprocess.run("".eslintrc.js"", shell=True)
    subprocess.run(""jest.config.js"", shell=True)
    subprocess.run(")", shell=True)
    # Check all files in root
    for file in [*; do]:
    if [ -f "$file" ]:; then
    # Check if file is in allowed list
    subprocess.run("allowed=false", shell=True)
    for allowed_file in ["${ALLOWED_FILES[@]}"; do]:
    if [ "$file" == "$allowed_file" ]:; then
    subprocess.run("allowed=true", shell=True)
    subprocess.run("break", shell=True)
    if [ "$allowed" == false ]:; then
    print("-e ")${YELLOW}Warning: Unexpected file in root: $file${NC}"
    print("  Consider moving this file to an appropriate subdirectory")
    print("-e ")${GREEN}Root directory cleanup complete!${NC}"

if __name__ == "__main__":
    main()