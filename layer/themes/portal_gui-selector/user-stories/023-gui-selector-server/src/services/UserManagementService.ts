/**
 * User Management Service
 * Handles user registration, authentication, and profile management
 */

import * as bcrypt from 'bcrypt';
import { DatabaseService } from './DatabaseService';
import { JWTService } from './JWTService';
import { ExternalLogService } from './ExternalLogService';

export enum UserRole {
  ADMIN = 'admin',
  DESIGNER = 'designer',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  notifications?: boolean;
  defaultView?: string;
  recentSelections?: string[];
}

export interface UserCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
  roles?: UserRole[];
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export class UserManagementService {
  private dbService: DatabaseService;
  private jwtService: JWTService;
  private logger: ExternalLogService;
  private saltRounds: number = 10;
  private maxLoginAttempts: number = 5;
  private lockoutDuration: number = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.dbService = new DatabaseService();
    this.jwtService = new JWTService();
    this.logger = new ExternalLogService();
  }

  /**
   * Initialize the user management service
   */
  async initialize(): Promise<void> {
    await this.dbService.init();
    await this.createUsersTable();
    await this.createDefaultAdminUser();
    this.logger.info('UserManagementService initialized');
  }

  /**
   * Create users table if not exists
   */
  private async createUsersTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        roles TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    `;

    await this.dbService.run(sql);
  }

  /**
   * Create default admin user if none exists
   */
  private async createDefaultAdminUser(): Promise<void> {
    const adminExists = await this.dbService.get(
      'SELECT id FROM users WHERE roles LIKE ?',
      ['%admin%']
    );

    if (!adminExists) {
      await this.registerUser({
        username: 'admin',
        email: 'admin@gui-selector.local',
        password: 'GuiSelector2024!',
        roles: [UserRole.ADMIN]
      });
      this.logger.info('Default admin user created');
    }
  }

  /**
   * Register a new user
   */
  async registerUser(data: RegistrationData): Promise<User> {
    // Validate input
    if (!this.validateUsername(data.username)) {
      throw new Error('Invalid username format');
    }

    if (!this.validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (!this.validatePassword(data.password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    // Check if user exists
    const existingUser = await this.dbService.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [data.username, data.email]
    );

    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.saltRounds);

    // Create user
    const userId = this.generateUserId();
    const roles = data.roles || [UserRole.VIEWER];

    await this.dbService.run(
      `INSERT INTO users (id, username, email, password_hash, roles, preferences)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.username,
        data.email,
        passwordHash,
        JSON.stringify(roles),
        JSON.stringify({})
      ]
    );

    this.logger.info(`User registered: ${data.username}`);

    return this.getUserById(userId)!;
  }

  /**
   * Authenticate user
   */
  async authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
    try {
      // Get user
      const userRow = await this.dbService.get(
        'SELECT * FROM users WHERE username = ?',
        [credentials.username]
      );

      if (!userRow) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Check if account is locked
      if (userRow.locked_until && new Date(userRow.locked_until) > new Date()) {
        return {
          success: false,
          message: 'Account is temporarily locked due to too many failed attempts'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        credentials.password,
        userRow.password_hash
      );

      if (!isValidPassword) {
        // Increment login attempts
        await this.incrementLoginAttempts(userRow.id);
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Check if user is active
      if (!userRow.is_active) {
        return {
          success: false,
          message: 'Account is disabled'
        };
      }

      // Reset login attempts and update last login
      await this.dbService.run(
        `UPDATE users 
         SET login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [userRow.id]
      );

      // Parse user data
      const user = this.parseUserRow(userRow);

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        roles: user.roles
      };

      const token = this.jwtService.generateToken(tokenPayload);
      const refreshToken = credentials.rememberMe
        ? this.jwtService.generateRefreshToken(tokenPayload)
        : undefined;

      this.logger.info(`User authenticated: ${user.username}`);

      return {
        success: true,
        user,
        token,
        refreshToken
      };
    } catch (error: any) {
      this.logger.error(`Authentication error: ${error.message}`);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const userRow = await this.dbService.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    return userRow ? this.parseUserRow(userRow) : null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const userRow = await this.dbService.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    return userRow ? this.parseUserRow(userRow) : null;
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    const rows = await this.dbService.all(
      'SELECT * FROM users ORDER BY created_at DESC'
    );

    return rows.map(row => this.parseUserRow(row));
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const rows = await this.dbService.all(
      'SELECT * FROM users WHERE roles LIKE ? AND is_active = 1',
      [`%"${role}"%`]
    );

    return rows.map(row => this.parseUserRow(row));
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const allowedFields = ['email', 'preferences'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const field of allowedFields) {
      if (updates[field as keyof User] !== undefined) {
        updateFields.push(`${field} = ?`);
        const value = field === 'preferences' 
          ? JSON.stringify(updates[field as keyof User])
          : updates[field as keyof User];
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(userId);

    await this.dbService.run(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    this.logger.info(`User profile updated: ${userId}`);

    return (await this.getUserById(userId))!;
  }

  /**
   * Update user roles (admin only)
   */
  async updateUserRoles(userId: string, roles: UserRole[]): Promise<User> {
    await this.dbService.run(
      'UPDATE users SET roles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(roles), userId]
    );

    this.logger.info(`User roles updated: ${userId}`);

    return (await this.getUserById(userId))!;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const userRow = await this.dbService.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!userRow) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, userRow.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    // Validate new password
    if (!this.validatePassword(newPassword)) {
      throw new Error('New password does not meet requirements');
    }

    // Hash and update password
    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);
    
    await this.dbService.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );

    this.logger.info(`Password changed for user: ${userId}`);

    return true;
  }

  /**
   * Reset user password (admin only)
   */
  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    if (!this.validatePassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    
    await this.dbService.run(
      'UPDATE users SET password_hash = ?, login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );

    this.logger.info(`Password reset for user: ${userId}`);

    return true;
  }

  /**
   * Activate/deactivate user (admin only)
   */
  async setUserActive(userId: string, isActive: boolean): Promise<User> {
    await this.dbService.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, userId]
    );

    this.logger.info(`User ${isActive ? 'activated' : 'deactivated'}: ${userId}`);

    return (await this.getUserById(userId))!;
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string): Promise<boolean> {
    // Check if user is not the last admin
    const user = await this.getUserById(userId);
    if (user?.roles.includes(UserRole.ADMIN)) {
      const adminCount = await this.dbService.get(
        'SELECT COUNT(*) as count FROM users WHERE roles LIKE ? AND id != ?',
        ['%admin%', userId]
      );
      
      if (adminCount.count === 0) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    await this.dbService.run('DELETE FROM users WHERE id = ?', [userId]);
    
    this.logger.info(`User deleted: ${userId}`);

    return true;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedPreferences = {
      ...user.preferences,
      ...preferences
    };

    await this.dbService.run(
      'UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(updatedPreferences), userId]
    );

    return (await this.getUserById(userId))!;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    recentRegistrations: number;
  }> {
    const total = await this.dbService.get('SELECT COUNT(*) as count FROM users');
    const active = await this.dbService.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const recent = await this.dbService.get(
      'SELECT COUNT(*) as count FROM users WHERE created_at > datetime("now", "-7 days")'
    );

    const usersByRole: Record<string, number> = {};
    for (const role of Object.values(UserRole)) {
      const count = await this.dbService.get(
        'SELECT COUNT(*) as count FROM users WHERE roles LIKE ?',
        [`%"${role}"%`]
      );
      usersByRole[role] = count.count;
    }

    return {
      totalUsers: total.count,
      activeUsers: active.count,
      usersByRole,
      recentRegistrations: recent.count
    };
  }

  /**
   * Helper: Increment login attempts
   */
  private async incrementLoginAttempts(userId: string): Promise<void> {
    const userRow = await this.dbService.get(
      'SELECT login_attempts FROM users WHERE id = ?',
      [userId]
    );

    const attempts = (userRow.login_attempts || 0) + 1;

    if (attempts >= this.maxLoginAttempts) {
      const lockedUntil = new Date(Date.now() + this.lockoutDuration);
      await this.dbService.run(
        'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
        [attempts, lockedUntil.toISOString(), userId]
      );
      this.logger.warn(`Account locked due to failed attempts: ${userId}`);
    } else {
      await this.dbService.run(
        'UPDATE users SET login_attempts = ? WHERE id = ?',
        [attempts, userId]
      );
    }
  }

  /**
   * Helper: Parse database row to User object
   */
  private parseUserRow(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      roles: JSON.parse(row.roles),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      isActive: row.is_active === 1,
      preferences: row.preferences ? JSON.parse(row.preferences) : {}
    };
  }

  /**
   * Helper: Generate unique user ID
   */
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Validate username
   */
  private validateUsername(username: string): boolean {
    return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
  }

  /**
   * Helper: Validate email
   */
  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Helper: Validate password strength
   */
  private validatePassword(password: string): boolean {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
  }
}