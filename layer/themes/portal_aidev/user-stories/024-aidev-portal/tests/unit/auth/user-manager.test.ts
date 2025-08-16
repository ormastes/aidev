import { UserManager } from '../../../src/auth/user-manager';
import { AuthenticationManager } from '../../../src/auth/authentication-manager';
import { TokenStore } from '../../../src/auth/token-store';
import { crypto } from '../../../../../../infra_external-log-lib/src';

// Mock dependencies
jest.mock('../../../src/auth/authentication-manager');
jest.mock('../../../src/auth/token-store');

describe("UserManager", () => {
  let userManager: UserManager;
  let mockAuthManager: jest.Mocked<AuthenticationManager>;
  let mockTokenStore: jest.Mocked<TokenStore>;
  
  const validpassword: "PLACEHOLDER";
  const hashedPassword = crypto.createHash('sha256').update(validPassword + 'salt').digest('hex');

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAuthManager = new AuthenticationManager({
      jwtsecret: process.env.SECRET || "PLACEHOLDER",
      tokenExpiry: '1h'
    }) as jest.Mocked<AuthenticationManager>;
    
    mockTokenStore = new TokenStore({
      keyPrefix: 'test:',
      defaultExpiry: 3600
    }) as jest.Mocked<TokenStore>;
    
    userManager = new UserManager({
      authManager: mockAuthManager,
      tokenStore: mockTokenStore
    });
  });

  describe("createUser", () => {
    const validUser = {
      id: 'user123',
      username: "testuser",
      password: validPassword,
      role: 'user',
      permissions: ['read'],
      fullName: 'Test User',
      active: true,
      email: 'test@example.com'
    };

    it('should create user successfully', async () => {
      const result = await userManager.createUser(validUser);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
      expect(result.error).toBeUndefined();
      
      // Verify user was stored
      const user = await userManager.getUser('user123');
      expect(user).toBeDefined();
      expect(user?.username).toBe("testuser");
      expect(user?.password).toBe(hashedPassword);
      expect(user?.active).toBe(true);
      expect(user?.createdAt).toBeDefined();
    });

    it('should fail with weak password', async () => {
      const result = await userManager.createUser({
        ...validUser,
        password: "PLACEHOLDER"
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('password does not meet policy requirements');
    });

    it('should fail with duplicate username', async () => {
      await userManager.createUser(validUser);
      
      const result = await userManager.createUser({
        ...validUser,
        id: 'user456'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('username already exists');
    });

    it('should handle errors during creation', async () => {
      // Mock Map.set to throw an error
      const originalSet = Map.prototype.set;
      Map.prototype.set = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = await userManager.createUser(validUser);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
      
      // Restore original
      Map.prototype.set = originalSet;
    });
  });

  describe('password validation', () => {
    const baseUser = {
      id: 'user123',
      username: "testuser",
      role: 'user',
      permissions: ['read'],
      fullName: 'Test User',
      active: true
    };

    it('should require minimum length', async () => {
      const result = await userManager.createUser({
        ...baseUser,
        password: "PLACEHOLDER"
      });
      
      expect(result.success).toBe(false);
    });

    it('should require uppercase letters', async () => {
      const result = await userManager.createUser({
        ...baseUser,
        password: "PLACEHOLDER"
      });
      
      expect(result.success).toBe(false);
    });

    it('should require lowercase letters', async () => {
      const result = await userManager.createUser({
        ...baseUser,
        password: "PLACEHOLDER"
      });
      
      expect(result.success).toBe(false);
    });

    it('should require numbers', async () => {
      const result = await userManager.createUser({
        ...baseUser,
        password: "PLACEHOLDER"
      });
      
      expect(result.success).toBe(false);
    });

    it('should require special characters', async () => {
      const result = await userManager.createUser({
        ...baseUser,
        password: "PLACEHOLDER"
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('getUser', () => {
    beforeEach(async () => {
      await userManager.createUser({
        id: 'user123',
        username: "testuser",
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User'
      });
    });

    it('should get user by id', async () => {
      const user = await userManager.getUser('user123');
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('user123');
      expect(user?.username).toBe("testuser");
    });

    it('should return null for non-existent user', async () => {
      const user = await userManager.getUser('non-existent');
      expect(user).toBeNull();
    });
  });

  describe("getUserByUsername", () => {
    beforeEach(async () => {
      await userManager.createUser({
        id: 'user123',
        username: "testuser",
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User'
      });
    });

    it('should get user by username', async () => {
      const user = await userManager.getUserByUsername("testuser");
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('user123');
      expect(user?.username).toBe("testuser");
    });

    it('should return null for non-existent username', async () => {
      const user = await userManager.getUserByUsername('non-existent');
      expect(user).toBeNull();
    });
  });

  describe("validateCredentials", () => {
    beforeEach(async () => {
      await userManager.createUser({
        id: 'user123',
        username: "testuser",
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User'
      });
    });

    it('should validate correct credentials', async () => {
      const user = await userManager.validateCredentials("testuser", validPassword);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('user123');
      expect(user?.lastLogin).toBeDefined();
    });

    it('should return null for incorrect password', async () => {
      const user = await userManager.validateCredentials("testuser", "wrongpassword");
      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await userManager.validateCredentials("nonexistent", validPassword);
      expect(user).toBeNull();
    });

    it('should return null for inactive user', async () => {
      await userManager.updateUser('user123', { active: false });
      
      const user = await userManager.validateCredentials("testuser", validPassword);
      expect(user).toBeNull();
    });

    it('should implement rate limiting after failed attempts', async () => {
      // Set NODE_ENV to test for faster rate limit window
      process.env.NODE_ENV = 'test';
      
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await userManager.validateCredentials("testuser", "wrongpassword");
      }
      
      // Next attempt should be rate limited
      await expect(userManager.validateCredentials("testuser", validPassword))
        .rejects.toThrow('rate limit exceeded');
        
      delete process.env.NODE_ENV;
    });

    it('should clear failed attempts on successful login', async () => {
      // Make some failed attempts
      await userManager.validateCredentials("testuser", "wrongpassword");
      await userManager.validateCredentials("testuser", "wrongpassword");
      
      // Successful login
      const user = await userManager.validateCredentials("testuser", validPassword);
      expect(user).toBeDefined();
      
      // Failed attempts should be cleared, so one more wrong attempt is allowed
      const failedUser = await userManager.validateCredentials("testuser", "wrongpassword");
      expect(failedUser).toBeNull();
    });
  });

  describe("updateUser", () => {
    beforeEach(async () => {
      await userManager.createUser({
        id: 'user123',
        username: "testuser",
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User'
      });
    });

    it('should update user successfully', async () => {
      const result = await userManager.updateUser('user123', {
        fullName: 'Updated User',
        email: 'updated@example.com'
      });
      
      expect(result).toBe(true);
      
      const user = await userManager.getUser('user123');
      expect(user?.fullName).toBe('Updated User');
      expect(user?.email).toBe('updated@example.com');
    });

    it('should update username and maintain mapping', async () => {
      const result = await userManager.updateUser('user123', {
        username: "newusername"
      });
      
      expect(result).toBe(true);
      
      // Old username should not work
      const oldUser = await userManager.getUserByUsername("testuser");
      expect(oldUser).toBeNull();
      
      // New username should work
      const newUser = await userManager.getUserByUsername("newusername");
      expect(newUser).toBeDefined();
      expect(newUser?.id).toBe('user123');
    });

    it('should update and hash new password', async () => {
      const newpassword: "PLACEHOLDER";
      
      const result = await userManager.updateUser('user123', {
        password: newPassword
      });
      
      expect(result).toBe(true);
      
      // Should be able to login with new password
      const user = await userManager.validateCredentials("testuser", newPassword);
      expect(user).toBeDefined();
    });

    it('should fail to update with weak password', async () => {
      await expect(userManager.updateUser('user123', {
        password: "PLACEHOLDER"
      })).rejects.toThrow('password does not meet policy requirements');
    });

    it('should return false for non-existent user', async () => {
      const result = await userManager.updateUser('non-existent', {
        fullName: 'Updated'
      });
      
      expect(result).toBe(false);
    });
  });

  describe("deleteUser", () => {
    beforeEach(async () => {
      await userManager.createUser({
        id: 'user123',
        username: "testuser",
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User'
      });
      
      mockTokenStore.getUserTokens.mockResolvedValue(['token1', 'token2']);
      mockTokenStore.blacklistToken.mockResolvedValue();
    });

    it('should delete user successfully', async () => {
      const result = await userManager.deleteUser('user123');
      
      expect(result).toBe(true);
      
      // User should be gone
      const user = await userManager.getUser('user123');
      expect(user).toBeNull();
      
      // Username mapping should be gone
      const userByUsername = await userManager.getUserByUsername("testuser");
      expect(userByUsername).toBeNull();
    });

    it('should blacklist all user tokens on deletion', async () => {
      await userManager.deleteUser('user123');
      
      expect(mockTokenStore.getUserTokens).toHaveBeenCalledWith('user123');
      expect(mockTokenStore.blacklistToken).toHaveBeenCalledTimes(2);
      expect(mockTokenStore.blacklistToken).toHaveBeenCalledWith('token1');
      expect(mockTokenStore.blacklistToken).toHaveBeenCalledWith('token2');
    });

    it('should return false for non-existent user', async () => {
      const result = await userManager.deleteUser('non-existent');
      expect(result).toBe(false);
    });
  });

  describe("listUsers", () => {
    beforeEach(async () => {
      await userManager.createUser({
        id: 'user1',
        username: 'user1',
        password: validPassword,
        role: 'admin',
        permissions: ['read', 'write'],
        fullName: 'User One'
      });
      
      await userManager.createUser({
        id: 'user2',
        username: 'user2',
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'User Two'
      });
    });

    it('should list all users with passwords hidden', async () => {
      const users = await userManager.listUsers();
      
      expect(users).toHaveLength(2);
      expect(users[0].password).toBe('[HIDDEN]');
      expect(users[1].password).toBe('[HIDDEN]');
      
      // Verify other fields are present
      const user1 = users.find(u => u.id === 'user1');
      expect(user1?.username).toBe('user1');
      expect(user1?.role).toBe('admin');
      expect(user1?.fullName).toBe('User One');
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'test'; // Use shorter rate limit window
      
      await userManager.createUser({
        id: 'user123',
        username: "testuser",
        password: validPassword,
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User'
      });
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should allow rate limit to expire', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await userManager.validateCredentials("testuser", "wrongpassword");
      }
      
      // Should be rate limited
      await expect(userManager.validateCredentials("testuser", validPassword))
        .rejects.toThrow('rate limit exceeded');
      
      // Wait for rate limit window to expire (100ms in test mode)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be able to login now
      const user = await userManager.validateCredentials("testuser", validPassword);
      expect(user).toBeDefined();
    });
  });
});