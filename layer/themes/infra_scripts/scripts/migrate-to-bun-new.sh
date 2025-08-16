#!/usr/bin/env bash
# Migration to bun wrapper - delegates to TypeScript implementation
# Maximum 10 lines for security compliance

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for bun and run TypeScript implementation
if ! command -v bun &> /dev/null; then
    echo "Error: bun is required. Install: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
exec bun run "$SCRIPT_DIR/migrate-to-bun.ts" "$@"