#!/usr/bin/env bun
/**
 * Migrated from: fix-remaining-direct-imports.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.768Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("Fixing remaining direct Node.js imports...");
  console.log("==========================================");
  // First compile the external-log-lib if not already done
  console.log("Ensuring external-log-lib is compiled...");
  process.chdir("layer/themes/infra_external-log-lib");
  await mkdir("dist", { recursive: true });
  await $`bunx tsc src/config.ts src/facades/*.ts src/index.ts --outDir ./dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck 2>/dev/null`;
  process.chdir("../../../");
  // Function to calculate relative path
  await $`get_relative_path() {`;
  await $`local file_dir=$(dirname "$1")`;
  await $`local target="layer/themes/infra_external-log-lib/dist"`;
  // Count how many directories up we need to go
  await $`local depth=$(echo "$file_dir" | tr '/' '\n' | wc -l)`;
  await $`local up_dirs=""`;
  // Build the relative path
  if ([ "$file_dir" == "." ]) {; then
  console.log("./$target");
  await $`elif [[ "$file_dir" == *"layer/themes"* ]]; then`;
  // For files in layer/themes, calculate relative path
  await $`local rel_path=$(realpath --relative-to="$file_dir" "$target" 2>/dev/null || echo "../../../infra_external-log-lib/dist")`;
  console.log("$rel_path");
  } else {
  // For other files, use a standard path
  await $`local slashes=$(echo "$file_dir" | sed 's/[^/]//g' | wc -c)`;
  await $`for ((i=1; i<$slashes; i++)); do`;
  await $`up_dirs="../$up_dirs"`;
  }
  console.log("${up_dirs}layer/themes/infra_external-log-lib/dist");
  }
  await $`}`;
  // Arrays to track changes
  await $`declare -a fixed_files=()`;
  await $`declare -i fs_count=0`;
  await $`declare -i path_count=0`;
  await $`declare -i cp_count=0`;
  console.log("");
  console.log("Processing files...");
  // Fix fs imports
  for (const file of [$(grep -l "import.*from ['\"]fs['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do]) {
  if ([ "$file" == *"infra_external-log-lib"* ]) {; then
  await $`continue  # Skip the external-log-lib itself`;
  }
  await $`rel_path=$(get_relative_path "$file")`;
  // Replace various fs import patterns
  await $`sed -i "s/import \* as fs from 'fs';/import { fs } from '$rel_path';/g" "$file"`;
  await $`sed -i "s/import fs from 'fs';/import { fs } from '$rel_path';/g" "$file"`;
  await $`sed -i "s/import { promises as fs } from 'fs';/import { fsPromises as fs } from '$rel_path';/g" "$file"`;
  await $`sed -i "s/import { readFile, writeFile } from 'fs\/promises';/import { fsPromises } from '$rel_path';\nconst { readFile, writeFile } = fsPromises;/g" "$file"`;
  await $`fixed_files+=("$file")`;
  await $`((fs_count++))`;
  }
  // Fix path imports
  for (const file of [$(grep -l "import.*from ['\"]path['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do]) {
  if ([ "$file" == *"infra_external-log-lib"* ]) {; then
  await $`continue`;
  }
  await $`rel_path=$(get_relative_path "$file")`;
  await $`sed -i "s/import \* as path from 'path';/import { path } from '$rel_path';/g" "$file"`;
  await $`sed -i "s/import path from 'path';/import { path } from '$rel_path';/g" "$file"`;
  await $`sed -i "s/import { join, resolve } from 'path';/import { path } from '$rel_path';\nconst { join, resolve } = path;/g" "$file"`;
  await $`((path_count++))`;
  }
  // Fix child_process imports
  for (const file of [$(grep -l "import.*from ['\"]child_process['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do]) {
  if ([ "$file" == *"infra_external-log-lib"* ]) {; then
  await $`continue`;
  }
  await $`rel_path=$(get_relative_path "$file")`;
  await $`sed -i "s/import \* as child_process from 'child_process';/import { childProcess } from '$rel_path';/g" "$file"`;
  await $`sed -i "s/import { exec, execSync } from 'child_process';/import { childProcess } from '$rel_path';\nconst { exec, execSync } = childProcess;/g" "$file"`;
  await $`sed -i "s/import { spawn } from 'child_process';/import { childProcess } from '$rel_path';\nconst { spawn } = childProcess;/g" "$file"`;
  await $`((cp_count++))`;
  }
  console.log("");
  console.log("Migration Results");
  console.log("=================");
  console.log("✅ Fixed $fs_count files with fs imports");
  console.log("✅ Fixed $path_count files with path imports");
  console.log("✅ Fixed $cp_count files with child_process imports");
  console.log("");
  console.log("Total files updated: $((fs_count + path_count + cp_count))");
  // Check for any remaining direct imports
  console.log("");
  console.log("Checking for remaining direct imports...");
  await $`remaining_fs=$(grep -r "from ['\"]fs['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)`;
  await $`remaining_path=$(grep -r "from ['\"]path['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)`;
  await $`remaining_cp=$(grep -r "from ['\"]child_process['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)`;
  if ([ $remaining_fs -eq 0 && $remaining_path -eq 0 && $remaining_cp -eq 0 ]) {; then
  console.log("✅ All direct imports have been fixed!");
  } else {
  console.log("⚠️  Some direct imports remain:");
  await $`[[ $remaining_fs -gt 0 ]] && echo "  - fs: $remaining_fs"`;
  await $`[[ $remaining_path -gt 0 ]] && echo "  - path: $remaining_path"`;
  await $`[[ $remaining_cp -gt 0 ]] && echo "  - child_process: $remaining_cp"`;
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}