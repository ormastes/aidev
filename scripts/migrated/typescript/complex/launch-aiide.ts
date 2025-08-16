#!/usr/bin/env bun
/**
 * Migrated from: launch-aiide.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.790Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // AIIDE Launch Script
  // Starts both the backend server and frontend development server
  console.log("🚀 Launching AIIDE - AI Integrated Development Environment");
  console.log("===========================================================");
  // Check if node_modules exists
  if (! -d "node_modules" ) {; then
  console.log("📦 Installing dependencies...");
  await $`npm install`;
  }
  // Check environment variables
  if (! -f ".env" ) {; then
  console.log("⚠️  No .env file found. Creating from template...");
  await copyFile(".env.example", ".env");
  console.log("✅ Created .env file. Please configure your API keys.");
  }
  // Start backend server in background
  console.log("🔧 Starting backend server...");
  await $`npm run server &`;
  await $`SERVER_PID=$!`;
  // Wait for server to be ready
  console.log("⏳ Waiting for server to be ready...");
  await Bun.sleep(3 * 1000);
  // Check if server is running
  await $`if ! curl -s http://localhost:3457/api/providers > /dev/null; then`;
  console.log("❌ Backend server failed to start");
  await $`kill $SERVER_PID 2>/dev/null`;
  process.exit(1);
  }
  console.log("✅ Backend server running on http://localhost:3457");
  // Start frontend dev server
  console.log("🎨 Starting frontend development server...");
  await $`npm run dev &`;
  await $`FRONTEND_PID=$!`;
  // Wait for frontend to be ready
  await Bun.sleep(5 * 1000);
  console.log("");
  console.log("✅ AIIDE is running!");
  console.log("");
  console.log("📍 Frontend: http://localhost:5173");
  console.log("📍 Backend:  http://localhost:3457");
  console.log("📍 API Docs: http://localhost:3457/api-docs");
  console.log("");
  console.log("Press Ctrl+C to stop all services");
  // Function to handle cleanup
  await $`cleanup() {`;
  console.log("");
  console.log("🛑 Stopping AIIDE services...");
  await $`kill $SERVER_PID 2>/dev/null`;
  await $`kill $FRONTEND_PID 2>/dev/null`;
  console.log("✅ AIIDE stopped");
  process.exit(0);
  await $`}`;
  // Set up trap to handle Ctrl+C
  await $`trap cleanup SIGINT SIGTERM`;
  // Wait for processes
  await $`wait $SERVER_PID $FRONTEND_PID`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}