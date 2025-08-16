/**
 * Enhanced User Manager - Manages user accounts and authentication with advanced security
 */

import { AuthenticationManager } from './authentication-manager';
import { TokenStore } from './token-store';
import { SecurityManager } from './security-manager';
import * as bcrypt from 'bcrypt';
import { crypto } from '../../../../../infra_external-log-lib/src';

export interface UserManagerConfig {
  authManager: AuthenticationManager;
  tokenStore: TokenStore;
  securityManager?: SecurityManager;
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
  mfaEnabled?: boolean;
  passwordExpiry?: Date;
  mustChangePassword?: boolean;
  groups?: string[];
  apiKeys?: ApiKey[];
  serviceAccount?: boolean;
  profileData?: {
    avatar?: string;
    timezone?: string;
    language?: string;
    preferences?: Record<string, any>;
  };
}

export interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number; // in days
  preventReuse?: number; // number of previous passwords to check
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  scopes?: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  active: boolean;
  ipWhitelist?: string[];
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  members: string[]; // user IDs
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface TemporaryPassword {
  userId: string;
  password: string;
  expiresAt: Date;
  mustChange: boolean;
  createdAt: Date;
}

export class EnhancedUserManager {
  private authManager: AuthenticationManager;
  private tokenStore: TokenStore;
  private securityManager?: SecurityManager;
  private users: Map<string, User> = new Map();
  private usersByUsername: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private userGroups: Map<string, UserGroup> = new Map();
  private passwordResetTokens: Map<string, PasswordResetToken> = new Map();
  private temporaryPasswords: Map<string, TemporaryPassword> = new Map();
  private failedLogins: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private static readonly BCRYPT_ROUNDS = 12;
  
