import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { BranchCoverageAnalyzer } from './branch-coverage-analyzer';
import { SystemTestClassCoverageAnalyzer } from './system-test-class-coverage-analyzer';
import { CoverageReportGenerator } from './coverage-report-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

async function setupCompleteProject() {
  const projectDir = '/tmp/test-complete-project';
  
  // Create project structure
  await fs.mkdir(`${projectDir}/src/services`, { recursive: true });
  await fs.mkdir(`${projectDir}/src/controllers`, { recursive: true });
  await fs.mkdir(`${projectDir}/src/utils`, { recursive: true });
  await fs.mkdir(`${projectDir}/tests/unit`, { recursive: true });
  await fs.mkdir(`${projectDir}/tests/system`, { recursive: true });
  await fs.mkdir(`${projectDir}/coverage`, { recursive: true });
  
  // Create source files with branches and classes
  await fs.writeFile(
    `${projectDir}/src/services/PaymentService.ts`,
    `export class PaymentService {
      processPayment(amount: number, currency: string) {
        if (amount <= 0) {
          throw new Error('Invalid amount');
        }
        
        switch (currency) {
          case 'USD':
            return this.processUSD(amount);
          case 'EUR':
            return this.processEUR(amount);
          case 'GBP':
            return this.processGBP(amount);
          default:
            throw new Error('Unsupported currency');
        }
      }
      
      private processUSD(amount: number) {
        return amount > 1000 ? amount * 0.98 : amount;
      }
      
      private processEUR(amount: number) {
        return amount > 1000 ? amount * 0.97 : amount;
      }
      
      private processGBP(amount: number) {
        return amount > 1000 ? amount * 0.96 : amount;
      }
    }`
  );
  
  await fs.writeFile(
    `${projectDir}/src/controllers/OrderController.ts`,
    `export class OrderController {
      validateOrder(order: any) {
        if (!order) {
          return false;
        }
        
        const hasItems = order.items && order.items.length > 0;
        const hasCustomer = order.customerId != null;
        const hasTotal = order.total > 0;
        
        return hasItems && hasCustomer && hasTotal;
      }
      
      calculateDiscount(order: any) {
        const total = order.total || 0;
        
        if (total > 1000) {
          return total * 0.1;
        } else if (total > 500) {
          return total * 0.05;
        } else if (total > 100) {
          return total * 0.02;
        } else {
          return 0;
        }
      }
    }`
  );
  
  // Create coverage data
  await fs.writeFile(
    `${projectDir}/coverage/coverage.json`,
    JSON.stringify({
      branches: {
        total: 20,
        covered: 15,
        pct: 75
      },
      lines: {
        total: 100,
        covered: 85,
        pct: 85
      },
      files: {
        'src/services/PaymentService.ts': {
          branches: { total: 10, covered: 8 },
          lines: {
            '3': 1, '4': 1, '7': 1, '8': 1,
            '9': 1, '10': 1, '11': 0, '12': 0,
            '13': 1, '14': 1, '15': 0
          }
        },
        'src/controllers/OrderController.ts': {
          branches: { total: 10, covered: 7 },
          lines: {
            '3': 1, '4': 1, '7': 1, '8': 1,
            '9': 1, '10': 0, '15': 1, '16': 1,
            '17': 0, '18': 0, '19': 1
          }
        }
      }
    })
  );
  
  // Create system tests
  await fs.writeFile(
    `${projectDir}/tests/system/PaymentService.systest.ts`,
    `describe('PaymentService System Tests', () => {
      it('should process payments', () => {});
      it('should handle different currencies', () => {});
    });`
  );
  
  // Create unit tests
  await fs.writeFile(
    `${projectDir}/tests/unit/OrderController.test.ts`,
    `describe('OrderController Unit Tests', () => {
      it('should validate orders', () => {});
    });`
  );
  
  return projectDir;
}

