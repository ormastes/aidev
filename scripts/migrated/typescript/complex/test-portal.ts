#!/usr/bin/env bun
/**
 * Migrated from: test-portal.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.791Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("Starting AI Dev Portal test...");
  // Start the server
  await $`node dist/server.js &`;
  await $`SERVER_PID=$!`;
  // Wait for server to start
  await Bun.sleep(2 * 1000);
  // Check if server is running
  await $`if ! curl -s http://localhost:3000/api/health > /dev/null; then`;
  console.log("❌ Server failed to start");
  await $`kill $SERVER_PID 2>/dev/null`;
  process.exit(1);
  }
  console.log("✅ Server started successfully on port 3000");
  console.log("");
  console.log("Portal features added:");
  console.log("✅ Left panel navigation with sections:");
  console.log("   - Projects, Features, Feature Progress, Tasks");
  console.log("   - GUI Selector, Story Reporter, Test Manual");
  console.log("");
  console.log("✅ Top selector bars for:");
  console.log("   - Theme filtering");
  console.log("   - Epic filtering");
  console.log("   - App filtering");
  console.log("");
  console.log("✅ Feature Progress Monitor showing:");
  console.log("   - Total features count");
  console.log("   - In Progress features count");
  console.log("   - Completed features count");
  console.log("   - Pending tasks count");
  console.log("   - Progress bars for each feature");
  console.log("");
  console.log("✅ Service integration frames for:");
  console.log("   - GUI Selector (http://localhost:3456)");
  console.log("   - Story Reporter (/services/story-reporter)");
  console.log("   - Test Manual (/services/manual)");
  console.log("");
  console.log("✅ VFS API endpoint for reading:");
  console.log("   - /api/vfs/FEATURE.vf.json");
  console.log("   - /api/vfs/TASK_QUEUE.vf.json");
  console.log("   - /api/vfs/NAME_ID.vf.json");
  console.log("");
  console.log("🌐 Portal is running at: http://localhost:3000");
  console.log("   Login with: admin/demo123, developer/demo123, or tester/demo123");
  console.log("");
  console.log("Press Ctrl+C to stop the server...");
  // Wait for user to stop
  await $`wait $SERVER_PID`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}