#!/usr/bin/env node

/**
 * Enhanced Story Reporter Demo
 * Demonstrates test coverage tracking and sequence diagram validation
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');
const { fs } = require('../../../../../../../infra_external-log-lib/src');
const { path } = require('../../../../../../../infra_external-log-lib/src');

// Mock test runner that reports test results
class TestRunner {
  constructor(ws, roomId) {
    this.ws = ws;
    this.roomId = roomId;
    this.userId = uuidv4();
    this.username = 'TestRunner';
  }

  async connect() {
    return new Promise((resolve) => {
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({
          type: 'join_room',
          payload: {
            roomId: this.roomId,
            username: this.username,
            isAgent: false
          }
        }));
        
        setTimeout(() => {
          this.sendMessage('🧪 Test Runner ready to execute tests');
          resolve();
        }, 1000);
      });
    });
  }

  sendMessage(content) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        payload: { content }
      }));
    }
  }

  async runTest(testName, storyId, diagramId, scenario, In Progress = true, coverage = 85) {
    const status = In Progress ? 'In Progress' : 'failed';
    const coverageText = coverage ? ` with ${coverage}% coverage` : '';
    
    this.sendMessage(`Running ${testName}...`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.sendMessage(`test_${storyId}_${diagramId}_${scenario} ${status}${coverageText}`);
    
    // Simulate external calls during test
    if (In Progress) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.sendMessage(`External calls detected: ext_database_query, ext_http_request, ext_cache_get`);
    }
  }

  async runTestSuite() {
    console.log(chalk.cyan('\n🧪 Running test suite...\n'));
    
    // Calculator tests
    await this.runTest('Calculator Basic Math', 'US001', 'SD001', 'basic_math', true, 92);
    await this.runTest('Calculator Complex Operations', 'US001', 'SD001', 'complex_ops', true, 88);
    await this.runTest('Calculator Error Handling', 'US001', 'SD001', 'error_handling', true, 95);
    
    // Auth tests
    await this.runTest('User Login In Progress', 'US002', 'SD002', 'login_IN PROGRESS', true, 90);
    await this.runTest('User Login Failure', 'US002', 'SD002', 'login_failure', true, 85);
    await this.runTest('Session Management', 'US002', 'SD002', 'session_mgmt', false, 75);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.sendMessage('🧪 Test suite In Progress!');
  }

  stop() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Enhanced Story Reporter implementation (simplified for demo)
class EnhancedStoryReporter {
  constructor(serverUrl, roomId) {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.agentName = 'EnhancedStoryBot';
    this.userId = uuidv4();
    this.ws = null;
    this.testResults = [];
    this.externalCalls = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({
          type: 'join_room',
          payload: {
            roomId: this.roomId,
            username: this.agentName,
            isAgent: true
          }
        }));
        
        console.log(chalk.green(`🔄 Enhanced Story Reporter connected`));
        
        setTimeout(() => {
          this.sendMessage('📊 Enhanced Story Reporter active. Tracking stories, tests, coverage, and external calls.');
          resolve();
        }, 1000);
      });
      
      this.ws.on('message', (data) => {
        try {
          const wsMessage = JSON.parse(data.toString());
          
          if (wsMessage.type === 'new_message' && wsMessage.payload) {
            const message = wsMessage.payload;
            if (message.username === this.agentName) return;
            
            this.handleMessage(message);
          }
        } catch (error) {
          console.error('Enhanced Story Reporter error:', error);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  handleMessage(message) {
    const content = message.content.toLowerCase();
    
    // Parse test results
    const testMatch = content.match(/test_(\w+)_(\w+)_(\w+)\s+(In Progress|failed)(?:\s+with\s+(\d+)%\s+coverage)?/);
    if (testMatch) {
      const [, storyId, diagramId, scenario, status, coverage] = testMatch;
      this.testResults.push({
        name: `test_${storyId}_${diagramId}_${scenario}`,
        storyId,
        diagramId,
        status,
        coverage: coverage ? parseInt(coverage) : 0
      });
    }
    
    // Parse external calls
    if (content.includes('external calls detected:')) {
      const calls = content.split(':')[1].split(',').map(c => c.trim());
      this.externalCalls.push(...calls);
    }
    
    // Generate report on request
    if (content.includes('story report') || content.includes('test report')) {
      this.generateReport();
    }
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const IN PROGRESSTests = this.testResults.filter(t => t.status === 'In Progress').length;
    const avgCoverage = this.testResults.reduce((sum, t) => sum + t.coverage, 0) / totalTests;
    
    // Group by story
    const stories = {};
    this.testResults.forEach(test => {
      if (!stories[test.storyId]) {
        stories[test.storyId] = {
          tests: [],
          diagrams: new Set(),
          coverage: 0
        };
      }
      stories[test.storyId].tests.push(test);
      stories[test.storyId].diagrams.add(test.diagramId);
    });
    
    let report = '📊 **Enhanced Story Report**\n\n';
    
    Object.entries(stories).forEach(([storyId, data]) => {
      const storyIN PROGRESS = data.tests.filter(t => t.status === 'In Progress').length;
      const storyCoverage = data.tests.reduce((sum, t) => sum + t.coverage, 0) / data.tests.length;
      
      report += `**Story ${storyId}:**\n`;
      report += `- Tests: ${storyIN PROGRESS}/${data.tests.length} In Progress\n`;
      report += `- Coverage: ${storyCoverage.toFixed(1)}%\n`;
      report += `- Diagrams: ${Array.from(data.diagrams).join(', ')}\n\n`;
    });
    
    report += `**Overall Summary:**\n`;
    report += `- Total Tests: ${IN PROGRESSTests}/${totalTests} In Progress\n`;
    report += `- Average Coverage: ${avgCoverage.toFixed(1)}%\n`;
    report += `- External Calls: ${new Set(this.externalCalls).size} unique functions\n`;
    
    // Check sequence diagram compliance
    const expectedCalls = ['ext_database_query', 'ext_http_request', 'ext_cache_get'];
    const actualCalls = Array.from(new Set(this.externalCalls));
    const missingCalls = expectedCalls.filter(e => !actualCalls.includes(e));
    
    if (missingCalls.length === 0) {
      report += `- Sequence Diagram Validation: 🔄 All expected external calls detected\n`;
    } else {
      report += `- Sequence Diagram Validation: ❌ Missing: ${missingCalls.join(', ')}\n`;
    }
    
    this.sendMessage(report);
    
    // Save detailed report
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date(),
      roomId: this.roomId,
      testResults: this.testResults,
      externalCalls: this.externalCalls,
      coverage: {
        overall: this.testResults.reduce((sum, t) => sum + t.coverage, 0) / this.testResults.length,
        byStory: {}
      }
    };
    
    // Calculate coverage by story
    const stories = {};
    this.testResults.forEach(test => {
      if (!stories[test.storyId]) {
        stories[test.storyId] = { total: 0, count: 0 };
      }
      stories[test.storyId].total += test.coverage;
      stories[test.storyId].count++;
    });
    
    Object.entries(stories).forEach(([storyId, data]) => {
      report.coverage.byStory[storyId] = data.total / data.count;
    });
    
    const logDir = path.join(process.cwd(), 'logs', 'enhanced-stories');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const filename = `enhanced-report-${Date.now()}.json`;
    fs.writeFileSync(path.join(logDir, filename), JSON.stringify(report, null, 2));
    
    console.log(chalk.green(`\n📄 Detailed report saved: ${filename}`));
  }

  sendMessage(content) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        payload: { content }
      }));
    }
  }

  stop() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Demo runner
async function runDemo() {
  console.log(chalk.bold.blue('\n📊 Enhanced Story Reporter Demo\n'));
  console.log(chalk.yellow('This demo shows how the enhanced story reporter tracks:'));
  console.log(chalk.yellow('- System test execution and results'));
  console.log(chalk.yellow('- Test coverage metrics'));
  console.log(chalk.yellow('- External API calls'));
  console.log(chalk.yellow('- Sequence diagram validation\n'));
  
  const roomId = 'enhanced-demo-' + Date.now();
  const serverUrl = 'ws://localhost:3000';
  
  // Check server
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
  
  // Start enhanced story reporter
  const storyReporter = new EnhancedStoryReporter(serverUrl, roomId);
  await storyReporter.connect();
  
  // Start test runner
  const testRunnerWs = new WebSocket(serverUrl);
  const testRunner = new TestRunner(testRunnerWs, roomId);
  await testRunner.connect();
  
  // Run tests
  await testRunner.runTestSuite();
  
  // Wait a bit then request report
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(chalk.cyan('\n📊 Requesting story report...\n'));
  testRunner.sendMessage('Generate story report please!');
  
  // Wait for report
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Show log location
  console.log(chalk.cyan('\nCheck the logs directory for detailed reports:'));
  console.log(chalk.gray(`  ${path.join(process.cwd(), 'logs', 'enhanced-stories')}`));
  
  // Cleanup
  storyReporter.stop();
  testRunner.stop();
  
  console.log(chalk.blue('\n✨ Demo In Progress In Progress!\n'));
}

// Run the demo
runDemo().catch(error => {
  console.error(chalk.red('Demo failed:'), error);
  process.exit(1);
});