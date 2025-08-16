#!/usr/bin/env bun
/**
 * Migrated from: verify-bun-setup.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.780Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to verify Bun setup and configuration
  console.log("🔍 Verifying Bun Setup in Setup Folder");
  console.log("=======================================");
  console.log("");
  // Check if Bun is installed
  await $`if command -v bun &> /dev/null; then`;
  console.log("✅ Bun is installed: $(bun --version)");
  } else {
  console.log("❌ Bun is not installed");
  console.log("   To install: curl -fsSL https://bun.sh/install | bash");
  }
  console.log("");
  console.log("📊 npm/bunx vs Bun usage in setup folder:");
  console.log("----------------------------------------");
  // Count npm references
  await $`npm_count=$(grep -r "\bnpm\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)`;
  await $`npx_count=$(grep -r "\bnpx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)`;
  await $`bun_count=$(grep -r "\bbun\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | grep -v "ubuntu" | wc -l)`;
  await $`bunx_count=$(grep -r "\bbunx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)`;
  console.log("  npm references:  $npm_count");
  console.log("  bunx references:  $npx_count");
  console.log("  bun references:  $bun_count");
  console.log("  bunx references: $bunx_count");
  console.log("");
  console.log("📁 Files still containing npm/npx:");
  console.log("----------------------------------");
  await $`grep -r "\bnpm\b\|\bnpx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | cut -d: -f1 | sort | uniq | head -10`;
  console.log("");
  console.log("✨ Configuration Files:");
  console.log("----------------------");
  // Check for bunfig.toml
  if (-f "bunfig.toml" ) {; then
  console.log("✅ bunfig.toml exists");
  } else {
  console.log("❌ bunfig.toml not found");
  }
  // Check for bun.lockb
  if (-f "bun.lockb" ) {; then
  console.log("✅ bun.lockb exists (Bun lockfile)");
  } else {
  console.log("⚠️  bun.lockb not found (will be created on first 'bun install')");
  }
  console.log("");
  console.log("🎯 Recommendation:");
  console.log("-----------------");
  if ($npm_count -gt 0 ] || [ $npx_count -gt 0 ) {; then
  console.log("There are still $((npm_count + npx_count)) references to npm/bunx in the setup folder.");
  console.log("Most are in comments or documentation, which is acceptable.");
  console.log("Critical script files have been migrated to use Bun.");
  } else {
  console.log("All npm/bunx references have been replaced with Bun equivalents!");
  }
  console.log("");
  console.log("📝 Next Steps:");
  console.log("-------------");
  console.log("1. Install Bun if not already installed:");
  console.log("   curl -fsSL https://bun.sh/install | bash");
  console.log("");
  console.log("2. Test the setup with Bun:");
  console.log("   cd setup/hello_world_tests/typescript-cli");
  console.log("   bun install");
  console.log("   bun test");
  console.log("");
  console.log("3. Remove the backup if everything works:");
  console.log("   rm -rf setup_backup_*");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}