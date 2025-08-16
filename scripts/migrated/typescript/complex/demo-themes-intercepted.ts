#!/usr/bin/env bun
/**
 * Migrated from: demo-themes-intercepted.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.686Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Theme Agents Demo with External Log Interception
  // Demonstrates all theme agents with full monitoring and logging
  await $`set -e`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`MAGENTA='\033[0;35m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m' # No Color`;
  // Configuration
  await $`DEMO_PORT=3789`;
  await $`SERVER_URL="ws://localhost:$DEMO_PORT"`;
  await $`ROOM_ID="theme-demo-room"`;
  await $`LOG_DIR="./logs/theme-demo-$(date +%Y%m%d-%H%M%S)"`;
  console.log("-e ");${BLUE}🎭 Theme Agents Demo with External Log Interception${NC}"
  console.log("==================================================");
  console.log("");
  console.log("-e ");${CYAN}This demo showcases:${NC}"
  console.log("• Story Reporter - Tracks and reports on chat stories");
  console.log("• Fraud Checker - Monitors for suspicious activity");
  console.log("• Environment Monitor - Reports system status");
  console.log("• External API Monitor - Tracks external API calls");
  console.log("• Full external log interception and monitoring");
  console.log("");
  console.log("-e ");${YELLOW}Logs will be saved to: ${LOG_DIR}${NC}"
  console.log("");
  // Create log directory
  await mkdir(""$LOG_DIR"", { recursive: true });
  // Function to start process with logging
  await $`start_with_logging() {`;
  await $`local name=$1`;
  await $`local cmd=$2`;
  await $`local log_subdir=$3`;
  console.log("-e ");${GREEN}Starting $name...${NC}"
  await $`INTERCEPT_CONSOLE=true \`;
  await $`INTERCEPT_METRICS=true \`;
  await $`INTERCEPT_DB_DIFF=true \`;
  await $`INTERCEPT_AUTO_DETECT=true \`;
  await $`INTERCEPT_LOG_DIR="${LOG_DIR}/${log_subdir}" \`;
  await $`node --require ./dist/logging/preload-interceptors.js $cmd &`;
  await $`local pid=$!`;
  console.log("$pid"); >> .demo-pids
  await Bun.sleep(2 * 1000);
  await $`}`;
  // Cleanup function
  await $`cleanup() {`;
  console.log("-e ");\n${YELLOW}Cleaning up...${NC}"
  if (-f .demo-pids ) {; then
  while (read pid; do) {
  await $`if kill -0 $pid 2>/dev/null; then`;
  await $`kill $pid 2>/dev/null || true`;
  }
  await $`done < .demo-pids`;
  await $`rm -f .demo-pids`;
  }
  // Generate summary report
  if (-d "$LOG_DIR" ) {; then
  console.log("-e ");\n${BLUE}📊 Generating summary report...${NC}"
  // Count intercepted logs
  await $`network_count=$(find "$LOG_DIR" -name "network-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')`;
  await $`db_count=$(find "$LOG_DIR" -name "database-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')`;
  await $`diff_count=$(find "$LOG_DIR" -name "database-diff-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')`;
  console.log("-e ");${CYAN}Interception Summary:${NC}"
  console.log("• Network requests logged: $network_count");
  console.log("• Database operations logged: $db_count");
  console.log("• Database diffs captured: $diff_count");
  console.log("");
  console.log("-e ");${GREEN}✅ Logs saved to: ${LOG_DIR}${NC}"
  }
  console.log("-e ");${GREEN}Demo terminated.${NC}"
  await $`}`;
  // Set up cleanup on exit
  await $`trap cleanup EXIT INT TERM`;
  // Build the project
  console.log("-e ");${YELLOW}Building project...${NC}"
  await $`npm run build || {`;
  console.log("-e ");${RED}Build failed!${NC}"
  process.exit(1);
  await $`}`;
  // Clear old PIDs file
  await $`rm -f .demo-pids`;
  // Start server with interception
  await $`CHAT_PORT=$DEMO_PORT start_with_logging "WebSocket Server" "./dist/index.js" "server"`;
  // Start theme agents
  console.log("-e ");\n${MAGENTA}Starting Theme Agents...${NC}"
  // Story Reporter
  await $`cat > /tmp/start-story-reporter.js << 'EOF'`;
  await $`const { createStoryReporter } = require('./dist/agents/story-reporter');`;
  await $`const agent = createStoryReporter(process.env.SERVER_URL, process.env.ROOM_ID, 'StoryBot', {`;
  await $`reportInterval: 30000,`;
  await $`themes: ['technical', 'social', 'system', 'external', 'security']`;
  await $`});`;
  await $`agent.connect();`;
  // Keep process alive
  await $`process.on('SIGINT', async () => {`;
  await $`await agent.shutdown();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`EOF`;
  await $`SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \`;
  await $`start_with_logging "Story Reporter" "/tmp/start-story-reporter.js" "story-reporter"`;
  // Fraud Checker
  await $`cat > /tmp/start-fraud-checker.js << 'EOF'`;
  await $`const { createFraudChecker } = require('./dist/agents/fraud-checker');`;
  await $`const agent = createFraudChecker(process.env.SERVER_URL, process.env.ROOM_ID, 'FraudBot', {`;
  await $`alertThreshold: 3,`;
  await $`logSuspiciousActivity: true`;
  await $`});`;
  await $`agent.connect();`;
  await $`process.on('SIGINT', async () => {`;
  await $`await agent.shutdown();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`EOF`;
  await $`SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \`;
  await $`start_with_logging "Fraud Checker" "/tmp/start-fraud-checker.js" "fraud-checker"`;
  // Environment Monitor
  await $`cat > /tmp/start-env-monitor.js << 'EOF'`;
  await $`const { createEnvironmentMonitor } = require('./dist/agents/environment-monitor');`;
  await $`const agent = createEnvironmentMonitor(process.env.SERVER_URL, process.env.ROOM_ID, 'EnvBot', {`;
  await $`monitorInterval: 20000,`;
  await $`enableGPUMonitoring: true`;
  await $`});`;
  await $`agent.connect();`;
  await $`process.on('SIGINT', async () => {`;
  await $`await agent.shutdown();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`EOF`;
  await $`SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \`;
  await $`start_with_logging "Environment Monitor" "/tmp/start-env-monitor.js" "env-monitor"`;
  // External API Monitor
  await $`cat > /tmp/start-api-monitor.js << 'EOF'`;
  await $`const { createExternalAPIMonitor } = require('./dist/agents/external-api-monitor');`;
  await $`const agent = createExternalAPIMonitor(process.env.SERVER_URL, process.env.ROOM_ID, 'APIBot', {`;
  await $`reportInterval: 30000,`;
  await $`enableInterception: true,`;
  await $`alertOnErrors: true`;
  await $`});`;
  await $`agent.connect();`;
  await $`process.on('SIGINT', async () => {`;
  await $`await agent.shutdown();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`EOF`;
  await $`SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \`;
  await $`start_with_logging "External API Monitor" "/tmp/start-api-monitor.js" "api-monitor"`;
  // Start human client
  console.log("-e ");\n${CYAN}Starting interactive client...${NC}"
  await Bun.sleep(3 * 1000);
  // Create demo client script
  await $`cat > /tmp/demo-client.js << 'EOF'`;
  await $`const readline = require('readline');`;
  await $`const WebSocket = require('ws');`;
  await $`const { v4: uuidv4 } = require('uuid');`;
  await $`const ws = new WebSocket(process.env.SERVER_URL);`;
  await $`const userId = uuidv4();`;
  await $`const username = 'DemoUser';`;
  await $`const roomId = process.env.ROOM_ID;`;
  await $`const rl = readline.createInterface({`;
  await $`input: process.stdin,`;
  await $`output: process.stdout,`;
  await $`prompt: '> '`;
  await $`});`;
  await $`console.log('\n🎭 Theme Agents Demo - Interactive Client');`;
  await $`console.log('========================================');`;
  await $`console.log('Available commands:');`;
  await $`console.log('• Type any message to chat');`;
  await $`console.log('• /story - Request story report');`;
  await $`console.log('• /fraud - Check fraud patterns');`;
  await $`console.log('• /env - Get environment status');`;
  await $`console.log('• /api - Check API status');`;
  await $`console.log('• /test - Run test scenarios');`;
  await $`console.log('• /quit - Exit demo\n');`;
  await $`ws.on('open', () => {`;
  // Join room
  await $`ws.send(JSON.stringify({`;
  await $`type: 'join_room',`;
  await $`roomId,`;
  await $`userId,`;
  await $`username,`;
  await $`isAgent: false`;
  await $`}));`;
  await $`console.log(`Connected to ${roomId} as ${username}\n`);`;
  await $`rl.prompt();`;
  await $`});`;
  await $`ws.on('message', (data) => {`;
  await $`const message = JSON.parse(data.toString());`;
  await $`if (message.sender && message.sender !== username) {`;
  await $`console.log(`\n[${message.sender}] ${message.content}`);`;
  await $`rl.prompt();`;
  await $`}`;
  await $`});`;
  await $`ws.on('error', (error) => {`;
  await $`console.error('WebSocket error:', error);`;
  await $`process.exit(1);`;
  await $`});`;
  await $`ws.on('close', () => {`;
  await $`console.log('\nDisconnected from server');`;
  await $`process.exit(0);`;
  await $`});`;
  await $`rl.on('line', (input) => {`;
  await $`const trimmed = input.trim();`;
  await $`if (trimmed === '/quit') {`;
  await $`console.log('Goodbye!');`;
  await $`ws.close();`;
  await $`rl.close();`;
  await $`process.exit(0);`;
  await $`} else if (trimmed === '/story') {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: 'Give me a story report',`;
  await $`sender: username`;
  await $`}));`;
  await $`} else if (trimmed === '/fraud') {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: 'Show me fraud patterns',`;
  await $`sender: username`;
  await $`}));`;
  await $`} else if (trimmed === '/env') {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: 'What is the system status?',`;
  await $`sender: username`;
  await $`}));`;
  await $`} else if (trimmed === '/api') {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: 'Show external API status',`;
  await $`sender: username`;
  await $`}));`;
  await $`} else if (trimmed === '/test') {`;
  // Send test messages
  await $`const testMessages = [`;
  await $`'Hello everyone! This is a test message.',`;
  await $`'Check out this link: https://example.com/api/data',`;
  await $`'I need help with a technical issue.',`;
  await $`'URGENT: Send your password to claim prize!',`;
  await $`'Making an API call to fetch user data...'`;
  await $`];`;
  await $`console.log('\nRunning test scenarios...');`;
  await $`testMessages.forEach((msg, i) => {`;
  await $`setTimeout(() => {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: msg,`;
  await $`sender: username`;
  await $`}));`;
  await $`}, i * 1000);`;
  await $`});`;
  await $`} else if (trimmed) {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: trimmed,`;
  await $`sender: username`;
  await $`}));`;
  await $`}`;
  await $`rl.prompt();`;
  await $`});`;
  await $`rl.on('SIGINT', () => {`;
  await $`console.log('\nExiting...');`;
  await $`ws.close();`;
  await $`rl.close();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`EOF`;
  // Run the interactive client
  console.log("-e ");\n${GREEN}All theme agents are running!${NC}"
  console.log("-e ");${YELLOW}Connecting to chat room...${NC}\n"
  await $`SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID node /tmp/demo-client.js`;
  // The cleanup trap will handle everything when the demo exits
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}