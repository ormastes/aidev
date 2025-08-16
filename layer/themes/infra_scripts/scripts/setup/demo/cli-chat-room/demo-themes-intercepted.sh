#!/bin/bash

# Theme Agents Demo with External Log Interception
# Demonstrates all theme agents with full monitoring and logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEMO_PORT=3789
SERVER_URL="ws://localhost:$DEMO_PORT"
ROOM_ID="theme-demo-room"
LOG_DIR="./logs/theme-demo-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}🎭 Theme Agents Demo with External Log Interception${NC}"
echo "=================================================="
echo ""
echo -e "${CYAN}This demo showcases:${NC}"
echo "• Story Reporter - Tracks and reports on chat stories"
echo "• Fraud Checker - Monitors for suspicious activity"
echo "• Environment Monitor - Reports system status"
echo "• External API Monitor - Tracks external API calls"
echo "• Full external log interception and monitoring"
echo ""
echo -e "${YELLOW}Logs will be saved to: ${LOG_DIR}${NC}"
echo ""

# Create log directory
mkdir -p "$LOG_DIR"

# Function to start process with logging
start_with_logging() {
    local name=$1
    local cmd=$2
    local log_subdir=$3
    
    echo -e "${GREEN}Starting $name...${NC}"
    
    INTERCEPT_CONSOLE=true \
    INTERCEPT_METRICS=true \
    INTERCEPT_DB_DIFF=true \
    INTERCEPT_AUTO_DETECT=true \
    INTERCEPT_LOG_DIR="${LOG_DIR}/${log_subdir}" \
    node --require ./dist/logging/preload-interceptors.js $cmd &
    
    local pid=$!
    echo "$pid" >> .demo-pids
    sleep 2
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    
    if [ -f .demo-pids ]; then
        while read pid; do
            if kill -0 $pid 2>/dev/null; then
                kill $pid 2>/dev/null || true
            fi
        done < .demo-pids
        rm -f .demo-pids
    fi
    
    # Generate summary report
    if [ -d "$LOG_DIR" ]; then
        echo -e "\n${BLUE}📊 Generating summary report...${NC}"
        
        # Count intercepted logs
        network_count=$(find "$LOG_DIR" -name "network-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')
        db_count=$(find "$LOG_DIR" -name "database-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')
        diff_count=$(find "$LOG_DIR" -name "database-diff-*.jsonl" -exec wc -l {} + 2>/dev/null | awk '{sum += $1} END {print sum+0}')
        
        echo -e "${CYAN}Interception Summary:${NC}"
        echo "• Network requests logged: $network_count"
        echo "• Database operations logged: $db_count"
        echo "• Database diffs captured: $diff_count"
        echo ""
        echo -e "${GREEN}✅ Logs saved to: ${LOG_DIR}${NC}"
    fi
    
    echo -e "${GREEN}Demo terminated.${NC}"
}

# Set up cleanup on exit
trap cleanup EXIT INT TERM

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm run build || {
    echo -e "${RED}Build failed!${NC}"
    exit 1
}

# Clear old PIDs file
rm -f .demo-pids

# Start server with interception
CHAT_PORT=$DEMO_PORT start_with_logging "WebSocket Server" "./dist/index.js" "server"

# Start theme agents
echo -e "\n${MAGENTA}Starting Theme Agents...${NC}"

# Story Reporter
cat > /tmp/start-story-reporter.js << 'EOF'
const { createStoryReporter } = require('./dist/agents/story-reporter');
const agent = createStoryReporter(process.env.SERVER_URL, process.env.ROOM_ID, 'StoryBot', {
    reportInterval: 30000,
    themes: ['technical', 'social', 'system', 'external', 'security']
});
agent.connect();

// Keep process alive
process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
});
EOF

SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \
start_with_logging "Story Reporter" "/tmp/start-story-reporter.js" "story-reporter"

# Fraud Checker
cat > /tmp/start-fraud-checker.js << 'EOF'
const { createFraudChecker } = require('./dist/agents/fraud-checker');
const agent = createFraudChecker(process.env.SERVER_URL, process.env.ROOM_ID, 'FraudBot', {
    alertThreshold: 3,
    logSuspiciousActivity: true
});
agent.connect();

process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
});
EOF

SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \
start_with_logging "Fraud Checker" "/tmp/start-fraud-checker.js" "fraud-checker"

