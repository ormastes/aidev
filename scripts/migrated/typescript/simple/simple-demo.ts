#!/usr/bin/env bun
/**
 * Migrated from: simple-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.578Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Simple demo script to test GUI selector server features
  await $`BASE_URL="http://localhost:3256"`;
  console.log("=== GUI Selector Server Feature Test ===");
  console.log("");
  // 1. Health check
  console.log("1. Health Check:");
  await $`curl -s $BASE_URL/api/health | jq .`;
  console.log("");
  // 2. List templates
  console.log("2. Available Templates:");
  await $`curl -s $BASE_URL/api/templates | jq '.[].name'`;
  console.log("");
  // 3. Get template preview
  console.log("3. Modern Dashboard Preview:");
  await $`curl -s $BASE_URL/api/templates/modern-01/preview | jq '{html: .html | length, css: .css | length, assets: .assets}'`;
  console.log("");
  // 4. Session login
  console.log("4. Session-based Login:");
  await $`curl -s -X POST $BASE_URL/api/auth/login \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"username":"admin","password":"admin123"}' \`;
  await $`-c /tmp/cookies.txt | jq .`;
  console.log("");
  // 5. JWT login
  console.log("5. JWT-based Login:");
  await $`JWT_RESPONSE=$(curl -s -X POST $BASE_URL/api/v2/auth/token \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{"username":"admin","password":"admin123"}')`;
  console.log("$JWT_RESPONSE | jq .");
  await $`ACCESS_TOKEN=$(echo $JWT_RESPONSE | jq -r .accessToken)`;
  console.log("");
  // 6. Create app
  console.log("6. Create App/Project:");
  await $`curl -s -X POST $BASE_URL/api/apps \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-H "Authorization: Bearer $ACCESS_TOKEN" \`;
  await $`-d '{"name":"Demo Calculator","description":"A demo calculator app"}' | jq .`;
  console.log("");
  // 7. List apps
  console.log("7. List Apps:");
  await $`curl -s $BASE_URL/api/apps \`;
  await $`-H "Authorization: Bearer $ACCESS_TOKEN" | jq .`;
  console.log("");
  // 8. Check external logs
  console.log("8. External Logs:");
  console.log("Logs should be in: ../../../95.child_project/external_log_lib/logs/gui-selector/");
  await $`ls -la ../../../95.child_project/external_log_lib/logs/gui-selector/ 2>/dev/null || echo "Log directory not found"`;
  console.log("");
  console.log("=== Feature Summary ===");
  console.log("✓ Health monitoring");
  console.log("✓ Template management with 4 categories");
  console.log("✓ Session-based authentication");
  console.log("✓ JWT-based authentication");
  console.log("✓ App/project management");
  console.log("✓ SQLite database persistence");
  console.log("✓ External logging integration");
  console.log("");
  console.log("Access the web UI at: http://localhost:3256");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}