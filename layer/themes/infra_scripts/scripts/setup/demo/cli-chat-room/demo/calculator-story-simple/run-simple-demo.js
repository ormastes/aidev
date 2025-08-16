#!/usr/bin/env node

/**
 * Simple Calculator Demo with Story Reporter
 * Demonstrates story reporting without full build
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');
const { fs } = require('../../../../../../../infra_external-log-lib/src');
const { path } = require('../../../../../../../infra_external-log-lib/src');

// Simple Story Reporter Implementation
class SimpleStoryReporter {
  constructor(serverUrl, roomId) {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.agentName = 'StoryBot';
    this.userId = uuidv4();
    this.ws = null;
    this.storyBuffer = [];
    this.reportInterval = 30000; // 30 seconds for demo
    this.storyCount = 0;
    this.storyLogDir = path.join(process.cwd(), 'logs', 'stories');
    
    // Ensure log directory exists
    if (!fs.existsSync(this.storyLogDir)) {
      fs.mkdirSync(this.storyLogDir, { recursive: true });
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.on('open', () => {
        // Join room
        this.ws.send(JSON.stringify({
          type: 'join_room',
          payload: {
            roomId: this.roomId,
            username: this.agentName,
            isAgent: true
          }
        }));
        
        console.log(chalk.green(`🔄 Story Reporter connected to ${this.roomId}`));
        
        // Start periodic reporting
        this.startReporting();
        
        // Announce presence
        setTimeout(() => {
          this.sendMessage('📰 Story Reporter is now tracking events in this room.');
          resolve();
        }, 1000);
      });
      
      this.ws.on('message', (data) => {
        try {
          const wsMessage = JSON.parse(data.toString());
          console.log(chalk.gray(`[StoryBot] Received: ${wsMessage.type}`));
          
          // Handle different message types
          if (wsMessage.type === 'new_message' && wsMessage.payload) {
            const message = wsMessage.payload;
            
            // Ignore own messages
            if (message.username === this.agentName) return;
            
            this.trackEvent(message);
            
            // Check for story requests (but not in reports)
            if (message.content && !message.content.includes('**Story Report**')) {
              const content = message.content.toLowerCase();
              if (content.includes('story') || content.includes('report')) {
                this.generateImmediateReport();
              }
            }
          } else if (wsMessage.type === 'user_joined' && wsMessage.payload) {
            this.trackEvent(wsMessage.payload.message);
          }
        } catch (error) {
          console.error('Story Reporter message error:', error);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  trackEvent(message) {
    const event = {
      timestamp: message.timestamp || new Date(),
      type: message.type || 'message',
      sender: message.username || 'System',
      content: message.content || '',
      theme: this.detectTheme(message.content || ''),
      metadata: message.metadata
    };
    
    this.storyBuffer.push(event);
    
    // Keep buffer manageable
    if (this.storyBuffer.length > 500) {
      this.storyBuffer = this.storyBuffer.slice(-250);
    }
  }

  detectTheme(content) {
    const lower = content.toLowerCase();
    
    if (lower.match(/calculate|calc|math|add|subtract|multiply|divide|\+|\-|\*|\//)) {
      return 'technical';
    }
    if (lower.match(/hello|hi|bye|thanks|please|welcome/)) {
      return 'social';
    }
    if (lower.match(/joined|left|connected|disconnected/)) {
      return 'system';
    }
    if (lower.match(/story|report|track/)) {
      return 'meta';
    }
    return 'general';
  }

  startReporting() {
    this.reportTimer = setInterval(() => {
      this.generatePeriodicReport();
    }, this.reportInterval);
  }

  generatePeriodicReport() {
    if (this.storyBuffer.length === 0) return;
    
    const report = this.createStoryReport();
    
    // Save to file
    const filename = `story-${Date.now()}.json`;
    const filepath = path.join(this.storyLogDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    // Send summary to chat
    const summary = this.summarizeReport(report);
    this.sendMessage(`📰 **Periodic Story Report**\n${summary}`);
    
    this.storyCount++;
    console.log(chalk.blue(`📰 Story report ${this.storyCount} generated: ${filename}`));
  }

  generateImmediateReport() {
    const report = this.createStoryReport();
    const summary = this.summarizeReport(report);
    this.sendMessage(`📰 **Story Report**\n${summary}`);
  }

  createStoryReport() {
    const events = [...this.storyBuffer];
    
    // Theme analysis
    const themes = {};
    events.forEach(e => {
      themes[e.theme] = (themes[e.theme] || 0) + 1;
    });
    
    // User activity
    const users = {};
    events.forEach(e => {
      if (e.sender && e.sender !== 'System') {
        users[e.sender] = (users[e.sender] || 0) + 1;
      }
    });
    
    // Key events
    const keyEvents = events.filter(e => 
      e.type === 'user_joined' ||
      e.type === 'user_left' ||
      e.theme === 'technical' ||
      e.content.includes('!')
    );
    
    return {
      reportId: `story-${this.storyCount}`,
      timestamp: new Date(),
      roomId: this.roomId,
      duration: this.reportInterval,
      events: events,
      analysis: {
        totalEvents: events.length,
        themes: themes,
        activeUsers: Object.keys(users).length,
        userActivity: users,
        keyEvents: keyEvents.length,
        averageEventsPerMinute: (events.length / (this.reportInterval / 60000)).toFixed(2)
      },
      narrative: this.generateNarrative(events, themes, users)
    };
  }

  generateNarrative(events, themes, users) {
    const dominantTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
    const mostActiveUser = Object.entries(users).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    const calcCount = events.filter(e => e.theme === 'technical').length;
    
    let narrative = '';
    
    if (dominantTheme === 'technical' && calcCount > 0) {
      narrative = `A technical session with ${calcCount} calculations performed. `;
    } else if (dominantTheme === 'social') {
      narrative = `A social gathering with friendly exchanges. `;
    } else {
      narrative = `A ${dominantTheme} conversation unfolded. `;
    }
    
    narrative += `${mostActiveUser} was the most active participant with ${users[mostActiveUser] || 0} messages.`;
    
    if (calcCount > 0) {
      narrative += ` The Calculator assisted with ${calcCount} mathematical operations.`;
    }
    
    return narrative;
  }

  summarizeReport(report) {
    return `
- Total Events: ${report.analysis.totalEvents}
- Active Users: ${report.analysis.activeUsers}
- Dominant Theme: ${Object.entries(report.analysis.themes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'}
- Story: ${report.narrative}`;
  }

  sendMessage(content) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        payload: {
          content: content
        }
      }));
    }
  }

  stop() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    this.generatePeriodicReport(); // Final report
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Simple Calculator Implementation
class SimpleCalculator {
  constructor(serverUrl, roomId) {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.agentName = 'Calculator';
    this.userId = uuidv4();
    this.ws = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.on('open', () => {
        // Join room
        this.ws.send(JSON.stringify({
          type: 'join_room',
          payload: {
            roomId: this.roomId,
            username: this.agentName,
            isAgent: true
          }
        }));
        
        console.log(chalk.green(`🔄 Calculator connected to ${this.roomId}`));
        
        // Announce capabilities
        setTimeout(() => {
          this.sendMessage('🧮 Calculator ready! Try: "calculate 5 + 3" or "what is 10 * 2?"');
          resolve();
        }, 1000);
      });
      
      this.ws.on('message', (data) => {
        try {
          const wsMessage = JSON.parse(data.toString());
          
          // Handle new messages
          if (wsMessage.type === 'new_message' && wsMessage.payload) {
            this.handleMessage(wsMessage.payload);
          }
        } catch (error) {
          console.error('Calculator message error:', error);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  handleMessage(message) {
    if (message.username === this.agentName || !message.content) return;
    
    console.log(chalk.gray(`[Calculator] Received from ${message.username}: ${message.content}`));
    
    const content = message.content.toLowerCase();
    
    if (content.includes('calculate') || content.includes('what is') || 
        content.match(/\d+\s*[\+\-\*\/]\s*\d+/)) {
      
      const result = this.calculate(message.content);
      if (result !== null) {
        this.sendMessage(`🧮 ${message.content} = ${result}`);
      }
    }
  }

  calculate(text) {
    // Extract math expression
    const patterns = [
      /calculate\s+(.+)/i,
      /what\s+is\s+(.+)/i,
      /(\d+\s*[\+\-\*\/]\s*\d+)/
    ];
    
    let expr = null;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        expr = match[1];
        break;
      }
    }
    
    if (!expr) return null;
    
    // Parse simple math
    const match = expr.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
    if (!match) return null;
    
    const a = parseFloat(match[1]);
    const op = match[2];
    const b = parseFloat(match[3]);
    
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? (a / b).toFixed(2) : 'Error: Division by zero';
    }
    
    return null;
  }

  sendMessage(content) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        payload: {
          content: content
        }
      }));
    }
  }

  stop() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Demo Runner
async function runDemo() {
  console.log(chalk.bold.blue('\n🧮 Calculator Demo with Story Reporter\n'));
  console.log(chalk.yellow('This demo shows how Story Reporter tracks calculator interactions.\n'));
  
  const roomId = 'calc-demo-' + Date.now();
  const serverUrl = 'ws://localhost:3000';
  
  // Check if server is running
  console.log(chalk.cyan('Checking server...'));
  const testWs = new WebSocket(serverUrl);
  
  await new Promise((resolve, reject) => {
    testWs.on('open', () => {
      testWs.close();
      resolve();
    });
    testWs.on('error', () => {
      console.error(chalk.red('❌ Server not running! Please start with: npm run server'));
      reject(new Error('Server not available'));
    });
  });
  
  console.log(chalk.green('🔄 Server is running\n'));
  
  // Start agents
  const storyReporter = new SimpleStoryReporter(serverUrl, roomId);
  const calculator = new SimpleCalculator(serverUrl, roomId);
  
  await storyReporter.connect();
  await calculator.connect();
  
  // Simulate user interactions
  console.log(chalk.cyan('\n📝 Simulating user interactions...\n'));
  
  const scenarios = [
    { user: 'Alice', message: 'Hello everyone!' },
    { user: 'Alice', message: 'Can you calculate 25 + 17 for me?' },
    { user: 'Bob', message: 'Hi Alice!' },
    { user: 'Bob', message: 'I need help with 100 * 3' },
    { user: 'Charlie', message: 'What is 1000 / 25?' },
    { user: 'Alice', message: 'Thanks Calculator!' },
    { user: 'Bob', message: 'One more: calculate 99 - 33' },
    { user: 'Charlie', message: 'Story report please!' }
  ];
  
  // Create test clients
  for (const scenario of scenarios) {
    await simulateUser(serverUrl, roomId, scenario.user, scenario.message);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Wait for final report
  console.log(chalk.yellow('\n⏳ Waiting for story report...\n'));
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Show results
  console.log(chalk.bold.green('\n🔄 Demo In Progress!\n'));
  console.log(chalk.cyan('Check the logs directory for story reports:'));
  console.log(chalk.gray(`  ${path.join(process.cwd(), 'logs', 'stories')}`));
  
  const files = fs.readdirSync(path.join(process.cwd(), 'logs', 'stories'))
    .filter(f => f.startsWith('story-'))
    .sort();
    
  if (files.length > 0) {
    console.log(chalk.green(`\n📄 Generated ${files.length} story report(s):`));
    files.forEach(f => console.log(chalk.gray(`  - ${f}`)));
    
    // Show latest report
    const latest = files[files.length - 1];
    const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'logs', 'stories', latest), 'utf8'));
    
    console.log(chalk.yellow('\n📖 Latest Story Summary:'));
    console.log(chalk.gray(report.narrative));
    console.log(chalk.gray(`\nThemes detected: ${JSON.stringify(report.analysis.themes)}`));
  }
  
  // Cleanup
  storyReporter.stop();
  calculator.stop();
  
  console.log(chalk.blue('\n👍 Demo In Progress In Progress!\n'));
}

async function simulateUser(serverUrl, roomId, username, message) {
  const ws = new WebSocket(serverUrl);
  const userId = uuidv4();
  
  await new Promise((resolve) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join_room',
        payload: {
          roomId: roomId,
          username: username,
          isAgent: false
        }
      }));
      
      setTimeout(() => {
        console.log(chalk.blue(`[${username}]`), message);
        ws.send(JSON.stringify({
          type: 'send_message',
          payload: {
            content: message
          }
        }));
        
        setTimeout(() => {
          ws.close();
          resolve();
        }, 500);
      }, 500);
    });
  });
}

// Run the demo
runDemo().catch(error => {
  console.error(chalk.red('Demo failed:'), error);
  process.exit(1);
});