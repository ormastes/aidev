#!/usr/bin/env bash
# Shared library for enforcing File Creation API usage.
# Provides: file_api_check <files...>
# Exits non-zero from caller if violations should block.
# Environment variables:
#   FILE_API_ALLOWLIST_PREFIXES (space-separated prefixes to skip, default: scripts/)
#   FILE_API_BYPASS=1 (caller may allow bypass; library itself does not bypass)

set -o nounset -o pipefail

# Patterns indicating direct filesystem writes/dirs that should use the FileCreationAPI instead.
FILE_API_PATTERNS=(
  "fs\\.writeFileSync"
  "fs\\.writeFile"        # includes async forms
  "fs\\.promises\\.writeFile"
  "fs\\.mkdirSync"
  "fs\\.mkdir"
  "fs\\.promises\\.mkdir"
  "fs\\.appendFileSync"
  "fs\\.appendFile"
  "fs\\.createWriteStream"
)

# Determine if a file should be skipped from checks
is_skipped_file() {
  local f="$1"
  # test/spec files
  if [[ "$f" == *".test."* ]] || [[ "$f" == *".spec."* ]] || [[ "$f" == *"/test/"* ]]; then
    return 0
  fi
  # allowlist prefixes
  local prefixes=${FILE_API_ALLOWLIST_PREFIXES:-"scripts/"}
  for p in $prefixes; do
    if [[ "$f" == $p* ]]; then
      return 0
    fi
  done
  return 1  # not skipped
}

# Count violations in a single file
count_violations_in_file() {
  local f="$1"
  local total=0
  for pat in "${FILE_API_PATTERNS[@]}"; do
    local c
    c=$(grep -E -c -- "$pat" "$f" 2>/dev/null || echo 0)
    c=${c//[^0-9]/}
    if [[ -n "$c" && "$c" -gt 0 ]]; then
      total=$(( total + c ))
    fi
  done
  echo "$total"
}

# Main check: prints violations to stdout; returns 0 if none, 1 if violations.
file_api_check() {
  local files=("$@")
  local violations=0
  local violation_lines=""
  for f in "${files[@]}"; do
    is_skipped_file "$f" && continue || true
    local v
    v=$(count_violations_in_file "$f")
    if [[ "$v" -gt 0 ]]; then
      violations=$(( violations + v ))
      violation_lines+=$'\n  - '"$f"' ('"$v"' violations)'
    fi
  done
  if [[ "$violations" -gt 0 ]]; then
    echo "❌ Direct file system access violations found!"
    echo "Files with violations:" && echo -e "$violation_lines"
    cat <<'EOF'

Please use FileCreationAPI instead:
  import { getFileAPI, FileType } from '@external-log-lib/pipe';
  const fileAPI = getFileAPI();

Examples:
  - Replace: fs.writeFileSync(path, data)
    With:    await fileAPI.createFile(path, data, { type: FileType.TEMPORARY })
  - Replace: fs.mkdirSync(path)
    With:    await fileAPI.createDirectory(path)
EOF
    return 1
  fi
  return 0
}