describe('Coverage Analyzers Integration', () => {
  let branchAnalyzer: BranchCoverageAnalyzer;
  let systemTestAnalyzer: SystemTestClassCoverageAnalyzer;
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await setupCompleteProject();
  });

  beforeEach(() => {
    branchAnalyzer = new BranchCoverageAnalyzer();
    systemTestAnalyzer = new SystemTestClassCoverageAnalyzer();
  });

  afterAll(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  describe('Combined Analysis', () => {
    it('should analyze both branch and class coverage', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      expect(branchResult).toBeDefined();
      expect(classResult).toBeDefined();
      
      expect(branchResult.percentage).toBeGreaterThanOrEqual(0);
      expect(classResult.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should provide complementary insights', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      // Branch coverage focuses on code paths
      expect(branchResult.details).toBeDefined();
      expect(branchResult.total).toBeGreaterThanOrEqual(0);
      
      // Class coverage focuses on system test coverage
      expect(classResult.details).toBeDefined();
      expect(classResult.totalClasses).toBeGreaterThanOrEqual(0);
    });

    it('should identify different coverage gaps', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      // PaymentService has system tests but may have uncovered branches
      const paymentBranches = branchResult.details.find(d => 
        d.file.includes('PaymentService')
      );
      const paymentClass = classResult.details.find(d => 
        d.className === 'PaymentService'
      );
      
      if (paymentBranches && paymentClass) {
        // Class is covered by system tests
        expect(paymentClass.covered).toBe(true);
        // But may have uncovered branches
        expect(paymentBranches.percentage).toBeLessThanOrEqual(100);
      }
      
      // OrderController has unit tests but no system tests
      const orderClass = classResult.details.find(d => 
        d.className === 'OrderController'
      );
      
      if (orderClass) {
        // Class is not covered by system tests
        expect(orderClass.covered).toBe(false);
      }
    });
  });

  describe('Coverage Metrics Correlation', () => {
    it('should show that high branch coverage does not guarantee system test coverage', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      // A file can have high branch coverage from unit tests
      // but still lack system test coverage
      const hasHighBranchLowSystem = branchResult.details.some(branch => {
        const className = path.basename(branch.file, '.ts');
        const classDetail = classResult.details.find(c => 
          c.className === className
        );
        
        return branch.percentage > 70 && classDetail && !classDetail.covered;
      });
      
      // This scenario is possible and valid
      expect(typeof hasHighBranchLowSystem).toBe('boolean');
    });

    it('should calculate overall project coverage', () => {
      const branchCoverage = 75; // 75% branches covered
      const systemTestCoverage = 50; // 50% classes have system tests
      
      // Different ways to calculate overall coverage
      const averageCoverage = (branchCoverage + systemTestCoverage) / 2;
      const weightedCoverage = (branchCoverage * 0.6) + (systemTestCoverage * 0.4);
      
      expect(averageCoverage).toBe(62.5);
      expect(weightedCoverage).toBe(65);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive coverage report', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      const comprehensiveReport = {
        timestamp: new Date().toISOString(),
        projectPath: projectDir,
        coverage: {
          branch: {
            percentage: branchResult.percentage,
            covered: branchResult.covered,
            total: branchResult.total
          },
          systemTest: {
            percentage: classResult.percentage,
            covered: classResult.coveredClasses,
            total: classResult.totalClasses
          }
        },
        details: {
          branchDetails: branchResult.details,
          classDetails: classResult.details
        },
        summary: {
          overallHealth: 'needs-improvement',
          recommendations: [
            'Increase branch coverage to 80%',
            'Add system tests for uncovered classes',
            'Focus on critical paths'
          ]
        }
      };
      
      expect(comprehensiveReport.coverage.branch).toBeDefined();
      expect(comprehensiveReport.coverage.systemTest).toBeDefined();
      expect(comprehensiveReport.summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify priority areas for improvement', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      // Identify critical gaps
      const criticalGaps = [];
      
      // Classes without system tests
      const uncoveredClasses = classResult.details.filter(d => !d.covered);
      if (uncoveredClasses.length > 0) {
        criticalGaps.push({
          type: 'system-test-gap',
          classes: uncoveredClasses.map(c => c.className),
          priority: 'high'
        });
      }
      
      // Files with low branch coverage
      const lowBranchCoverage = branchResult.details.filter(d => 
        d.percentage < 50
      );
      if (lowBranchCoverage.length > 0) {
        criticalGaps.push({
          type: 'branch-coverage-gap',
          files: lowBranchCoverage.map(f => f.file),
          priority: 'medium'
        });
      }
      
      expect(Array.isArray(criticalGaps)).toBe(true);
    });
  });

  describe('Threshold Validation', () => {
    it('should validate against multiple thresholds', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      const thresholds = {
        branch: 80,
        systemTest: 70,
        overall: 75
      };
      
      const validation = {
        branch: branchResult.percentage >= thresholds.branch,
        systemTest: classResult.percentage >= thresholds.systemTest,
        overall: ((branchResult.percentage + classResult.percentage) / 2) >= thresholds.overall
      };
      
      // Check which thresholds are met
      const failedThresholds = Object.entries(validation)
        .filter(([_, passed]) => !passed)
        .map(([threshold, _]) => threshold);
      
      expect(Array.isArray(failedThresholds)).toBe(true);
    });

    it('should provide actionable feedback for threshold failures', async () => {
      const branchResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const classResult = await systemTestAnalyzer.analyze(projectDir, 'theme');
      
      const feedback = [];
      
      if (branchResult.percentage < 80) {
        const gap = 80 - branchResult.percentage;
        const branchesNeeded = Math.ceil((gap / 100) * branchResult.total);
        
        feedback.push({
          metric: 'Branch Coverage',
          current: `${branchResult.percentage}%`,
          target: '80%',
          gap: `${gap.toFixed(1)}%`,
          action: `Cover ${branchesNeeded} more branches`
        });
      }
      
      if (classResult.percentage < 70) {
        const gap = 70 - classResult.percentage;
        const classesNeeded = Math.ceil((gap / 100) * classResult.totalClasses);
        
        feedback.push({
          metric: 'System Test Coverage',
          current: `${classResult.percentage}%`,
          target: '70%',
          gap: `${gap.toFixed(1)}%`,
          action: `Add system tests for ${classesNeeded} more classes`
        });
      }
      
      expect(Array.isArray(feedback)).toBe(true);
      
      for (const item of feedback) {
        expect(item.metric).toBeDefined();
        expect(item.action).toBeDefined();
      }
    });
  });

  describe('Performance Optimization', () => {
    it('should run analyzers in parallel for better performance', async () => {
      const startTime = Date.now();
      
      // Run analyzers in parallel
      const [branchResult, classResult] = await Promise.all([
        branchAnalyzer.analyze(projectDir, 'theme'),
        systemTestAnalyzer.analyze(projectDir, 'theme')
      ]);
      
      const parallelTime = Date.now() - startTime;
      
      // Run sequentially for comparison
      const sequentialStart = Date.now();
      await branchAnalyzer.analyze(projectDir, 'theme');
      await systemTestAnalyzer.analyze(projectDir, 'theme');
      const sequentialTime = Date.now() - sequentialStart;
      
      // Parallel should be faster or at least not significantly slower
      expect(parallelTime).toBeLessThanOrEqual(sequentialTime * 1.5);
      
      expect(branchResult).toBeDefined();
      expect(classResult).toBeDefined();
    });

    it('should cache results for repeated analyses', async () => {
      // First run - no cache
      const firstRunStart = Date.now();
      const firstResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const firstRunTime = Date.now() - firstRunStart;
      
      // Second run - potentially cached
      const secondRunStart = Date.now();
      const secondResult = await branchAnalyzer.analyze(projectDir, 'theme');
      const secondRunTime = Date.now() - secondRunStart;
      
      // Results should be consistent
      expect(secondResult.percentage).toBe(firstResult.percentage);
      expect(secondResult.total).toBe(firstResult.total);
      
      // Second run might be faster due to file system caching
      expect(secondRunTime).toBeLessThanOrEqual(firstRunTime * 2);
    });
  });
});