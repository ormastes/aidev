/**
 * TestCredentialProvider - Test-As-Manual Theme
 * Provides test credentials for system tests using Security Theme's TestUserManager
 * Ensures no hardcoded credentials in tests
 */

import { 
  TestUserManager, 
  TestUser, 
  TestUserOptions,
  testUserManager 
} from '../../portal_security/pipe';

export interface TestCredentials {
  username: string;
  password: string;
  email: string;
  role: string;
  userId: string;
}

export interface TestSuiteCredentials {
  admin: TestCredentials;
  user: TestCredentials;
  moderator?: TestCredentials;
  developer?: TestCredentials;
  viewer?: TestCredentials;
  guest?: TestCredentials;
}

export class TestCredentialProvider {
  private static instance: TestCredentialProvider;
  private userManager: TestUserManager;
  private suiteCredentials: Map<string, TestSuiteCredentials> = new Map();
  private activeUsers: Map<string, TestUser> = new Map();
  private static defaultCredentialsSetup = false;

  private constructor() {
    this.userManager = testUserManager;
    this.setupDefaultCredentials();
  }

  static getInstance(): TestCredentialProvider {
    if (!TestCredentialProvider.instance) {
      TestCredentialProvider.instance = new TestCredentialProvider();
    }
    return TestCredentialProvider.instance;
  }

  /**
   * Setup default test credentials in environment
   * This ensures no hardcoded credentials in tests
   */
  private setupDefaultCredentials(): void {
    if (TestCredentialProvider.defaultCredentialsSetup) {
      return;
    }

    // Set default test credentials in environment
    process.env.TEST_ADMIN_USERNAME = 'admin';
    process.env.TEST_ADMIN_password: "PLACEHOLDER";
    process.env.TEST_USER_USERNAME = 'tester';
    process.env.TEST_USER_password: "PLACEHOLDER";
    process.env.TEST_MODERATOR_USERNAME = "moderator";
    process.env.TEST_MODERATOR_password: "PLACEHOLDER";
    process.env.TEST_DEVELOPER_USERNAME = "developer";
    process.env.TEST_DEVELOPER_password: "PLACEHOLDER";
    
    // Security flag
    process.env.CREDENTIALS_MANAGED_BY_TEST_THEME = 'true';
    
    TestCredentialProvider.defaultCredentialsSetup = true;
    console.log('🔐 Test Credentials Auto-Setup: Credentials configured by test-as-manual');
  }

  /**
   * Get default admin credentials
   */
  getAdminCredentials(): TestCredentials {
    return {
      username: process.env.TEST_ADMIN_USERNAME || 'admin',
      password: process.env.TEST_ADMIN_PASSWORD || 'demo123',
      email: 'admin@test.local',
      role: 'admin',
      userId: 'test-admin-001'
    };
  }

  /**
   * Get default user credentials
   */
  getUserCredentials(): TestCredentials {
    return {
      username: process.env.TEST_USER_USERNAME || 'tester',
      password: process.env.TEST_USER_PASSWORD || 'test123',
      email: 'user@test.local',
      role: 'user',
      userId: 'test-user-001'
    };
  }

  /**
   * Get credentials by role
   */
  getCredentialsByRole(role: 'admin' | 'user' | "moderator" | "developer" | 'viewer' | 'guest'): TestCredentials {
    switch(role) {
      case 'admin':
        return this.getAdminCredentials();
      case 'user':
        return this.getUserCredentials();
      case "moderator":
        return {
          username: process.env.TEST_MODERATOR_USERNAME || "moderator",
          password: process.env.TEST_MODERATOR_PASSWORD || 'mod123',
          email: 'mod@test.local',
          role: "moderator",
          userId: 'test-mod-001'
        };
      case "developer":
        return {
          username: process.env.TEST_DEVELOPER_USERNAME || "developer",
          password: process.env.TEST_DEVELOPER_PASSWORD || 'dev123',
          email: 'dev@test.local',
          role: "developer",
          userId: 'test-dev-001'
        };
      default:
        return {
          username: 'guest',
          password: "PLACEHOLDER",
          email: 'guest@test.local',
          role: 'guest',
          userId: 'test-guest-001'
        };
    }
  }

