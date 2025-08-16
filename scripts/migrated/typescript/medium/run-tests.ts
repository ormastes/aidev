#!/usr/bin/env bun
/**
 * Migrated from: run-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.616Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // MCP Docker Test Runner Script
  // Runs all MCP tests in Docker containers
  await $`set -e`;
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`PROJECT_DIR="$(dirname "$SCRIPT_DIR")"`;
  console.log("🚀 MCP Docker Test Suite");
  console.log("========================");
  console.log("");
  // Build Docker images
  console.log("📦 Building Docker images...");
  await $`docker-compose -f "$PROJECT_DIR/docker-compose.yml" build`;
  // Create results directory
  await mkdir(""$PROJECT_DIR/results"", { recursive: true });
  // Run tests for each mode
  console.log("");
  console.log("🧪 Running tests...");
  console.log("");
  // Test strict mode
  console.log("Testing STRICT mode...");
  await $`docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-strict`;
  // Test enhanced mode
  console.log("");
  console.log("Testing ENHANCED mode...");
  await $`docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-enhanced`;
  // Test basic mode
  console.log("");
  console.log("Testing BASIC mode...");
  await $`docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-basic`;
  // Collect results
  console.log("");
  console.log("📊 Collecting results...");
  await $`"$SCRIPT_DIR/collect-results.sh"`;
  // Generate final report
  console.log("");
  console.log("📄 Generating final report...");
  await $`"$SCRIPT_DIR/generate-report.sh"`;
  // Cleanup
  console.log("");
  console.log("🧹 Cleaning up...");
  await $`docker-compose -f "$PROJECT_DIR/docker-compose.yml" down`;
  console.log("");
  console.log("✅ Test suite complete!");
  console.log("Results available in: $PROJECT_DIR/results/");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}