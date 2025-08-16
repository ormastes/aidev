#!/usr/bin/env node

/**
 * Claude Launcher with MCP Integration
 * Launches Claude with MCP configuration and sends test prompts
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const EventEmitter = require('events');
const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');
const { getFileAPI, FileType } = require('../../../infra_external-log-lib/pipe');

const fileAPI = getFileAPI();


class ClaudeLauncher extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      mcpServer: config.mcpServer || 'mcp-server-strict.js',
      mcpPort: config.mcpPort || 8080,
      workspacePath: config.workspacePath || '/workspace',
      resultPath: config.resultPath || '/results',
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.mcpProcess = null;
    this.ws = null;
    this.sessionId = Date.now().toString();
    this.responses = [];
  }

  /**
   * Launch MCP server and establish connection
   */
  async launch() {
    console.log(`🚀 Launching Claude with MCP: ${this.config.mcpServer}`);
    
    // Start MCP server
    await this.startMCPServer();
    
    // Connect via WebSocket
    await this.connectWebSocket();
    
    // Initialize session
    await this.initializeSession();
    
    console.log('✅ Claude launcher ready');
    return true;
  }

  /**
   * Start the MCP server process
   */
  startMCPServer() {
    return new Promise((resolve, reject) => {
      const serverPath = path.join('/app/mcp-servers', this.config.mcpServer);
      
      this.mcpProcess = spawn('node', [serverPath], {
        env: {
          ...process.env,
          VF_BASE_PATH: this.config.workspacePath,
          MCP_PORT: this.config.mcpPort,
          TEST_MODE: 'true'
        }
      });

      this.mcpProcess.stdout.on('data', (data) => {
        console.log(`MCP: ${data.toString()}`);
      });

      this.mcpProcess.stderr.on('data', (data) => {
        console.error(`MCP Error: ${data.toString()}`);
      });

      this.mcpProcess.on('error', reject);

      // Give server time to start
      setTimeout(resolve, 2000);
    });
  }

  /**
   * Connect to MCP server via WebSocket
   */
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:${this.config.mcpPort}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log(`📡 Connected to MCP server at ${wsUrl}`);
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  /**
   * Initialize Claude session with MCP
   */
  initializeSession() {
    const initMessage = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        clientInfo: {
          name: 'claude-test-launcher',
          version: '1.0.0'
        },
        capabilities: {
          tools: true
        }
      },
      id: 1
    };

    return this.sendMessage(initMessage);
  }

  /**
   * Send a prompt to Claude with MCP context
   */
  async sendPrompt(prompt, options = {}) {
    console.log(`\n📝 Sending prompt: "${prompt}"`);
    
    const message = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: options.tool || 'write_file_with_validation',
        arguments: this.buildArguments(prompt, options)
      },
      id: Date.now()
    };

    const response = await this.sendMessage(message);
    
    // Store response for analysis
    this.responses.push({
      prompt,
      response,
      timestamp: new Date().toISOString(),
      violations: this.detectViolations(response)
    });

    return response;
  }

  /**
   * Build arguments from prompt
   */
  buildArguments(prompt, options) {
    // Extract file path and content from prompt
    const fileMatch = prompt.match(/create\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+)?([^\s]+)/i);
    const purposeMatch = prompt.match(/(?:for|to|that)\s+(.+)/i);
    
    const fileName = fileMatch ? fileMatch[1] : 'test-file.js';
    const purpose = purposeMatch ? purposeMatch[1] : prompt;
    
    // Determine path based on prompt
    let filePath = fileName;
    if (prompt.toLowerCase().includes('root')) {
      filePath = fileName;
    } else if (prompt.includes('gen/doc')) {
      filePath = `gen/doc/${fileName}`;
    } else if (prompt.includes('layer/themes')) {
      filePath = `layer/themes/test-theme/${fileName}`;
    }

    return {
      path: filePath,
      content: options.content || `// Generated from prompt: ${prompt}\n`,
      purpose: purpose,
      category: options.category || 'utilities',
      tags: options.tags || ['test'],
      force: options.force || false,
      justification: options.justification
    };
  }

  /**
   * Send message and wait for response
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, this.config.timeout);

      const messageId = message.id;
      
      const responseHandler = (response) => {
        if (response.id === messageId) {
          clearTimeout(timeout);
          this.removeListener('response', responseHandler);
          resolve(response);
        }
      };

      this.on('response', responseHandler);
      this.ws.send(JSON.stringify(message));
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    console.log('📥 Received:', JSON.stringify(message, null, 2));
    
    if (message.result || message.error) {
      this.emit('response', message);
    }
  }

  /**
   * Detect violations in response
   */
  detectViolations(response) {
    const violations = [];
    
    if (response.error) {
      violations.push({
        type: 'error',
        message: response.error.message
      });
    }

    if (response.result?.content) {
      const content = response.result.content[0]?.text;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          
          if (!parsed.allowed) {
            violations.push({
              type: 'file_creation_blocked',
              issues: parsed.issues,
              suggestions: parsed.suggestions
            });
          }

          if (parsed.validation?.issues) {
            violations.push({
              type: 'validation_issues',
              issues: parsed.validation.issues
            });
          }
        } catch (e) {
          // Not JSON response
        }
      }
    }

    return violations;
  }

  /**
   * Wait for a specific response pattern
   */
  async waitForResponse(pattern, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Response pattern timeout'));
      }, timeout);

      const checkResponse = () => {
        const lastResponse = this.responses[this.responses.length - 1];
        if (lastResponse && this.matchesPattern(lastResponse, pattern)) {
          clearTimeout(timer);
          resolve(lastResponse);
        } else {
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  /**
   * Check if response matches pattern
   */
  matchesPattern(response, pattern) {
    if (pattern.violations && response.violations.length === 0) {
      return false;
    }

    if (pattern.allowed !== undefined) {
      const content = response.response?.result?.content?.[0]?.text;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.allowed !== pattern.allowed) {
            return false;
          }
        } catch {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate response against expected outcome
   */
  validateResponse(expected) {
    const lastResponse = this.responses[this.responses.length - 1];
    
    const validation = {
      success: true,
      errors: [],
      warnings: []
    };

    // Check for expected violations
    if (expected.shouldViolate) {
      if (lastResponse.violations.length === 0) {
        validation.success = false;
        validation.errors.push('Expected violation but none detected');
      }
    } else {
      if (lastResponse.violations.length > 0) {
        validation.success = false;
        validation.errors.push(`Unexpected violations: ${JSON.stringify(lastResponse.violations)}`);
      }
    }

    // Check for file creation
    if (expected.fileCreated !== undefined) {
      const content = lastResponse.response?.result?.content?.[0]?.text;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (expected.fileCreated && !parsed.success) {
            validation.success = false;
            validation.errors.push('Expected file creation but failed');
          } else if (!expected.fileCreated && parsed.success) {
            validation.success = false;
            validation.errors.push('File created when it should have been blocked');
          }
        } catch {
          validation.warnings.push('Could not parse response as JSON');
        }
      }
    }

    return validation;
  }

  /**
   * Get test results summary
   */
  getResults() {
    const summary = {
      sessionId: this.sessionId,
      totalPrompts: this.responses.length,
      violations: this.responses.filter(r => r.violations.length > 0).length,
      successful: this.responses.filter(r => r.violations.length === 0).length,
      responses: this.responses,
      timestamp: new Date().toISOString()
    };

    // Save to results file
    const resultFile = path.join(this.config.resultPath, `claude-test-${this.sessionId}.json`);
    await fileAPI.createFile(resultFile, JSON.stringify(summary, null, 2));
    
    console.log(`\n📊 Results saved to: ${resultFile}`);
    
    return summary;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    console.log('\n🛑 Shutting down Claude launcher...');
    
    if (this.ws) {
      this.ws.close();
    }

    if (this.mcpProcess) {
      this.mcpProcess.kill('SIGTERM');
    }

    console.log('✅ Shutdown complete');
  }
}

module.exports = ClaudeLauncher;

// Run if executed directly
if (require.main === module) {
  const launcher = new ClaudeLauncher({
    mcpServer: process.env.MCP_SERVER || 'mcp-server-strict.js',
    workspacePath: process.env.VF_BASE_PATH || '/workspace'
  });

  async function runTest() {
    try {
      await launcher.launch();
      
      // Test prompts
      await launcher.sendPrompt('Create a new file called test.js in the root directory');
      await launcher.sendPrompt('Create a documentation file in gen/doc/ for API reference');
      await launcher.sendPrompt('Create an error handling utility');
      
      const results = await launcher.getResults();
      console.log('\n📈 Test Summary:');
      console.log(`  Total Prompts: ${results.totalPrompts}`);
      console.log(`  Violations: ${results.violations}`);
      console.log(`  Successful: ${results.successful}`);
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await launcher.shutdown();
    }
  }

  runTest();
}