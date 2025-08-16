#!/usr/bin/env bun
/**
 * Migrated from: cleanup-root.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.782Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Root Directory Cleanup Script
  // Ensures all files are in their proper locations according to FILE_STRUCTURE.vf.json
  console.log("🧹 Starting root directory cleanup...");
  // Create necessary directories
  await mkdir("gen/doc", { recursive: true });
  await mkdir("gen/test-output", { recursive: true });
  await mkdir("gen/test-results", { recursive: true });
  await mkdir("config/python", { recursive: true });
  await mkdir("deploy", { recursive: true });
  await mkdir("scripts/cli", { recursive: true });
  // Move documentation files to gen/doc
  console.log("📄 Moving documentation files...");
  for (const file of [FEATURE_STATUS_REPORT.md FINAL_IMPLEMENTATION_REPORT.md INFRASTRUCTURE_IMPLEMENTATION.md PLATFORM_STATUS.md; do]) {
  await $`[ -f "$file" ] && mv "$file" gen/doc/ && echo "  ✓ Moved $file"`;
  }
  // Move any other reports or status files
  await $`find . -maxdepth 1 -name "*REPORT*.md" -exec mv {} gen/doc/ \; 2>/dev/null`;
  await $`find . -maxdepth 1 -name "*STATUS*.md" -exec mv {} gen/doc/ \; 2>/dev/null`;
  await $`find . -maxdepth 1 -name "*IMPLEMENTATION*.md" -exec mv {} gen/doc/ \; 2>/dev/null`;
  // Move Python config files (only if they're not needed in root)
  console.log("🐍 Checking Python configuration files...");
  if (-f "Makefile.python" ) {; then
  await $`rm -f Makefile.python`;
  console.log("  ✓ Removed Makefile.python (duplicate)");
  }
  // Remove duplicate directories
  console.log("📁 Removing duplicate directories...");
  await $`[ -d "aidev" ] && rm -rf aidev/ && echo "  ✓ Removed duplicate aidev/ directory"`;
  await $`[ -d "playwright-tests" ] && rm -rf playwright-tests/ && echo "  ✓ Removed playwright-tests/"`;
  // Move deployment configs
  console.log("🚀 Organizing deployment configs...");
  if (-d "helm" ] || [ -d "k8s" ) {; then
  await mkdir("deploy", { recursive: true });
  await $`[ -d "helm" ] && mv helm deploy/ && echo "  ✓ Moved helm/ to deploy/"`;
  await $`[ -d "k8s" ] && mv k8s deploy/ && echo "  ✓ Moved k8s/ to deploy/"`;
  }
  // Move test outputs
  console.log("🧪 Moving test outputs...");
  await $`[ -d "test-output" ] && mv test-output gen/ && echo "  ✓ Moved test-output/"`;
  await $`[ -d "test-results" ] && mv test-results gen/ && echo "  ✓ Moved test-results/"`;
  // Clean up TypeScript files
  console.log("📝 Moving TypeScript files...");
  await $`[ -f "aidev-cli.ts" ] && mv aidev-cli.ts scripts/cli/ && echo "  ✓ Moved aidev-cli.ts"`;
  // Remove duplicate ConfigManager files
  console.log("🔧 Removing duplicate files...");
  for (const ext of [ts js d.ts d.ts.map js.map; do]) {
  await $`[ -f "ConfigManager.$ext" ] && rm -f "ConfigManager.$ext" && echo "  ✓ Removed ConfigManager.$ext"`;
  }
  // Remove unnecessary config files
  await $`[ -f "bunfig.toml" ] && rm -f bunfig.toml && echo "  ✓ Removed bunfig.toml"`;
  // Clean setup directory
  await $`[ -d "setup/theme_storage" ] && rm -rf setup/theme_storage && echo "  ✓ Removed setup/theme_storage"`;
  // List remaining files in root (for review)
  console.log("");
  console.log("📊 Files remaining in root directory:");
  console.log("====================================");
  await $`ls -la | grep -E "^-" | awk '{print "  • " $9}'`;
  console.log("");
  console.log("📁 Directories in root:");
  console.log("======================");
  await $`ls -la | grep -E "^d" | grep -v "^\." | awk '{print "  • " $9}'`;
  console.log("");
  console.log("✅ Root cleanup complete!");
  console.log("");
  console.log("Note: Some files MUST remain in root for tooling:");
  console.log("  • package.json (if using Node.js)");
  console.log("  • pyproject.toml (might need to stay for Python tools)");
  console.log("  • .gitignore and other dot files");
  console.log("  • Core vf.json files (FEATURE, TASK_QUEUE, etc.)");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}