#!/usr/bin/env bun
/**
 * Migrated from: deploy-secure-platform.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.719Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Deploy AI Development Platform with Security
  // Runs all components with Bun and security features enabled
  await $`set -e`;
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║   AI Development Platform - Secure Deployment   ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log("");
  // Check for Bun
  await $`if ! command -v bun &> /dev/null; then`;
  console.log("-e ");${RED}❌ Bun is not installed${NC}"
  console.log("Install Bun with: curl -fsSL https://bun.sh/install | bash");
  process.exit(1);
  }
  console.log("-e ");${GREEN}✅ Bun $(bun --version) found${NC}"
  console.log("");
  // Environment setup
  process.env.NODE_ENV = "${NODE_ENV:-production}";
  process.env.JWT_ACCESS_SECRET = "${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}";
  process.env.JWT_REFRESH_SECRET = "${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}";
  process.env.ALLOWED_ORIGINS = "${ALLOWED_ORIGINS:-"http://localhost:3000,http://localhost:3456,http://localhost:8080"}";
  console.log("🔐 Security Configuration:");
  console.log("   NODE_ENV: $NODE_ENV");
  console.log("   JWT configured: ✅");
  console.log("   CORS origins: $ALLOWED_ORIGINS");
  console.log("");
  // Component configuration
  await $`COMPONENTS=(`;
  await $`"GUI_SELECTOR:release/gui-selector-portal:3465:src/server.ts"`;
  await $`"GUI_SERVER:_aidev:3457:50.src/51.ui/gui-server-secure.ts"`;
  await $`"MONITORING:monitoring:3000:dashboard-server-secure.ts"`;
  await $`"AI_PORTAL:_aidev:8080:50.src/51.ui/ai-dev-portal-secure.ts"`;
  await $`)`;
  // Function to start a component
  await $`start_component() {`;
  await $`local name=$1`;
  await $`local dir=$2`;
  await $`local port=$3`;
  await $`local script=$4`;
  console.log("-e ");${BLUE}Starting $name on port $port...${NC}"
  if (-d "$dir" ) {; then
  process.chdir(""$dir"");
  // Install dependencies if needed
  if (! -d "node_modules" ) {; then
  console.log("   Installing dependencies...");
  await $`bun install --silent`;
  }
  // Start with Bun in background
  await $`PORT=$port bun $script > /tmp/${name}.log 2>&1 &`;
  await $`local pid=$!`;
  await Bun.sleep(2 * 1000);
  // Check if running
  await $`if kill -0 $pid 2>/dev/null; then`;
  console.log("-e ");${GREEN}   ✅ $name started (PID: $pid)${NC}"
  console.log("$pid > /tmp/${name}.pid");
  } else {
  console.log("-e ");${RED}   ❌ $name failed to start${NC}"
  await $`cat /tmp/${name}.log`;
  }
  process.chdir("- > /dev/null");
  } else {
  console.log("-e ");${YELLOW}   ⚠️  $name directory not found: $dir${NC}"
  }
  console.log("");
  await $`}`;
  // Function to stop all components
  await $`stop_all() {`;
  console.log("Stopping all components...");
  for (const component of ["${COMPONENTS[@]}"; do]) {
  await $`IFS=':' read -r name dir port script <<< "$component"`;
  if (-f "/tmp/${name}.pid" ) {; then
  await $`kill $(cat /tmp/${name}.pid) 2>/dev/null || true`;
  await $`rm /tmp/${name}.pid`;
  console.log("   Stopped $name");
  }
  }
  await $`}`;
  // Handle Ctrl+C
  await $`trap stop_all INT TERM`;
  // Parse command
  await $`case "${1:-start}" in`;
  await $`start)`;
  console.log("🚀 Starting all components...");
  console.log("");
  for (const component of ["${COMPONENTS[@]}"; do]) {
  await $`IFS=':' read -r name dir port script <<< "$component"`;
  await $`start_component "$name" "$dir" "$port" "$script"`;
  }
  console.log("════════════════════════════════════════════════");
  console.log("🎉 Platform deployed successfully!");
  console.log("");
  console.log("📍 Access Points:");
  console.log("   AI Dev Portal:       http://localhost:8080 (Main Entry)");
  console.log("   GUI Selector Portal: http://localhost:3465");
  console.log("   GUI Design Server:   http://localhost:3457");
  console.log("   Monitoring Dashboard: http://localhost:3000");
  console.log("");
  console.log("🔒 Security Features Active:");
  console.log("   ✅ All security headers enabled");
  console.log("   ✅ CSRF protection active");
  console.log("   ✅ Rate limiting configured");
  console.log("   ✅ XSS protection enabled");
  console.log("   ✅ Input sanitization active");
  console.log("");
  console.log("Press Ctrl+C to stop all services");
  // Keep script running
  while (true; do) {
  await Bun.sleep(60 * 1000);
  console.log("-n ");."
  }
  await $`;;`;
  await $`stop)`;
  await $`stop_all`;
  console.log("✅ All components stopped");
  await $`;;`;
  await $`restart)`;
  await $`$0 stop`;
  await Bun.sleep(2 * 1000);
  await $`$0 start`;
  await $`;;`;
  await $`status)`;
  console.log("Component Status:");
  for (const component of ["${COMPONENTS[@]}"; do]) {
  await $`IFS=':' read -r name dir port script <<< "$component"`;
  if (-f "/tmp/${name}.pid" ) { && kill -0 $(cat /tmp/${name}.pid) 2>/dev/null; then
  console.log("-e ");   ${GREEN}✅ $name: Running (PID: $(cat /tmp/${name}.pid))${NC}"
  } else {
  console.log("-e ");   ${RED}❌ $name: Not running${NC}"
  }
  }
  await $`;;`;
  await $`test)`;
  console.log("🧪 Testing security features...");
  console.log("");
  // Test each component
  for (const component of ["${COMPONENTS[@]}"; do]) {
  await $`IFS=':' read -r name dir port script <<< "$component"`;
  console.log("Testing $name on port $port...");
  // Check if running
  await $`response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/api/health 2>/dev/null || echo "000")`;
  if ("$response" == "200" ] || [ "$response" == "404" ) {; then
  console.log("-e ");${GREEN}   ✅ $name responding${NC}"
  // Check security headers
  await $`headers=$(curl -sI http://localhost:$port | grep -i "x-content-type\|x-frame\|strict-transport" | wc -l)`;
  if ($headers -gt 0 ) {; then
  console.log("-e ");${GREEN}   ✅ Security headers present${NC}"
  } else {
  console.log("-e ");${YELLOW}   ⚠️  Some security headers missing${NC}"
  }
  } else {
  console.log("-e ");${RED}   ❌ $name not responding (HTTP $response)${NC}"
  }
  console.log("");
  }
  await $`;;`;
  await $`*)`;
  console.log("Usage: $0 {start|stop|restart|status|test}");
  console.log("");
  console.log("Commands:");
  console.log("  start   - Start all components");
  console.log("  stop    - Stop all components");
  console.log("  restart - Restart all components");
  console.log("  status  - Check component status");
  console.log("  test    - Test security features");
  process.exit(1);
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}