# Environment Monitor
cat > /tmp/start-env-monitor.js << 'EOF'
const { createEnvironmentMonitor } = require('./dist/agents/environment-monitor');
const agent = createEnvironmentMonitor(process.env.SERVER_URL, process.env.ROOM_ID, 'EnvBot', {
    monitorInterval: 20000,
    enableGPUMonitoring: true
});
agent.connect();

process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
});
EOF

SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \
start_with_logging "Environment Monitor" "/tmp/start-env-monitor.js" "env-monitor"

# External API Monitor
cat > /tmp/start-api-monitor.js << 'EOF'
const { createExternalAPIMonitor } = require('./dist/agents/external-api-monitor');
const agent = createExternalAPIMonitor(process.env.SERVER_URL, process.env.ROOM_ID, 'APIBot', {
    reportInterval: 30000,
    enableInterception: true,
    alertOnErrors: true
});
agent.connect();

process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
});
EOF

SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID \
start_with_logging "External API Monitor" "/tmp/start-api-monitor.js" "api-monitor"

# Start human client
echo -e "\n${CYAN}Starting interactive client...${NC}"
sleep 3

# Create demo client script
cat > /tmp/demo-client.js << 'EOF'
const readline = require('readline');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const ws = new WebSocket(process.env.SERVER_URL);
const userId = uuidv4();
const username = 'DemoUser';
const roomId = process.env.ROOM_ID;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

console.log('\n🎭 Theme Agents Demo - Interactive Client');
console.log('========================================');
console.log('Available commands:');
console.log('• Type any message to chat');
console.log('• /story - Request story report');
console.log('• /fraud - Check fraud patterns');
console.log('• /env - Get environment status');
console.log('• /api - Check API status');
console.log('• /test - Run test scenarios');
console.log('• /quit - Exit demo\n');

ws.on('open', () => {
    // Join room
    ws.send(JSON.stringify({
        type: 'join_room',
        roomId,
        userId,
        username,
        isAgent: false
    }));
    
    console.log(`Connected to ${roomId} as ${username}\n`);
    rl.prompt();
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.sender && message.sender !== username) {
        console.log(`\n[${message.sender}] ${message.content}`);
        rl.prompt();
    }
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
});

ws.on('close', () => {
    console.log('\nDisconnected from server');
    process.exit(0);
});

rl.on('line', (input) => {
    const trimmed = input.trim();
    
    if (trimmed === '/quit') {
        console.log('Goodbye!');
        ws.close();
        rl.close();
        process.exit(0);
    } else if (trimmed === '/story') {
        ws.send(JSON.stringify({
            type: 'user_message',
            content: 'Give me a story report',
            sender: username
        }));
    } else if (trimmed === '/fraud') {
        ws.send(JSON.stringify({
            type: 'user_message',
            content: 'Show me fraud patterns',
            sender: username
        }));
    } else if (trimmed === '/env') {
        ws.send(JSON.stringify({
            type: 'user_message',
            content: 'What is the system status?',
            sender: username
        }));
    } else if (trimmed === '/api') {
        ws.send(JSON.stringify({
            type: 'user_message',
            content: 'Show external API status',
            sender: username
        }));
    } else if (trimmed === '/test') {
        // Send test messages
        const testMessages = [
            'Hello everyone! This is a test message.',
            'Check out this link: https://example.com/api/data',
            'I need help with a technical issue.',
            'URGENT: Send your password to claim prize!',
            'Making an API call to fetch user data...'
        ];
        
        console.log('\nRunning test scenarios...');
        testMessages.forEach((msg, i) => {
            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'user_message',
                    content: msg,
                    sender: username
                }));
            }, i * 1000);
        });
    } else if (trimmed) {
        ws.send(JSON.stringify({
            type: 'user_message',
            content: trimmed,
            sender: username
        }));
    }
    
    rl.prompt();
});

rl.on('SIGINT', () => {
    console.log('\nExiting...');
    ws.close();
    rl.close();
    process.exit(0);
});
EOF

# Run the interactive client
echo -e "\n${GREEN}All theme agents are running!${NC}"
echo -e "${YELLOW}Connecting to chat room...${NC}\n"

SERVER_URL=$SERVER_URL ROOM_ID=$ROOM_ID node /tmp/demo-client.js

# The cleanup trap will handle everything when the demo exits