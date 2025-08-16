/**
 * Authentication Service implementation
 */

import { createHash, randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  IAuthService,
  Credentials,
  AuthResult,
  TokenInfo,
  User
} from '../../xlib/interfaces/infrastructure.interfaces';

interface StoredUser extends User {
  passwordHash?: string;
  apiKeys?: string[];
}

interface StoredToken {
  token: string;
  userId: string;
  expiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export class AuthService implements IAuthService {
  private users: Map<string, StoredUser>;
  private tokens: Map<string, StoredToken>;
  private refreshTokens: Map<string, StoredToken>;
  private readonly tokenExpiry: number = 3600 * 1000; // 1 hour
  private readonly refreshTokenExpiry: number = 7 * 24 * 3600 * 1000; // 7 days

  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.refreshTokens = new Map();

    // Initialize with default admin user
    this.initializeDefaultUsers();
  }

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    let user: StoredUser | null = null;

    switch (credentials.type) {
      case "password":
        if (!credentials.username || !credentials.password) {
          throw new Error('Username and password required');
        }
        user = await this.authenticatePassword(credentials.username, credentials.password);
        break;

      case 'apiKey':
        if (!credentials.apiKey) {
          throw new Error('API key required');
        }
        user = await this.authenticateApiKey(credentials.apiKey);
        break;

      case 'oauth':
        throw new Error('OAuth authentication not implemented');

      default:
        throw new Error('Invalid authentication type');
    }

    if (!user) {
      throw new Error('Authentication failed');
    }

