#!/usr/bin/env bun
/**
 * Migrated from: setup-demo-mcp.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.697Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup and Test Enhanced MCP Server Demo
  // This script creates a demo environment and installs the enhanced MCP server
  await $`set -e`;
  console.log("🚀 Setting up Enhanced MCP Demo Environment");
  console.log("===========================================");
  // Get script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  // Create demo directory
  await $`DEMO_DIR="/tmp/mcp-demo-$(date +%s)"`;
  console.log("📁 Creating demo directory: $DEMO_DIR");
  await mkdir(""$DEMO_DIR"", { recursive: true });
  // Initialize demo environment
  console.log("📋 Initializing demo environment structure...");
  await $`cat > "$DEMO_DIR/init-demo.js" << 'EOF'`;
  await $`const fs = require('fs').promises;`;
  await $`const path = require('path');`;
  await $`async function initDemo() {`;
  await $`const demoDir = process.argv[2] || process.cwd();`;
  // Create directory structure
  await $`const dirs = [`;
  await $`'layer/themes/infra_filesystem-mcp/children',`;
  await $`'layer/themes/infra_filesystem-mcp/tests',`;
  await $`'layer/themes/infra_filesystem-mcp/schemas',`;
  await $`'gen/doc',`;
  await $`'gen/history/retrospect',`;
  await $`'temp'`;
  await $`];`;
  await $`for (const dir of dirs) {`;
  await $`await await fileAPI.createDirectory(path.join(demoDir), { recursive: true });`;
  await $`}`;
  // Create required JSON files
  await $`const taskQueue = {`;
  await $`taskQueues: {`;
  await $`critical: [],`;
  await $`high: [],`;
  await $`medium: [],`;
  await $`low: [],`;
  await $`completed: []`;
  await $`},`;
  await $`working: [],`;
  await $`metadata: {`;
  await $`totalTasks: 0,`;
  await $`lastUpdated: new Date().toISOString()`;
  await $`}`;
  await $`};`;
  await $`const features = {`;
  await $`metadata: { level: 'root', version: '1.0.0' },`;
  await $`features: {`;
  await $`platform: [],`;
  await $`infrastructure: []`;
  await $`}`;
  await $`};`;
  await $`const artifacts = {`;
  await $`metadata: { version: '1.0.0', artifact_count: 0 },`;
  await $`artifacts: []`;
  await $`};`;
  await $`await fs.writeFile(`;
  await $`path.join(demoDir, 'TASK_QUEUE.vf.json'),`;
  await $`JSON.stringify(taskQueue, null, 2)`;
  await $`);`;
  await $`await fs.writeFile(`;
  await $`path.join(demoDir, 'FEATURE.vf.json'),`;
  await $`JSON.stringify(features, null, 2)`;
  await $`);`;
  await $`await fs.writeFile(`;
  await $`path.join(demoDir, 'ARTIFACTS.vf.json'),`;
  await $`JSON.stringify(artifacts, null, 2)`;
  await $`);`;
  // Create CLAUDE.md
  await $`await await fileAPI.createFile(`;
  await $`path.join(demoDir, 'CLAUDE.md'), { type: FileType.TEMPORARY });`;
  await $`console.log('✅ Demo environment initialized');`;
  await $`}`;
  await $`initDemo().catch(console.error);`;
  await $`EOF`;
  await $`node "$DEMO_DIR/init-demo.js" "$DEMO_DIR"`;
  // Copy necessary files
  console.log("📦 Copying MCP server files...");
  await copyFile("-r "$PROJECT_ROOT/dist" "$DEMO_DIR/dist" 2>/dev/null || echo "⚠️  No dist folder found, will", "build"");
  await copyFile("-r "$PROJECT_ROOT/src" "$DEMO_DIR/src" 2>/dev/null || echo "⚠️  No src folder", "found"");
  await copyFile(""$PROJECT_ROOT/package.json"", ""$DEMO_DIR/package.json"");
  await copyFile(""$PROJECT_ROOT/mcp-server-enhanced.js"", ""$DEMO_DIR/mcp-server-enhanced.js"");
  // Copy schema files
  await mkdir(""$DEMO_DIR/layer/themes/infra_filesystem-mcp/schemas"", { recursive: true });
  if (-f "$PROJECT_ROOT/schemas/artifact_patterns.json" ) {; then
  await copyFile(""$PROJECT_ROOT/schemas/artifact_patterns.json"", ""$DEMO_DIR/layer/themes/infra_filesystem-mcp/schemas/"");
  }
  // Build if needed
  if (! -d "$DEMO_DIR/dist" ) {; then
  console.log("🔨 Building TypeScript files...");
  process.chdir(""$PROJECT_ROOT"");
  await $`npm run build`;
  await copyFile("-r "$PROJECT_ROOT/dist"", ""$DEMO_DIR/dist"");
  }
  // Create test script
  console.log("🧪 Creating test script...");
  await $`cat > "$DEMO_DIR/test-mcp.js" << 'EOF'`;
  await $`const EnhancedFilesystemMCPServer = require('./mcp-server-enhanced.js');`;
  await $`async function testMCP() {`;
  await $`console.log('\n🧪 Testing Enhanced MCP Server\n');`;
  await $`const server = new EnhancedFilesystemMCPServer(process.cwd(), true);`;
  // Test 1: Startup
  await $`console.log('Test 1: Startup');`;
  await $`const startup = await server.handleRequest('vf_startup', {});`;
  await $`console.log('✅ Startup:', startup.status === 'ready' ? 'PASSED' : 'FAILED');`;
  await $`console.log('   Features:', Object.keys(startup.features).join(', '));`;
  // Test 2: Try to push task without artifacts (should be refused)
  await $`console.log('\nTest 2: Push task requiring artifacts (should be refused)');`;
  await $`const pushResult = await server.handleRequest('vf_push_task_validated', {`;
  await $`task: {`;
  await $`id: 'deploy-test',`;
  await $`type: 'deployment',`;
  await $`content: { title: 'Deploy feature' },`;
  await $`artifactRequirements: [`;
  await $`{ type: 'source_code', minCount: 1, mustExist: true },`;
  await $`{ type: 'test_code', minCount: 1, mustExist: true }`;
  await $`],`;
  await $`status: 'pending'`;
  await $`},`;
  await $`priority: 'high'`;
  await $`});`;
  await $`console.log('✅ Validation:', pushResult.allowed === false ? 'CORRECTLY REFUSED' : 'FAILED');`;
  await $`if (pushResult.errors) {`;
  await $`console.log('   Errors:', pushResult.errors.join('; '));`;
  await $`}`;
  // Test 3: Save artifact with adhoc type (requires reason)
  await $`console.log('\nTest 3: Save adhoc artifact without reason (should be refused)');`;
  await $`const adhocResult = await server.handleRequest('vf_save_artifact', {`;
  await $`content: 'test content',`;
  await $`type: 'adhoc'`;
  await $`});`;
  await $`console.log('✅ Adhoc validation:', adhocResult.success === false ? 'CORRECTLY REFUSED' : 'FAILED');`;
  await $`console.log('   Message:', adhocResult.message);`;
  // Test 4: Save proper artifact
  await $`console.log('\nTest 4: Save source code artifact');`;
  await $`const saveResult = await server.handleRequest('vf_save_artifact', {`;
  await $`content: 'export class TestClass {}',`;
  await $`type: 'source_code',`;
  await $`metadata: { state: 'draft' }`;
  await $`});`;
  await $`console.log('✅ Save artifact:', saveResult.success ? 'PASSED' : 'FAILED');`;
  // Test 5: Get queue status
  await $`console.log('\nTest 5: Get queue status');`;
  await $`const status = await server.handleRequest('vf_get_queue_status', {});`;
  await $`console.log('✅ Queue status:');`;
  await $`console.log('   Total tasks:', status.totalTasks);`;
  await $`console.log('   Ready tasks:', status.readyTasks);`;
  await $`console.log('   Blocked tasks:', status.blockedTasks);`;
  await $`console.log('   Invalid tasks:', status.invalidTasks);`;
  // Test 6: Validate task queue
  await $`console.log('\nTest 6: Validate entire task queue');`;
  await $`const validation = await server.handleRequest('vf_validate_task_queue', {});`;
  await $`console.log('✅ Queue validation:', validation.isValid ? 'VALID' : 'INVALID');`;
  await $`console.log('   Has circular dependencies:', validation.hasCircularDependencies);`;
  await $`console.log('\n✨ All tests completed!');`;
  await $`console.log('📊 Summary: The enhanced MCP server correctly refuses invalid operations');`;
  await $`}`;
  await $`testMCP().catch(console.error);`;
  await $`EOF`;
  // Run tests
  console.log("");
  console.log("🧪 Running MCP tests...");
  process.chdir(""$DEMO_DIR"");
  await $`node test-mcp.js`;
  // Create MCP config for Claude Code
  console.log("");
  console.log("📝 Creating MCP configuration...");
  await $`cat > "$DEMO_DIR/mcp-config.json" << EOF`;
  await $`{`;
  await $`"mcpServers": {`;
  await $`"filesystem-mcp-enhanced": {`;
  await $`"command": "node",`;
  await $`"args": ["$DEMO_DIR/mcp-server-enhanced.js"],`;
  await $`"env": {`;
  await $`"VF_BASE_PATH": "$DEMO_DIR",`;
  await $`"VF_STRICT_MODE": "true"`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Create run script
  await $`cat > "$DEMO_DIR/run-mcp.sh" << EOF`;
  console.log("Starting Enhanced MCP Server...");
  console.log("Base path: $DEMO_DIR");
  console.log("Strict mode: ENABLED");
  console.log("");
  await $`VF_BASE_PATH="$DEMO_DIR" VF_STRICT_MODE="true" node "$DEMO_DIR/mcp-server-enhanced.js"`;
  await $`EOF`;
  await $`chmod +x "$DEMO_DIR/run-mcp.sh"`;
  // Display results
  console.log("");
  console.log("✅ Demo environment setup complete!");
  console.log("===========================================");
  console.log("");
  console.log("📁 Demo location: $DEMO_DIR");
  console.log("");
  console.log("To run the enhanced MCP server:");
  console.log("  cd $DEMO_DIR");
  console.log("  ./run-mcp.sh");
  console.log("");
  console.log("To use with Claude Code:");
  console.log("  1. Copy the MCP config to your Claude Code settings:");
  console.log("     cat $DEMO_DIR/mcp-config.json");
  console.log("");
  console.log("  2. Or run Claude Code in the demo directory:");
  console.log("     cd $DEMO_DIR");
  console.log("     claude-code .");
  console.log("");
  console.log("Key features demonstrated:");
  console.log("  ✅ Artifact requirement validation");
  console.log("  ✅ Task dependency checking");
  console.log("  ✅ Adhoc file justification");
  console.log("  ✅ Queue status with validation");
  console.log("  ✅ Operations correctly refused when requirements not met");
  console.log("");
  console.log("The server will REFUSE operations that don't meet artifact requirements!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}