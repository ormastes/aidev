/**
 * Global Setup for Profile Management E2E Tests
 * 
 * Prepares test environment including:
 * - Database initialization with test data
 * - Test user accounts creation
 * - Service configuration
 * - Mock external services setup
 */

import { chromium, FullConfig } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Test environment configuration
const TEST_CONFIG = {
  API_URL: 'http://localhost:3156/api',
  PORTAL_URL: 'http://localhost:3156',
  DB_NAME: 'aidev_profile_test',
  TEST_DATA_DIR: path.join(__dirname, 'test-data'),
  UPLOAD_DIR: path.join(__dirname, 'test-uploads')
};

// Test users to be created
const TEST_USERS = [
  {
    username: 'admin_test_user',
    email: 'admin@aidev-test.com',
    password: 'AdminPass123!@#',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    username: 'regular_test_user',
    email: 'user@aidev-test.com',
    password: 'UserPass123!@#',
    firstName: 'Regular',
    lastName: 'User',
    role: 'user'
  },
  {
    username: 'premium_test_user',
    email: 'premium@aidev-test.com',
    password: 'PremiumPass123!@#',
    firstName: 'Premium',
    lastName: 'User',
    role: 'premium'
  }
];

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Profile Management E2E Test Environment...');
  
  try {
    // 1. Create test directories
    await createTestDirectories();
    
    // 2. Wait for services to be available
    await waitForServices();
    
    // 3. Initialize test database
    await initializeTestDatabase();
    
    // 4. Create test users
    await createTestUsers();
    
    // 5. Setup test data
    await setupTestData();
    
    // 6. Configure mock services
    await configureMockServices();
    
    console.log('✅ Profile Management E2E Test Environment Setup Complete');
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

async function createTestDirectories(): Promise<void> {
  console.log('📁 Creating test directories...');
  
  const directories = [
    TEST_CONFIG.TEST_DATA_DIR,
    TEST_CONFIG.UPLOAD_DIR,
    path.join(TEST_CONFIG.TEST_DATA_DIR, 'avatars'),
    path.join(TEST_CONFIG.TEST_DATA_DIR, 'covers'),
    path.join(TEST_CONFIG.TEST_DATA_DIR, 'exports'),
    path.join(TEST_CONFIG.TEST_DATA_DIR, 'imports')
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   Created: ${dir}`);
    }
  }
}

async function waitForServices(): Promise<void> {
  console.log('⏳ Waiting for services to be available...');
  
  const maxAttempts = 30;
  const delayMs = 2000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check portal health
      const portalResponse = await axios.get(`${TEST_CONFIG.PORTAL_URL}/health`, {
        timeout: 5000
      });
      
      // Check API health
      const apiResponse = await axios.get(`${TEST_CONFIG.API_URL}/health`, {
        timeout: 5000
      });
      
      if (portalResponse.status === 200 && apiResponse.status === 200) {
        console.log(`   ✅ Services available after ${attempt} attempts`);
        return;
      }
    } catch (error) {
      console.log(`   Attempt ${attempt}/${maxAttempts}: Services not ready yet...`);
      
      if (attempt === maxAttempts) {
        throw new Error('Services failed to start within timeout period');
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function initializeTestDatabase(): Promise<void> {
  console.log('🗄️ Initializing test database...');
  
  try {
    // Initialize or reset test database
    const initResponse = await axios.post(`${TEST_CONFIG.API_URL}/admin/database/reset`, {
      environment: 'test',
      preserveSchema: true,
      seedData: true
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-admin-token'}`,
        'X-Test-Environment': 'true'
      }
    });
    
    if (initResponse.status === 200) {
      console.log('   ✅ Test database initialized successfully');
    }
  } catch (error) {
    console.warn('   ⚠️ Database initialization failed, proceeding with existing state:', error);
  }
}

async function createTestUsers(): Promise<void> {
  console.log('👥 Creating test users...');
  
  const createdUsers = [];
  
  for (const userData of TEST_USERS) {
    try {
      // Register user
      const registerResponse = await axios.post(`${TEST_CONFIG.API_URL}/auth/register`, {
        ...userData,
        skipEmailVerification: true // For testing
      });
      
      if (registerResponse.status === 201) {
        console.log(`   ✅ Created user: ${userData.username}`);
        createdUsers.push({
          ...userData,
          id: registerResponse.data.userId
        });
      }
    } catch (error: any) {
      // User might already exist from previous test runs
      if (error.response?.status === 409) {
        console.log(`   ℹ️ User already exists: ${userData.username}`);
      } else {
        console.warn(`   ⚠️ Failed to create user ${userData.username}:`, error.message);
      }
    }
  }
  
  // Save created users to file for test access
  const usersFilePath = path.join(TEST_CONFIG.TEST_DATA_DIR, 'test-users.json');
  fs.writeFileSync(usersFilePath, JSON.stringify(createdUsers, null, 2));
}

