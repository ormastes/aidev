#!/usr/bin/env bun
/**
 * Migrated from: install-git-hooks.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.794Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Install Git hooks for File Creation API enforcement
  await $`HOOKS_DIR=".git/hooks"`;
  await $`PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"`;
  console.log("📦 Installing Git hooks for File Creation API enforcement...");
  // Check if .git directory exists
  if (! -d ".git" ) {; then
  console.log("❌ Not a git repository. Please run from project root.");
  process.exit(1);
  }
  // Create hooks directory if it doesn't exist
  if (! -d "$HOOKS_DIR" ) {; then
  await mkdir(""$HOOKS_DIR"", { recursive: true });
  }
  // Check if pre-commit hook already exists
  if (-f "$PRE_COMMIT_HOOK" ) {; then
  console.log("⚠️  Pre-commit hook already exists. Creating backup...");
  await copyFile(""$PRE_COMMIT_HOOK" "$PRE_COMMIT_HOOK.backup.$(date", "+%Y%m%d%H%M%S)"");
  }
  // Create pre-commit hook
  await $`cat > "$PRE_COMMIT_HOOK" << 'EOF'`;
  // Pre-commit hook for File Creation API enforcement
  // Run the file API check
  if (-f "scripts/pre-commit-file-api.sh" ) {; then
  await $`bash scripts/pre-commit-file-api.sh`;
  await $`RESULT=$?`;
  if ($RESULT -ne 0 ) {; then
  await $`exit $RESULT`;
  }
  }
  // Run other checks if needed (e.g., linting, tests)
  // Add your other pre-commit checks here
  process.exit(0);
  await $`EOF`;
  // Make hook executable
  await $`chmod +x "$PRE_COMMIT_HOOK"`;
  console.log("✅ Git hooks installed successfully!");
  console.log("");
  console.log("The pre-commit hook will now check for direct file system access in staged files.");
  console.log("To bypass the check (not recommended), use: git commit --no-verify");
  console.log("");
  console.log("To uninstall, run: rm $PRE_COMMIT_HOOK");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}