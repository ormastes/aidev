#!/usr/bin/env bun
/**
 * Migrated from: migrate-npx-to-bunx.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.788Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to migrate bunx commands to bunx
  // Excludes fraud-checker theme
  console.log("🔄 Migrating bunx to bunx...");
  console.log("=============================");
  // Count files before migration
  await $`BEFORE_COUNT=$(find . -type f \( -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.js" \) \`;
  await $`-not -path "*/node_modules/*" \`;
  await $`-not -path "*/.git/*" \`;
  await $`-not -path "*/fraud-checker/*" \`;
  await $`-not -path "*/infra_fraud-checker/*" \`;
  await $`-exec grep -l "bunx " {} \; 2>/dev/null | wc -l)`;
  console.log("📊 Files with bunx before migration: $BEFORE_COUNT");
  // List of files to update
  await $`FILES_TO_UPDATE=$(find . -type f \( -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.js" \) \`;
  await $`-not -path "*/node_modules/*" \`;
  await $`-not -path "*/.git/*" \`;
  await $`-not -path "*/fraud-checker/*" \`;
  await $`-not -path "*/infra_fraud-checker/*" \`;
  await $`-not -path "*/.venv/*" \`;
  await $`-not -path "*/dist/*" \`;
  await $`-not -path "*/build/*" \`;
  await $`-not -path "*/coverage/*" \`;
  await $`-exec grep -l "bunx " {} \; 2>/dev/null)`;
  await $`UPDATED_COUNT=0`;
  for (const file of [$FILES_TO_UPDATE; do]) {
  // Skip if file doesn't exist
  await $`[ ! -f "$file" ] && continue`;
  // Create backup
  await copyFile(""$file"", ""$file.bak.npx"");
  // Replace bunx with bunx
  await $`sed -i 's/\bnpx /bunx /g' "$file"`;
  // Check if file was actually modified
  await $`if ! diff -q "$file" "$file.bak.npx" > /dev/null; then`;
  console.log("✅ Updated: $file");
  await $`UPDATED_COUNT=$((UPDATED_COUNT + 1))`;
  // Remove backup if successful
  await $`rm "$file.bak.npx"`;
  } else {
  // Restore if no changes
  await $`rm "$file.bak.npx"`;
  }
  }
  // Count files after migration
  await $`AFTER_COUNT=$(find . -type f \( -name "*.sh" -o -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*.js" \) \`;
  await $`-not -path "*/node_modules/*" \`;
  await $`-not -path "*/.git/*" \`;
  await $`-not -path "*/fraud-checker/*" \`;
  await $`-not -path "*/infra_fraud-checker/*" \`;
  await $`-exec grep -l "bunx " {} \; 2>/dev/null | wc -l)`;
  console.log("");
  console.log("📊 Migration Summary:");
  console.log("  Files before: $BEFORE_COUNT");
  console.log("  Files updated: $UPDATED_COUNT");
  console.log("  Files after: $AFTER_COUNT");
  console.log("");
  if ($AFTER_COUNT -eq 0 ) {; then
  console.log("🎉 Migration complete! All bunx commands have been replaced with bunx.");
  } else {
  console.log("⚠️  $AFTER_COUNT files still contain bunx (likely in fraud-checker or were skipped)");
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}