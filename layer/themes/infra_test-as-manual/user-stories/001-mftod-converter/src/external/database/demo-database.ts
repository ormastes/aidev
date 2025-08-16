/**
 * Database Integration Demo
 * Demonstrates the database functionality with sample data
 */

import { DatabaseFactory, getDefaultDatabaseConfig } from './index';
import { HistoryService } from '../../logic/services/HistoryService';
import { UserService } from '../../logic/services/UserService';
import { ManualTestSuite } from '../../logic/entities/ManualTest';

async function runDatabaseDemo() {
  console.log('🗄️ Starting Database Integration Demo\n');

  try {
    // Initialize database with memory adapter for demo
    const config = { type: 'memory' as const };
    const database = await DatabaseFactory.create(config);
    console.log('✅ Database connected successfully');

    // Initialize services
    const userService = new UserService(database);
    const historyService = new HistoryService(database);

    // 1. User Management Demo
    console.log('\n👤 User Management Demo');
    console.log('========================');

    // Create default admin
    const admin = await userService.createDefaultAdmin();
    if (admin) {
      console.log(`✅ Created admin user: ${admin.username} (${admin.email})`);
    }

    // Create test users
    const tester = await userService.createUser({
      username: 'john_tester',
      email: 'john@example.com',
      role: 'tester'
    });
    console.log(`✅ Created tester: ${tester.username}`);

    const viewer = await userService.createUser({
      username: 'jane_viewer',
      email: 'jane@example.com',
      role: 'viewer'
    });
    console.log(`✅ Created viewer: ${viewer.username}`);

    // Test authentication
    const loginSession = await userService.login({ username: 'john_tester' });
    console.log(`✅ Login successful - Token: ${loginSession.token.substring(0, 10)}...`);

    // Test permissions
    const canExecute = userService.hasPermission(tester, 'execute');
    const canDelete = userService.hasPermission(viewer, 'delete');
    console.log(`✅ Tester can execute tests: ${canExecute}`);
    console.log(`✅ Viewer can delete tests: ${canDelete}`);

    // 2. Test History Demo
    console.log('\n📚 Test History Demo');
    console.log('====================');

    // Create sample test suite
    const sampleSuite: ManualTestSuite = {
      id: 'suite-login-tests',
      title: 'User Login Test Suite',
      description: 'Test suite for user authentication functionality',
      procedures: [
        {
          id: 'test-valid-login',
          title: 'Valid Login Test',
          description: 'Test successful login with valid credentials',
          category: "Authentication",
          priority: 'high' as const,
          estimatedTime: 5,
          prerequisites: ['User account exists', 'Browser is open'],
          testSteps: [
            {
              id: 'step-1',
              order: 1,
              instruction: 'Navigate to login page',
              expected: 'Login form is displayed'
            },
            {
              id: 'step-2',
              order: 2,
              instruction: 'Enter valid username and password',
              expected: 'Credentials are accepted'
            },
            {
              id: 'step-3',
              order: 3,
              instruction: 'Click login button',
              expected: 'User is redirected to dashboard'
            }
          ],
          cleanupSteps: ['Logout user', 'Clear browser cache']
        },
        {
          id: 'test-invalid-login',
          title: 'Invalid Login Test',
          description: 'Test login failure with invalid credentials',
          category: "Authentication",
          priority: 'medium' as const,
          estimatedTime: 3,
          prerequisites: ['Browser is open'],
          testSteps: [
            {
              id: 'step-1',
              order: 1,
              instruction: 'Navigate to login page',
              expected: 'Login form is displayed'
            },
            {
              id: 'step-2',
              order: 2,
              instruction: 'Enter invalid credentials',
              expected: 'Error message is displayed'
            }
          ],
          cleanupSteps: []
        }
      ],
      commonProcedures: [],
      sequences: []
    };

    // Save initial version
    const version1 = await historyService.saveVersion(
      'suite-login-tests',
      sampleSuite,
      tester.id,
      {
        sourceFile: 'login.cy.ts',
        conversionType: 'cypress',
        pluginsUsed: ['cypress-parser', 'pdf-formatter']
      }
    );
    console.log(`✅ Saved version ${version1.version} with ${version1.changes.length} changes`);

    // Modify suite and save new version
    const modifiedSuite = {
      ...sampleSuite,
      procedures: [
        ...sampleSuite.procedures,
        {
          id: 'test-forgot-password',
          title: 'Forgot Password Test',
          description: 'Test password reset functionality',
          category: "Authentication",
          priority: 'low' as const,
          estimatedTime: 7,
          prerequisites: ['User account exists'],
          testSteps: [
            {
              id: 'step-1',
              order: 1,
              instruction: 'Click forgot password link',
              expected: 'Password reset form is displayed'
            },
            {
              id: 'step-2',
              order: 2,
              instruction: 'Enter email address',
              expected: 'Reset email is sent'
            }
          ],
          cleanupSteps: ['Check email']
        }
      ]
    };

    const version2 = await historyService.saveVersion(
      'suite-login-tests',
      modifiedSuite,
      tester.id,
      {
        sourceFile: 'login-extended.cy.ts',
        conversionType: 'cypress',
        pluginsUsed: ['cypress-parser', 'pdf-formatter']
      }
    );
    console.log(`✅ Saved version ${version2.version} with changes: ${version2.changes.join(', ')}`);

    // Get history
    const history = await historyService.getHistory('suite-login-tests');
    console.log(`✅ Retrieved ${history.length} versions from history`);

    // Compare versions
    const comparison = await historyService.compareVersions('suite-login-tests', 1, 2);
    console.log(`✅ Version comparison: ${comparison.summary}`);
    console.log(`   - Added: ${comparison.changes.added.length} items`);
    console.log(`   - Removed: ${comparison.changes.removed.length} items`);
    console.log(`   - Modified: ${comparison.changes.modified.length} items`);

    // 3. Test Execution Demo
    console.log('\n🚀 Test Execution Demo');
    console.log('======================');

    // Start execution
    const execution1 = await historyService.startExecution(
      version2.id,
      tester.id,
      'Testing the updated login suite'
    );
    console.log(`✅ Started execution: ${execution1.id}`);

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Complete execution
    const completedExecution = await historyService.completeExecution(
      execution1.id,
      {
        passed: 2,
        failed: 1,
        skipped: 0,
        details: {
          'test-valid-login': 'PASS',
          'test-invalid-login': 'PASS',
          'test-forgot-password: "PLACEHOLDER"
        }
      },
      "completed",
      'One test failed due to email service being down'
    );
    console.log(`✅ Completed execution with status: ${completedExecution.status}`);

    // Get execution history
    const executions = await historyService.getExecutionHistory(version2.id);
    console.log(`✅ Retrieved ${executions.length} executions for this version`);

    // 4. Analytics Demo
    console.log('\n📊 Analytics Demo');
    console.log('=================');

    const statistics = await historyService.getStatistics(tester.id);
    console.log(`✅ User Statistics:`);
    console.log(`   - Total Suites: ${statistics.totalSuites}`);
    console.log(`   - Total Executions: ${statistics.totalExecutions}`);
    console.log(`   - Success Rate: ${statistics.successRate.toFixed(1)}%`);
    console.log(`   - Avg Execution Time: ${statistics.avgExecutionTime.toFixed(0)}ms`);

    const pluginStats = await historyService.getMostUsedPlugins();
    console.log(`✅ Most Used Plugins:`);
    pluginStats.forEach(plugin => {
      console.log(`   - ${plugin.plugin}: ${plugin.count} uses`);
    });

    // 5. User Activity Demo
    console.log('\n📈 User Activity Demo');
    console.log('=====================');

    const userActivity = await userService.getUserActivity(tester.id);
    console.log(`✅ User Activity for ${tester.username}:`);
    console.log(`   - Total Executions: ${userActivity.totalExecutions}`);
    console.log(`   - Success Rate: ${userActivity.successRate.toFixed(1)}%`);
    console.log(`   - Last Activity: ${userActivity.lastActivity?.toISOString() || 'Never'}`);

    // 6. Session Management Demo
    console.log('\n🔐 Session Management Demo');
    console.log('==========================');

    // Validate session
    const validSession = await userService.validateSession(loginSession.token);
    console.log(`✅ Session validation: ${validSession ? 'Valid' : 'Invalid'}`);

    // Refresh session
    const refreshedSession = await userService.refreshSession(loginSession.token);
    console.log(`✅ Session refreshed: ${refreshedSession ? 'Success' : 'Failed'}`);

    // Clean up expired sessions
    const cleanedCount = await userService.cleanupExpiredSessions();
    console.log(`✅ Cleaned up ${cleanedCount} expired sessions`);

    // Logout
    await userService.logout(loginSession.token);
    console.log(`✅ User logged out successfully`);

    // 7. Data Export Demo
    console.log('\n📤 Data Export Demo');
    console.log('==================');

    const exportData = await historyService.exportHistory('suite-login-tests');
    console.log(`✅ Exported history:`);
    console.log(`   - Suite ID: ${exportData.suiteId}`);
    console.log(`   - Total Versions: ${exportData.totalVersions}`);
    console.log(`   - Exported At: ${exportData.exportedAt}`);

    // Clean up
    await database.disconnect();
    console.log('\n✅ Database disconnected successfully');

    console.log('\n🎉 Database Integration Demo Completed Successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('- ✅ Multi-adapter database support (Memory, SQLite, PostgreSQL)');
    console.log('- ✅ User management and authentication');
    console.log('- ✅ Test suite versioning and history tracking');
    console.log('- ✅ Test execution tracking and results');
    console.log('- ✅ Session management and security');
    console.log('- ✅ Analytics and reporting');
    console.log('- ✅ Data export capabilities');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runDatabaseDemo().catch(console.error);
}

export { runDatabaseDemo };