    // Generate tokens
    const token = this.generateToken();
    const refreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + this.tokenExpiry);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const storedToken: StoredToken = {
      token,
      userId: user.id,
      expiresAt,
      refreshToken,
      refreshExpiresAt
    };

    this.tokens.set(token, storedToken);
    this.refreshTokens.set(refreshToken, storedToken);

    // Remove sensitive data
    const { passwordHash, apiKeys, ...publicUser } = user;

    return {
      token,
      refreshToken,
      expiresIn: this.tokenExpiry / 1000, // Convert to seconds
      user: publicUser
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const storedToken = this.refreshTokens.get(refreshToken);
    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    if (storedToken.refreshExpiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token expired');
    }

    const user = this.users.get(storedToken.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove old tokens
    this.tokens.delete(storedToken.token);
    this.refreshTokens.delete(refreshToken);

    // Generate new tokens
    const newToken = this.generateToken();
    const newRefreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + this.tokenExpiry);
    const refreshExpiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const newStoredToken: StoredToken = {
      token: newToken,
      userId: user.id,
      expiresAt,
      refreshToken: newRefreshToken,
      refreshExpiresAt
    };

    this.tokens.set(newToken, newStoredToken);
    this.refreshTokens.set(newRefreshToken, newStoredToken);

    // Remove sensitive data
    const { passwordHash, apiKeys, ...publicUser } = user;

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: this.tokenExpiry / 1000,
      user: publicUser
    };
  }

  async logout(token: string): Promise<void> {
    const storedToken = this.tokens.get(token);
    if (storedToken) {
      this.tokens.delete(token);
      this.refreshTokens.delete(storedToken.refreshToken);
    }
  }

  async validateToken(token: string): Promise<TokenInfo> {
    const storedToken = this.tokens.get(token);
    if (!storedToken) {
      return {
        valid: false,
        expiresAt: new Date(0),
        user: this.getAnonymousUser(),
        permissions: []
      };
    }

    if (storedToken.expiresAt < new Date()) {
      this.tokens.delete(token);
      return {
        valid: false,
        expiresAt: storedToken.expiresAt,
        user: this.getAnonymousUser(),
        permissions: []
      };
    }

    const user = this.users.get(storedToken.userId);
    if (!user) {
      return {
        valid: false,
        expiresAt: storedToken.expiresAt,
        user: this.getAnonymousUser(),
        permissions: []
      };
    }

    const { passwordHash, apiKeys, ...publicUser } = user;

    return {
      valid: true,
      expiresAt: storedToken.expiresAt,
      user: publicUser,
      permissions: user.permissions
    };
  }

  async hasPermission(token: string, permission: string): Promise<boolean> {
    const tokenInfo = await this.validateToken(token);
    if (!tokenInfo.valid) return false;

    return tokenInfo.permissions.includes(permission) || 
           tokenInfo.permissions.includes('*'); // Wildcard permission
  }

  async getUser(token: string): Promise<User> {
    const tokenInfo = await this.validateToken(token);
    if (!tokenInfo.valid) {
      throw new Error('Invalid token');
    }
    return tokenInfo.user;
  }

  async updateUser(token: string, updates: Partial<User>): Promise<User> {
    const tokenInfo = await this.validateToken(token);
    if (!tokenInfo.valid) {
      throw new Error('Invalid token');
    }

    const user = this.users.get(tokenInfo.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Update allowed fields
    if (updates.email) user.email = updates.email;
    if (updates.metadata) user.metadata = { ...user.metadata, ...updates.metadata };

    // Cannot update sensitive fields through this method
    // (id, username, roles, permissions must be updated through admin methods)

    const { passwordHash, apiKeys, ...publicUser } = user;
    return publicUser;
  }

  // Admin methods (not part of interface but needed for management)
  async createUser(username: string, password: string, email: string, roles: string[] = ['user']): Promise<User> {
    const id = uuidv4();
    const passwordHash = this.hashPassword(password);
    const permissions = this.getPermissionsForRoles(roles);

    const user: StoredUser = {
      id,
      username,
      email,
      roles,
      permissions,
      passwordHash,
      apiKeys: []
    };

    this.users.set(id, user);

    const { passwordHash: _, apiKeys: __, ...publicUser } = user;
    return publicUser;
  }

  async createApiKey(userId: string): Promise<string> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const apiKey = `ak_${this.generateToken()}`;
    if (!user.apiKeys) {
      user.apiKeys = [];
    }
    user.apiKeys.push(apiKey);

    return apiKey;
  }

  // Private helper methods
  private async authenticatePassword(username: string, password: string): Promise<StoredUser | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        const passwordHash = this.hashPassword(password);
        if (user.passwordHash === passwordHash) {
          return user;
        }
      }
    }
    return null;
  }

  private async authenticateApiKey(apiKey: string): Promise<StoredUser | null> {
    for (const user of this.users.values()) {
      if (user.apiKeys && user.apiKeys.includes(apiKey)) {
        return user;
      }
    }
    return null;
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();

    for (const role of roles) {
      switch (role) {
        case 'admin':
          permissions.add('*'); // All permissions
          break;
        case "developer":
          permissions.add('agent:create');
          permissions.add('agent:read');
          permissions.add('agent:update');
          permissions.add('agent:delete');
          permissions.add('task:*');
          permissions.add('workflow:*');
          break;
        case 'user':
          permissions.add('agent:read');
          permissions.add('task:read');
          permissions.add('workflow:read');
          break;
        case 'viewer':
          permissions.add('agent:read');
          break;
      }
    }

    return Array.from(permissions);
  }

  private getAnonymousUser(): User {
    return {
      id: "anonymous",
      username: "anonymous",
      email: '',
      roles: [],
      permissions: []
    };
  }

  private initializeDefaultUsers(): void {
    // Create default admin user
    const adminId = 'admin-001';
    this.users.set(adminId, {
      id: adminId,
      username: 'admin',
      email: 'admin@llm-agent.local',
      roles: ['admin'],
      permissions: ['*'],
      passwordHash: this.hashPassword("admin123"), // Change in production!
      apiKeys: []
    });

    // Create default developer user
    const devId = 'dev-001';
    this.users.set(devId, {
      id: devId,
      username: "developer",
      email: 'dev@llm-agent.local',
      roles: ["developer"],
      permissions: this.getPermissionsForRoles(["developer"]),
      passwordHash: this.hashPassword('dev123'), // Change in production!
      apiKeys: []
    });
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Remove expired tokens
    const now = new Date();
    
    for (const [token, storedToken] of this.tokens.entries()) {
      if (storedToken.expiresAt < now) {
        this.tokens.delete(token);
      }
    }

    for (const [refreshToken, storedToken] of this.refreshTokens.entries()) {
      if (storedToken.refreshExpiresAt < now) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}