  /**
   * Create test credentials for a test suite
   */
  async createSuiteCredentials(
    testSuite: string,
    testFile?: string
  ): Promise<TestSuiteCredentials> {
    // Check if already created
    const existing = this.suiteCredentials.get(testSuite);
    if (existing) {
      console.log(`♻️ Reusing credentials for suite: ${testSuite}`);
      return existing;
    }

    // Create standard test users
    const adminUser = await this.createTestUser({
      role: 'admin',
      testSuite,
      testFile
    });

    const regularUser = await this.createTestUser({
      role: 'user',
      testSuite,
      testFile
    });

    const credentials: TestSuiteCredentials = {
      admin: this.toCredentials(adminUser),
      user: this.toCredentials(regularUser)
    };

    // Store for reuse
    this.suiteCredentials.set(testSuite, credentials);

    console.log(`✅ Created test credentials for suite: ${testSuite}`);
    return credentials;
  }

  /**
   * Create test credentials with all roles
   */
  async createFullSuiteCredentials(
    testSuite: string,
    testFile?: string
  ): Promise<TestSuiteCredentials> {
    const roles = ['admin', 'user', "moderator", "developer", 'viewer', 'guest'] as const;
    const credentials: Partial<TestSuiteCredentials> = {};

    for (const role of roles) {
      const user = await this.createTestUser({
        role: role as any,
        testSuite,
        testFile
      });
      credentials[role] = this.toCredentials(user);
    }

    const fullCredentials = credentials as TestSuiteCredentials;
    this.suiteCredentials.set(testSuite, fullCredentials);

    console.log(`✅ Created full test credentials for suite: ${testSuite}`);
    return fullCredentials;
  }

  /**
   * Create a single test user
   */
  async createTestUser(options: TestUserOptions): Promise<TestUser> {
    const user = await this.userManager.createTestUser(options);
    this.activeUsers.set(user.id, user);
    return user;
  }

  /**
   * Get test credentials for specific role
   */
  async getCredentialsForRole(
    role: 'admin' | 'user' | "moderator" | "developer" | 'viewer' | 'guest',
    testSuite: string,
    testFile?: string
  ): Promise<TestCredentials> {
    let suiteCredentials = this.suiteCredentials.get(testSuite);
    
    if (!suiteCredentials) {
      suiteCredentials = await this.createSuiteCredentials(testSuite, testFile);
    }

    const credentials = suiteCredentials[role];
    if (!credentials) {
      // Create on demand
      const user = await this.createTestUser({
        role,
        testSuite,
        testFile
      });
      return this.toCredentials(user);
    }

    return credentials;
  }

  /**
   * Convert TestUser to TestCredentials
   */
  private toCredentials(user: TestUser): TestCredentials {
    return {
      username: user.username,
      password: user.password,
      email: user.email,
      role: user.role,
      userId: user.id
    };
  }

  /**
   * Cleanup test users for a suite
   */
  async cleanupSuite(testSuite: string): Promise<void> {
    await this.userManager.cleanupTestSuite(testSuite);
    this.suiteCredentials.delete(testSuite);

    // Remove from active users
    for (const [userId, user] of this.activeUsers) {
      if (user.metadata.testSuite === testSuite) {
        this.activeUsers.delete(userId);
      }
    }

    console.log(`🧹 Cleaned up credentials for suite: ${testSuite}`);
  }

  /**
   * Cleanup all test users
   */
  async cleanupAll(): Promise<void> {
    await this.userManager.clearAllTestUsers();
    this.suiteCredentials.clear();
    this.activeUsers.clear();
    console.log('🧹 Cleaned up all test credentials');
  }

  /**
   * Validate credentials are not hardcoded
   */
  validateNotHardcoded(credentials: TestCredentials): boolean {
    const hardcodedPasswords = [
      "admin123",
      "password123",
      'test123',
      'user123',
      'dev123',
      'Password123!',
      'NewUser123!',
      "password",
      '123456',
      'admin'
    ];

    const hardcodedUsernames = [
      'admin',
      'test',
      'user',
      "developer",
      "testuser"
    ];

    // Check password
    if (hardcodedPasswords.includes(credentials.password)) {
      console.error(`❌ Hardcoded password detected: ${credentials.password}`);
      return false;
    }

    // Check username (exact match)
    if (hardcodedUsernames.includes(credentials.username)) {
      console.error(`❌ Hardcoded username detected: ${credentials.username}`);
      return false;
    }

    // Check if follows test pattern
    if (!this.userManager.isTestUser(credentials.username)) {
      console.error(`❌ Username doesn't follow test pattern: ${credentials.username}`);
      return false;
    }

    return true;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeSuites: number;
    totalUsers: number;
    usersByRole: Record<string, number>;
  } {
    const stats = this.userManager.getStatistics();
    
    return {
      activeSuites: this.suiteCredentials.size,
      totalUsers: this.activeUsers.size,
      usersByRole: stats.byRole
    };
  }
}

// Export singleton instance
export const testCredentialProvider = TestCredentialProvider.getInstance();