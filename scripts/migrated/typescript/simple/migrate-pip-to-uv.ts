#!/usr/bin/env bun
/**
 * Migrated from: migrate-pip-to-uv.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.585Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to migrate from pip to uv
  console.log("Starting migration from pip to uv...");
  // Replace pip commands in Python files (avoiding double replacement)
  await $`find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/\bpip install\b/uv pip install/g' {} \;`;
  await $`find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'\bpip install\b'/'uv pip install'/g" {} \;`;
  await $`find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"\bpip install\b"/"uv pip install"/g' {} \;`;
  await $`find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`\bpip install\b/`uv pip install/g' {} \;`;
  // Replace pip commands in shell scripts
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python -m uv pip install/uv uv pip install/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python3 -m uv pip install/uv uv pip install/g' {} \;`;
  // Replace pip commands in TypeScript and JavaScript files
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'uv pip install'/'uv uv pip install'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"uv pip install"/"uv uv pip install"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`uv pip install/`uv uv pip install/g' {} \;`;
  // Replace pip commands in markdown files
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python -m uv pip install/uv uv pip install/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python3 -m uv pip install/uv uv pip install/g' {} \;`;
  // Replace requirements.txt references
  await $`find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install -r requirements.txt/uv uv pip install -r requirements.txt/g' {} \;`;
  await $`find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'uv pip install -r requirements.txt'/'uv uv pip install -r requirements.txt'/g" {} \;`;
  await $`find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"uv pip install -r requirements.txt"/"uv uv pip install -r requirements.txt"/g' {} \;`;
  // Replace in pyproject.toml files
  await $`find . -name "pyproject.toml" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;`;
  // Replace pip freeze commands
  await $`find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/pip freeze/uv pip freeze/g' {} \;`;
  await $`find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/pip list/uv pip list/g' {} \;`;
  console.log("Migration from pip to uv completed!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}