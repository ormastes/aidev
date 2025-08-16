#!/bin/bash
# Unified pre-commit hook using shared File Creation API enforcement library.
echo "🔍 Checking for direct file system access violations..."

set -o errexit -o nounset -o pipefail

LIB_DIR="$(dirname "$0")/lib"
if [ -f "$LIB_DIR/file_api_check.sh" ]; then
  # shellcheck disable=SC1091
  . "$LIB_DIR/file_api_check.sh"
else
  echo "⚠️  Shared library scripts/lib/file_api_check.sh not found; fallback to inline patterns." >&2
fi

mapfile -t STAGED_FILES < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)
if [ ${#STAGED_FILES[@]} -eq 0 ]; then
  echo "✅ No JavaScript/TypeScript files to check"
  exit 0
fi

if declare -f file_api_check >/dev/null 2>&1; then
  if ! file_api_check "${STAGED_FILES[@]}"; then
    echo ""
    echo "To bypass (not recommended):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
  fi
else
  # Minimal fallback
  PATTERNS=( 'fs\.writeFileSync' 'fs\.writeFile' 'fs\.promises\.writeFile' 'fs\.mkdirSync' 'fs\.mkdir' 'fs\.promises\.mkdir' 'fs\.appendFileSync' 'fs\.appendFile' 'fs\.createWriteStream' )
  VIOLATION_FILES=""
  VIOLATIONS=0
  for f in "${STAGED_FILES[@]}"; do
    if [[ "$f" == *".test."* ]] || [[ "$f" == *".spec."* ]] || [[ "$f" == *"/test/"* ]] || [[ "$f" == scripts/* ]]; then
      continue
    fi
    FV=0
    for p in "${PATTERNS[@]}"; do
      c=$(grep -E -c -- "$p" "$f" 2>/dev/null || echo 0)
      c=${c//[^0-9]/}
      if [[ -n "$c" && "$c" -gt 0 ]]; then
        FV=$((FV + c))
      fi
    done
    if [[ $FV -gt 0 ]]; then
      VIOLATIONS=$((VIOLATIONS + FV))
      VIOLATION_FILES+=$"\n  - $f ($FV violations)"
    fi
  done
  if [[ $VIOLATIONS -gt 0 ]]; then
    echo "❌ Direct file system access violations found!" && echo -e "$VIOLATION_FILES" && exit 1
  fi
fi

echo "✅ No direct file system access violations found"
exit 0