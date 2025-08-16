#!/usr/bin/env python3
"""
Migrated from: pre-commit-file-api.sh
Auto-generated Python - 2025-08-16T04:57:27.779Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Pre-commit hook for File Creation API enforcement
    # This script checks for direct file system access in staged files
    print("🔍 Checking for direct file system access violations...")
    # Get list of staged TypeScript/JavaScript files
    subprocess.run("STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')", shell=True)
    if -z "$STAGED_FILES" :; then
    print("✅ No JavaScript/TypeScript files to check")
    sys.exit(0)
    subprocess.run("VIOLATIONS=0", shell=True)
    subprocess.run("VIOLATION_FILES=""", shell=True)
    # Patterns to check for
    subprocess.run("PATTERNS=(", shell=True)
    subprocess.run(""fs\.writeFileSync"", shell=True)
    subprocess.run(""fs\.writeFile"", shell=True)
    subprocess.run(""fs\.promises\.writeFile"", shell=True)
    subprocess.run(""fs\.mkdirSync"", shell=True)
    subprocess.run(""fs\.mkdir"", shell=True)
    subprocess.run(""fs\.promises\.mkdir"", shell=True)
    subprocess.run(""fs\.appendFileSync"", shell=True)
    subprocess.run(""fs\.appendFile"", shell=True)
    subprocess.run(""fs\.createWriteStream"", shell=True)
    subprocess.run(")", shell=True)
    # Check each staged file
    for FILE in [$STAGED_FILES; do]:
    # Skip test files
    if [ "$FILE" == *".test."* ]] || [[ "$FILE" == *".spec."* ]] || [[ "$FILE" == *"/test/"* ]:; then
    subprocess.run("continue", shell=True)
    # Skip external-log-lib implementation files
    if [ "$FILE" == *"infra_external-log-lib/src/file-manager"* ]: || \
    subprocess.run("[[ "$FILE" == *"infra_external-log-lib/src/fraud-detector"* ]] || \", shell=True)
    subprocess.run("[[ "$FILE" == *"infra_external-log-lib/src/interceptors"* ]]; then", shell=True)
    subprocess.run("continue", shell=True)
    # Check for violations
    subprocess.run("FILE_VIOLATIONS=0", shell=True)
    for PATTERN in ["${PATTERNS[@]}"; do]:
    subprocess.run("COUNT=$(grep -c "$PATTERN" "$FILE" 2>/dev/null || echo 0)", shell=True)
    if "$COUNT" -gt 0 :; then
    subprocess.run("FILE_VIOLATIONS=$((FILE_VIOLATIONS + COUNT))", shell=True)
    if "$FILE_VIOLATIONS" -gt 0 :; then
    subprocess.run("VIOLATIONS=$((VIOLATIONS + FILE_VIOLATIONS))", shell=True)
    subprocess.run("VIOLATION_FILES="$VIOLATION_FILES\n  - $FILE ($FILE_VIOLATIONS violations)"", shell=True)
    if "$VIOLATIONS" -gt 0 :; then
    print("")
    print("❌ Direct file system access violations found!")
    print("")
    print("Files with violations:")
    print("-e ")$VIOLATION_FILES"
    print("")
    print("Please use FileCreationAPI instead:")
    print("  import { getFileAPI, FileType } from '@external-log-lib/pipe';")
    print("  const fileAPI = getFileAPI();")
    print("")
    print("Examples:")
    print("  - Replace: fs.writeFileSync(path, data)")
    print("    With:    await fileAPI.createFile(path, data, { type: FileType.TEMPORARY })")
    print("")
    print("  - Replace: fs.mkdirSync(path)")
    print("    With:    await fileAPI.createDirectory(path)")
    print("")
    print("To bypass (not recommended):")
    print("  git commit --no-verify")
    print("")
    sys.exit(1)
    print("✅ No direct file system access violations found")
    sys.exit(0)

if __name__ == "__main__":
    main()