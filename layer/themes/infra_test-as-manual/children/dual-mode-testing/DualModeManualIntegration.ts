/**
 * Dual Mode Manual Integration
 * Bridges dual-mode testing with test-as-manual infrastructure
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { TestScenario, ServiceFeature } from './DualModeTestFramework'

/**
 * Integrates dual-mode tests with the test-as-manual theme
 */
export class DualModeManualIntegration {
  private outputDir: string = 'gen/doc/manual-tests'
  
  /**
   * Convert dual-mode test scenarios to manual test format
   */
  async convertToManualTests(
    serviceName: string,
    scenarios: TestScenario[],
    features: ServiceFeature[]
  ): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true })
    
    // Generate comprehensive manual test document
    const manualDoc = this.generateComprehensiveManualDoc(serviceName, scenarios, features)
    
    // Save as markdown
    const filename = `${serviceName.toLowerCase().replace(/\s+/g, '-')}-manual-tests.md`
    await fs.writeFile(path.join(this.outputDir, filename), manualDoc)
    
    // Also generate HTML version
    const htmlDoc = this.generateHTMLManualDoc(serviceName, scenarios, features)
    const htmlFilename = `${serviceName.toLowerCase().replace(/\s+/g, '-')}-manual-tests.html`
    await fs.writeFile(path.join(this.outputDir, htmlFilename), htmlDoc)
    
    // Generate JSON for programmatic access
    const jsonDoc = {
      serviceName,
      features,
      scenarios: scenarios.map(s => ({
        ...s,
        manualSteps: s.manualSteps || this.generateManualStepsFromScenario(s)
      })),
      generatedAt: new Date().toISOString()
    }
    const jsonFilename = `${serviceName.toLowerCase().replace(/\s+/g, '-')}-manual-tests.json`
    await fs.writeFile(
      path.join(this.outputDir, jsonFilename),
      JSON.stringify(jsonDoc, null, 2)
    )
  }
  
  /**
   * Generate comprehensive manual test documentation
   */
  private generateComprehensiveManualDoc(
    serviceName: string,
    scenarios: TestScenario[],
    features: ServiceFeature[]
  ): string {
    let doc = `# ${serviceName} - Manual Test Documentation\n\n`
    doc += `Generated: ${new Date().toISOString()}\n\n`
    doc += `---\n\n`
    
    // Table of Contents
    doc += `## Table of Contents\n\n`
    doc += `1. [Service Overview](#service-overview)\n`
    doc += `2. [Features](#features)\n`
    doc += `3. [Test Scenarios](#test-scenarios)\n`
    doc += `4. [Test Execution Guide](#test-execution-guide)\n`
    doc += `5. [Troubleshooting](#troubleshooting)\n\n`
    
    // Service Overview
    doc += `## Service Overview\n\n`
    doc += `**Service Name**: ${serviceName}\n\n`
    doc += `**Total Features**: ${features.length}\n`
    doc += `**Total Test Scenarios**: ${scenarios.length}\n\n`
    
    // Features section
    doc += `## Features\n\n`
    doc += this.generateFeaturesSection(features)
    
    // Test Scenarios
    doc += `## Test Scenarios\n\n`
    doc += this.generateScenariosSection(scenarios)
    
    // Test Execution Guide
    doc += `## Test Execution Guide\n\n`
    doc += this.generateExecutionGuide()
    
    // Troubleshooting
    doc += `## Troubleshooting\n\n`
    doc += this.generateTroubleshootingSection()
    
    return doc
  }
  
  /**
   * Generate features documentation section
   */
  private generateFeaturesSection(features: ServiceFeature[]): string {
    let section = ''
    
    features.forEach((feature, index) => {
      section += `### ${index + 1}. ${feature.name}\n\n`
      section += `**ID**: \`${feature.id}\`\n\n`
      section += `**Description**: ${feature.description}\n\n`
      section += `**Testable**: ${feature.testable ? '✅ Yes' : '❌ No'}\n\n`
      
      if (feature.requiredMode) {
        section += `**Required Mode**: ${feature.requiredMode}\n\n`
      }
      
      if (feature.selectors && Object.keys(feature.selectors).length > 0) {
        section += `**Key Selectors**:\n`
        Object.entries(feature.selectors).forEach(([key, selector]) => {
          section += `- ${key}: \`${selector}\`\n`
        })
        section += '\n'
      }
      
      section += '---\n\n'
    })
    
    return section
  }
  
  /**
   * Generate test scenarios section
   */
  private generateScenariosSection(scenarios: TestScenario[]): string {
    let section = ''
    
    // Group by category
    const categories = [...new Set(scenarios.map(s => s.category))]
    
    categories.forEach(category => {
      section += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests\n\n`
      
      const categoryScenarios = scenarios.filter(s => s.category === category)
      
      categoryScenarios.forEach(scenario => {
        section += `#### ${scenario.name}\n\n`
        section += `**ID**: \`${scenario.id}\`\n`
        section += `**Priority**: ${this.getPriorityBadge(scenario.priority)}\n`
        section += `**Mode**: ${this.getModeBadge(scenario.mode)}\n`
        section += `**Description**: ${scenario.description}\n\n`
        
        // Preconditions
        if (scenario.preconditions && scenario.preconditions.length > 0) {
          section += `**Preconditions**:\n`
          scenario.preconditions.forEach((pre, i) => {
            section += `${i + 1}. ${pre}\n`
          })
          section += '\n'
        }
        
        // Manual Steps
        const manualSteps = scenario.manualSteps || this.generateManualStepsFromScenario(scenario)
        if (manualSteps.length > 0) {
          section += `**Manual Test Steps**:\n\n`
          manualSteps.forEach(step => {
            section += `${step.step}. **${step.instruction}**\n`
            section += `   - Expected Result: ${step.expectedResult}\n`
            if (step.screenshot) {
              section += `   - 📸 Screenshot Required\n`
            }
            section += '\n'
          })
        }
        
        // Expected Results
        section += `**Expected Results**:\n`
        scenario.expectedResults.forEach((result, i) => {
          section += `- ${result}\n`
        })
        section += '\n---\n\n'
      })
    })
    
    return section
  }
  
  /**
   * Generate execution guide
   */
  private generateExecutionGuide(): string {
    return `### Prerequisites

1. **Environment Setup**
   - Portal running on http://localhost:3156
   - Service endpoints accessible
   - Test project(s) configured

2. **Browser Requirements**
   - Chrome/Firefox/Safari latest version
   - Developer tools enabled
   - Network throttling disabled

### Execution Modes

#### Port Mode (Direct Access)
1. Navigate directly to service URL: \`http://localhost:3156/services/<service-id>\`
2. Execute test steps without portal context
3. Verify service works independently

#### Embed Mode (Portal Integration)
1. Open portal at \`http://localhost:3156\`
2. Select a test project from dropdown
3. Click on service card to open in modal
4. Execute test steps within iframe context
5. Verify project context is maintained

### Test Data Management

- Use dedicated test projects for reproducible results
- Clear browser cache between test runs if needed
- Document any test data created during execution

### Recording Results

1. Note test execution date and time
2. Record actual vs expected results
3. Take screenshots for failures
4. Document any deviations from expected behavior

`
  }
  
  /**
   * Generate troubleshooting section
   */
  private generateTroubleshootingSection(): string {
    return `### Common Issues

#### Service Not Loading
- Verify portal is running: \`curl http://localhost:3156\`
- Check browser console for errors
- Ensure no port conflicts

#### Features Missing in Embed Mode
- Check project context is passed in URL
- Verify iframe permissions
- Look for console errors in both parent and iframe

#### Test Data Issues
- Ensure test project has required files (TASK_QUEUE.vf.json, FEATURE.vf.json)
- Verify file permissions
- Check file format validity

#### Performance Problems
- Clear browser cache
- Disable browser extensions
- Check system resources

### Debug Tips

1. **Use Browser DevTools**
   - Network tab for API calls
   - Console for JavaScript errors
   - Elements for DOM inspection

2. **Check Logs**
   - Service logs for backend errors
   - Browser console for frontend issues
   - Network logs for connectivity problems

3. **Isolation Testing**
   - Test in incognito/private mode
   - Try different browsers
   - Test on different machines

`
  }
  
  /**
   * Generate HTML version of manual tests
   */
  private generateHTMLManualDoc(
    serviceName: string,
    scenarios: TestScenario[],
    features: ServiceFeature[]
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${serviceName} - Manual Tests</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
        }
        h1, h2, h3, h4 { color: #333; }
        h1 { border-bottom: 3px solid #4CAF50; padding-bottom: 1rem; }
        h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-top: 2rem; }
        .feature-card, .scenario-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-right: 0.5rem;
        }
        .priority-high { background: #ffebee; color: #c62828; }
        .priority-medium { background: #fff3e0; color: #ef6c00; }
        .priority-low { background: #e8f5e9; color: #2e7d32; }
        .mode-port { background: #e3f2fd; color: #1565c0; }
        .mode-embed { background: #f3e5f5; color: #6a1b9a; }
        .mode-both { background: #e0f2f1; color: #00695c; }
        .step {
            background: #f8f9fa;
            border-left: 4px solid #4CAF50;
            padding: 1rem;
            margin: 0.5rem 0;
        }
        .step-number {
            font-weight: bold;
            color: #4CAF50;
            margin-right: 0.5rem;
        }
        .expected-result {
            color: #666;
            margin-top: 0.5rem;
            padding-left: 1rem;
        }
        .screenshot-required {
            color: #ff9800;
            font-weight: 600;
        }
        code {
            background: #f5f5f5;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .toc {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        .toc ul { padding-left: 1.5rem; }
        .toc a { color: #1565c0; text-decoration: none; }
        .toc a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>🧪 ${serviceName} - Manual Test Documentation</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    
    <div class="toc">
        <h2>📋 Table of Contents</h2>
        <ul>
            <li><a href="#features">Features (${features.length})</a></li>
            <li><a href="#scenarios">Test Scenarios (${scenarios.length})</a></li>
            <li><a href="#guide">Execution Guide</a></li>
        </ul>
    </div>
    
    <section id="features">
        <h2>✨ Features</h2>
        ${features.map(feature => `
            <div class="feature-card">
                <h3>${feature.name}</h3>
                <p><strong>ID:</strong> <code>${feature.id}</code></p>
                <p>${feature.description}</p>
                ${feature.requiredMode ? `<span class="badge mode-${feature.requiredMode}">${feature.requiredMode} mode</span>` : ''}
            </div>
        `).join('')}
    </section>
    
    <section id="scenarios">
        <h2>🎯 Test Scenarios</h2>
        ${scenarios.map(scenario => {
          const manualSteps = scenario.manualSteps || this.generateManualStepsFromScenario(scenario)
          return `
            <div class="scenario-card">
                <h3>${scenario.name}</h3>
                <div>
                    <span class="badge priority-${scenario.priority}">${scenario.priority} priority</span>
                    <span class="badge mode-${scenario.mode}">${scenario.mode} mode</span>
                </div>
                <p>${scenario.description}</p>
                
                ${manualSteps.length > 0 ? `
                    <h4>Test Steps:</h4>
                    ${manualSteps.map(step => `
                        <div class="step">
                            <div><span class="step-number">Step ${step.step}:</span> ${step.instruction}</div>
                            <div class="expected-result">✓ Expected: ${step.expectedResult}</div>
                            ${step.screenshot ? '<div class="screenshot-required">📸 Screenshot Required</div>' : ''}
                        </div>
                    `).join('')}
                ` : ''}
                
                <h4>Expected Results:</h4>
                <ul>
                    ${scenario.expectedResults.map(result => `<li>${result}</li>`).join('')}
                </ul>
            </div>
          `
        }).join('')}
    </section>
    
    <section id="guide">
        <h2>📖 Execution Guide</h2>
        <div class="feature-card">
            <h3>Test Modes</h3>
            <p><strong>Port Mode:</strong> Direct access via <code>http://localhost:3156/services/*</code></p>
            <p><strong>Embed Mode:</strong> Access through portal modal iframe</p>
            <h3>Prerequisites</h3>
            <ul>
                <li>Portal running on port 3156</li>
                <li>Test project configured</li>
                <li>Browser with DevTools</li>
            </ul>
        </div>
    </section>
</body>
</html>`
  }
  
  /**
   * Generate manual steps from automated test steps
   */
  private generateManualStepsFromScenario(scenario: TestScenario): any[] {
    return scenario.steps.map((step, index) => ({
      step: index + 1,
      instruction: step.description,
      expectedResult: this.getExpectedResultForStep(step),
      screenshot: step.action === 'screenshot'
    }))
  }
  
  /**
   * Get expected result for a test step
   */
  private getExpectedResultForStep(step: any): string {
    switch (step.action) {
      case 'click':
        return `Element ${step.target} should be clickable and respond to interaction`
      case 'type':
        return `Text "${step.value}" should be entered into the field`
      case 'select':
        return `Option "${step.value}" should be selected`
      case 'validate':
        return `Element ${step.target} should be present and visible`
      case 'wait':
        return `Page should load/update within ${step.value}ms`
      case 'screenshot':
        return `Screenshot captured for documentation`
      default:
        return `Action ${step.action} should complete successfully`
    }
  }
  
  /**
   * Get priority badge HTML
   */
  private getPriorityBadge(priority: string): string {
    const badges = {
      high: '🔴 High',
      medium: '🟡 Medium',
      low: '🟢 Low'
    }
    return badges[priority] || priority
  }
  
  /**
   * Get mode badge HTML
   */
  private getModeBadge(mode: string): string {
    const badges = {
      port: '🔌 Port',
      embed: '🖼️ Embed',
      both: '🔄 Both'
    }
    return badges[mode] || mode
  }
}

export default DualModeManualIntegration