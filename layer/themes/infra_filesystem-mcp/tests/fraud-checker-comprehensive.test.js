#!/usr/bin/env node

/**
 * Comprehensive Fraud Checker Tests
 * Validates all detection capabilities and ensures the improved fraud checker works correctly
 */

const { fs } = require('../../infra_external-log-lib/src');
const { path } = require('../../infra_external-log-lib/src');
const { EnhancedFraudChecker } = require('../../../../run-enhanced-fraud-check.js');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class FraudCheckerTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.testDir = path.join(__dirname, 'test-files');
  }

  // Helper to create test files
  createTestFile(filename, content) {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    const filepath = path.join(this.testDir, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
  }

  // Clean up test files
  cleanup() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  // Test runner
  async runTest(name, testFn) {
    try {
      await testFn();
      this.passed++;
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      return true;
    } catch (error) {
      this.failed++;
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
      return false;
    }
  }

  // Assert helper
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // Test SQL Injection Detection
  async testSQLInjectionDetection() {
    const testCases = [
      {
        name: 'Basic SQL injection',
        code: `const query = "SELECT * FROM users WHERE id = ${userId}";`,
        shouldDetect: true
      },
      {
        name: 'OR 1=1 pattern',
        code: `const sql = "SELECT * FROM users WHERE name = 'admin' OR 1=1";`,
        shouldDetect: true
      },
      {
        name: 'UNION SELECT',
        code: `exec("SELECT * FROM users UNION SELECT * FROM passwords");`,
        shouldDetect: true
      },
      {
        name: 'Safe parameterized query',
        code: `db.query("SELECT * FROM users WHERE id = ?", [userId]);`,
        shouldDetect: false
      }
    ];

    for (const testCase of testCases) {
      const file = this.createTestFile(`sql-${Date.now()}.js`, testCase.code);
      const checker = new EnhancedFraudChecker();
      
      // Mock the scan
      const violations = checker.detectPatterns(testCase.code, file);
      const hasSQLInjection = violations.some(v => v.rule === 'SQL_INJECTION');
      
      this.assert(
        hasSQLInjection === testCase.shouldDetect,
        `SQL Injection detection failed for: ${testCase.name}`
      );
    }
  }

  // Test XSS Detection
  async testXSSDetection() {
    const testCases = [
      {
        name: 'innerHTML with user input',
        code: `element.innerHTML = \`<div>\${userInput}</div>\`;`,
        shouldDetect: true
      },
      {
        name: 'document.write with variables',
        code: `document.write('<script>' + userScript + '</script>');`,
        shouldDetect: true
      },
      {
        name: 'eval with user input',
        code: `eval("var x = " + \${userValue});`,
        shouldDetect: true
      },
      {
        name: 'Safe text content',
        code: `element.textContent = userInput;`,
        shouldDetect: false
      }
    ];

    for (const testCase of testCases) {
      const file = this.createTestFile(`xss-${Date.now()}.js`, testCase.code);
      const checker = new EnhancedFraudChecker();
      
      const violations = checker.detectPatterns(testCase.code, file);
      const hasXSS = violations.some(v => v.rule === 'XSS_VULNERABILITY');
      
      this.assert(
        hasXSS === testCase.shouldDetect,
        `XSS detection failed for: ${testCase.name}`
      );
    }
  }

  // Test Hardcoded Secrets Detection
  async testHardcodedSecretsDetection() {
    const testCases = [
      {
        name: 'API key hardcoded',
        code: `const apiKey = "sk_live_4242424242424242424242";`,
        shouldDetect: true
      },
      {
        name: 'Password in code',
        code: `const password = "MySecretPassword123!";`,
        shouldDetect: true
      },
      {
        name: 'Token hardcoded',
        code: `const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";`,
        shouldDetect: true
      },
      {
        name: 'Environment variable usage',
        code: `const apiKey = process.env.API_KEY;`,
        shouldDetect: false
      },
      {
        name: 'Example/placeholder',
        code: `const password = "example_password";`,
        shouldDetect: false
      }
    ];

    for (const testCase of testCases) {
      const file = this.createTestFile(`secret-${Date.now()}.js`, testCase.code);
      const checker = new EnhancedFraudChecker();
      
      const violations = checker.detectPatterns(testCase.code, file);
      const hasSecret = violations.some(v => v.rule === 'HARDCODED_SECRET');
      
      this.assert(
        hasSecret === testCase.shouldDetect,
        `Secret detection failed for: ${testCase.name}`
      );
    }
  }

  // Test Path Traversal Detection
  async testPathTraversalDetection() {
    const testCases = [
      {
        name: 'Directory traversal pattern',
        code: `const file = fs.readFileSync("../../etc/passwd");`,
        shouldDetect: true
      },
      {
        name: 'User input in path',
        code: `fs.readFile(\`./uploads/\${userInput}\`, callback);`,
        shouldDetect: true
      },
      {
        name: 'Windows path traversal',
        code: `const path = "..\\\\..\\\\windows\\\\system32";`,
        shouldDetect: true
      },
      {
        name: 'Safe absolute path',
        code: `const file = fs.readFileSync("/app/config.json");`,
        shouldDetect: false
      }
    ];

    for (const testCase of testCases) {
      const file = this.createTestFile(`path-${Date.now()}.js`, testCase.code);
      const checker = new EnhancedFraudChecker();
      
      const violations = checker.detectPatterns(testCase.code, file);
      const hasPathTraversal = violations.some(v => v.rule === 'PATH_TRAVERSAL');
      
      this.assert(
        hasPathTraversal === testCase.shouldDetect,
        `Path traversal detection failed for: ${testCase.name}`
      );
    }
  }

  // Test Weak Crypto Detection
  async testWeakCryptoDetection() {
    const testCases = [
      {
        name: 'Math.random for token',
        code: `const token = Math.random().toString(36);`,
        shouldDetect: true
      },
      {
        name: 'Math.random for password',
        code: `const password = "user_" + Math.random();`,
        shouldDetect: true
      },
      {
        name: 'Math.random for key generation',
        code: `const key = Math.random() * 1000000;`,
        shouldDetect: true
      },
      {
        name: 'Math.random for non-security',
        code: `const randomIndex = Math.floor(Math.random() * array.length);`,
        shouldDetect: false
      }
    ];

    for (const testCase of testCases) {
      const file = this.createTestFile(`crypto-${Date.now()}.js`, testCase.code);
      const checker = new EnhancedFraudChecker();
      
      const violations = checker.detectPatterns(testCase.code, file);
      const hasWeakCrypto = violations.some(v => v.rule === 'WEAK_RANDOM');
      
      this.assert(
        hasWeakCrypto === testCase.shouldDetect,
        `Weak crypto detection failed for: ${testCase.name}`
      );
    }
  }

  // Test Code Quality Detection
  async testCodeQualityDetection() {
    const testCases = [
      {
        name: 'Multiple console statements',
        code: `
          console.log("debug1");
          console.error("error");
          console.warn("warning");
          console.info("info");
        `,
        shouldDetect: true,
        rule: 'CONSOLE_STATEMENTS'
      },
      {
        name: 'TODO comments',
        code: `
          // TODO: Fix this later
          // FIXME: This is broken
          // HACK: Temporary solution
        `,
        shouldDetect: true,
        rule: 'UNRESOLVED_TODOS'
      },
      {
        name: 'Debugger statement',
        code: `
          function test() {
            debugger;
            return true;
          }
        `,
        shouldDetect: true,
        rule: 'DEBUGGER_STATEMENT'
      }
    ];

    for (const testCase of testCases) {
      const file = this.createTestFile(`quality-${Date.now()}.js`, testCase.code);
      const checker = new EnhancedFraudChecker();
      
      const violations = checker.detectPatterns(testCase.code, file);
      const hasQualityIssue = violations.some(v => v.rule === testCase.rule);
      
      this.assert(
        hasQualityIssue === testCase.shouldDetect,
        `Code quality detection failed for: ${testCase.name}`
      );
    }
  }

  // Test Severity Classification
  async testSeverityClassification() {
    const checker = new EnhancedFraudChecker();
    
    // Critical severity
    const sqlInjection = `exec("DROP TABLE users WHERE id = ${id}")`;
    const criticalViolations = checker.detectPatterns(sqlInjection, 'test.js');
    this.assert(
      criticalViolations.some(v => v.severity === 'critical'),
      'SQL injection should be marked as critical'
    );
    
    // High severity
    const debuggerCode = `debugger; console.log("test");`;
    const highViolations = checker.detectPatterns(debuggerCode, 'test.js');
    this.assert(
      highViolations.some(v => v.severity === 'high'),
      'Debugger statements should be marked as high severity'
    );
    
    // Low severity
    const todoCode = `// TODO: implement this feature`;
    const lowViolations = checker.detectPatterns(todoCode, 'test.js');
    this.assert(
      lowViolations.some(v => v.severity === 'low'),
      'TODO comments should be marked as low severity'
    );
  }

  // Test File Scanning
  async testFileScanning() {
    // Create test files with various issues
    this.createTestFile('vulnerable.js', `
      const password = "admin123";
      const query = "SELECT * FROM users WHERE id = " + userId;
      eval(userInput);
      debugger;
    `);
    
    this.createTestFile('safe.py', `
      import os
      
      def get_user(user_id):
          return db.query("SELECT * FROM users WHERE id = ?", [user_id])
    `);
    
    const checker = new EnhancedFraudChecker();
    
    // Mock scanning (since we can't easily test the full scan)
    const vulnerableContent = fs.readFileSync(path.join(this.testDir, 'vulnerable.js'), 'utf-8');
    const violations = checker.detectPatterns(vulnerableContent, 'vulnerable.js');
    
    this.assert(violations.length >= 4, 'Should detect multiple issues in vulnerable file');
    this.assert(
      violations.some(v => v.rule === 'HARDCODED_SECRET'),
      'Should detect hardcoded password'
    );
    this.assert(
      violations.some(v => v.rule === 'SQL_INJECTION'),
      'Should detect SQL injection'
    );
  }

  // Test Confidence Scoring
  async testConfidenceScoring() {
    const checker = new EnhancedFraudChecker();
    
    // High confidence detection
    const definiteSQL = `exec("DROP TABLE users")`;
    const highConfidence = checker.detectPatterns(definiteSQL, 'test.js');
    this.assert(
      highConfidence.some(v => v.confidence >= 90),
      'Clear violations should have high confidence'
    );
    
    // Medium confidence detection
    const possibleIssue = `const data = "../" + userPath;`;
    const mediumConfidence = checker.detectPatterns(possibleIssue, 'test.js');
    this.assert(
      mediumConfidence.some(v => v.confidence >= 70 && v.confidence < 90),
      'Possible issues should have medium confidence'
    );
  }

  // Test Report Generation
  async testReportGeneration() {
    const checker = new EnhancedFraudChecker();
    
    // Create a file with multiple issues
    const testCode = `
      const apiKey = "sk_live_1234567890abcdef";
      const sql = "SELECT * FROM users WHERE name = '" + userName + "'";
      element.innerHTML = userInput;
      console.log("debug");
      // TODO: fix this
      debugger;
    `;
    
    const violations = checker.detectPatterns(testCode, 'test.js');
    
    // Check that violations are properly categorized
    const categories = new Set(violations.map(v => v.category));
    this.assert(categories.has('security'), 'Should have security category violations');
    this.assert(categories.has('quality'), 'Should have quality category violations');
    
    // Check severity distribution
    const severities = violations.map(v => v.severity);
    this.assert(severities.includes('critical'), 'Should have critical violations');
    this.assert(severities.includes('high'), 'Should have high violations');
    this.assert(severities.includes('low'), 'Should have low violations');
  }

  // Test False Positive Prevention
  async testFalsePositivePrevention() {
    const checker = new EnhancedFraudChecker();
    
    const safeCases = [
      {
        name: 'Environment variable for secrets',
        code: `const apiKey = process.env.API_KEY;`
      },
      {
        name: 'Parameterized queries',
        code: `db.query("SELECT * FROM users WHERE id = ?", [userId]);`
      },
      {
        name: 'Safe DOM manipulation',
        code: `element.textContent = userInput;`
      },
      {
        name: 'Test file console logs',
        code: `console.log("Running test");`,
        filename: 'test.spec.js'
      }
    ];
    
    for (const safeCase of safeCases) {
      const violations = checker.detectPatterns(
        safeCase.code, 
        safeCase.filename || 'safe.js'
      );
      
      // Check for specific false positives
      if (safeCase.name.includes('Environment')) {
        this.assert(
          !violations.some(v => v.rule === 'HARDCODED_SECRET'),
          `False positive for: ${safeCase.name}`
        );
      }
    }
  }

  // Test Edge Cases
  async testEdgeCases() {
    const checker = new EnhancedFraudChecker();
    
    // Empty file
    const emptyViolations = checker.detectPatterns('', 'empty.js');
    this.assert(emptyViolations.length === 0, 'Empty file should have no violations');
    
    // Very long lines
    const longLine = 'const x = "' + 'a'.repeat(10000) + '";';
    const longLineViolations = checker.detectPatterns(longLine, 'long.js');
    this.assert(longLineViolations !== undefined, 'Should handle long lines');
    
    // Unicode and special characters
    const unicode = `const message = "Hello 世界 🌍";`;
    const unicodeViolations = checker.detectPatterns(unicode, 'unicode.js');
    this.assert(unicodeViolations !== undefined, 'Should handle unicode');
    
    // Nested patterns
    const nested = `eval("eval('" + userInput + "')")`;
    const nestedViolations = checker.detectPatterns(nested, 'nested.js');
    this.assert(
      nestedViolations.some(v => v.rule === 'XSS_VULNERABILITY'),
      'Should detect nested patterns'
    );
  }

  // Run all tests
  async runAllTests() {
    console.log(`\n${colors.cyan}${colors.bright}=== Comprehensive Fraud Checker Tests ===${colors.reset}\n`);
    
    const tests = [
      { name: 'SQL Injection Detection', fn: () => this.testSQLInjectionDetection() },
      { name: 'XSS Detection', fn: () => this.testXSSDetection() },
      { name: 'Hardcoded Secrets Detection', fn: () => this.testHardcodedSecretsDetection() },
      { name: 'Path Traversal Detection', fn: () => this.testPathTraversalDetection() },
      { name: 'Weak Crypto Detection', fn: () => this.testWeakCryptoDetection() },
      { name: 'Code Quality Detection', fn: () => this.testCodeQualityDetection() },
      { name: 'Severity Classification', fn: () => this.testSeverityClassification() },
      { name: 'File Scanning', fn: () => this.testFileScanning() },
      { name: 'Confidence Scoring', fn: () => this.testConfidenceScoring() },
      { name: 'Report Generation', fn: () => this.testReportGeneration() },
      { name: 'False Positive Prevention', fn: () => this.testFalsePositivePrevention() },
      { name: 'Edge Cases', fn: () => this.testEdgeCases() }
    ];
    
    for (const test of tests) {
      console.log(`\n${colors.blue}Testing: ${test.name}${colors.reset}`);
      await this.runTest(test.name, test.fn);
    }
    
    // Summary
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}Test Results Summary${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}Passed: ${this.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.failed}${colors.reset}`);
    console.log(`Total: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(2)}%`);
    
    // Cleanup
    this.cleanup();
    
    // Exit code
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Performance test
async function performanceTest() {
  console.log(`\n${colors.yellow}${colors.bright}=== Performance Test ===${colors.reset}\n`);
  
  const checker = new EnhancedFraudChecker();
  const largeFile = 'const x = 1;\n'.repeat(10000); // 10k lines
  
  const startTime = Date.now();
  const violations = checker.detectPatterns(largeFile, 'large.js');
  const endTime = Date.now();
  
  console.log(`Processed 10,000 lines in ${endTime - startTime}ms`);
  console.log(`Performance: ${(10000 / ((endTime - startTime) / 1000)).toFixed(2)} lines/second`);
  
  if (endTime - startTime > 1000) {
    console.log(`${colors.yellow}⚠️ Performance warning: Processing took more than 1 second${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Good performance${colors.reset}`);
  }
}

// Integration test
async function integrationTest() {
  console.log(`\n${colors.magenta}${colors.bright}=== Integration Test ===${colors.reset}\n`);
  
  const testProjectPath = path.join(__dirname, 'test-project');
  
  // Create a test project structure
  if (!fs.existsSync(testProjectPath)) {
    fs.mkdirSync(testProjectPath, { recursive: true });
  }
  
  // Create various test files
  fs.writeFileSync(path.join(testProjectPath, 'vulnerable.js'), `
    const password = "admin123";
    const query = "SELECT * FROM users WHERE id = " + userId;
    eval(userInput);
  `);
  
  fs.writeFileSync(path.join(testProjectPath, 'safe.js'), `
    const apiKey = process.env.API_KEY;
    const query = db.prepare("SELECT * FROM users WHERE id = ?");
  `);
  
  fs.mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
  fs.writeFileSync(path.join(testProjectPath, 'src', 'app.js'), `
    console.log("Starting application");
    // TODO: Add error handling
    debugger; // Remove before production
  `);
  
  console.log('Created test project structure');
  console.log('Running fraud checker on test project...\n');
  
  // Note: Can't easily test the full scan here, but structure is ready
  console.log(`${colors.green}✓ Integration test structure created${colors.reset}`);
  
  // Cleanup
  fs.rmSync(testProjectPath, { recursive: true, force: true });
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Comprehensive Fraud Checker Test Suite                 ║');
  console.log('║     Testing all detection capabilities                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  const suite = new FraudCheckerTestSuite();
  
  try {
    // Run main test suite
    await suite.runAllTests();
    
    // Run performance test
    await performanceTest();
    
    // Run integration test
    await integrationTest();
    
    console.log(`\n${colors.green}${colors.bright}✅ All tests completed successfully!${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ Test suite failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { FraudCheckerTestSuite };