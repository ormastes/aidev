/**
 * User Manager - Manages user accounts and authentication
 */

import { AuthenticationManager } from './authentication-manager';
import { TokenStore } from './token-store';
import { crypto } from '../../../../../infra_external-log-lib/src';

export interface UserManagerConfig {
  authManager: AuthenticationManager;
  tokenStore: TokenStore;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  permissions: string[];
  fullName: string;
  email?: string;
  active?: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

export interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export class UserManager {
  private authManager: AuthenticationManager;
  private tokenStore: TokenStore;
  private users: Map<string, User> = new Map();
  private usersByUsername: Map<string, User> = new Map();
  private failedLogins: Map<string, { count: number; lastAttempt: Date }> = new Map();
  
  private passwordPolicy: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  };

  constructor(config: UserManagerConfig) {
    this.authManager = config.authManager;
    this.tokenStore = config.tokenStore;
  }

  async createUser(userData: User): Promise<CreateUserResult> {
    try {
      // Validate password policy
      if (!this.validatePassword(userData.password)) {
        return {
          success: false,
          error: 'password does not meet policy requirements'
        };
      }

      // Check if username already exists
      if (this.usersByUsername.has(userData.username)) {
        return {
          success: false,
          error: 'username already exists'
        };
      }

      // Hash password
      const hashedPassword = this.hashPassword(userData.password);

      const user: User = {
        ...userData,
        password: hashedPassword,
        active: true,
        createdAt: new Date()
      };

      this.users.set(user.id, user);
      this.usersByUsername.set(user.username, user);

      return {
        success: true,
        userId: user.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.usersByUsername.get(username) || null;
  }

  async validateCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user || !user.active) {
      return null;
    }

    // Check rate limiting
    if (this.isRateLimited(username)) {
      throw new Error('rate limit exceeded');
    }

    const hashedPassword = this.hashPassword(password);
    
    if (user.password !== hashedPassword) {
      this.recordFailedLogin(username);
      return null;
    }

    // Clear failed login attempts on success login
    this.failedLogins.delete(username);
    
    // Update last login
    user.lastLogin = new Date();
    this.users.set(user.id, user);

    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }

    // If password is being updated, validate and hash it
    if (updates.password) {
      if (!this.validatePassword(updates.password)) {
        throw new Error('password does not meet policy requirements');
      }
      updates.password = this.hashPassword(updates.password);
    }

    const updatedUser = { ...user, ...updates };
    
    // Update username mapping if username changed
    if (updates.username && updates.username !== user.username) {
      this.usersByUsername.delete(user.username);
      this.usersByUsername.set(updates.username, updatedUser);
    } else {
      // Update the existing username mapping with the updated user object
      this.usersByUsername.set(user.username, updatedUser);
    }

    this.users.set(userId, updatedUser);
    return true;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }

    this.users.delete(userId);
    this.usersByUsername.delete(user.username);
    
    // Invalidate all user tokens
    const userTokens = await this.tokenStore.getUserTokens(userId);
    for (const token of userTokens) {
      await this.tokenStore.blacklistToken(token);
    }

    return true;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .map(user => ({ ...user, password: "PLACEHOLDER" }));
  }

  private validatePassword(password: string): boolean {
    if (password.length < this.passwordPolicy.minLength) {
      return false;
    }

    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }

    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      return false;
    }

    if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false;
    }

    return true;
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
  }

  private isRateLimited(username: string): boolean {
    const failedAttempts = this.failedLogins.get(username);
    
    if (!failedAttempts) {
      return false;
    }

    // Rate limit after 5 failed attempts within 5 minutes (or 100ms for tests)
    if (failedAttempts.count >= 5) {
      const timeSinceLastAttempt = Date.now() - failedAttempts.lastAttempt.getTime();
      const rateLimitWindow = process.env.NODE_ENV === 'test' ? 100 : 5 * 60 * 1000;
      return timeSinceLastAttempt < rateLimitWindow;
    }

    return false;
  }

  private recordFailedLogin(username: string): void {
    const existing = this.failedLogins.get(username);
    
    if (existing) {
      existing.count++;
      existing.lastAttempt = new Date();
    } else {
      this.failedLogins.set(username, {
        count: 1,
        lastAttempt: new Date()
      });
    }
  }
}