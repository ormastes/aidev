import { TestEnvironmentSetup } from './index';

/**
 * Demo script that intentionally fails certain criteria to demonstrate the reporting system
 */
export async function runDemo() {
  console.log('Running Test Environment Demo...\n');

  // Create mock test results with intentionally failing metrics
  const mockTestResults = {
    coverageMap: {
      'src/auth/login.ts': {
        path: 'src/auth/login.ts',
        statementMap: {},
        fnMap: {
          '0': { name: 'login', line: 10 },
          '1': { name: 'logout', line: 20 },
          '2': { name: 'validateToken', line: 30 }
        },
        branchMap: {
          '0': { line: 15, type: 'if', locations: [{}, {}] },
          '1': { line: 25, type: 'if', locations: [{}, {}] }
        },
        s: {},
        f: { '0': 5, '1': 3, '2': 0 }, // One uncovered function
        b: { '0': [5, 2], '1': [3, 0] }, // Some uncovered branches
        l: {
          '10': 5, '11': 5, '12': 5, '13': 5, '14': 5,
          '15': 5, '16': 2, '17': 2, '18': 5,
          '20': 3, '21': 3, '22': 3, '23': 3,
          '25': 3, '26': 0, '27': 0, '28': 3,
          '30': 0, '31': 0, '32': 0, '33': 0  // Uncovered lines
        },
        code: `
class AuthService {
  login(username: string, password: string) {
    // Implementation
  }
  
  logout() {
    // Implementation
  }
  
  validateToken(token: string) {
    // Implementation
  }
}

class UserManager {
  createUser() {
    // Implementation
  }
  
  deleteUser() {
    // Implementation  
  }
}
        `
      },
      'src/data/processor.ts': {
        path: 'src/data/processor.ts',
        fnMap: {
          '0': { name: 'processData', line: 5 },
          '1': { name: 'validateData', line: 15 }
        },
        branchMap: {
          '0': { line: 10, type: 'if', locations: [{}, {}] }
        },
        f: { '0': 10, '1': 8 },
        b: { '0': [10, 5] },
        l: {
          '5': 10, '6': 10, '7': 10, '8': 10,
          '10': 10, '11': 5, '12': 5, '13': 10,
          '15': 8, '16': 8, '17': 8
        },
        code: `
class DataProcessor {
  processData(data: any) {
    // Implementation
  }
  
  validateData(data: any) {
    // Implementation
  }
}
        `
      }
    },
    testSuites: [
      {
        name: 'AuthService Tests',
        tests: [
          { name: 'should login user', status: 'passed' },
          { name: 'should logout user', status: 'passed' },
          { name: 'should validate token', status: 'skipped' } // Intentionally skipped
        ]
      },
      {
        name: 'DataProcessor Tests',
        tests: [
          { name: 'should process data', status: 'passed' },
          { name: 'should validate data', status: 'passed' }
        ]
      }
    ]
  };

  // Run demo for different themes
  const themes = ['authentication', 'data-processing'];
  
  for (const theme of themes) {
    console.log(`\n=== Running demo for theme: ${theme} ===\n`);
    
    const setup = new TestEnvironmentSetup({
      theme,
      environment: 'system',
      mode: 'demo',
      outputDir: `gen/test-reports/${theme}/demo`
    });
    
    try {
      const report = await setup.runAnalysis(mockTestResults);
      
      console.log(`Theme: ${report.theme}`);
      console.log(`Status: ${report.status.overall.toUpperCase()}`);
      console.log('\nCriteria Results:');
      console.log(`- Class Coverage: ${report.status.criteria.classCoverage.actual.toFixed(1)}% / ${report.status.criteria.classCoverage.target}% - ${report.status.criteria.classCoverage.met ? 'PASSED' : 'FAILED'}`);
      console.log(`- Branch Coverage: ${report.status.criteria.branchCoverage.actual.toFixed(1)}% / ${report.status.criteria.branchCoverage.target}% - ${report.status.criteria.branchCoverage.met ? 'PASSED' : 'FAILED'}`);
      console.log(`- Code Duplication: ${report.status.criteria.duplication.actual.toFixed(1)}% / max ${report.status.criteria.duplication.target}% - ${report.status.criteria.duplication.met ? 'PASSED' : 'FAILED'}`);
      console.log(`- Fraud Check: ${report.status.criteria.fraudCheck.actual} / min ${report.status.criteria.fraudCheck.target} - ${report.status.criteria.fraudCheck.met ? 'PASSED' : 'FAILED'}`);
      
      if (report.metrics.fraudCheck.violations.length > 0) {
        console.log('\nFraud Violations:');
        report.metrics.fraudCheck.violations.forEach(v => {
          console.log(`- [${v.severity}] ${v.type}: ${v.message}`);
        });
      }
      
      console.log(`\nReport saved to: gen/test-reports/${theme}/demo/`);
      
    } catch (error) {
      console.error(`Error running demo for ${theme}:`, error);
    }
  }
  
  // Run production mode example
  console.log('\n\n=== Running production mode example ===\n');
  
  const prodSetup = new TestEnvironmentSetup({
    theme: 'authentication',
    environment: 'system',
    mode: 'production',
    outputDir: 'gen/test-reports/authentication/production'
  });
  
  try {
    const report = await prodSetup.runAnalysis(mockTestResults);
    console.log(`Production mode would ${report.status.overall === 'passed' ? 'PASS' : 'FAIL'} with these strict criteria.`);
    console.log('In production, class and branch coverage must be >= 95%');
  } catch (error) {
    console.error('Error running production demo:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}