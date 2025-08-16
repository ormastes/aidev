#!/usr/bin/env node

/**
 * Prompt Injection System for MCP Testing
 * Injects various prompts to test file creation rules and violations
 */

const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');
const { getFileAPI, FileType } = require('../../../infra_external-log-lib/pipe');

const fileAPI = getFileAPI();


class PromptInjector {
  constructor(config = {}) {
    this.config = {
      promptsPath: config.promptsPath || '/app/prompts',
      delayBetweenPrompts: config.delayBetweenPrompts || 1000,
      ...config
    };
    
    this.prompts = {
      violation: [],
      allowed: [],
      edgeCase: []
    };
    
    this.results = [];
  }

  /**
   * Load prompts from JSON files
   */
  async loadPrompts() {
    console.log('📚 Loading test prompts...');
    
    // Load violation prompts
    const violationFile = path.join(this.config.promptsPath, 'violation-prompts.json');
    this.prompts.violation = await this.loadPromptFile(violationFile);
    
    // Load allowed prompts
    const allowedFile = path.join(this.config.promptsPath, 'allowed-prompts.json');
    this.prompts.allowed = await this.loadPromptFile(allowedFile);
    
    // Load edge case prompts
    const edgeCaseFile = path.join(this.config.promptsPath, 'edge-case-prompts.json');
    this.prompts.edgeCase = await this.loadPromptFile(edgeCaseFile);
    
    console.log(`✅ Loaded ${this.getTotalPrompts()} prompts`);
  }

  /**
   * Load a single prompt file
   */
  async loadPromptFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not load ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Get total number of prompts
   */
  getTotalPrompts() {
    return Object.values(this.prompts).reduce((total, arr) => total + arr.length, 0);
  }

  /**
   * Inject a single prompt
   */
  async injectPrompt(launcher, prompt) {
    console.log(`\n💉 Injecting prompt: "${prompt.text}"`);
    console.log(`   Type: ${prompt.type}`);
    console.log(`   Expected: ${prompt.expected}`);
    
    const startTime = Date.now();
    
    try {
      // Send prompt with options
      const response = await launcher.sendPrompt(prompt.text, {
        tool: prompt.tool || 'write_file_with_validation',
        category: prompt.category,
        tags: prompt.tags,
        force: prompt.force,
        justification: prompt.justification,
        content: prompt.content
      });
      
      // Validate response
      const validation = await launcher.validateResponse({
        shouldViolate: prompt.shouldViolate,
        fileCreated: prompt.fileCreated,
        violationType: prompt.violationType
      });
      
      const result = {
        prompt: prompt.text,
        type: prompt.type,
        expected: prompt.expected,
        response: response,
        validation: validation,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: validation.success
      };
      
      this.results.push(result);
      
      // Log result
      if (validation.success) {
        console.log(`   ✅ PASS: ${prompt.expected}`);
      } else {
        console.log(`   ❌ FAIL: ${validation.errors.join(', ')}`);
      }
      
      return result;
      
    } catch (error) {
      const result = {
        prompt: prompt.text,
        type: prompt.type,
        expected: prompt.expected,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: false
      };
      
      this.results.push(result);
      console.log(`   ❌ ERROR: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Inject all prompts in a category
   */
  async injectCategory(launcher, category) {
    console.log(`\n🏷️  Testing ${category} prompts...`);
    const prompts = this.prompts[category];
    
    for (const prompt of prompts) {
      await this.injectPrompt(launcher, prompt);
      
      // Delay between prompts
      if (this.config.delayBetweenPrompts > 0) {
        await this.delay(this.config.delayBetweenPrompts);
      }
    }
  }

  /**
   * Run all prompt injections
   */
  async runAll(launcher) {
    console.log('\n🚀 Starting prompt injection tests...\n');
    
    // Test violations first
    await this.injectCategory(launcher, 'violation');
    
    // Test allowed operations
    await this.injectCategory(launcher, 'allowed');
    
    // Test edge cases
    await this.injectCategory(launcher, 'edgeCase');
    
    return this.getResults();
  }

  /**
   * Run specific test scenarios
   */
  async runScenario(launcher, scenario) {
    console.log(`\n🎬 Running scenario: ${scenario.name}`);
    
    const scenarioResults = [];
    
    for (const step of scenario.steps) {
      const prompt = this.findPrompt(step.promptId);
      if (prompt) {
        const result = await this.injectPrompt(launcher, prompt);
        scenarioResults.push(result);
        
        // Check if scenario should continue
        if (!result.success && step.critical) {
          console.log('   ⚠️  Critical step failed, aborting scenario');
          break;
        }
      }
    }
    
    return scenarioResults;
  }

  /**
   * Find prompt by ID
   */
  findPrompt(promptId) {
    for (const category of Object.values(this.prompts)) {
      const prompt = category.find(p => p.id === promptId);
      if (prompt) return prompt;
    }
    return null;
  }

  /**
   * Get test results
   */
  getResults() {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.success).length,
      failed: this.results.filter(r => !r.success).length,
      byType: {},
      results: this.results
    };
    
    // Group by type
    for (const result of this.results) {
      if (!summary.byType[result.type]) {
        summary.byType[result.type] = {
          total: 0,
          passed: 0,
          failed: 0
        };
      }
      
      summary.byType[result.type].total++;
      if (result.success) {
        summary.byType[result.type].passed++;
      } else {
        summary.byType[result.type].failed++;
      }
    }
    
    return summary;
  }

  /**
   * Generate test report
   */
  async generateReport(outputPath) {
    const results = this.getResults();
    
    let report = '# MCP Prompt Injection Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- Total Tests: ${results.total}\n`;
    report += `- Passed: ${results.passed} (${Math.round(results.passed / results.total * 100)}%)\n`;
    report += `- Failed: ${results.failed} (${Math.round(results.failed / results.total * 100)}%)\n\n`;
    
    report += '## Results by Type\n\n';
    for (const [type, stats] of Object.entries(results.byType)) {
      report += `### ${type}\n`;
      report += `- Total: ${stats.total}\n`;
      report += `- Passed: ${stats.passed}\n`;
      report += `- Failed: ${stats.failed}\n\n`;
    }
    
    report += '## Detailed Results\n\n';
    for (const result of results.results) {
      report += `### ${result.prompt}\n`;
      report += `- Type: ${result.type}\n`;
      report += `- Expected: ${result.expected}\n`;
      report += `- Result: ${result.success ? '✅ PASS' : '❌ FAIL'}\n`;
      if (!result.success && result.validation?.errors) {
        report += `- Errors: ${result.validation.errors.join(', ')}\n`;
      }
      report += `- Duration: ${result.duration}ms\n\n`;
    }
    
    await fileAPI.createFile(outputPath, report);
    console.log(`\n📄 Report saved to: ${outputPath}`);
    
    return report;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PromptInjector;

// Run if executed directly
if (require.main === module) {
  const launcher = require('./claude-launcher');
  const injector = new PromptInjector();
  
  async function runTest() {
    try {
      await injector.loadPrompts();
      const claudeLauncher = new launcher();
      await claudeLauncher.launch();
      const results = await injector.runAll(claudeLauncher);
      await injector.generateReport('/results/prompt-injection-report.md');
      console.log('Test complete!');
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      if (claudeLauncher) await claudeLauncher.shutdown();
    }
  }
  
  runTest();
}