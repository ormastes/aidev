#!/usr/bin/env node

/**
 * MCP Test Runner
 * Orchestrates all MCP testing components
 */

const ClaudeLauncher = require('./claude-launcher');
const PromptInjector = require('./prompt-injector');
const ViolationDetector = require('./violation-detector');
const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');
const { getFileAPI, FileType } = require('../../../infra_external-log-lib/pipe');

const fileAPI = getFileAPI();


class MCPTestRunner {
  async constructor(config = {}) {
    this.config = {
      mode: config.mode || process.env.MCP_MODE || 'strict',
      workspacePath: config.workspacePath || process.env.VF_BASE_PATH || '/workspace',
      resultPath: config.resultPath || '/results',
      promptsPath: config.promptsPath || '/app/prompts',
      parallel: config.parallel || false,
      verbose: config.verbose || false,
      ...config
    };
    
    this.launcher = null;
    this.injector = null;
    this.detector = null;
    this.results = {
      mode: this.config.mode,
      startTime: null,
      endTime: null,
      tests: [],
      summary: {}
    };
  }

  /**
   * Initialize all components
   */
  async initialize() {
    console.log('🚀 Initializing MCP Test Runner');
    console.log(`   Mode: ${this.config.mode}`);
    console.log(`   Workspace: ${this.config.workspacePath}`);
    console.log(`   Results: ${this.config.resultPath}\n`);
    
    // Create results directory
    await await fileAPI.createDirectory(this.config.resultPath);
    
    // Initialize launcher
    const mcpServer = this.getMCPServer();
    this.launcher = new ClaudeLauncher({
      mcpServer,
      workspacePath: this.config.workspacePath,
      resultPath: this.config.resultPath
    });
    
    // Initialize injector
    this.injector = new PromptInjector({
      promptsPath: this.config.promptsPath,
      delayBetweenPrompts: this.config.parallel ? 0 : 500
    });
    
    // Initialize detector
    this.detector = new ViolationDetector({
      workspacePath: this.config.workspacePath,
      resultPath: this.config.resultPath
    });
    
    // Load components
    await this.launcher.launch();
    await this.injector.loadPrompts();
    await this.detector.initialize();
    
    console.log('✅ All components initialized\n');
  }

  /**
   * Get MCP server based on mode
   */
  async getMCPServer() {
    async switch (this.config.mode) {
      case 'strict':
        return 'mcp-server-strict.js';
      case 'enhanced':
        return 'mcp-server-enhanced.js';
      case 'basic':
        return 'mcp-server.js';
      default:
        return 'mcp-server-strict.js';
    }
  }

