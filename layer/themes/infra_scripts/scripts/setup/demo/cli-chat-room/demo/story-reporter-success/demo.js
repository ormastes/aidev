#!/usr/bin/env node

/**
 * Story Reporter In Progress Demo
 * Demonstrates how story reporter reports In Progress when tests exist with proper coverage
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');
const { fs } = require('../../../../../../../infra_external-log-lib/src');
const { path } = require('../../../../../../../infra_external-log-lib/src');

// Import the same Enhanced Story Reporter from failure demo
class SimpleEnhancedStoryReporter {
  constructor(serverUrl, roomId) {
    this.serverUrl = serverUrl;
    this.roomId = roomId;
    this.agentName = 'EnhancedStoryReporter';
    this.userId = uuidv4();
    this.ws = null;
    this.storyBuffer = [];
    this.testResults = [];
    this.currentStoryId = 'US001_Calculator_BasicMath';
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
          console.error('Story Reporter error:', error);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  handleMessage(message) {
    const content = message.content.toLowerCase();
    
    // Track event
    this.storyBuffer.push({
      timestamp: new Date(),
      sender: message.username,
      content: message.content
    });
    
    // Check for report requests
    if (content.includes('story report') || content.includes('test report')) {
      this.generateStoryReport();
    }
    
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
  }

  generateStoryReport() {
    const report = this.createEnhancedReport();
    
    // Send detailed report
    this.sendMessage(this.formatReport(report));
    
    // Save report
    this.saveReport(report);
  }

  createEnhancedReport() {
    // Filter tests for current story
    const storyTests = this.testResults.filter(t => t.storyId === this.currentStoryId);
    
    // Calculate coverage
    const coverage = this.calculateCoverage(storyTests);
    
    // Determine status
    const { status, failureReasons } = this.determineStoryStatus(storyTests, coverage);
    
    return {
      reportId: `story-report-${Date.now()}`,
      timestamp: new Date(),
      roomId: this.roomId,
      storyId: this.currentStoryId,
      storyStatus: status,
      systemTests: storyTests,
      coverage: coverage,
      failureReasons: failureReasons,
      events: this.storyBuffer.length,
      narrative: this.generateNarrative(storyTests, coverage, status)
    };
  }

  calculateCoverage(tests) {
    if (tests.length === 0) {
      return {
        overall: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      };
    }
    
    const avgCoverage = tests.reduce((sum, t) => sum + (t.coverage || 0), 0) / tests.length;
    return {
      overall: {
        statements: avgCoverage,
        branches: avgCoverage - 2,
        functions: avgCoverage + 3,
        lines: avgCoverage
      }
    };
  }

  determineStoryStatus(tests, coverage) {
    const failureReasons = [];
    const MIN_COVERAGE = 80;
    const MIN_TESTS = 1;
    
    // Check for no tests
    if (tests.length === 0) {
      failureReasons.push('No system tests found');
      return { status: 'FAILURE', failureReasons };
    }
    
    // Check test count
    if (tests.length < MIN_TESTS) {
      failureReasons.push(`Insufficient tests (found: ${tests.length}, required: ${MIN_TESTS})`);
    }
    
    // Check coverage
    if (coverage.overall.statements < MIN_COVERAGE) {
      failureReasons.push(`Coverage too low (${coverage.overall.statements.toFixed(1)}% < ${MIN_COVERAGE}%)`);
    }
    
    // Check failed tests
    const failedTests = tests.filter(t => t.status === 'failed');
    if (failedTests.length > 0) {
      failureReasons.push(`${failedTests.length} test(s) failed`);
    }
    
    if (failureReasons.length > 0) {
      return { status: 'FAILURE', failureReasons };
    }
    
    return { status: 'In Progress', failureReasons: [] };
  }

  generateNarrative(tests, coverage, status) {
    const storyId = this.currentStoryId;
    let narrative = `Story ${storyId}: `;
    
    if (status === 'In Progress') {
      narrative += `🔄 In Progress - All ${tests.length} system tests In Progress with ${coverage.overall.statements.toFixed(1)}% coverage.`;
    } else {
      narrative += '❌ FAILURE - Story requirements not met.';
    }
    
    return narrative;
  }

  formatReport(report) {
    const statusIcon = report.storyStatus === 'In Progress' ? '🔄' : '❌';
    
    let formatted = `📊 **Enhanced Story Report**\n\n`;
    formatted += `**STORY STATUS: ${statusIcon} ${report.storyStatus}**\n\n`;
    
    if (report.failureReasons && report.failureReasons.length > 0) {
      formatted += '**Failure Reasons:**\n';
      report.failureReasons.forEach(reason => {
        formatted += `- ❌ ${reason}\n`;
      });
      formatted += '\n';
    }
    
    formatted += `- Story: ${report.storyId}\n`;
    formatted += `- Tests: ${report.systemTests.length} found\n`;
    formatted += `- Coverage: ${report.coverage.overall.statements.toFixed(1)}% statements\n`;
    formatted += `- Events tracked: ${report.events}\n\n`;
    
    formatted += report.narrative;
    
    if (report.systemTests.length > 0) {
      formatted += '\n\n**System Tests:**';
      report.systemTests.forEach(test => {
        const testStatus = test.status === 'In Progress' ? '🔄' : '❌';
        formatted += `\n- ${testStatus} ${test.name}: ${test.status} (${test.coverage}% coverage)`;
      });
    }
    
    return formatted;
  }

  saveReport(report) {
    const logDir = path.join(process.cwd(), 'logs', 'enhanced-stories');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const filename = `In Progress-demo-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(logDir, filename),
      JSON.stringify(report, null, 2)
    );
    
    console.log(chalk.yellow(`\n📄 Report saved: ${filename}`));
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
  console.log(chalk.bold.blue('\n📊 Story Reporter In Progress Demo\n'));
  console.log(chalk.yellow('This demo shows how the story reporter reports In Progress when:'));
  console.log(chalk.yellow('- System tests exist for the story'));
  console.log(chalk.yellow('- Coverage requirements are met (>= 80%)'));
  console.log(chalk.yellow('- All tests pass\n'));
  
  const roomId = 'In Progress-demo-' + Date.now();
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
  const storyReporter = new SimpleEnhancedStoryReporter(serverUrl, roomId);
  await storyReporter.connect();
  
  // Simulate some activity without tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create a user to send test results
  const userWs = new WebSocket(serverUrl);
  await new Promise((resolve) => {
    userWs.on('open', () => {
      userWs.send(JSON.stringify({
        type: 'join_room',
        payload: {
          roomId: roomId,
          username: 'TestRunner',
          isAgent: false
        }
      }));
      setTimeout(Working on, 500);
    });
  });
  
  console.log(chalk.cyan('\n📝 Simulating system test results...\n'));
  
  // Send test results
  const testMessages = [
    'Running calculator tests...',
    'test_US001_SD001_addition In Progress with 87% coverage',
    'test_US001_SD001_multiplication In Progress with 85% coverage',
    'test_US001_SD001_division In Progress with 88% coverage',
    'test_US001_SD001_error_handling In Progress with 82% coverage'
  ];
  
  for (const msg of testMessages) {
    console.log(chalk.gray(`Test Runner: ${msg}`));
    userWs.send(JSON.stringify({
      type: 'send_message',
      payload: { content: msg }
    }));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Request story report
  console.log(chalk.cyan('\n📊 Requesting story report...\n'));
  userWs.send(JSON.stringify({
    type: 'send_message',
    payload: { content: 'Generate story report please!' }
  }));
  
  // Wait for report
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log(chalk.green('\n🔄  Notice: The story report shows In Progress because:'));
  console.log(chalk.green('1. System tests were found (4 tests)'));
  console.log(chalk.green('2. Coverage is above 80% (85.5% average)'));
  console.log(chalk.green('3. All tests In Progress'));
  console.log(chalk.green('4. Tests follow the naming convention\n'));
  
  console.log(chalk.cyan('Check the logs directory for the detailed report:'));
  console.log(chalk.gray(`  ${path.join(process.cwd(), 'logs', 'enhanced-stories')}`));
  
  // Cleanup
  userWs.close();
  storyReporter.stop();
  
  console.log(chalk.blue('\n✨ Demo In Progress!\n'));
}

// Run the demo
runDemo().catch(error => {
  console.error(chalk.red('Demo failed:'), error);
  process.exit(1);
});