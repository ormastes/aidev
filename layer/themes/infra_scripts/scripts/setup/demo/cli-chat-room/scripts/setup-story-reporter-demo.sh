#!/bin/bash

# Setup Script for Story Reporter Demo with Calculator
# Sets up a complete demo environment for testing story reporter

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 Story Reporter Demo Setup${NC}"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Create demo directory structure
DEMO_DIR="demo/calculator-story"
echo -e "${YELLOW}Creating demo directory: ${DEMO_DIR}${NC}"
mkdir -p "$DEMO_DIR"

# Build the project first
echo -e "${YELLOW}Building project...${NC}"
npm run build || {
    echo -e "${RED}Build failed! Please fix build errors first.${NC}"
    exit 1
}

# Create Calculator Agent
echo -e "${GREEN}Creating Calculator Agent...${NC}"
cat > "$DEMO_DIR/calculator-agent.js" << 'EOF'
/**
 * Calculator Agent for Story Reporter Demo
 * A simple agent that can perform calculations
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class CalculatorAgent {
  constructor(serverUrl, roomId, agentName = 'Calculator') {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.agentName = agentName;
    this.userId = uuidv4();
    this.ws = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🧮 Connecting Calculator to ${this.serverUrl}...`);
      
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.on('open', () => {
        // Join room
        this.ws.send(JSON.stringify({
          type: 'join_room',
          roomId: this.roomId,
          userId: this.userId,
          username: this.agentName,
          isAgent: true
        }));
        
        this.connected = true;
        console.log(`✅ Calculator connected to room ${this.roomId}`);
        
        // Announce capabilities
        setTimeout(() => {
          this.sendMessage({
            type: 'agent_message',
            content: '🧮 Calculator Agent ready! I can solve: add, subtract, multiply, divide. Try: "calculate 5 + 3"',
            sender: this.agentName
          });
          resolve();
        }, 1000);
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      this.ws.on('error', reject);
      this.ws.on('close', () => {
        this.connected = false;
        console.log('Calculator disconnected');
      });
    });
  }

  handleMessage(message) {
    // Skip own messages and system messages
    if (message.sender === this.agentName || 
        message.type === 'system_message' ||
        message.type === 'user_joined' ||
        message.type === 'user_left') {
      return;
    }
    
    const content = message.content?.toLowerCase() || '';
    
    // Check for calculation requests
    if (content.includes('calculate') || content.includes('calc') || 
        content.includes('what is') || content.includes('solve')) {
      
      const result = this.parseAndCalculate(message.content);
      if (result !== null) {
        this.sendMessage({
          type: 'agent_message',
          content: `🧮 ${message.content} = ${result}`,
          sender: this.agentName,
          metadata: {
            calculation: message.content,
            result: result,
            respondingTo: message.sender
          }
        });
      }
    } else if (content.includes('help') && content.includes('calc')) {
      this.sendMessage({
        type: 'agent_message',
        content: '🧮 I can help with: add (+), subtract (-), multiply (*), divide (/). Example: "calculate 10 + 5"',
        sender: this.agentName
      });
    }
  }

  parseAndCalculate(text) {
    // Extract mathematical expression
    const patterns = [
      /calculate\s+(.+)/i,
      /calc\s+(.+)/i,
      /what\s+is\s+(.+)/i,
      /solve\s+(.+)/i,
      /(\d+\s*[\+\-\*\/]\s*\d+)/
    ];
    
    let expression = null;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        expression = match[1].trim();
        break;
      }
    }
    
    if (!expression) return null;
    
    // Simple calculator - only basic operations
    try {
      // Clean the expression
      expression = expression.replace(/[^0-9\+\-\*\/\.\s\(\)]/g, '');
      
      // Basic validation
      if (!/^\d+(\.\d+)?[\s]*[\+\-\*\/][\s]*\d+(\.\d+)?$/.test(expression)) {
        return null;
      }
      
      // Parse operation
      const operators = ['+', '-', '*', '/'];
      let operator = null;
      let parts = [];
      
      for (const op of operators) {
        if (expression.includes(op)) {
          parts = expression.split(op).map(p => p.trim());
          operator = op;
          break;
        }
      }
      
      if (!operator || parts.length !== 2) return null;
      
      const a = parseFloat(parts[0]);
      const b = parseFloat(parts[1]);
      
      if (isNaN(a) || isNaN(b)) return null;
      
      // Perform calculation
      let result;
      switch (operator) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': 
          if (b === 0) return 'Error: Division by zero';
          result = a / b; 
          break;
      }
      
      // Format result
      return Number.isInteger(result) ? result : result.toFixed(2);
    } catch (error) {
      console.error('Calculation error:', error);
      return null;
    }
  }

  sendMessage(message) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Start the calculator agent
const serverUrl = process.env.SERVER_URL || 'ws://localhost:3000';
const roomId = process.env.ROOM_ID || 'calculator-demo';
const calculator = new CalculatorAgent(serverUrl, roomId);

calculator.connect().catch(console.error);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Calculator...');
  calculator.disconnect();
  process.exit(0);
});
EOF

# Create Demo Runner Script
echo -e "${GREEN}Creating demo runner...${NC}"
cat > "$DEMO_DIR/run-demo.js" << 'EOF'
/**
 * Calculator Demo Runner with Story Reporter
 * Runs a full demo showing story reporter tracking calculator interactions
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class CalculatorDemo {
  constructor() {
    this.processes = [];
    this.roomId = 'calculator-demo';
    this.serverUrl = 'ws://localhost:3000';
    this.logDir = path.join(process.cwd(), 'logs', 'calculator-demo');
  }

  async run() {
    console.log(chalk.bold.blue('\n🧮 Calculator Demo with Story Reporter\n'));
    
    try {
      // Ensure log directory
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      
      // Start server
      await this.startServer();
      
      // Start story reporter
      await this.startStoryReporter();
      
      // Start calculator agent
      await this.startCalculator();
      
      // Run test scenarios
      await this.runTestScenarios();
      
      // Wait for story report
      console.log(chalk.yellow('\n⏳ Waiting for story report generation...'));
      await this.delay(65000); // Wait for report interval
      
      // Show results
      await this.showResults();
      
    } catch (error) {
      console.error(chalk.red('Demo error:'), error);
    } finally {
      await this.cleanup();
    }
  }

  async startServer() {
    console.log(chalk.cyan('1️⃣ Starting Chat Server with Interception...'));
    
    const server = spawn('node', [
      '--require', './dist/logging/preload-interceptors.js',
      './dist/index.js'
    ], {
      env: {
        ...process.env,
        CHAT_PORT: 3000,
        INTERCEPT_CONSOLE: 'false',
        INTERCEPT_METRICS: 'true',
        INTERCEPT_LOG_DIR: path.join(this.logDir, 'server')
      },
      stdio: 'pipe'
    });
    
    this.processes.push(server);
    
    await new Promise((resolve) => {
      server.stdout.on('data', (data) => {
        if (data.toString().includes('Chat server running')) {
          console.log(chalk.green('✅ Server started'));
          resolve();
        }
      });
      setTimeout(resolve, 5000);
    });
  }

  async startStoryReporter() {
    console.log(chalk.cyan('2️⃣ Starting Story Reporter...'));
    
    const reporter = spawn('node', [
      '--require', './dist/logging/preload-interceptors.js',
      './scripts/start-story-reporter.js',
      this.serverUrl,
      this.roomId,
      'StoryBot'
    ], {
      env: {
        ...process.env,
        INTERCEPT_CONSOLE: 'false',
        INTERCEPT_LOG_DIR: path.join(this.logDir, 'story-reporter')
      },
      stdio: 'pipe'
    });
    
    this.processes.push(reporter);
    
    reporter.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Story Reporter')) {
        console.log(chalk.gray(`[StoryBot] ${output.trim()}`));
      }
    });
    
    await this.delay(3000);
    console.log(chalk.green('✅ Story Reporter ready'));
  }

  async startCalculator() {
    console.log(chalk.cyan('3️⃣ Starting Calculator Agent...'));
    
    const calculator = spawn('node', [
      path.join(__dirname, 'calculator-agent.js')
    ], {
      env: {
        ...process.env,
        SERVER_URL: this.serverUrl,
        ROOM_ID: this.roomId
      },
      stdio: 'pipe'
    });
    
    this.processes.push(calculator);
    
    calculator.stdout.on('data', (data) => {
      console.log(chalk.gray(`[Calculator] ${data.toString().trim()}`));
    });
    
    await this.delay(3000);
    console.log(chalk.green('✅ Calculator ready'));
  }

  async runTestScenarios() {
    console.log(chalk.cyan('\n4️⃣ Running Test Scenarios...'));
    
    const scenarios = [
      { user: 'Alice', messages: [
        'Hello everyone!',
        'Can someone help me calculate 25 + 17?',
        'Thanks! Now what is 100 - 42?'
      ]},
      { user: 'Bob', messages: [
        'Hi Alice!',
        'I need to solve 15 * 4',
        'And also 120 / 5 please'
      ]},
      { user: 'Charlie', messages: [
        'Testing error: calculate 10 / 0',
        'Let me try: what is 3.14 * 2?',
        'One more: solve 999 + 1'
      ]}
    ];
    
    for (const scenario of scenarios) {
      const client = await this.createClient(scenario.user);
      
      for (const message of scenario.messages) {
        console.log(chalk.blue(`[${scenario.user}]`), message);
        client.send(message);
        await this.delay(2000);
      }
      
      client.close();
      await this.delay(1000);
    }
  }

  async createClient(username) {
    const ws = new WebSocket(this.serverUrl);
    const userId = uuidv4();
    
    await new Promise((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'join_room',
          roomId: this.roomId,
          userId,
          username,
          isAgent: false
        }));
        resolve();
      });
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.sender && msg.sender !== username && msg.type === 'agent_message') {
        console.log(chalk.green(`[${msg.sender}]`), msg.content);
      }
    });
    
    return {
      send: (content) => {
        ws.send(JSON.stringify({
          type: 'user_message',
          content,
          sender: username
        }));
      },
      close: () => ws.close()
    };
  }

  async showResults() {
    console.log(chalk.bold.yellow('\n📊 Demo Results:\n'));
    
    // Check story reports
    const storyDir = path.join(process.cwd(), 'logs', 'stories');
    if (fs.existsSync(storyDir)) {
      const files = fs.readdirSync(storyDir).filter(f => f.startsWith('story-'));
      console.log(chalk.cyan('Story Reports Generated:'), files.length);
      
      if (files.length > 0) {
        const latestReport = files[files.length - 1];
        const reportPath = path.join(storyDir, latestReport);
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        console.log(chalk.gray('\nLatest Story Report Summary:'));
        console.log('- Total Events:', report.analysis.totalEvents);
        console.log('- Themes:', JSON.stringify(report.analysis.themes));
        console.log('- Active Users:', report.analysis.activeUsers);
        console.log('- Narrative:', report.narrative);
      }
    }
    
    // Check intercepted logs
    console.log(chalk.cyan('\n📡 Interception Summary:'));
    const logFiles = this.countLogFiles(this.logDir);
    console.log('- Network Logs:', logFiles.network);
    console.log('- System Metrics:', logFiles.metrics);
    console.log('- Total Files:', logFiles.total);
  }

  countLogFiles(dir) {
    let count = { network: 0, metrics: 0, total: 0 };
    
    function scan(currentDir) {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scan(fullPath);
        } else {
          count.total++;
          if (item.includes('network-')) count.network++;
          if (item.includes('metrics')) count.metrics++;
        }
      });
    }
    
    scan(dir);
    return count;
  }

  async cleanup() {
    console.log(chalk.yellow('\n🧹 Cleaning up...'));
    
    this.processes.forEach(proc => {
      proc.kill('SIGTERM');
    });
    
    await this.delay(1000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the demo
const demo = new CalculatorDemo();
demo.run().catch(console.error);
EOF

# Create E2E Test for Calculator Demo
echo -e "${GREEN}Creating E2E test...${NC}"
cat > "$DEMO_DIR/e2e-calculator-story.test.js" << 'EOF'
/**
 * E2E Test for Calculator with Story Reporter
 * Verifies story reporter correctly tracks calculator interactions
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

async function runE2ETest() {
  console.log(chalk.bold.blue('\n🧪 E2E Test: Calculator with Story Reporter\n'));
  
  const testResults = [];
  const processes = [];
  let storyReportGenerated = false;
  let calculationsTracked = false;
  let themesDetected = false;
  
  try {
    // Start server
    console.log(chalk.cyan('Starting test environment...'));
    
    const server = spawn('node', ['./dist/index.js'], {
      env: { ...process.env, CHAT_PORT: 3001 },
      stdio: 'pipe'
    });
    processes.push(server);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start story reporter with short interval
    const reporter = spawn('node', ['./scripts/start-story-reporter.js'], {
      env: {
        ...process.env,
        SERVER_URL: 'ws://localhost:3001',
        ROOM_ID: 'test-room'
      },
      stdio: 'pipe'
    });
    processes.push(reporter);
    
    // Start calculator
    const calculator = spawn('node', ['./demo/calculator-story/calculator-agent.js'], {
      env: {
        ...process.env,
        SERVER_URL: 'ws://localhost:3001',
        ROOM_ID: 'test-room'
      },
      stdio: 'pipe'
    });
    processes.push(calculator);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run test interactions
    console.log(chalk.cyan('Running test calculations...'));
    
    const ws = new WebSocket('ws://localhost:3001');
    await new Promise(resolve => ws.on('open', resolve));
    
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId: 'test-room',
      userId: 'test-user',
      username: 'Tester',
      isAgent: false
    }));
    
    const testMessages = [
      'Hello calculator!',
      'calculate 42 + 58',
      'what is 100 * 3?',
      'solve 1000 / 10'
    ];
    
    for (const msg of testMessages) {
      ws.send(JSON.stringify({
        type: 'user_message',
        content: msg,
        sender: 'Tester'
      }));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for story report
    console.log(chalk.cyan('Waiting for story report...'));
    await new Promise(resolve => setTimeout(resolve, 65000));
    
    // Check results
    console.log(chalk.cyan('Checking results...'));
    
    // Check story reports
    const storyDir = path.join(process.cwd(), 'logs', 'stories');
    if (fs.existsSync(storyDir)) {
      const reports = fs.readdirSync(storyDir).filter(f => f.startsWith('story-'));
      storyReportGenerated = reports.length > 0;
      
      if (storyReportGenerated) {
        const report = JSON.parse(fs.readFileSync(path.join(storyDir, reports[0]), 'utf8'));
        
        // Check if calculations were tracked
        calculationsTracked = report.events.some(e => 
          e.content && e.content.includes('calculate')
        );
        
        // Check themes
        themesDetected = report.analysis.themes && 
          (report.analysis.themes.technical > 0 || report.analysis.themes.general > 0);
      }
    }
    
    // Report results
    console.log(chalk.bold.yellow('\n📊 Test Results:'));
    
    testResults.push({
      name: 'Story Report Generated',
      passed: storyReportGenerated
    });
    
    testResults.push({
      name: 'Calculations Tracked',
      passed: calculationsTracked
    });
    
    testResults.push({
      name: 'Themes Detected',
      passed: themesDetected
    });
    
    // Display results
    testResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? chalk.green : chalk.red;
      console.log(color(`${icon} ${result.name}`));
    });
    
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    
    console.log(chalk.bold(`\nTotal: ${passed}/${total} tests passed`));
    
    if (passed === total) {
      console.log(chalk.bold.green('\n✅ All tests passed!'));
    } else {
      console.log(chalk.bold.red('\n❌ Some tests failed'));
    }
    
    ws.close();
    
  } catch (error) {
    console.error(chalk.red('Test error:'), error);
  } finally {
    // Cleanup
    processes.forEach(p => p.kill());
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test
runE2ETest().catch(console.error);
EOF

# Create README for the demo
echo -e "${GREEN}Creating demo README...${NC}"
cat > "$DEMO_DIR/README.md" << 'EOF'
# Calculator Demo with Story Reporter

This demo showcases how the Story Reporter agent tracks and reports on chat room interactions, using a simple calculator agent as an example.

## Components

1. **Calculator Agent** (`calculator-agent.js`)
   - Simple math operations (add, subtract, multiply, divide)
   - Responds to calculation requests in natural language
   - Demonstrates agent interaction patterns

2. **Story Reporter** 
   - Tracks all chat events and messages
   - Detects conversation themes (technical, social, system)
   - Generates periodic narrative reports
   - Saves detailed logs for analysis

3. **External Log Library**
   - Intercepts all network communications
   - Captures system metrics
   - Provides transparent monitoring

## Running the Demo

### Quick Start
```bash
# From project root
npm run build
node demo/calculator-story/run-demo.js
```

### Manual Steps

1. Start the chat server:
```bash
npm run server
```

2. Start Story Reporter:
```bash
npm run start:story-reporter
```

3. Start Calculator Agent:
```bash
node demo/calculator-story/calculator-agent.js
```

4. Connect a client and interact:
```bash
npm run client TestUser calculator-demo
```

### E2E Test
```bash
node demo/calculator-story/e2e-calculator-story.test.js
```

## What to Observe

1. **Real-time Tracking**: Story Reporter tracks every message and event
2. **Theme Detection**: Messages are categorized (technical for calculations)
3. **User Activity**: Tracks who is most active
4. **Narrative Generation**: Creates a story about what happened
5. **External Monitoring**: All network calls are logged

## Story Report Format

Reports are saved to `logs/stories/story-*.json` with:
- Event timeline
- Theme analysis
- User activity metrics
- Generated narrative
- Key events summary

## Expected Output

The demo will show:
- Calculator responding to math requests
- Story Reporter generating periodic reports
- Themes detected (technical, social)
- User activity tracking
- Narrative about calculation session

## Customization

Modify `calculator-agent.js` to:
- Add more complex operations
- Change response format
- Add error handling

Modify story reporter config to:
- Change report interval
- Add custom themes
- Adjust narrative style
EOF

# Make scripts executable
chmod +x "$DEMO_DIR/run-demo.js"
chmod +x "$DEMO_DIR/e2e-calculator-story.test.js"

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${CYAN}Demo created in: ${DEMO_DIR}${NC}"
echo ""
echo "To run the demo:"
echo -e "${YELLOW}  node ${DEMO_DIR}/run-demo.js${NC}"
echo ""
echo "To run E2E test:"
echo -e "${YELLOW}  node ${DEMO_DIR}/e2e-calculator-story.test.js${NC}"
echo ""
echo "Components created:"
echo "  - Calculator Agent (simple math operations)"
echo "  - Demo Runner (automated scenario)"
echo "  - E2E Test (verification)"
echo "  - README with instructions"
echo ""