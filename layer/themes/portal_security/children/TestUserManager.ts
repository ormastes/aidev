/**
 * TestUserManager - Security Theme
 * Manages test user creation, lifecycle, and cleanup for system tests
 * Ensures no hardcoded credentials in tests
 */

import { crypto } from '../../infra_external-log-lib/src';
import * as bcrypt from 'bcrypt';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  hashedPassword: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  expiresAt: Date;
  sessionId?: string;
  metadata: {
    testSuite: string;
    testFile?: string;
    isTemporary: boolean;
  };
}

export type UserRole = 'admin' | 'user' | 'moderator' | 'developer' | 'viewer' | 'guest';

export interface TestUserOptions {
  role?: UserRole;
  prefix?: string;
  testSuite: string;
  testFile?: string;
  expirationMinutes?: number;
  customData?: Record<string, any>;
}

export class TestUserManager {
  private static instance: TestUserManager;
  private testUsers: Map<string, TestUser> = new Map();
  private rolePermissions: Map<UserRole, string[]> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly saltRounds = 10;
  private readonly defaultExpiration = 30; // minutes

  private constructor() {
    this.initializeRolePermissions();
    this.startCleanupInterval();
  }

  static getInstance(): TestUserManager {
    if (!TestUserManager.instance) {
      TestUserManager.instance = new TestUserManager();
    }
    return TestUserManager.instance;
  }

  /**
   * Initialize role permissions
   */
  private initializeRolePermissions(): void {
    this.rolePermissions.set('admin', ['all']);
    this.rolePermissions.set('moderator', ['read', 'write', 'delete', 'moderate']);
    this.rolePermissions.set('developer', ['read', 'write', 'debug']);
    this.rolePermissions.set('user', ['read', 'write']);
    this.rolePermissions.set('viewer', ['read']);
    this.rolePermissions.set('guest', ['read_public']);
  }

  /**
   * Create a test user with automatic cleanup
   */
  async createTestUser(options: TestUserOptions): Promise<TestUser> {
    const {
      role = 'user',
      prefix = role,
      testSuite,
      testFile,
      expirationMinutes = this.defaultExpiration
    } = options;

    // Generate unique test user credentials
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const username = `${prefix}-test-${randomSuffix}`;
    const password = this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const email = `${username}@test.local`;

    const testUser: TestUser = {
      id: `test-user-${crypto.randomBytes(8).toString('hex')}`,
      username,
      password,
      hashedPassword,
      email,
      role,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
      metadata: {
        testSuite,
        testFile,
        isTemporary: true
      }
    };

    // Store user
    this.testUsers.set(testUser.id, testUser);

    // Schedule cleanup
    this.scheduleCleanup(testUser.id, expirationMinutes * 60 * 1000);

    console.log(`✅ Created test user: ${username} with role: ${role} for suite: ${testSuite}`);

    return testUser;
  }

  /**
   * Create multiple test users for different roles
   */
  async createTestUsersForRoles(
    roles: UserRole[],
    options: Omit<TestUserOptions, 'role'>
  ): Promise<Map<UserRole, TestUser>> {
    const users = new Map<UserRole, TestUser>();

    for (const role of roles) {
      const user = await this.createTestUser({ ...options, role });
      users.set(role, user);
    }

    return users;
  }

  /**
   * Generate secure password
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'A'; // Uppercase
    password += 'a'; // Lowercase
    password += '1'; // Number
    password += '!'; // Special

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
  }

  /**
   * Get test user by ID
   */
  getTestUser(userId: string): TestUser | undefined {
    return this.testUsers.get(userId);
  }

  /**
   * Get test user by username
   */
  getTestUserByUsername(username: string): TestUser | undefined {
    return Array.from(this.testUsers.values()).find(
      user => user.username === username
    );
  }

  /**
   * Get all test users for a test suite
   */
  getTestUsersForSuite(testSuite: string): TestUser[] {
    return Array.from(this.testUsers.values()).filter(
      user => user.metadata.testSuite === testSuite
    );
  }

  /**
   * Update test user session
   */
  updateUserSession(userId: string, sessionId: string): void {
    const user = this.testUsers.get(userId);
    if (user) {
      user.sessionId = sessionId;
    }
  }

  /**
   * Validate if username follows test pattern
   */
  isTestUser(username: string): boolean {
    return /^[\w]+-test-[a-f0-9]{8}$/.test(username);
  }

  /**
   * Cleanup test user
   */
  async cleanupTestUser(userId: string): Promise<void> {
    const user = this.testUsers.get(userId);
    if (!user) return;

    // Cancel cleanup timer
    const timer = this.cleanupTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(userId);
    }

    // Remove user
    this.testUsers.delete(userId);
    
    console.log(`🧹 Cleaned up test user: ${user.username}`);
  }

  /**
   * Cleanup all test users for a suite
   */
  async cleanupTestSuite(testSuite: string): Promise<void> {
    const users = this.getTestUsersForSuite(testSuite);
    
    for (const user of users) {
      await this.cleanupTestUser(user.id);
    }

    console.log(`🧹 Cleaned up ${users.length} test users for suite: ${testSuite}`);
  }

  /**
   * Cleanup all expired test users
   */
  async cleanupExpiredUsers(): Promise<void> {
    const now = new Date();
    const expiredUsers: string[] = [];

    for (const [userId, user] of this.testUsers) {
      if (user.expiresAt <= now) {
        expiredUsers.push(userId);
      }
    }

    for (const userId of expiredUsers) {
      await this.cleanupTestUser(userId);
    }

    if (expiredUsers.length > 0) {
      console.log(`🧹 Cleaned up ${expiredUsers.length} expired test users`);
    }
  }

  /**
   * Schedule cleanup for a user
   */
  private scheduleCleanup(userId: string, delay: number): void {
    const timer = setTimeout(() => {
      this.cleanupTestUser(userId);
    }, delay);

    this.cleanupTimers.set(userId, timer);
  }

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanupExpiredUsers();
    }, 5 * 60 * 1000);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUsers: number;
    byRole: Record<UserRole, number>;
    bySuite: Record<string, number>;
    expired: number;
    active: number;
  } {
    const now = new Date();
    const stats = {
      totalUsers: this.testUsers.size,
      byRole: {} as Record<UserRole, number>,
      bySuite: {} as Record<string, number>,
      expired: 0,
      active: 0
    };

    for (const user of this.testUsers.values()) {
      // By role
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;

      // By suite
      const suite = user.metadata.testSuite;
      stats.bySuite[suite] = (stats.bySuite[suite] || 0) + 1;

      // Expired vs active
      if (user.expiresAt <= now) {
        stats.expired++;
      } else {
        stats.active++;
      }
    }

    return stats;
  }

  /**
   * Export test user data (for debugging)
   */
  exportTestUsers(): Array<{
    username: string;
    role: UserRole;
    testSuite: string;
    createdAt: Date;
    expiresAt: Date;
  }> {
    return Array.from(this.testUsers.values()).map(user => ({
      username: user.username,
      role: user.role,
      testSuite: user.metadata.testSuite,
      createdAt: user.createdAt,
      expiresAt: user.expiresAt
    }));
  }

  /**
   * Clear all test users (use with caution)
   */
  async clearAllTestUsers(): Promise<void> {
    const userIds = Array.from(this.testUsers.keys());
    
    for (const userId of userIds) {
      await this.cleanupTestUser(userId);
    }

    console.log(`🧹 Cleared all ${userIds.length} test users`);
  }
}

// Export singleton instance
export const testUserManager = TestUserManager.getInstance();