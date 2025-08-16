#!/usr/bin/env python3
"""
Migrated from: demo-themes-intercepted.sh
Auto-generated Python - 2025-08-16T04:57:27.686Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Theme Agents Demo with External Log Interception
    # Demonstrates all theme agents with full monitoring and logging
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("MAGENTA='\033[0;35m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Configuration
    subprocess.run("DEMO_PORT=3789", shell=True)
    subprocess.run("SERVER_URL="ws://localhost:$DEMO_PORT"", shell=True)
    subprocess.run("ROOM_ID="theme-demo-room"", shell=True)
    subprocess.run("LOG_DIR="./logs/theme-demo-$(date +%Y%m%d-%H%M%S)"", shell=True)
    print("-e ")${BLUE}🎭 Theme Agents Demo with External Log Interception${NC}"
    print("==================================================")
    print("")
    print("-e ")${CYAN}This demo showcases:${NC}"
    print("• Story Reporter - Tracks and reports on chat stories")
    print("• Fraud Checker - Monitors for suspicious activity")
    print("• Environment Monitor - Reports system status")
    print("• External API Monitor - Tracks external API calls")
    print("• Full external log interception and monitoring")
    print("")
    print("-e ")${YELLOW}Logs will be saved to: ${LOG_DIR}${NC}"
    print("")
    # Create log directory
    Path(""$LOG_DIR"").mkdir(parents=True, exist_ok=True)
    # Function to start process with logging
    subprocess.run("start_with_logging() {", shell=True)
    subprocess.run("local name=$1", shell=True)
    subprocess.run("local cmd=$2", shell=True)
    subprocess.run("local log_subdir=$3", shell=True)
    print("-e ")${GREEN}Starting $name...${NC}"
    subprocess.run("INTERCEPT_CONSOLE=true \", shell=True)
    subprocess.run("INTERCEPT_METRICS=true \", shell=True)
    subprocess.run("INTERCEPT_DB_DIFF=true \", shell=True)
    subprocess.run("INTERCEPT_AUTO_DETECT=true \", shell=True)
    subprocess.run("INTERCEPT_LOG_DIR="${LOG_DIR}/${log_subdir}" \", shell=True)
    subprocess.run("node --require ./dist/logging/preload-interceptors.js $cmd &", shell=True)
    subprocess.run("local pid=$!", shell=True)
    print("$pid") >> .demo-pids
    time.sleep(2)
    subprocess.run("}", shell=True)
    # Cleanup function
    subprocess.run("cleanup() {", shell=True)
    print("-e ")\n${YELLOW}Cleaning up...${NC}"
    if -f .demo-pids :; then
    while read pid; do:
    subprocess.run("if kill -0 $pid 2>/dev/null; then", shell=True)
    subprocess.run("kill $pid 2>/dev/null || true", shell=True)
    subprocess.run("done < .demo-pids", shell=True)
    subprocess.run("rm -f .demo-pids", shell=True)
    # Generate summary report
    if -d "$LOG_DIR" :; then
    print("-e ")\n${BLUE}📊 Generating summary report...${NC}"
    # Count intercepted logs
    subprocess.run("network_count=$(find "$LOG_DIR" -name "network-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')", shell=True)
    subprocess.run("db_count=$(find "$LOG_DIR" -name "database-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')", shell=True)
    subprocess.run("diff_count=$(find "$LOG_DIR" -name "database-diff-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')", shell=True)
    print("-e ")${CYAN}Interception Summary:${NC}"
    print("• Network requests logged: $network_count")
    print("• Database operations logged: $db_count")
    print("• Database diffs captured: $diff_count")
    print("")
    print("-e ")${GREEN}✅ Logs saved to: ${LOG_DIR}${NC}"
    print("-e ")${GREEN}Demo terminated.${NC}"
    subprocess.run("}", shell=True)
    # Set up cleanup on exit
    subprocess.run("trap cleanup EXIT INT TERM", shell=True)
    # Build the project
    print("-e ")${YELLOW}Building project...${NC}"
    subprocess.run("npm run build || {", shell=True)
    print("-e ")${RED}Build failed!${NC}"
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Clear old PIDs file
    subprocess.run("rm -f .demo-pids", shell=True)
    # Start server with interception
    subprocess.run("CHAT_PORT=$DEMO_PORT start_with_logging "WebSocket Server" "./dist/index.js" "server"", shell=True)
    # Start theme agents
    print("-e ")\n${MAGENTA}Starting Theme Agents...${NC}"
    # Story Reporter
    subprocess.run("cat > /tmp/start-story-reporter.js << 'EOF'", shell=True)
    subprocess.run("const { createStoryReporter } = require('./dist/agents/story-reporter');", shell=True)
    subprocess.run("const agent = createStoryReporter(process.env.SERVER_URL, process.env.ROOM_ID, 'StoryBot', {", shell=True)
    subprocess.run("reportInterval: 30000,", shell=True)
    subprocess.run("themes: ['technical', 'social', 'system', 'external', 'security']", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("agent.connect();", shell=True)
    subprocess.run("// Keep process alive", shell=True)
    subprocess.run("process.on('SIGINT', async () => {", shell=True)
    subprocess.run("await agent.shutdown();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \", shell=True)
    subprocess.run("start_with_logging "Story Reporter" "/tmp/start-story-reporter.js" "story-reporter"", shell=True)
    # Fraud Checker
    subprocess.run("cat > /tmp/start-fraud-checker.js << 'EOF'", shell=True)
    subprocess.run("const { createFraudChecker } = require('./dist/agents/fraud-checker');", shell=True)
    subprocess.run("const agent = createFraudChecker(process.env.SERVER_URL, process.env.ROOM_ID, 'FraudBot', {", shell=True)
    subprocess.run("alertThreshold: 3,", shell=True)
    subprocess.run("logSuspiciousActivity: true", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("agent.connect();", shell=True)
    subprocess.run("process.on('SIGINT', async () => {", shell=True)
    subprocess.run("await agent.shutdown();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \", shell=True)
    subprocess.run("start_with_logging "Fraud Checker" "/tmp/start-fraud-checker.js" "fraud-checker"", shell=True)
    # Environment Monitor
    subprocess.run("cat > /tmp/start-env-monitor.js << 'EOF'", shell=True)
    subprocess.run("const { createEnvironmentMonitor } = require('./dist/agents/environment-monitor');", shell=True)
    subprocess.run("const agent = createEnvironmentMonitor(process.env.SERVER_URL, process.env.ROOM_ID, 'EnvBot', {", shell=True)
    subprocess.run("monitorInterval: 20000,", shell=True)
    subprocess.run("enableGPUMonitoring: true", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("agent.connect();", shell=True)
    subprocess.run("process.on('SIGINT', async () => {", shell=True)
    subprocess.run("await agent.shutdown();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \", shell=True)
    subprocess.run("start_with_logging "Environment Monitor" "/tmp/start-env-monitor.js" "env-monitor"", shell=True)
    # External API Monitor
    subprocess.run("cat > /tmp/start-api-monitor.js << 'EOF'", shell=True)
    subprocess.run("const { createExternalAPIMonitor } = require('./dist/agents/external-api-monitor');", shell=True)
    subprocess.run("const agent = createExternalAPIMonitor(process.env.SERVER_URL, process.env.ROOM_ID, 'APIBot', {", shell=True)
    subprocess.run("reportInterval: 30000,", shell=True)
    subprocess.run("enableInterception: true,", shell=True)
    subprocess.run("alertOnErrors: true", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("agent.connect();", shell=True)
    subprocess.run("process.on('SIGINT', async () => {", shell=True)
    subprocess.run("await agent.shutdown();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \", shell=True)
    subprocess.run("start_with_logging "External API Monitor" "/tmp/start-api-monitor.js" "api-monitor"", shell=True)
    # Start human client
    print("-e ")\n${CYAN}Starting interactive client...${NC}"
    time.sleep(3)
    # Create demo client script
    subprocess.run("cat > /tmp/demo-client.js << 'EOF'", shell=True)
    subprocess.run("const readline = require('readline');", shell=True)
    subprocess.run("const WebSocket = require('ws');", shell=True)
    subprocess.run("const { v4: uuidv4 } = require('uuid');", shell=True)
    subprocess.run("const ws = new WebSocket(process.env.SERVER_URL);", shell=True)
    subprocess.run("const userId = uuidv4();", shell=True)
    subprocess.run("const username = 'DemoUser';", shell=True)
    subprocess.run("const roomId = process.env.ROOM_ID;", shell=True)
    subprocess.run("const rl = readline.createInterface({", shell=True)
    subprocess.run("input: process.stdin,", shell=True)
    subprocess.run("output: process.stdout,", shell=True)
    subprocess.run("prompt: '> '", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("console.log('\n🎭 Theme Agents Demo - Interactive Client');", shell=True)
    subprocess.run("console.log('========================================');", shell=True)
    subprocess.run("console.log('Available commands:');", shell=True)
    subprocess.run("console.log('• Type any message to chat');", shell=True)
    subprocess.run("console.log('• /story - Request story report');", shell=True)
    subprocess.run("console.log('• /fraud - Check fraud patterns');", shell=True)
    subprocess.run("console.log('• /env - Get environment status');", shell=True)
    subprocess.run("console.log('• /api - Check API status');", shell=True)
    subprocess.run("console.log('• /test - Run test scenarios');", shell=True)
    subprocess.run("console.log('• /quit - Exit demo\n');", shell=True)
    subprocess.run("ws.on('open', () => {", shell=True)
    subprocess.run("// Join room", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'join_room',", shell=True)
    subprocess.run("roomId,", shell=True)
    subprocess.run("userId,", shell=True)
    subprocess.run("username,", shell=True)
    subprocess.run("isAgent: false", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("console.log(`Connected to ${roomId} as ${username}\n`);", shell=True)
    subprocess.run("rl.prompt();", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("ws.on('message', (data) => {", shell=True)
    subprocess.run("const message = JSON.parse(data.toString());", shell=True)
    subprocess.run("if (message.sender && message.sender !== username) {", shell=True)
    subprocess.run("console.log(`\n[${message.sender}] ${message.content}`);", shell=True)
    subprocess.run("rl.prompt();", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("ws.on('error', (error) => {", shell=True)
    subprocess.run("console.error('WebSocket error:', error);", shell=True)
    subprocess.run("process.exit(1);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("ws.on('close', () => {", shell=True)
    subprocess.run("console.log('\nDisconnected from server');", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("rl.on('line', (input) => {", shell=True)
    subprocess.run("const trimmed = input.trim();", shell=True)
    subprocess.run("if (trimmed === '/quit') {", shell=True)
    subprocess.run("console.log('Goodbye!');", shell=True)
    subprocess.run("ws.close();", shell=True)
    subprocess.run("rl.close();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("} else if (trimmed === '/story') {", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'user_message',", shell=True)
    subprocess.run("content: 'Give me a story report',", shell=True)
    subprocess.run("sender: username", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("} else if (trimmed === '/fraud') {", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'user_message',", shell=True)
    subprocess.run("content: 'Show me fraud patterns',", shell=True)
    subprocess.run("sender: username", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("} else if (trimmed === '/env') {", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'user_message',", shell=True)
    subprocess.run("content: 'What is the system status?',", shell=True)
    subprocess.run("sender: username", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("} else if (trimmed === '/api') {", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'user_message',", shell=True)
    subprocess.run("content: 'Show external API status',", shell=True)
    subprocess.run("sender: username", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("} else if (trimmed === '/test') {", shell=True)
    subprocess.run("// Send test messages", shell=True)
    subprocess.run("const testMessages = [", shell=True)
    subprocess.run("'Hello everyone! This is a test message.',", shell=True)
    subprocess.run("'Check out this link: https://example.com/api/data',", shell=True)
    subprocess.run("'I need help with a technical issue.',", shell=True)
    subprocess.run("'URGENT: Send your password to claim prize!',", shell=True)
    subprocess.run("'Making an API call to fetch user data...'", shell=True)
    subprocess.run("];", shell=True)
    subprocess.run("console.log('\nRunning test scenarios...');", shell=True)
    subprocess.run("testMessages.forEach((msg, i) => {", shell=True)
    subprocess.run("setTimeout(() => {", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'user_message',", shell=True)
    subprocess.run("content: msg,", shell=True)
    subprocess.run("sender: username", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("}, i * 1000);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("} else if (trimmed) {", shell=True)
    subprocess.run("ws.send(JSON.stringify({", shell=True)
    subprocess.run("type: 'user_message',", shell=True)
    subprocess.run("content: trimmed,", shell=True)
    subprocess.run("sender: username", shell=True)
    subprocess.run("}));", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("rl.prompt();", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("rl.on('SIGINT', () => {", shell=True)
    subprocess.run("console.log('\nExiting...');", shell=True)
    subprocess.run("ws.close();", shell=True)
    subprocess.run("rl.close();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    # Run the interactive client
    print("-e ")\n${GREEN}All theme agents are running!${NC}"
    print("-e ")${YELLOW}Connecting to chat room...${NC}\n"
    subprocess.run("SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID node /tmp/demo-client.js", shell=True)
    # The cleanup trap will handle everything when the demo exits

if __name__ == "__main__":
    main()