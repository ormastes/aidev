#!/bin/bash

# Pre-commit hook for File Creation API enforcement
# This script checks for direct file system access in staged files

echo "🔍 Checking for direct file system access violations..."

# Fail fast on script errors (but allow pattern greps to fail silently via || echo 0 paths below)
set -o errexit -o nounset -o pipefail

# Get list of staged TypeScript/JavaScript files (ACM = Added, Copied, Modified)
mapfile -t STAGED_FILES < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ ${#STAGED_FILES[@]} -eq 0 ]; then
  echo "✅ No JavaScript/TypeScript files to check"
  exit 0
fi

VIOLATIONS=0
VIOLATION_FILES=""

# Patterns to check for
PATTERNS=(
  "fs\.writeFileSync"
  "fs\.writeFile"
  "fs\.promises\.writeFile"
  "fs\.mkdirSync"
  "fs\.mkdir"
  "fs\.promises\.mkdir"
  "fs\.appendFileSync"
  "fs\.appendFile"
  "fs\.createWriteStream"
)

# Check each staged file
for FILE in "${STAGED_FILES[@]}"; do
  # Skip test files
  if [[ "$FILE" == *".test."* ]] || [[ "$FILE" == *".spec."* ]] || [[ "$FILE" == *"/test/"* ]]; then
    continue
  fi
  
  # Skip external-log-lib implementation files
  if [[ "$FILE" == *"infra_external-log-lib/src/file-manager"* ]] || \
     [[ "$FILE" == *"infra_external-log-lib/src/fraud-detector"* ]] || \
     [[ "$FILE" == *"infra_external-log-lib/src/interceptors"* ]]; then
    continue
  fi
  
  # Check for violations
  FILE_VIOLATIONS=0
  for PATTERN in "${PATTERNS[@]}"; do
    # Use grep -E -c (extended regex) explicitly; ensure only digits kept
    COUNT=$(grep -E -c -- "$PATTERN" "$FILE" 2>/dev/null || echo 0)
    # Strip any non-digit chars defensively (avoids [ int errors)
    COUNT=${COUNT//[^0-9]/}
    if [[ -n "$COUNT" && "$COUNT" -gt 0 ]]; then
      FILE_VIOLATIONS=$((FILE_VIOLATIONS + COUNT))
    fi
  done
  
  if [ "$FILE_VIOLATIONS" -gt 0 ]; then
    VIOLATIONS=$((VIOLATIONS + FILE_VIOLATIONS))
    VIOLATION_FILES="$VIOLATION_FILES\n  - $FILE ($FILE_VIOLATIONS violations)"
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "❌ Direct file system access violations found!"
  echo ""
  echo "Files with violations:"
  echo -e "$VIOLATION_FILES"
  echo ""
  echo "Please use FileCreationAPI instead:"
  echo "  import { getFileAPI, FileType } from '@external-log-lib/pipe';"
  echo "  const fileAPI = getFileAPI();"
  echo ""
  echo "Examples:"
  echo "  - Replace: fs.writeFileSync(path, data)"
  echo "    With:    await fileAPI.createFile(path, data, { type: FileType.TEMPORARY })"
  echo ""
  echo "  - Replace: fs.mkdirSync(path)"
  echo "    With:    await fileAPI.createDirectory(path)"
  echo ""
  echo "To bypass (not recommended):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ No direct file system access violations found"
exit 0