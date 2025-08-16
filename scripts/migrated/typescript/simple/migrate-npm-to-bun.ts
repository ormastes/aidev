#!/usr/bin/env bun
/**
 * Migrated from: migrate-npm-to-bun.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.580Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to migrate from npm to bun
  console.log("Starting migration from npm to bun...");
  // Add bun to PATH
  process.env.PATH = ""$HOME/.bun/bin:$PATH"";
  // Replace npm commands in package.json files
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm install"/"bun install"/g' {} \;`;
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm i"/"bun i"/g' {} \;`;
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm run"/"bun run"/g' {} \;`;
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm test"/"bun test"/g' {} \;`;
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm build"/"bun build"/g' {} \;`;
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm start"/"bun start"/g' {} \;`;
  await $`find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm ci"/"bun install --frozen-lockfile"/g' {} \;`;
  // Replace npm commands in TypeScript and JavaScript files
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm install'/'bun install'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm install"/"bun install"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm i'/'bun i'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm i"/"bun i"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm run'/'bun run'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm run"/"bun run"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm test'/'bun test'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm test"/"bun test"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm build'/'bun build'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm build"/"bun build"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm start'/'bun start'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm start"/"bun start"/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm ci'/'bun install --frozen-lockfile'/g" {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm ci"/"bun install --frozen-lockfile"/g' {} \;`;
  // Replace npm commands in shell scripts
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm install/bun install/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm i/bun i/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm run/bun run/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm test/bun test/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm build/bun build/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm start/bun start/g' {} \;`;
  await $`find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm ci/bun install --frozen-lockfile/g' {} \;`;
  // Replace npm commands in markdown files
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm install/bun install/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm i/bun i/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm run/bun run/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm test/bun test/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm build/bun build/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm start/bun start/g' {} \;`;
  await $`find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm ci/bun install --frozen-lockfile/g' {} \;`;
  // Replace backtick npm commands
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm install/`bun install/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm i/`bun i/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm run/`bun run/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm test/`bun test/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm build/`bun build/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm start/`bun start/g' {} \;`;
  await $`find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm ci/`bun install --frozen-lockfile/g' {} \;`;
  console.log("Migration from npm to bun completed!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}