async function setupTestData(): Promise<void> {
  console.log('📊 Setting up test data...');
  
  // Create test image files
  const testImages = [
    { name: 'avatar-small.jpg', size: 50 * 1024, format: 'JPEG' },
    { name: 'avatar-medium.jpg', size: 200 * 1024, format: 'JPEG' },
    { name: 'avatar-large.png', size: 1 * 1024 * 1024, format: 'PNG' },
    { name: 'cover-photo.jpg', size: 800 * 1024, format: 'JPEG' },
    { name: 'project-image.webp', size: 300 * 1024, format: 'WebP' }
  ];
  
  for (const imageSpec of testImages) {
    const imagePath = path.join(TEST_CONFIG.TEST_DATA_DIR, imageSpec.name);
    if (!fs.existsSync(imagePath)) {
      const imageData = generateTestImage(imageSpec.format, imageSpec.size);
      fs.writeFileSync(imagePath, imageData);
      console.log(`   ✅ Created test image: ${imageSpec.name}`);
    }
  }
  
  // Create test import/export data
  const importTestData = {
    profile: {
      firstName: 'Imported',
      lastName: 'User',
      bio: 'Profile imported from external source',
      location: 'Import City, IC',
      skills: ['Imported Skill 1', 'Imported Skill 2']
    },
    settings: {
      theme: 'dark',
      language: 'en-US',
      notifications: {
        email: true,
        push: false,
        sms: false
      }
    },
    privacySettings: {
      profileVisibility: 'friends',
      allowSearch: true,
      showEmail: false
    }
  };
  
  const importDataPath = path.join(TEST_CONFIG.TEST_DATA_DIR, 'import-test-data.json');
  fs.writeFileSync(importDataPath, JSON.stringify(importTestData, null, 2));
  
  // Create test CSV data for bulk operations
  const csvTestData = [
    'firstName,lastName,email,company,position',
    'John,CSV,john.csv@example.com,CSV Corp,Developer',
    'Jane,CSV,jane.csv@example.com,CSV Inc,Designer',
    'Bob,CSV,bob.csv@example.com,CSV Ltd,Manager'
  ].join('\n');
  
  const csvDataPath = path.join(TEST_CONFIG.TEST_DATA_DIR, 'bulk-import.csv');
  fs.writeFileSync(csvDataPath, csvTestData);
  
  console.log('   ✅ Test data files created successfully');
}

async function configureMockServices(): Promise<void> {
  console.log('🔧 Configuring mock external services...');
  
  try {
    // Configure mock OAuth providers
    const oauthConfig = {
      github: {
        enabled: true,
        mockMode: true,
        testUserData: {
          login: 'test-github-user',
          name: 'Test GitHub User',
          email: 'github@example.com',
          avatar_url: 'https://github.com/avatar/test.jpg'
        }
      },
      google: {
        enabled: true,
        mockMode: true,
        testUserData: {
          sub: 'test-google-user-123',
          name: 'Test Google User',
          email: 'google@example.com',
          picture: 'https://google.com/avatar/test.jpg'
        }
      },
      linkedin: {
        enabled: true,
        mockMode: true,
        testUserData: {
          id: 'test-linkedin-user',
          firstName: 'Test',
          lastName: 'LinkedIn User',
          emailAddress: 'linkedin@example.com'
        }
      }
    };
    
    await axios.post(`${TEST_CONFIG.API_URL}/admin/config/oauth`, oauthConfig, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-admin-token'}`,
        'X-Test-Environment': 'true'
      }
    });
    
    // Configure mock email service
    const emailConfig = {
      provider: 'mock',
      mockMode: true,
      captureEmails: true,
      emailCaptureDir: path.join(TEST_CONFIG.TEST_DATA_DIR, 'emails')
    };
    
    await axios.post(`${TEST_CONFIG.API_URL}/admin/config/email`, emailConfig, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-admin-token'}`,
        'X-Test-Environment': 'true'
      }
    });
    
    // Configure mock SMS service for 2FA testing
    const smsConfig = {
      provider: 'mock',
      mockMode: true,
      captureSMS: true,
      smsCaptureDir: path.join(TEST_CONFIG.TEST_DATA_DIR, 'sms')
    };
    
    await axios.post(`${TEST_CONFIG.API_URL}/admin/config/sms`, smsConfig, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-admin-token'}`,
        'X-Test-Environment': 'true'
      }
    });
    
    console.log('   ✅ Mock services configured successfully');
    
  } catch (error) {
    console.warn('   ⚠️ Mock service configuration failed, tests may use real services:', error);
  }
}

function generateTestImage(format: string, size: number): Buffer {
  let header: Buffer;
  
  switch (format.toUpperCase()) {
    case 'JPEG':
      header = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
      ]);
      break;
    case 'PNG':
      header = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
      ]);
      break;
    case 'WEBP':
      header = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
      ]);
      break;
    default:
      header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  }
  
  const dataSize = Math.max(size - header.length - 4, 100);
  const data = Buffer.alloc(dataSize);
  
  // Fill with realistic image-like data
  for (let i = 0; i < dataSize; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  
  const footer = format.toUpperCase() === 'JPEG' ? Buffer.from([0xFF, 0xD9]) : Buffer.alloc(2);
  
  return Buffer.concat([header, data, footer]);
}

export default globalSetup;