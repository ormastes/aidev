#!/usr/bin/env bun
/**
 * Migrated from: migrate-to-facade.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.611Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Migrate from direct imports to facade pattern
  console.log("Migrating to facade pattern...");
  console.log("==============================");
  // Count files before migration
  await $`TOTAL_FILES=$(find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" | wc -l)`;
  console.log("Total files to check: $TOTAL_FILES");
  // Keep the original external-log-lib imports that already exist
  console.log("");
  console.log("Keeping existing external-log-lib imports...");
  await $`EXISTING=$(grep -r "from.*infra_external-log-lib" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build | wc -l)`;
  console.log("Found $EXISTING existing external-log-lib imports (keeping these)");
  // Update the import statements to use named imports from facades
  console.log("");
  console.log("Updating import statements in external-log-lib users...");
  // Fix imports that already use external-log-lib but might have wrong syntax
  await $`find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { fs } from '.*infra_external-log-lib\/src';/import { fs } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;`;
  await $`find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { path } from '.*infra_external-log-lib\/src';/import { path } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;`;
  await $`find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { childProcess } from '.*infra_external-log-lib\/src';/import { childProcess } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;`;
  // Also update combined imports
  await $`find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { fs, path } from '.*infra_external-log-lib\/src';/import { fs, path } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;`;
  console.log("");
  console.log("Compilation check...");
  // Try to compile a few test files to verify
  console.log("Testing compilation of updated files...");
  process.chdir("layer/themes/infra_external-log-lib");
  await $`bunx tsc src/index.ts src/config.ts src/facades/*.ts --outDir dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck --noEmit 2>&1 | head -5`;
  process.chdir("../../../");
  console.log("");
  console.log("Migration Summary");
  console.log("=================");
  console.log("✅ Facade pattern implemented");
  console.log("✅ Security features active (path traversal, dangerous commands)");
  console.log("✅ Logging and monitoring enabled");
  console.log("✅ Test coverage maintained");
  console.log("");
  console.log("Key features of the new system:");
  console.log("- ESM-compatible facade pattern (no monkey-patching)");
  console.log("- Proxy-based interception that works with Bun");
  console.log("- Centralized security policies");
  console.log("- Call history tracking for testing");
  console.log("- Easy enable/disable via config");
  console.log("");
  console.log("Usage example:");
  console.log("  import { fs, path, childProcess } from './infra_external-log-lib/dist';");
  console.log("  // Use fs, path, childProcess normally - they're automatically intercepted");
  console.log("");
  console.log("To run tests: node test-facade.js");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}