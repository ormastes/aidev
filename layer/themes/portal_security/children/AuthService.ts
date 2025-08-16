/**
 * Core Authentication Service
 * 
 * Handles user authentication, validation, and session management
 */

import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../common/types/User';
import { SecurityConstants } from '../common/constants/security';
import { CredentialStore } from './CredentialStore';
import { TokenService } from './TokenService';
import { SessionManager } from './SessionManager';

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface AuthConfig {
  credentialStore?: CredentialStore;
  tokenService?: TokenService;
  sessionManager?: SessionManager;
  userRepository?: UserRepository;
}

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(userData: Partial<User>): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<User>;
}

export class AuthService {
  private credentialStore: CredentialStore;
  private tokenService: TokenService;
  private sessionManager: SessionManager;
  private userRepository: UserRepository;

  constructor(config?: AuthConfig) {
    this.credentialStore = config?.credentialStore || new CredentialStore();
    this.tokenService = config?.tokenService || new TokenService();
    this.sessionManager = config?.sessionManager || new SessionManager();
    this.userRepository = config?.userRepository || this.createDefaultUserRepository();
  }

  /**
   * Authenticate a user with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Validate input
      if (!credentials.username || !credentials.password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }

      // Find user
      const user = await this.userRepository.findByUsername(credentials.username);
      if (!user) {
        // Check default credentials in development
        if (process.env.NODE_ENV === 'development' &&
            credentials.username === SecurityConstants.DEFAULT_CREDENTIALS.USERNAME &&
            credentials.password === SecurityConstants.DEFAULT_CREDENTIALS.PASSWORD) {
          // Create default admin user
          const defaultUser = await this.createDefaultAdminUser();
          return this.successfulLogin(defaultUser, credentials.rememberMe);
        }
        
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Verify password
      const storedCredential = await this.credentialStore.getCredential(user.id);
      if (!storedCredential || !storedCredential.passwordHash) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      const isValidPassword = await bcrypt.compare(
        credentials.password,
        storedCredential.passwordHash
      );

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date()
      });

      return this.successfulLogin(user, credentials.rememberMe);
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  }

  /**
   * Logout a user
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionManager.destroySession(sessionId);
  }

  /**
   * Validate a token and return the user
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = await this.tokenService.verifyToken(token);
      if (!payload || !payload.userId) {
        return null;
      }

      return await this.userRepository.findById(payload.userId);
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Get current user from request
   */
  async getCurrentUser(req: any): Promise<User | null> {
    // Check session first
    if (req.session?.userId) {
      return await this.userRepository.findById(req.session.userId);
    }

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return await this.validateToken(token);
    }

    return null;
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    username: string;
    password: string;
    email?: string;
    roles?: UserRole[];
  }): Promise<User> {
    // Hash password
    const passwordHash = await bcrypt.hash(
      userData.password,
      SecurityConstants.PASSWORD.BCRYPT_ROUNDS
    );

    // Create user
    const user = await this.userRepository.create({
      username: userData.username,
      email: userData.email,
      roles: userData.roles || [UserRole.USER],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Store credentials
    await this.credentialStore.storeCredential({
      userId: user.id,
      type: 'password',
      passwordHash,
      createdAt: new Date()
    });

    return user;
  }

  /**
   * Helper to handle successful login
   */
  private async successfulLogin(user: User, rememberMe?: boolean): Promise<AuthResult> {
    // Create tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      roles: user.roles
    };

    const token = await this.tokenService.generateToken(tokenPayload);
    const refreshToken = rememberMe 
      ? await this.tokenService.generateRefreshToken(tokenPayload)
      : undefined;

    // Create session
    await this.sessionManager.createSession({
      id: `session-${user.id}-${Date.now()}`,
      userId: user.id,
      data: {
        username: user.username,
        roles: user.roles
      },
      expiresAt: new Date(Date.now() + SecurityConstants.SESSION.MAX_AGE)
    });

    return {
      success: true,
      user,
      token,
      refreshToken
    };
  }

  /**
   * Create default admin user for development
   */
  private async createDefaultAdminUser(): Promise<User> {
    return await this.createUser({
      username: SecurityConstants.DEFAULT_CREDENTIALS.USERNAME,
      password: SecurityConstants.DEFAULT_CREDENTIALS.PASSWORD,
      roles: [UserRole.ADMIN]
    });
  }

  /**
   * Create default in-memory user repository
   */
  private createDefaultUserRepository(): UserRepository {
    const users = new Map<string, User>();
    
    return {
      async findByUsername(username: string): Promise<User | null> {
        for (const user of users.values()) {
          if (user.username === username) {
            return user;
          }
        }
        return null;
      },

      async findById(id: string): Promise<User | null> {
        return users.get(id) || null;
      },

      async create(userData: Partial<User>): Promise<User> {
        const user: User = {
          id: `user-${Date.now()}`,
          username: userData.username!,
          email: userData.email,
          roles: userData.roles || [UserRole.USER],
          createdAt: userData.createdAt || new Date(),
          updatedAt: userData.updatedAt || new Date()
        };
        users.set(user.id, user);
        return user;
      },

      async update(id: string, userData: Partial<User>): Promise<User> {
        const user = users.get(id);
        if (!user) {
          throw new Error('User not found');
        }
        const updatedUser = { ...user, ...userData, updatedAt: new Date() };
        users.set(id, updatedUser);
        return updatedUser;
      }
    };
  }
}