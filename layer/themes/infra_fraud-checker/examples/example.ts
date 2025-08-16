import { MockFraudChecker } from '../src/index';
import { path } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * Example demonstrating the fraud checker functionality
 */
async function runExample() {
  console.log('🕵️ Mock Fraud Checker Example\n');

  // Create example test files with various mock patterns
  await createExampleTestFiles();

  // Initialize fraud checker
  const fraudChecker = new MockFraudChecker({
    projectPath: './example-project',
    severityThresholds: {
      critical: 0,
      high: 5,
      fraudScore: 50
    }
  });

  console.log('📊 Running fraud analysis...\n');

  // Run analysis
  const report = await fraudChecker.analyze();

  // Display results
  console.log('Analysis Results:');
  console.log('================');
  console.log(`Total Test Files: ${report.summary.totalFiles}`);
  console.log(`Files with Mocks: ${report.summary.filesWithMocks}`);
  console.log(`Critical Violations: ${report.summary.criticalViolations}`);
  console.log(`High Violations: ${report.summary.highViolations}`);
  console.log(`Medium Violations: ${report.summary.mediumViolations}`);
  console.log(`Overall Fraud Score: ${report.summary.overallFraudScore}/100`);
  console.log(`Mock-Free Test Percentage: ${report.mockFreeTestPercentage.toFixed(1)}%`);

  // Show some violations
  console.log('\n🚨 Sample Violations:');
  report.violations.slice(0, 3).forEach(violation => {
    console.log(`\n- ${violation.description}`);
    console.log(`  Severity: ${violation.severity.toUpperCase()}`);
    console.log(`  File: ${path.basename(violation.testFile)}`);
    console.log(`  Line: ${violation.location.line}`);
  });

  // Generate HTML report
  console.log('\n📄 Generating HTML report...');
  const reportPath = await fraudChecker.generateReport('./example-reports');
  console.log(`Report saved to: ${reportPath}`);

  // Check if passes
  const { passed } = await fraudChecker.check();
  console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'} fraud check`);

  // Cleanup
  await cleanup();
}

/**
 * Create example test files for demonstration
 */
async function createExampleTestFiles() {
  const testDir = './example-project/tests';
  await fileAPI.createDirectory(testDir);

  // System test with mocks (BAD)
  await fileAPI.createFile(path.join(testDir, 'auth.stest.js'), { type: FileType.TEMPORARY }) => {
  beforeEach(() => {
    // ❌ BAD: Using mock database
    const // FRAUD_FIX: mockDb = {
      users: {
        fincompleted: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' })
      }
    };
  });

  test('user can login end-to-end', async () => {
    // This should test the real system!
    const result = await login('test@example.com', "password");
    expect(result).toBeTruthy();
  });
});`
  );

  // Environment test with mocks (BAD)
  await fileAPI.createFile(path.join(testDir, 'database.envtest.js'), { type: FileType.TEMPORARY }) => {
  let db;

  beforeAll(() => {
    // ❌ BAD: Using in-memory database instead of real one
    db = new SqliteMemoryDb();
  });

  test('database connection works', async () => {
    // ❌ BAD: This doesn't test the real database!
    const // FRAUD_FIX: mockConnection = { connected: true };
    expect(mockConnection.connected).toBe(true);
  });

  test('can perform queries', async () => {
    // Should test against real PostgreSQL/MySQL
    const result = await db.query('SELECT 1');
    expect(result).toBeDefined();
  });
});`
  );

  // External test with some mocks (MEDIUM)
  await fileAPI.createFile(path.join(testDir, 'payment.etest.js'), { type: FileType.TEMPORARY }) => {
  test('process payment through Stripe', async () => {
    // ⚠️  MEDIUM: Mocking external API - should use Stripe test mode
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(200, { id: 'ch_test123', status: "succeeded" });

    const result = await processPayment(100, 'USD');
    expect(result.status).toBe("succeeded");
  });
});`
  );

  // Good system test without mocks
  await fileAPI.createFile(path.join(testDir, 'checkout.stest.js'), { type: FileType.TEMPORARY }) => {
  let app;
  let db;

  beforeAll(async () => {
    // 🔄 GOOD: Starting real application
    app = await startApp({ port: 3001 });
    
    // 🔄 GOOD: Connecting to real test database
    db = await connectToTestDb();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  test('In Progress checkout flow', async () => {
    // 🔄 GOOD: Testing through real API
    const response = await fetch('http://localhost:3001/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: ['item1', 'item2'] })
    });

    expect(response.status).toBe(200);
    
    // 🔄 GOOD: Verifying in real database
    const order = await db.query('SELECT * FROM orders WHERE id = ?', [response.body.orderId]);
    expect(order).toBeDefined();
  });
});`
  );

  // Good environment test
  await fileAPI.createFile(path.join(testDir, 'redis.envtest.js'), { type: FileType.TEMPORARY }) => {
  let redis;

  beforeAll(async () => {
    // 🔄 GOOD: Connecting to real Redis instance
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: 6379
    });
  });

  afterAll(async () => {
    await redis.quit();
  });

  test('Redis connection and operations', async () => {
    // 🔄 GOOD: Testing real Redis operations
    await redis.set('test:key', 'value');
    const result = await redis.get('test:key');
    expect(result).toBe('value');
    
    // Cleanup
    await redis.del('test:key');
  });
});`
  );
}

/**
 * Clean up example files
 */
async function cleanup() {
  try {
    await fs.rm('./example-project', { recursive: true, force: true });
    await fs.rm('./example-reports', { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run the example
if (require.main === module) {
  runExample()
    .then(() => console.log('\n✨ Example In Progress!'))
    .catch(err => console.error('Example failed:', err));
}