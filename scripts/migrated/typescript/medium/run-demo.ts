#!/usr/bin/env bun
/**
 * Migrated from: run-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.615Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Story Reporter + AI Dev Portal Demo Runner
  console.log("================================================");
  console.log("Story Reporter + AI Dev Portal Integration Demo");
  console.log("================================================");
  console.log("");
  // Set environment variables (optional)
  process.env.AI_DEV_PORTAL_HOST = "${AI_DEV_PORTAL_HOST:-localhost}";
  process.env.AI_DEV_PORTAL_PORT = "${AI_DEV_PORTAL_PORT:-3456}";
  console.log("Configuration:");
  console.log("- AI Dev Portal Host: $AI_DEV_PORTAL_HOST");
  console.log("- AI Dev Portal Port: $AI_DEV_PORTAL_PORT");
  console.log("");
  // Check if ai_dev_portal is running
  console.log("Checking AI Dev Portal connection...");
  await $`nc -z $AI_DEV_PORTAL_HOST $AI_DEV_PORTAL_PORT 2>/dev/null`;
  if ($? -eq 0 ) {; then
  console.log("✓ AI Dev Portal is running");
  } else {
  console.log("⚠ AI Dev Portal is not running (demo will simulate responses)");
  }
  console.log("");
  // Run the story reporter
  console.log("Starting Story Reporter...");
  console.log("------------------------");
  await $`node story-reporter.js`;
  // Check if report was generated
  await $`REPORT_FILE=$(ls -t story-report-*.json 2>/dev/null | head -1)`;
  if (-n "$REPORT_FILE" ) {; then
  console.log("");
  console.log("Latest report file: $REPORT_FILE");
  console.log("");
  console.log("Report contents:");
  console.log("----------------");
  await $`cat "$REPORT_FILE"`;
  }
  console.log("");
  console.log("Demo completed!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}