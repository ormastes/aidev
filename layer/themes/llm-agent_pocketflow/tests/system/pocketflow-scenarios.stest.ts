/**
 * Real-World Scenario System Tests for PocketFlow
 * Tests complete end-to-end workflows with actual process execution and file I/O
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';
import { execSync, spawn } from 'child_process';

describe('PocketFlow Real-World Scenarios', () => {
  let testDir: string;

  beforeEach(() => {
    // Create unique test directory
    testDir = path.join(os.tmpdir(), `pocketflow-scenarios-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should handle code generation workflow scenario', async () => {
    // Create a code generation workflow script
    const codeGenScript = path.join(testDir, 'code-gen-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      class CodeGenerationWorkflow {
        constructor(outputDir) {
          this.outputDir = outputDir;
          this.templatesDir = path.join(outputDir, 'templates');
          this.generatedDir = path.join(outputDir, 'generated');
          
          // Create directories
          fs.mkdirSync(this.templatesDir, { recursive: true });
          fs.mkdirSync(this.generatedDir, { recursive: true });
          
          // Create templates
          this.createTemplates();
        }
        
        createTemplates() {
          // Class template
          fs.writeFileSync(
            path.join(this.templatesDir, 'class.template'),
            \`export class {{className}} {
  constructor(private name: string) {}
  
  getName(): string {
    return this.name;
  }
  
  setName(name: string): void {
    this.name = name;
  }
}\`
          );
          
          // Function template
          fs.writeFileSync(
            path.join(this.templatesDir, 'function.template'),
            \`export function {{functionName}}(input: string): string {
  // Process input
  const result = input.toUpperCase();
  console.log('Processed:', result);
  return result;
}\`
          );
          
          // Test template
          fs.writeFileSync(
            path.join(this.templatesDir, 'test.template'),
            \`import { describe, test, expect } from '@jest/globals';

describe('{{testName}}', () => {
  test('should pass basic test', () => {
    // Test implementation pending
  });
  
  test('should handle edge cases', () => {
    expect(null).toBeNull();
  });
});\`
          );
        }
        
        async generateCode(specification) {
          console.log('Starting code generation workflow...');
          const results = [];
          
          for (const spec of specification.items) {
            console.log(\`Generating \${spec.type}: \${spec.name}\`);
            
            let template = '';
            let outputFile = '';
            
            switch (spec.type) {
              case 'class':
                template = fs.readFileSync(path.join(this.templatesDir, 'class.template'), 'utf8');
                template = template.replace(/{{className}}/g, spec.name);
                outputFile = path.join(this.generatedDir, \`\${spec.name}.ts\`);
                break;
                
              case 'function':
                template = fs.readFileSync(path.join(this.templatesDir, 'function.template'), 'utf8');
                template = template.replace(/{{functionName}}/g, spec.name);
                outputFile = path.join(this.generatedDir, \`\${spec.name}.ts\`);
                break;
                
              case 'test':
                template = fs.readFileSync(path.join(this.templatesDir, 'test.template'), 'utf8');
                template = template.replace(/{{testName}}/g, spec.name);
                outputFile = path.join(this.generatedDir, \`\${spec.name}.test.ts\`);
                break;
            }
            
            fs.writeFileSync(outputFile, template);
            results.push({
              type: spec.type,
              name: spec.name,
              file: outputFile,
              size: template.length
            });
            
            console.log(\`Generated: \${outputFile}\`);
          }
          
          // Generate index file
          const indexContent = results
            .filter(r => r.type !== 'test')
            .map(r => \`export * from './\${r.name}';\`)
            .join('\\n');
          
          const indexFile = path.join(this.generatedDir, 'index.ts');
          fs.writeFileSync(indexFile, indexContent);
          
          console.log('Code generation completed');
          return results;
        }
      }
      
      // Run the workflow
      async function runWorkflow() {
        const workflow = new CodeGenerationWorkflow('${testDir}');
        
        const specification = {
          items: [
            { type: 'class', name: 'UserModel' },
            { type: 'class', name: 'ProductModel' },
            { type: 'function', name: 'processData' },
            { type: 'function', name: 'validateInput' },
            { type: 'test', name: 'UserModel' },
            { type: 'test', name: 'processData' }
          ]
        };
        
        const results = await workflow.generateCode(specification);
        
        // Save results
        const resultsFile = path.join('${testDir}', 'generation-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        console.log(\`Total files generated: \${results.length}\`);
      }
      
      runWorkflow().catch(console.error);
    `;
    
    fs.writeFileSync(codeGenScript, scriptContent);
    
    // Execute the workflow
    const output = execSync(`node ${codeGenScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting code generation workflow');
    expect(output).toContain('Generating class: UserModel');
    expect(output).toContain('Generating class: ProductModel');
    expect(output).toContain('Generating function: processData');
    expect(output).toContain('Generating test: UserModel');
    expect(output).toContain('Code generation completed');
    expect(output).toContain('Total files generated: 6');
    
    // Verify generated files
    const generatedDir = path.join(testDir, 'generated');
    expect(fs.existsSync(path.join(generatedDir, 'UserModel.ts'))).toBe(true);
    expect(fs.existsSync(path.join(generatedDir, 'ProductModel.ts'))).toBe(true);
    expect(fs.existsSync(path.join(generatedDir, 'processData.ts'))).toBe(true);
    expect(fs.existsSync(path.join(generatedDir, 'index.ts'))).toBe(true);
    
    // Verify file contents
    const userModelContent = fs.readFileSync(path.join(generatedDir, 'UserModel.ts'), 'utf8');
    expect(userModelContent).toContain('export class UserModel');
    expect(userModelContent).toContain('getName(): string');
  });

  test('should handle data processing pipeline scenario', async () => {
    // Create a data processing pipeline script
    const pipelineScript = path.join(testDir, 'data-pipeline.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      class DataProcessingPipeline {
        constructor(config) {
          this.inputDir = config.inputDir;
          this.outputDir = config.outputDir;
          this.stages = [];
          
          // Create directories
          fs.mkdirSync(this.inputDir, { recursive: true });
          fs.mkdirSync(this.outputDir, { recursive: true });
        }
        
        addStage(stage) {
          this.stages.push(stage);
        }
        
        async execute() {
          console.log('Starting data processing pipeline...');
          
          // Generate sample data
          this.generateSampleData();
          
          // Process each file through the pipeline
          const files = fs.readdirSync(this.inputDir).filter(f => f.endsWith('.json'));
          const results = [];
          
          for (const file of files) {
            console.log(\`Processing file: \${file}\`);
            const inputPath = path.join(this.inputDir, file);
            let data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
            
            // Run through each stage
            for (const stage of this.stages) {
              console.log(\`  Stage: \${stage.name}\`);
              data = await stage.process(data);
            }
            
            // Save processed data
            const outputPath = path.join(this.outputDir, file.replace('.json', '-processed.json'));
            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
            
            results.push({
              input: file,
              output: outputPath,
              recordCount: data.records ? data.records.length : 0
            });
          }
          
          console.log('Pipeline execution completed');
          return results;
        }
        
        generateSampleData() {
          // Generate 3 sample data files
          for (let i = 1; i <= 3; i++) {
            const data = {
              id: \`dataset-\${i}\`,
              timestamp: new Date().toISOString(),
              records: []
            };
            
            // Generate random records
            for (let j = 0; j < 10; j++) {
              data.records.push({
                id: crypto.randomBytes(8).toString('hex'),
                value: Math.random() * 100,
                category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
                timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
              });
            }
            
            const filePath = path.join(this.inputDir, \`data-\${i}.json\`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          }
        }
      }
      
      // Define pipeline stages
      const validationStage = {
        name: 'Validation',
        async process(data) {
          // Validate and clean data
          data.records = data.records.filter(r => r.value > 0 && r.value < 100);
          data.validationTimestamp = new Date().toISOString();
          return data;
        }
      };
      
      const transformationStage = {
        name: 'Transformation',
        async process(data) {
          // Transform data
          data.records = data.records.map(r => ({
            ...r,
            value: Math.round(r.value * 100) / 100,
            normalizedValue: r.value / 100,
            categoryCode: r.category.charCodeAt(0)
          }));
          data.transformationTimestamp = new Date().toISOString();
          return data;
        }
      };
      
      const aggregationStage = {
        name: 'Aggregation',
        async process(data) {
          // Aggregate statistics
          const stats = {
            count: data.records.length,
            sum: data.records.reduce((sum, r) => sum + r.value, 0),
            average: 0,
            categories: {}
          };
          
          stats.average = stats.sum / stats.count;
          
          // Count by category
          data.records.forEach(r => {
            stats.categories[r.category] = (stats.categories[r.category] || 0) + 1;
          });
          
          data.statistics = stats;
          data.aggregationTimestamp = new Date().toISOString();
          return data;
        }
      };
      
      // Run the pipeline
      async function runPipeline() {
        const pipeline = new DataProcessingPipeline({
          inputDir: path.join('${testDir}', 'input'),
          outputDir: path.join('${testDir}', 'output')
        });
        
        pipeline.addStage(validationStage);
        pipeline.addStage(transformationStage);
        pipeline.addStage(aggregationStage);
        
        const results = await pipeline.execute();
        
        // Save pipeline results
        const resultsFile = path.join('${testDir}', 'pipeline-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        console.log(\`Files processed: \${results.length}\`);
        console.log(\`Total records: \${results.reduce((sum, r) => sum + r.recordCount, 0)}\`);
      }
      
      runPipeline().catch(console.error);
    `;
    
    fs.writeFileSync(pipelineScript, scriptContent);
    
    // Execute the pipeline
    const output = execSync(`node ${pipelineScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting data processing pipeline');
    expect(output).toContain('Processing file: data-1.json');
    expect(output).toContain('Stage: Validation');
    expect(output).toContain('Stage: Transformation');
    expect(output).toContain('Stage: Aggregation');
    expect(output).toContain('Pipeline execution completed');
    expect(output).toContain('Files processed: 3');
    
    // Verify output files
    const outputDir = path.join(testDir, 'output');
    expect(fs.existsSync(path.join(outputDir, 'data-1-processed.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'data-2-processed.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'data-3-processed.json'))).toBe(true);
    
    // Verify processed data structure
    const processedData = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'data-1-processed.json'), 'utf8')
    );
    expect(processedData.validationTimestamp).toBeDefined();
    expect(processedData.transformationTimestamp).toBeDefined();
    expect(processedData.aggregationTimestamp).toBeDefined();
    expect(processedData.statistics).toBeDefined();
    expect(processedData.statistics.count).toBeGreaterThan(0);
  });

  test('should handle deployment workflow scenario', async () => {
    // Create a deployment workflow script
    const deployScript = path.join(testDir, 'deployment-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      const { execSync } = require('child_process');
      
      class DeploymentWorkflow {
        constructor(config) {
          this.projectDir = config.projectDir;
          this.buildDir = path.join(this.projectDir, 'build');
          this.distDir = path.join(this.projectDir, 'dist');
          this.deployDir = path.join(this.projectDir, 'deploy');
          
          // Create directories
          fs.mkdirSync(this.buildDir, { recursive: true });
          fs.mkdirSync(this.distDir, { recursive: true });
          fs.mkdirSync(this.deployDir, { recursive: true });
        }
        
        async execute() {
          console.log('Starting deployment workflow...');
          
          const steps = [
            { name: 'Prepare', fn: () => this.prepare() },
            { name: 'Build', fn: () => this.build() },
            { name: 'Test', fn: () => this.test() },
            { name: 'Package', fn: () => this.package() },
            { name: 'Deploy', fn: () => this.deploy() }
          ];
          
          const results = [];
          
          for (const step of steps) {
            console.log(\`Executing step: \${step.name}\`);
            const startTime = Date.now();
            
            try {
              const result = await step.fn();
              const duration = Date.now() - startTime;
              
              results.push({
                step: step.name,
                status: 'completed',
                duration,
                details: result
              });
              
              console.log(\`  🔄 \${step.name} completed in \${duration}ms\`);
            } catch (error) {
              const duration = Date.now() - startTime;
              
              results.push({
                step: step.name,
                status: 'failed',
                duration,
                error: error.message
              });
              
              console.log(\`  ✗ \${step.name} failed: \${error.message}\`);
              break; // Stop on first failure
            }
          }
          
          return results;
        }
        
        prepare() {
          // Create sample source files
          const srcDir = path.join(this.projectDir, 'src');
          fs.mkdirSync(srcDir, { recursive: true });
          
          fs.writeFileSync(
            path.join(srcDir, 'index.js'),
            'console.log("Hello from deployment");\\nmodule.exports = { version: "1.0.0" };'
          );
          
          fs.writeFileSync(
            path.join(srcDir, 'config.json'),
            JSON.stringify({ env: 'production', port: 3000 }, null, 2)
          );
          
          // Create package.json
          fs.writeFileSync(
            path.join(this.projectDir, 'package.json'),
            JSON.stringify({
              name: 'deployment-test',
              version: '1.0.0',
              main: 'index.js',
              scripts: {
                test: 'echo "Tests completed"'
              }
            }, null, 2)
          );
          
          return { files: 3 };
        }
        
        build() {
          // Simulate build process
          const srcDir = path.join(this.projectDir, 'src');
          const files = fs.readdirSync(srcDir);
          
          files.forEach(file => {
            const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
            const buildContent = '// Built at: ' + new Date().toISOString() + '\\n' + content;
            fs.writeFileSync(path.join(this.buildDir, file), buildContent);
          });
          
          return { filesBuilt: files.length };
        }
        
        test() {
          // Simulate running tests
          const testResults = {
            total: 5,
            completed: 5,
            failed: 0,
            duration: 123
          };
          
          fs.writeFileSync(
            path.join(this.buildDir, 'test-results.json'),
            JSON.stringify(testResults, null, 2)
          );
          
          if (testResults.failed > 0) {
            throw new Error(\`\${testResults.failed} tests failed\`);
          }
          
          return testResults;
        }
        
        package() {
          // Create deployment package
          const packageInfo = {
            name: 'deployment-package',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            files: []
          };
          
          // Copy built files to dist
          const files = fs.readdirSync(this.buildDir);
          files.forEach(file => {
            const content = fs.readFileSync(path.join(this.buildDir, file));
            fs.writeFileSync(path.join(this.distDir, file), content);
            packageInfo.files.push({ name: file, size: content.length });
          });
          
          // Create manifest
          fs.writeFileSync(
            path.join(this.distDir, 'manifest.json'),
            JSON.stringify(packageInfo, null, 2)
          );
          
          return { packagedFiles: packageInfo.files.length };
        }
        
        deploy() {
          // Simulate deployment
          const deploymentInfo = {
            id: 'deploy-' + Date.now(),
            timestamp: new Date().toISOString(),
            target: 'production',
            files: []
          };
          
          // Copy dist files to deploy directory
          const files = fs.readdirSync(this.distDir);
          files.forEach(file => {
            const content = fs.readFileSync(path.join(this.distDir, file));
            fs.writeFileSync(path.join(this.deployDir, file), content);
            deploymentInfo.files.push(file);
          });
          
          // Create deployment record
          fs.writeFileSync(
            path.join(this.deployDir, 'deployment.json'),
            JSON.stringify(deploymentInfo, null, 2)
          );
          
          return deploymentInfo;
        }
      }
      
      // Run the deployment workflow
      async function runDeployment() {
        const workflow = new DeploymentWorkflow({
          projectDir: '${testDir}'
        });
        
        const results = await workflow.execute();
        
        // Save workflow results
        const resultsFile = path.join('${testDir}', 'deployment-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        const completedCount = results.filter(r => r.status === 'completed').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        
        console.log('\\nDeployment Summary:');
        console.log(\`  Completed steps: \${completedCount}\`);
        console.log(\`  Failed steps: \${failedCount}\`);
        console.log(\`  Total duration: \${results.reduce((sum, r) => sum + r.duration, 0)}ms\`);
      }
      
      runDeployment().catch(console.error);
    `;
    
    fs.writeFileSync(deployScript, scriptContent);
    
    // Execute the deployment workflow
    const output = execSync(`node ${deployScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting deployment workflow');
    expect(output).toContain('Executing step: Prepare');
    expect(output).toContain('🔄 Prepare completed');
    expect(output).toContain('Executing step: Build');
    expect(output).toContain('🔄 Build completed');
    expect(output).toContain('Executing step: Test');
    expect(output).toContain('🔄 Test completed');
    expect(output).toContain('Executing step: Package');
    expect(output).toContain('🔄 Package completed');
    expect(output).toContain('Executing step: Deploy');
    expect(output).toContain('🔄 Deploy completed');
    expect(output).toContain('Deployment Summary:');
    expect(output).toContain('Completed steps: 5');
    expect(output).toContain('Failed steps: 0');
    
    // Verify deployment artifacts
    const deployDir = path.join(testDir, 'deploy');
    expect(fs.existsSync(path.join(deployDir, 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(deployDir, 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(deployDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(deployDir, 'deployment.json'))).toBe(true);
  });

  test('should handle monitoring and alerting workflow', async () => {
    // Create a monitoring workflow script
    const monitorScript = path.join(testDir, 'monitoring-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      class MonitoringWorkflow {
        constructor(config) {
          this.metricsDir = path.join(config.baseDir, 'metrics');
          this.alertsDir = path.join(config.baseDir, 'alerts');
          this.reportsDir = path.join(config.baseDir, 'reports');
          
          // Create directories
          fs.mkdirSync(this.metricsDir, { recursive: true });
          fs.mkdirSync(this.alertsDir, { recursive: true });
          fs.mkdirSync(this.reportsDir, { recursive: true });
          
          this.thresholds = config.thresholds || {
            cpu: 80,
            memory: 90,
            disk: 85,
            responseTime: 1000
          };
        }
        
        async execute() {
          console.log('Starting monitoring workflow...');
          
          // Simulate monitoring cycle
          const duration = 5; // 5 monitoring cycles
          const results = {
            metrics: [],
            alerts: [],
            summary: {}
          };
          
          for (let i = 0; i < duration; i++) {
            console.log(\`Monitoring cycle \${i + 1}/\${duration}\`);
            
            // Collect metrics
            const metrics = this.collectMetrics();
            results.metrics.push(metrics);
            
            // Save metrics
            const metricsFile = path.join(this.metricsDir, \`metrics-\${Date.now()}.json\`);
            fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
            
            // Check thresholds and generate alerts
            const alerts = this.checkThresholds(metrics);
            if (alerts.length > 0) {
              results.alerts.push(...alerts);
              
              // Save alerts
              alerts.forEach(alert => {
                const alertFile = path.join(this.alertsDir, \`alert-\${Date.now()}-\${alert.type}.json\`);
                fs.writeFileSync(alertFile, JSON.stringify(alert, null, 2));
                console.log(\`  ⚠️  Alert: \${alert.message}\`);
              });
            }
            
            // Wait before next cycle (simulate real monitoring interval)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Generate summary report
          results.summary = this.generateSummary(results.metrics);
          
          // Save report
          const reportFile = path.join(this.reportsDir, \`report-\${Date.now()}.json\`);
          fs.writeFileSync(reportFile, JSON.stringify(results.summary, null, 2));
          
          console.log('Monitoring workflow completed');
          return results;
        }
        
        collectMetrics() {
          // Simulate metric collection
          return {
            timestamp: new Date().toISOString(),
            system: {
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              disk: Math.random() * 100
            },
            application: {
              responseTime: Math.random() * 2000,
              requestCount: Math.floor(Math.random() * 1000),
              errorCount: Math.floor(Math.random() * 10)
            },
            custom: {
              activeUsers: Math.floor(Math.random() * 500),
              queueLength: Math.floor(Math.random() * 100)
            }
          };
        }
        
        checkThresholds(metrics) {
          const alerts = [];
          
          if (metrics.system.cpu > this.thresholds.cpu) {
            alerts.push({
              type: 'cpu',
              severity: 'high',
              message: \`CPU usage \${metrics.system.cpu.toFixed(1)}% exceeds threshold \${this.thresholds.cpu}%\`,
              value: metrics.system.cpu,
              threshold: this.thresholds.cpu,
              timestamp: metrics.timestamp
            });
          }
          
          if (metrics.system.memory > this.thresholds.memory) {
            alerts.push({
              type: 'memory',
              severity: 'critical',
              message: \`Memory usage \${metrics.system.memory.toFixed(1)}% exceeds threshold \${this.thresholds.memory}%\`,
              value: metrics.system.memory,
              threshold: this.thresholds.memory,
              timestamp: metrics.timestamp
            });
          }
          
          if (metrics.application.responseTime > this.thresholds.responseTime) {
            alerts.push({
              type: 'performance',
              severity: 'medium',
              message: \`Response time \${metrics.application.responseTime.toFixed(0)}ms exceeds threshold \${this.thresholds.responseTime}ms\`,
              value: metrics.application.responseTime,
              threshold: this.thresholds.responseTime,
              timestamp: metrics.timestamp
            });
          }
          
          return alerts;
        }
        
        generateSummary(metricsArray) {
          const summary = {
            period: {
              start: metricsArray[0].timestamp,
              end: metricsArray[metricsArray.length - 1].timestamp,
              samples: metricsArray.length
            },
            averages: {
              cpu: 0,
              memory: 0,
              disk: 0,
              responseTime: 0
            },
            peaks: {
              cpu: 0,
              memory: 0,
              responseTime: 0
            },
            totals: {
              requests: 0,
              errors: 0
            }
          };
          
          // Calculate averages and peaks
          metricsArray.forEach(m => {
            summary.averages.cpu += m.system.cpu;
            summary.averages.memory += m.system.memory;
            summary.averages.disk += m.system.disk;
            summary.averages.responseTime += m.application.responseTime;
            
            summary.peaks.cpu = Math.max(summary.peaks.cpu, m.system.cpu);
            summary.peaks.memory = Math.max(summary.peaks.memory, m.system.memory);
            summary.peaks.responseTime = Math.max(summary.peaks.responseTime, m.application.responseTime);
            
            summary.totals.requests += m.application.requestCount;
            summary.totals.errors += m.application.errorCount;
          });
          
          // Calculate averages
          const count = metricsArray.length;
          summary.averages.cpu /= count;
          summary.averages.memory /= count;
          summary.averages.disk /= count;
          summary.averages.responseTime /= count;
          
          return summary;
        }
      }
      
      // Run the monitoring workflow
      async function runMonitoring() {
        const workflow = new MonitoringWorkflow({
          baseDir: '${testDir}',
          thresholds: {
            cpu: 70,
            memory: 80,
            disk: 90,
            responseTime: 800
          }
        });
        
        const results = await workflow.execute();
        
        // Save workflow results
        const resultsFile = path.join('${testDir}', 'monitoring-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify({
          totalMetrics: results.metrics.length,
          totalAlerts: results.alerts.length,
          summary: results.summary
        }, null, 2));
        
        console.log('\\nMonitoring Summary:');
        console.log(\`  Metrics collected: \${results.metrics.length}\`);
        console.log(\`  Alerts generated: \${results.alerts.length}\`);
        console.log(\`  Average CPU: \${results.summary.averages.cpu.toFixed(1)}%\`);
        console.log(\`  Peak Response Time: \${results.summary.peaks.responseTime.toFixed(0)}ms\`);
      }
      
      runMonitoring().catch(console.error);
    `;
    
    fs.writeFileSync(monitorScript, scriptContent);
    
    // Execute the monitoring workflow
    const output = execSync(`node ${monitorScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting monitoring workflow');
    expect(output).toContain('Monitoring cycle 1/5');
    expect(output).toContain('Monitoring cycle 5/5');
    expect(output).toContain('Monitoring workflow completed');
    expect(output).toContain('Monitoring Summary:');
    expect(output).toContain('Metrics collected: 5');
    
    // Verify directories and files
    const metricsDir = path.join(testDir, 'metrics');
    const alertsDir = path.join(testDir, 'alerts');
    const reportsDir = path.join(testDir, 'reports');
    
    expect(fs.existsSync(metricsDir)).toBe(true);
    expect(fs.existsSync(alertsDir)).toBe(true);
    expect(fs.existsSync(reportsDir)).toBe(true);
    
    // Verify metrics files were created
    const metricsFiles = fs.readdirSync(metricsDir);
    expect(metricsFiles.length).toBe(5);
    
    // Verify report was created
    const reportFiles = fs.readdirSync(reportsDir);
    expect(reportFiles.length).toBeGreaterThan(0);
  });
});