  private passwordPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90 days
    preventReuse: 5 // Last 5 passwords
  };

  constructor(config: UserManagerConfig) {
    this.authManager = config.authManager;
    this.tokenStore = config.tokenStore;
    this.securityManager = config.securityManager;
    
    // Cleanup expired tokens and passwords periodically
    setInterval(() => this.cleanupExpired(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Create a new user with enhanced validation
   */
  async createUser(userData: User): Promise<CreateUserResult> {
    try {
      // Validate password using security manager if available
      if (this.securityManager) {
        const validation = await this.securityManager.validatePassword(userData.password, {
          username: userData.username,
          email: userData.email,
          fullName: userData.fullName
        });
        
        if (!validation.valid) {
          return {
            success: false,
            error: `Password validation failed: ${validation.feedback.join(', ')}`
          };
        }
      } else if (!this.validatePassword(userData.password)) {
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

      // Check if email already exists
      if (userData.email && this.usersByEmail.has(userData.email)) {
        return {
          success: false,
          error: 'email already exists'
        };
      }

      // Hash password with bcrypt
      const hashedPassword = await this.hashPassword(userData.password);

      const user: User = {
        ...userData,
        password: hashedPassword,
        active: true,
        createdAt: new Date(),
        mfaEnabled: false,
        groups: userData.groups || [],
        apiKeys: [],
        passwordExpiry: this.passwordPolicy.maxAge ? 
          new Date(Date.now() + this.passwordPolicy.maxAge * 24 * 60 * 60 * 1000) : undefined
      };

      this.users.set(user.id, user);
      this.usersByUsername.set(user.username, user);
      if (user.email) {
        this.usersByEmail.set(user.email, user);
      }

      // Update password history if security manager is available
      if (this.securityManager) {
        await this.securityManager.updatePasswordHistory(user.id, hashedPassword);
      }

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

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return this.usersByUsername.get(username) || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email) || null;
  }

  /**
   * Validate credentials with enhanced security
   */
  async validateCredentials(username: string, password: string, ip?: string, userAgent?: string): Promise<User | null> {
    const user = await this.getUserByUsername(username) || await this.getUserByEmail(username);
    
    if (!user || !user.active) {
      return null;
    }

    // Check if account is locked via security manager
    if (this.securityManager && user.id) {
      const lockStatus = await this.securityManager.isAccountLocked(user.id);
      if (lockStatus.locked) {
        throw new Error(`account locked until ${lockStatus.unlockTime?.toISOString()}`);
      }
    }

    // Check rate limiting
    if (this.isRateLimited(username)) {
      throw new Error('rate limit exceeded');
    }

    // Check for temporary password
    const tempPassword = this.temporaryPasswords.get(user.id);
    if (tempPassword && tempPassword.expiresAt > new Date()) {
      const isTempValid = await bcrypt.compare(password, tempPassword.password);
      if (isTempValid) {
        user.mustChangePassword = true;
        return user;
      }
    }

    // Check password expiry
    if (user.passwordExpiry && user.passwordExpiry < new Date()) {
      user.mustChangePassword = true;
    }

    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      this.recordFailedLogin(username);
      
      // Notify security manager of failed login
      if (this.securityManager && ip && userAgent) {
        await this.securityManager.handleFailedLogin(user.id, ip, userAgent);
      }
      
      return null;
    }

    // Clear failed login attempts on successful login
    this.failedLogins.delete(username);
    
    // Notify security manager of successful login
    if (this.securityManager && ip && userAgent) {
      await this.securityManager.handleSuccessfulLogin(user.id, ip, userAgent);
    }
    
    // Update last login
    user.lastLogin = new Date();
    this.users.set(user.id, user);

    return user;
  }

  /**
   * Update user with enhanced validation
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }

    // If password is being updated, validate and hash it
    if (updates.password) {
      // Validate password using security manager if available
      if (this.securityManager) {
        const validation = await this.securityManager.validatePassword(updates.password, {
          username: updates.username || user.username,
          email: updates.email || user.email,
          fullName: updates.fullName || user.fullName
        });
        
        if (!validation.valid) {
          throw new Error(`Password validation failed: ${validation.feedback.join(', ')}`);
        }
        
        // Check password history
        const newPasswordHash = await this.hashPassword(updates.password);
        const isReused = !(await this.securityManager.checkPasswordHistory(userId, newPasswordHash));
        
        if (isReused) {
          throw new Error('Password has been used recently and cannot be reused');
        }
        
        updates.password = newPasswordHash;
        updates.passwordExpiry = this.passwordPolicy.maxAge ? 
          new Date(Date.now() + this.passwordPolicy.maxAge * 24 * 60 * 60 * 1000) : undefined;
        updates.mustChangePassword = false;
        
        // Update password history
        await this.securityManager.updatePasswordHistory(userId, newPasswordHash);
      } else {
        if (!this.validatePassword(updates.password)) {
          throw new Error('password does not meet policy requirements');
        }
        updates.password = await this.hashPassword(updates.password);
      }
    }

    const updatedUser = { ...user, ...updates };
    
    // Update username mapping if username changed
    if (updates.username && updates.username !== user.username) {
      this.usersByUsername.delete(user.username);
      this.usersByUsername.set(updates.username, updatedUser);
    } else {
      this.usersByUsername.set(user.username, updatedUser);
    }

    // Update email mapping if email changed
    if (updates.email !== undefined) {
      if (user.email) {
        this.usersByEmail.delete(user.email);
      }
      if (updates.email) {
        this.usersByEmail.set(updates.email, updatedUser);
      }
    }

    this.users.set(userId, updatedUser);
    return true;
  }

  /**
   * Delete user and cleanup all associated data
   */
  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }

    this.users.delete(userId);
    this.usersByUsername.delete(user.username);
    if (user.email) {
      this.usersByEmail.delete(user.email);
    }
    
    // Remove from all groups
    for (const [groupId, group] of this.userGroups.entries()) {
      if (group.members.includes(userId)) {
        group.members = group.members.filter(id => id !== userId);
        this.userGroups.set(groupId, group);
      }
    }
    
    // Invalidate all user tokens
    const userTokens = await this.tokenStore.getUserTokens(userId);
    for (const token of userTokens) {
      await this.tokenStore.blacklistToken(token);
    }

    return true;
  }

  /**
   * List users with optional filtering
   */
  async listUsers(filters?: {
    active?: boolean;
    role?: string;
    group?: string;
    serviceAccount?: boolean;
  }): Promise<User[]> {
    let users = Array.from(this.users.values());

    if (filters) {
      if (filters.active !== undefined) {
        users = users.filter(user => user.active === filters.active);
      }
      if (filters.role) {
        users = users.filter(user => user.role === filters.role);
      }
      if (filters.group) {
        users = users.filter(user => user.groups?.includes(filters.group!));
      }
      if (filters.serviceAccount !== undefined) {
        users = users.filter(user => user.serviceAccount === filters.serviceAccount);
      }
    }

    return users.map(user => ({ ...user, password: "PLACEHOLDER" }));
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists or not
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const resetToken: PasswordResetToken = {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      used: false,
      createdAt: new Date()
    };

    this.passwordResetTokens.set(token, resetToken);

    return {
      success: true,
      token
    };
  }

  /**
   * Reset password using token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const resetToken = this.passwordResetTokens.get(token);
    
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      };
    }

    const user = this.users.get(resetToken.userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Validate new password
    if (this.securityManager) {
      const validation = await this.securityManager.validatePassword(newPassword, {
        username: user.username,
        email: user.email,
        fullName: user.fullName
      });
      
      if (!validation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${validation.feedback.join(', ')}`
        };
      }
    }

    try {
      await this.updateUser(resetToken.userId, { 
        password: newPassword,
        mustChangePassword: false 
      });

      // Mark token as used
      resetToken.used = true;
      this.passwordResetTokens.set(token, resetToken);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create temporary password
   */
  async createTemporaryPassword(userId: string): Promise<{ success: boolean; password?: string; error?: string }> {
    const user = this.users.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const tempPassword = crypto.randomBytes(12).toString('base64');
    const hashedTempPassword = await this.hashPassword(tempPassword);

    const temporaryPassword: TemporaryPassword = {
      userId,
      password: hashedTempPassword,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      mustChange: true,
      createdAt: new Date()
    };

    this.temporaryPasswords.set(userId, temporaryPassword);

    return {
      success: true,
      password: tempPassword
    };
  }

  /**
   * Create a new user group
   */
  async createGroup(groupData: Omit<UserGroup, 'id' | "createdAt">): Promise<{ success: boolean; groupId?: string; error?: string }> {
    const groupId = crypto.randomUUID();
    const group: UserGroup = {
      ...groupData,
      id: groupId,
      createdAt: new Date()
    };

    this.userGroups.set(groupId, group);
    
    return {
      success: true,
      groupId
    };
  }

  /**
   * Add user to group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<boolean> {
    const user = this.users.get(userId);
    const group = this.userGroups.get(groupId);
    
    if (!user || !group) {
      return false;
    }

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      group.updatedAt = new Date();
      this.userGroups.set(groupId, group);
    }

    if (!user.groups!.includes(groupId)) {
      user.groups!.push(groupId);
      this.users.set(userId, user);
    }

    return true;
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<boolean> {
    const user = this.users.get(userId);
    const group = this.userGroups.get(groupId);
    
    if (!user || !group) {
      return false;
    }

    group.members = group.members.filter(id => id !== userId);
    group.updatedAt = new Date();
    this.userGroups.set(groupId, group);

    user.groups = user.groups!.filter(id => id !== groupId);
    this.users.set(userId, user);

    return true;
  }

  /**
   * Create API key for user
   */
  async createApiKey(userId: string, keyData: { 
    name: string; 
    permissions: string[]; 
    scopes?: string[];
    expiresAt?: Date;
    ipWhitelist?: string[];
  }): Promise<{ success: boolean; apiKey?: string; error?: string }> {
    const user = this.users.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const apiKeyId = crypto.randomUUID();
    const apiKeyValue = crypto.randomBytes(32).toString('hex');
    
    const apiKey: ApiKey = {
      id: apiKeyId,
      name: keyData.name,
      key: apiKeyValue,
      permissions: keyData.permissions,
      scopes: keyData.scopes,
      createdAt: new Date(),
      expiresAt: keyData.expiresAt,
      active: true,
      ipWhitelist: keyData.ipWhitelist
    };

    if (!user.apiKeys) {
      user.apiKeys = [];
    }
    
    user.apiKeys.push(apiKey);
    this.users.set(userId, user);

    return {
      success: true,
      apiKey: apiKeyValue
    };
  }

  /**
   * Validate API key with IP and scope checking
   */
  async validateApiKey(apiKey: string, ip?: string, requiredScope?: string): Promise<{ 
    valid: boolean; 
    userId?: string; 
    permissions?: string[]; 
    scopes?: string[];
    error?: string 
  }> {
    for (const [userId, user] of this.users.entries()) {
      if (!user.apiKeys) continue;
      
      const keyData = user.apiKeys.find(k => k.key === apiKey && k.active);
      if (keyData) {
        // Check expiry
        if (keyData.expiresAt && keyData.expiresAt < new Date()) {
          return {
            valid: false,
            error: 'API key expired'
          };
        }

        // Check IP whitelist
        if (ip && keyData.ipWhitelist && keyData.ipWhitelist.length > 0) {
          if (!keyData.ipWhitelist.includes(ip)) {
            return {
              valid: false,
              error: 'IP address not whitelisted for this API key'
            };
          }
        }

        // Check scope
        if (requiredScope && keyData.scopes && keyData.scopes.length > 0) {
          if (!keyData.scopes.includes(requiredScope)) {
            return {
              valid: false,
              error: 'Insufficient scope for this operation'
            };
          }
        }
        
        // Update last used
        keyData.lastUsed = new Date();
        this.users.set(userId, user);
        
        return {
          valid: true,
          userId,
          permissions: keyData.permissions,
          scopes: keyData.scopes
        };
      }
    }
    
    return {
      valid: false,
      error: 'Invalid API key'
    };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, apiKeyId: string): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user || !user.apiKeys) {
      return false;
    }

    const keyIndex = user.apiKeys.findIndex(k => k.id === apiKeyId);
    if (keyIndex >= 0) {
      user.apiKeys[keyIndex].active = false;
      this.users.set(userId, user);
      return true;
    }

    return false;
  }

  /**
   * Get user permissions (including group permissions)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = this.users.get(userId);
    
    if (!user) {
      return [];
    }

    const permissions = new Set(user.permissions);
    
    // Add group permissions
    if (user.groups) {
      for (const groupId of user.groups) {
        const group = this.userGroups.get(groupId);
        if (group) {
          group.permissions.forEach(permission => permissions.add(permission));
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission) || userPermissions.includes('*');
  }

  /**
   * Create service account
   */
  async createServiceAccount(serviceData: {
    name: string;
    permissions: string[];
    description?: string;
  }): Promise<CreateUserResult> {
    const serviceAccountData: User = {
      id: crypto.randomUUID(),
      username: `service_${serviceData.name.toLowerCase().replace(/\s+/g, '_')}`,
      password: crypto.randomBytes(32).toString('hex'), // Random password (not used)
      role: 'service',
      permissions: serviceData.permissions,
      fullName: serviceData.name,
      serviceAccount: true,
      active: true
    };

    return this.createUser(serviceAccountData);
  }

  /**
   * Hash password with bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, EnhancedUserManager.BCRYPT_ROUNDS);
  }

  /**
   * Validate password against policy (fallback when security manager not available)
   */
  private validatePassword(password: string): boolean {
    if (password.length < this.passwordPolicy.minLength) {
      return false;
    }

    if (password.length > this.passwordPolicy.maxLength) {
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

  /**
   * Check rate limiting (fallback when security manager not available)
   */
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

  /**
   * Record failed login attempt
   */
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

  /**
   * Cleanup expired tokens and passwords
   */
  private cleanupExpired(): void {
    const now = new Date();

    // Cleanup expired password reset tokens
    for (const [token, resetData] of this.passwordResetTokens.entries()) {
      if (resetData.expiresAt < now || resetData.used) {
        this.passwordResetTokens.delete(token);
      }
    }

    // Cleanup expired temporary passwords
    for (const [userId, tempData] of this.temporaryPasswords.entries()) {
      if (tempData.expiresAt < now) {
        this.temporaryPasswords.delete(userId);
      }
    }
  }
}