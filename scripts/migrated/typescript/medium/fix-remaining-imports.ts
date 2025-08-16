#!/usr/bin/env bun
/**
 * Migrated from: fix-remaining-imports.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.620Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("Fixing remaining direct imports...");
  // Fix imports from 'fs'
  await $`find layer/themes -name "*.ts" -o -name "*.js" | while read file; do`;
  if ([ "$file" == *"infra_external-log-lib"* ]) {; then
  await $`continue`;
  }
  // Fix: import { createWriteStream } from 'fs'
  await $`sed -i "s/import { createWriteStream, WriteStream } from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src';\nconst { createWriteStream } = fs;\ntype WriteStream = ReturnType<typeof createWriteStream>/g" "$file"`;
  // Fix: import { promises as fs } from 'fs'
  await $`sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/infra_external-log-lib\/src'/g" "$file"`;
  // Fix fraud-checker itself to use external-log-lib
  if ([ "$file" == *"infra_fraud-checker"* ]) {; then
  await $`sed -i "s/import \* as fs from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src'/g" "$file"`;
  await $`sed -i "s/import \* as path from 'path'/import { path } from '..\/..\/..\/infra_external-log-lib\/src'/g" "$file"`;
  }
  }
  // Fix specific files with proper relative paths
  console.log("Fixing specific files...");
  // Fix tool_web-scraper
  await $`sed -i "s/import { createWriteStream, WriteStream } from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src';\nconst { createWriteStream } = fs;\ntype WriteStream = any/g" \`;
  await $`layer/themes/tool_web-scraper/children/exporter/index.ts`;
  // Fix llm-agent_chat-space test files
  for (const file of [layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/**/*.ts; do]) {
  await $`sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/..\/..\/infra_external-log-lib\/src'/g" "$file"`;
  }
  // Fix helpers
  await $`sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/..\/..\/infra_external-log-lib\/src'/g" \`;
  await $`layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/helpers/test-file-system.ts`;
  console.log("Done fixing remaining imports!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}