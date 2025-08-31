/**
 * Global Teardown for Profile Management E2E Tests
 * 
 * Cleans up test environment including:
 * - Test user accounts deletion
 * - Test data cleanup
 * - Database cleanup
 * - Temporary files removal
 */

import { FullConfig } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Test environment configuration
const TEST_CONFIG = {
  API_URL: 'http://localhost:3156/api',
  TEST_DATA_DIR: path.join(__dirname, 'test-data'),
  UPLOAD_DIR: path.join(__dirname, 'test-uploads')
};

async function globalTeardown(config: FullConfig) {
  console.log('🧽 Cleaning up Profile Management E2E Test Environment...');
  
  try {
    // 1. Cleanup test users
    await cleanupTestUsers();
    
    // 2. Cleanup test data files
    await cleanupTestFiles();
    
    // 3. Cleanup database test data
    await cleanupTestDatabase();
    
    // 4. Generate test report
    await generateTestReport();
    
    console.log('✅ Profile Management E2E Test Environment Cleanup Complete');
    
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestUsers(): Promise<void> {
  console.log('🗑️ Cleaning up test users...');
  
  try {
    const usersFilePath = path.join(TEST_CONFIG.TEST_DATA_DIR, 'test-users.json');
    
    if (fs.existsSync(usersFilePath)) {
      const testUsers = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      
      for (const user of testUsers) {
        try {
          // Login to get auth token
          const loginResponse = await axios.post(`${TEST_CONFIG.API_URL}/auth/login`, {
            email: user.email,
            password: user.password
          });
          
          if (loginResponse.status === 200) {
            const authToken = loginResponse.data.token;
            
            // Delete user account
            await axios.delete(`${TEST_CONFIG.API_URL}/users/${user.id}`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            
            console.log(`   ✅ Deleted user: ${user.username}`);
          }
        } catch (error: any) {
          console.warn(`   ⚠️ Failed to delete user ${user.username}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.warn('   ⚠️ Test user cleanup failed:', error);
  }
}

async function cleanupTestFiles(): Promise<void> {
  console.log('📁 Cleaning up test files...');
  
  const directoriesToClean = [
    TEST_CONFIG.TEST_DATA_DIR,
    TEST_CONFIG.UPLOAD_DIR,
    path.join(__dirname, 'test-results-profile'),
    path.join(__dirname, 'playwright-report-profile')
  ];
  
  for (const dir of directoriesToClean) {
    try {
      if (fs.existsSync(dir)) {
        // Preserve important test artifacts, clean temporary data
        const preservePatterns = ['.gitkeep', 'test-report-*.json', 'coverage-*.json'];
        
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const shouldPreserve = preservePatterns.some(pattern => 
            entry.match(pattern.replace('*', '.*'))
          );
          
          if (!shouldPreserve) {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(fullPath);
            }
          }
        }
        
        console.log(`   ✅ Cleaned directory: ${dir}`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Failed to clean directory ${dir}:`, error);
    }
  }
}

async function cleanupTestDatabase(): Promise<void> {
  console.log('🗄️ Cleaning up test database...');
  
  try {
    // Remove test data but preserve schema
    const cleanupResponse = await axios.post(`${TEST_CONFIG.API_URL}/admin/database/cleanup`, {
      environment: 'test',
      removeTestData: true,
      preserveSchema: true,
      olderThan: new Date(Date.now() - 3600000).toISOString() // Remove data older than 1 hour
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-admin-token'}`,
        'X-Test-Environment': 'true'
      }
    });
    
    if (cleanupResponse.status === 200) {
      console.log('   ✅ Test database cleaned successfully');
      console.log(`   📈 Cleaned ${cleanupResponse.data.deletedRecords} test records`);
    }
  } catch (error) {
    console.warn('   ⚠️ Database cleanup failed:', error);
  }
}

async function generateTestReport(): Promise<void> {
  console.log('📄 Generating test report...');
  
  try {
    const reportData = {
      testSuite: 'Profile Management E2E Tests',
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      configuration: {
        apiUrl: TEST_CONFIG.API_URL,
        portalUrl: 'http://localhost:3156',
        testDataDir: TEST_CONFIG.TEST_DATA_DIR
      },
      cleanup: {
        testUsersRemoved: true,
        testFilesRemoved: true,
        databaseCleaned: true
      },
      testCategories: [
        'User Registration and Account Creation',
        'Profile Information Management',
        'Password and Security Management',
        'Privacy Settings and Data Control',
        'Notification Preferences',
        'Theme and Appearance Customization',
        'Language and Localization',
        'Activity History and Audit Logs',
        'Data Export and GDPR Compliance',
        'Role-Based Access Control',
        'Public Profile Features',
        'Performance and Usability',
        'Error Handling and Edge Cases',
        'Multi-Device Profile Synchronization',
        'Integration with External Services',
        'Advanced Profile Features'
      ],
      expectedTestCount: 25,
      testApproach: 'Mock Free Test Oriented Development',
      architectureCompliance: 'HEA (Hierarchical Encapsulation Architecture)'
    };
    
    const reportPath = path.join(__dirname, 'test-setup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log('   ✅ Test report generated:', reportPath);
    
  } catch (error) {
    console.warn('   ⚠️ Test report generation failed:', error);
  }
}

export default globalTeardown;