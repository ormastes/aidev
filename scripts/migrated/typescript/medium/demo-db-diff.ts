#!/usr/bin/env bun
/**
 * Migrated from: demo-db-diff.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.598Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Database Diff Demo Script
  // Shows how to use the database diff feature
  console.log("===================================");
  console.log("🔍 Database Diff Feature Demo");
  console.log("===================================");
  console.log("");
  console.log("This demonstrates the database diff tracking feature");
  console.log("that captures before/after states of database changes");
  console.log("without persisting any modifications.");
  console.log("");
  console.log("Key Features:");
  console.log("✅ Transaction-based diffs with automatic rollback");
  console.log("✅ Zero data persistence - changes are not saved");
  console.log("✅ Row-level change detection");
  console.log("✅ Works with PostgreSQL, MySQL, MongoDB, Redis, SQLite");
  console.log("✅ Easy parseable JSONL output format");
  console.log("");
  console.log("===================================");
  console.log("Usage:");
  console.log("===================================");
  console.log("");
  console.log("1. Enable database diff tracking:");
  console.log("   export INTERCEPT_DB_DIFF=true");
  console.log("");
  console.log("2. Run your application with the preload script:");
  console.log("   node --require ./dist/logging/preload-interceptors.js app.js");
  console.log("");
  console.log("3. View diff logs in real-time:");
  console.log("   export INTERCEPT_CONSOLE=true");
  console.log("");
  console.log("4. Check log files:");
  console.log("   logs/intercepted/database-diff-*.jsonl");
  console.log("");
  console.log("===================================");
  console.log("Example Output:");
  console.log("===================================");
  console.log("");
  await $`cat << 'EOF'`;
  await $`{`;
  await $`"timestamp": "2024-01-20T10:30:00Z",`;
  await $`"type": "db-diff",`;
  await $`"database": "myapp",`;
  await $`"table": "users",`;
  await $`"operation": "UPDATE",`;
  await $`"summary": {`;
  await $`"rowsAdded": 0,`;
  await $`"rowsRemoved": 0,`;
  await $`"rowsModified": 1,`;
  await $`"columnsChanged": ["last_login"],`;
  await $`"totalChanges": 1`;
  await $`},`;
  await $`"changes": [`;
  await $`{`;
  await $`"type": "modified",`;
  await $`"path": "row[id:123].last_login",`;
  await $`"oldValue": null,`;
  await $`"newValue": "2024-01-20T10:30:00Z"`;
  await $`}`;
  await $`]`;
  await $`}`;
  await $`EOF`;
  console.log("");
  console.log("===================================");
  console.log("Try it now:");
  console.log("===================================");
  console.log("");
  console.log("npm run demo:db-diff");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}