#!/usr/bin/env bash
# JJ commit wrapper enforcing File Creation API rules on working copy JS/TS changes.
# Usage: ./scripts/jj-commit-with-file-api-check.sh -m "feat: message" [other jj commit args]
# Or create an alias in jj config, e.g.:
#   jj config set --user alias.c '["bash","scripts/jj-commit-with-file-api-check.sh"]'
# Then use: jj c -m "msg"
set -euo pipefail

LIB_DIR="$(dirname "$0")/lib"
if [ -f "$LIB_DIR/file_api_check.sh" ]; then
  # shellcheck disable=SC1091
  . "$LIB_DIR/file_api_check.sh"
else
  echo "⚠️  Shared library scripts/lib/file_api_check.sh not found; fallback to inline patterns." >&2
fi

# Collect changed JS/TS files in working copy relative to current checkout.
# We include modified, added, untracked (excluding ignored) files.
mapfile -t CHANGED < <(git ls-files -m -o --exclude-standard | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ ${#CHANGED[@]} -eq 0 ]; then
  echo "✅ No JavaScript/TypeScript working copy changes to check"
  jj commit "$@"
  exit 0
fi

if declare -f file_api_check >/dev/null 2>&1; then
  if ! file_api_check "${CHANGED[@]}"; then
    if [[ "${JJ_COMMIT_BYPASS:-}" == 1 ]]; then
      echo "⚠️  Bypass active; proceeding with jj commit." >&2
    else
      echo "❌ JJ commit blocked (set JJ_COMMIT_BYPASS=1 to override)." >&2
      exit 1
    fi
  fi
else
  echo "⚠️  No shared checker available; proceeding without enforcement." >&2
fi

jj commit "$@"