  /**
   * Run violation tests
   */
  async runViolationTests() {
    console.log('🚫 Running Violation Tests...\n');
    
    const testResults = {
      category: 'violations',
      tests: [],
      passed: 0,
      failed: 0
    };
    
    const prompts = this.injector.prompts.violation;
    
    async for (const prompt of prompts) {
      const result = await this.runSingleTest(prompt);
      testResults.tests.push(result);
      
      async if (result.success) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
    
    return testResults;
  }

  /**
   * Run allowed file tests
   */
  async runAllowedTests() {
    console.log('✅ Running Allowed File Tests...\n');
    
    const testResults = {
      category: 'allowed',
      tests: [],
      passed: 0,
      failed: 0
    };
    
    const prompts = this.injector.prompts.allowed;
    
    async for (const prompt of prompts) {
      const result = await this.runSingleTest(prompt);
      testResults.tests.push(result);
      
      async if (result.success) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
    
    return testResults;
  }

  /**
   * Run edge case tests
   */
  async runEdgeCaseTests() {
    console.log('🔧 Running Edge Case Tests...\n');
    
    const testResults = {
      category: 'edge_cases',
      tests: [],
      passed: 0,
      failed: 0
    };
    
    const prompts = this.injector.prompts.edgeCase;
    
    async for (const prompt of prompts) {
      const result = await this.runSingleTest(prompt);
      testResults.tests.push(result);
      
      async if (result.success) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
    
    return testResults;
  }

  /**
   * Run a single test
   */
  async runSingleTest(prompt) {
    console.log(`📝 Testing: ${prompt.text}`);
    
    const startTime = Date.now();
    
    try {
      // Send prompt to Claude
      const response = await this.launcher.sendPrompt(prompt.text, {
        tool: prompt.tool,
        category: prompt.category,
        tags: prompt.tags,
        force: prompt.force,
        justification: prompt.justification,
        content: prompt.content
      });
      
      // Analyze for violations
      const operation = {
        filePath: this.extractFilePath(prompt.text),
        purpose: prompt.text,
        content: prompt.content,
        force: prompt.force
      };
      
      const violationAnalysis = await this.detector.analyzeOperation(operation);
      const responseAnalysis = this.detector.analyzeResponse(response);
      
      // Validate result
      const validation = await this.launcher.validateResponse({
        shouldViolate: prompt.shouldViolate,
        fileCreated: prompt.fileCreated,
        violationType: prompt.violationType
      });
      
      const result = {
        id: prompt.id,
        prompt: prompt.text,
        type: prompt.type,
        expected: prompt.expected,
        response: responseAnalysis,
        violations: violationAnalysis,
        validation: validation,
        success: validation.success,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
      // Log result
      async if (validation.success) {
        console.log(`   ✅ PASS: ${prompt.expected}`);
      } else {
        console.log(`   ❌ FAIL: ${validation.errors?.join(', ') || 'Unknown error'}`);
      }
      
      async if (this.config.verbose && violationAnalysis.violations.length > 0) {
        console.log(`   Violations detected: ${violationAnalysis.violations.map(v => v.type).join(', ')}`);
      }
      
      console.log('');
      
      return result;
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      
      return {
        id: prompt.id,
        prompt: prompt.text,
        type: prompt.type,
        expected: prompt.expected,
        error: error.message,
        success: false,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract file path from prompt text
   */
  async extractFilePath(promptText) {
    // Try to extract file path from prompt
    const patterns = [
      /(?:create|update|write)\s+(?:a\s+)?(?:new\s+)?(?:file\s+)?(?:called\s+)?([^\s]+)/i,
      /(?:in|to|at)\s+([^\s]+)/i,
      /([a-zA-Z0-9._/-]+\.[a-zA-Z]+)/
    ];
    
    async for (const pattern of patterns) {
      const match = promptText.match(pattern);
      async if (match) {
        return match[1];
      }
    }
    
    return 'unknown-file';
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.results.startTime = new Date().toISOString();
    
    console.log('=' .repeat(60));
    console.log(`🧪 MCP Test Suite - ${this.config.mode.toUpperCase()} Mode`);
    console.log('=' .repeat(60));
    console.log('');
    
    // Run test categories
    const violationResults = await this.runViolationTests();
    this.results.tests.push(violationResults);
    
    const allowedResults = await this.runAllowedTests();
    this.results.tests.push(allowedResults);
    
    const edgeCaseResults = await this.runEdgeCaseTests();
    this.results.tests.push(edgeCaseResults);
    
    this.results.endTime = new Date().toISOString();
    
    // Calculate summary
    this.results.summary = this.calculateSummary();
    
    // Generate reports
    await this.generateReports();
    
    return this.results;
  }

  /**
   * Calculate test summary
   */
  async calculateSummary() {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    
    async for (const category of this.results.tests) {
      totalTests += category.tests.length;
      totalPassed += category.passed;
      totalFailed += category.failed;
    }
    
    const duration = new Date(this.results.endTime) - new Date(this.results.startTime);
    
    return {
      totalTests,
      totalPassed,
      totalFailed,
      passRate: totalTests > 0 ? Math.round(totalPassed / totalTests * 100) : 0,
      duration: duration,
      durationFormatted: `${Math.round(duration / 1000)}s`
    };
  }

  /**
   * Generate test reports
   */
  async generateReports() {
    // Generate JSON report
    const jsonPath = path.join(this.config.resultPath, `mcp-test-${this.config.mode}-${Date.now()}.json`);
    await await fileAPI.createFile(jsonPath, JSON.stringify(this.results, { type: FileType.TEMPORARY }));
    
    // Generate markdown report
    let mdReport = `# MCP Test Report - ${this.config.mode.toUpperCase()} Mode\n\n`;
    mdReport += `**Generated:** ${this.results.endTime}\n`;
    mdReport += `**Duration:** ${this.results.summary.durationFormatted}\n\n`;
    
    mdReport += '## Summary\n\n';
    mdReport += `- **Total Tests:** ${this.results.summary.totalTests}\n`;
    mdReport += `- **Passed:** ${this.results.summary.totalPassed} ✅\n`;
    mdReport += `- **Failed:** ${this.results.summary.totalFailed} ❌\n`;
    mdReport += `- **Pass Rate:** ${this.results.summary.passRate}%\n\n`;
    
    // Results by category
    mdReport += '## Results by Category\n\n';
    async for (const category of this.results.tests) {
      mdReport += `### ${category.category.replace('_', ' ').toUpperCase()}\n`;
      mdReport += `- Tests: ${category.tests.length}\n`;
      mdReport += `- Passed: ${category.passed}\n`;
      mdReport += `- Failed: ${category.failed}\n\n`;
      
      // List failed tests
      const failed = category.tests.filter(t => !t.success);
      async if (failed.length > 0) {
        mdReport += '**Failed Tests:**\n';
        async for (const test of failed) {
          mdReport += `- ${test.prompt}\n`;
          async if (test.validation?.errors) {
            mdReport += `  - Error: ${test.validation.errors.join(', ')}\n`;
          }
        }
        mdReport += '\n';
      }
    }
    
    // Violation statistics
    const violationReport = await this.detector.generateReport();
    mdReport += '## Violation Statistics\n\n';
    mdReport += `- **Total Operations:** ${violationReport.summary.totalOperations}\n`;
    mdReport += `- **Blocked Operations:** ${violationReport.summary.blockedOperations}\n`;
    mdReport += `- **Total Violations:** ${violationReport.summary.totalViolations}\n\n`;
    
    const mdPath = path.join(this.config.resultPath, `mcp-test-${this.config.mode}-${Date.now()}.md`);
    await await fileAPI.createFile(mdPath, mdReport);
    
    // Generate launcher results
    await this.launcher.getResults();
    
    // Generate injector report
    await this.injector.generateReport(path.join(this.config.resultPath, { type: FileType.TEMPORARY });
    const value = args[i + 1];
    
    async if (key === 'parallel' || key === 'verbose') {
      config[key] = value === 'true';
    } else {
      config[key] = value;
    }
  }
  
  return config;
}

// Main execution
async if (require.main === module) {
  const config = parseArgs();
  const runner = new MCPTestRunner(config);
  
  async function main() {
    try {
      await runner.initialize();
      await runner.runAllTests();
      runner.printSummary();
      
      // Exit with appropriate code
      const exitCode = runner.results.summary.totalFailed > 0 ? 1 : 0;
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    } finally {
      await runner.cleanup();
    }
  }
  
  main();
}

module.exports = MCPTestRunner;