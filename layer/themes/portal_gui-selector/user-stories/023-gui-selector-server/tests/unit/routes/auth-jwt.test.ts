import request from 'supertest';
import express from 'express';
import { authJWTRouter } from '../../../src/routes/auth-jwt';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { JWTService } from '../../../src/services/JWTService';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../../src/services/DatabaseService');
jest.mock('../../../src/services/JWTService');

describe('JWT Auth Routes', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockJwtService: jest.Mocked<JWTService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v2/auth', authJWTRouter);

    // Setup mocks
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockJwtService = new JWTService() as jest.Mocked<JWTService>;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/v2/auth/token', () => {
    it('should generate tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      mockDb.getUserByUsername = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        role: 'user'
      });

      mockJwtService.generateAccessToken = jest.fn().mockReturnValue('mock-access-token');
      mockJwtService.generateRefreshToken = jest.fn().mockReturnValue('mock-refresh-token');
      mockJwtService.getRefreshTokenExpiry = jest.fn().mockReturnValue(new Date());

      const response = await request(app)
        .post('/api/v2/auth/token')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject invalid credentials', async () => {
      mockDb.getUserByUsername = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v2/auth/token')
        .send({
          username: 'invalid',
          password: 'wrong'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      
      mockDb.getUserByUsername = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        role: 'user'
      });

      const response = await request(app)
        .post('/api/v2/auth/token')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/v2/auth/token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password required');
    });

    it('should handle database errors', async () => {
      mockDb.getUserByUsername = jest.fn().mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/v2/auth/token')
        .send({
          username: 'testuser',
          password: 'password'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });
  });

  describe('POST /api/v2/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      mockJwtService.verifyRefreshToken = jest.fn().mockReturnValue({
        userId: 1,
        username: 'testuser',
        role: 'user'
      });

      mockDb.getRefreshToken = jest.fn().mockResolvedValue({
        id: 1,
        user_id: 1,
        token: 'valid-refresh-token',
        expires_at: new Date(Date.now() + 86400000)
      });

      mockDb.getUserById = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      });

      mockJwtService.generateAccessToken = jest.fn().mockReturnValue('new-access-token');
      mockJwtService.generateRefreshToken = jest.fn().mockReturnValue('new-refresh-token');
      mockJwtService.getRefreshTokenExpiry = jest.fn().mockReturnValue(new Date());

      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Refresh token required');
    });

    it('should reject invalid refresh token', async () => {
      mockJwtService.verifyRefreshToken = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      mockJwtService.verifyRefreshToken = jest.fn().mockReturnValue({
        userId: 1,
        username: 'testuser',
        role: 'user'
      });

      mockDb.getRefreshToken = jest.fn().mockResolvedValue({
        id: 1,
        user_id: 1,
        token: 'expired-token',
        expires_at: new Date(Date.now() - 86400000) // Expired
      });

      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({
          refreshToken: 'expired-token'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Refresh token expired');
    });
  });

  describe('GET /api/v2/auth/verify', () => {
    it('should verify valid access token', async () => {
      const mockUser = {
        userId: 1,
        username: 'testuser',
        role: 'user'
      };

      // Create a mock middleware that adds user to request
      app.use((req: any, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .get('/api/v2/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v2/auth/verify');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      const mockUser = { userId: 1, username: 'testuser', role: 'user' };

      // Create a mock middleware that adds user to request
      app.use((req: any, res, next) => {
        req.user = mockUser;
        next();
      });

      mockDb.revokeRefreshToken = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({
          refreshToken: 'refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should handle logout without refresh token', async () => {
      const mockUser = { userId: 1, username: 'testuser', role: 'user' };

      app.use((req: any, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('POST /api/v2/auth/register', () => {
    it('should register new user successfully', async () => {
      mockDb.getUserByUsername = jest.fn().mockResolvedValue(null);
      mockDb.getUserByEmail = jest.fn().mockResolvedValue(null);
      mockDb.createUser = jest.fn().mockResolvedValue({ lastID: 1 });

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration successful');
      expect(response.body.user).toHaveProperty('username', 'newuser');
    });

    it('should reject duplicate username', async () => {
      mockDb.getUserByUsername = jest.fn().mockResolvedValue({
        id: 1,
        username: 'existing'
      });

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          username: 'existing',
          password: 'password123',
          email: 'new@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    it('should reject duplicate email', async () => {
      mockDb.getUserByUsername = jest.fn().mockResolvedValue(null);
      mockDb.getUserByEmail = jest.fn().mockResolvedValue({
        id: 1,
        email: 'existing@example.com'
      });

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'existing@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          username: 'newuser',
          password: 'short',
          email: 'new@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid email format');
    });
  });
});