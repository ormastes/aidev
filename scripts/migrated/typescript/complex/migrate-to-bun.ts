#!/usr/bin/env bun
/**
 * Migrated from: migrate-to-bun.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.777Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to migrate setup folder from npm/bunx to Bun
  // This script replaces npm/bunx commands with Bun equivalents
  await $`set -e`;
  console.log("🚀 Migrating setup folder to use Bun instead of npm/npx...");
  // Create backup directory
  await $`BACKUP_DIR="setup_backup_$(date +%Y%m%d_%H%M%S)"`;
  console.log("📦 Creating backup in $BACKUP_DIR...");
  await copyFile("-r setup", ""$BACKUP_DIR"");
  // Function to replace npm/bunx with Bun equivalents
  await $`replace_npm_with_bun() {`;
  await $`local file=$1`;
  await $`local temp_file=$(mktemp)`;
  // Replace npm/bunx commands
  await $`sed -E \`;
  await $`-e 's/bun install/bun install/g' \`;
  await $`-e 's/bun install --frozen-lockfile/bun install --frozen-lockfile/g' \`;
  await $`-e 's/bun run /bun run /g' \`;
  await $`-e 's/bun start/bun start/g' \`;
  await $`-e 's/bun test/bun test/g' \`;
  await $`-e 's/bun build/bun build/g' \`;
  await $`-e 's/bunx /bunx /g' \`;
  await $`-e 's/command -v bun/command -v bun/g' \`;
  await $`-e 's/bun --version/bun --version/g' \`;
  await $`-e 's/"bun"/"bun"/g' \`;
  await $`-e 's/bun --version/bun --version/g' \`;
  await $`-e 's/Node\.js\/npm/Node.js\/Bun/g' \`;
  await $`"$file" > "$temp_file"`;
  // Only update if changes were made
  await $`if ! diff -q "$file" "$temp_file" > /dev/null; then`;
  await rename(""$temp_file"", ""$file"");
  console.log("✅ Updated: $file");
  } else {
  await $`rm "$temp_file"`;
  }
  await $`}`;
  // Find and update all relevant files
  console.log("🔍 Finding and updating files...");
  // Update shell scripts
  await $`find setup -type f -name "*.sh" | while read -r file; do`;
  await $`replace_npm_with_bun "$file"`;
  }
  // Update JavaScript/TypeScript test files
  await $`find setup -type f \( -name "*.js" -o -name "*.ts" \) | while read -r file; do`;
  await $`replace_npm_with_bun "$file"`;
  }
  // Update Markdown documentation
  await $`find setup -type f -name "*.md" | while read -r file; do`;
  await $`replace_npm_with_bun "$file"`;
  }
  // Update JSON configuration files
  await $`find setup -type f -name "*.json" | while read -r file; do`;
  await $`replace_npm_with_bun "$file"`;
  }
  // Update Dockerfiles
  await $`find setup -type f -name "Dockerfile*" | while read -r file; do`;
  await $`replace_npm_with_bun "$file"`;
  }
  // Update feature files
  await $`find setup -type f -name "*.feature" | while read -r file; do`;
  await $`replace_npm_with_bun "$file"`;
  }
  // Special case: Update package.json files to use Bun
  await $`find setup -type f -name "package.json" | while read -r file; do`;
  // Update scripts section to use bun
  await $`if grep -q '"scripts"' "$file"; then`;
  console.log("📝 Updating package.json scripts in: $file");
  // This would need more complex JSON parsing for production use
  // For now, just ensure the file exists
  }
  }
  console.log("");
  console.log("✨ Migration complete!");
  console.log("📋 Summary:");
  console.log("  - Backup created in: $BACKUP_DIR");
  console.log("  - bun install → bun install");
  console.log("  - bun install --frozen-lockfile → bun install --frozen-lockfile");
  console.log("  - bun run → bun run");
  console.log("  - bunx → bunx");
  console.log("");
  console.log("⚠️  Note: Please install Bun if not already installed:");
  console.log("  curl -fsSL https://bun.sh/install | bash");
  console.log("");
  console.log("To restore backup if needed:");
  console.log("  rm -rf setup && mv $BACKUP_DIR setup");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}