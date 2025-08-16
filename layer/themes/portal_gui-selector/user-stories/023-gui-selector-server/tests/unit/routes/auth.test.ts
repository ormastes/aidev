import request from "supertest";
import express from 'express';
import session from 'express-session';
import { authRouter } from '../../../src/routes/auth';
import bcrypt from 'bcrypt';

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: process.env.SECRET || "PLACEHOLDER",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use('/api/auth', authRouter);
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: "PLACEHOLDER"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.user).toHaveProperty("username", 'admin');
      expect(response.body.user).toHaveProperty('role', 'admin');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: "PLACEHOLDER"
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: "nonexistent",
          password: "PLACEHOLDER"
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password required');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: "PLACEHOLDER",
          email: 'newuser@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration successful');
      expect(response.body.user).toHaveProperty("username", 'newuser');
      expect(response.body.user).toHaveProperty('email', 'newuser@example.com');
      expect(response.body.user).toHaveProperty('role', 'user');
    });

    it('should reject registration with existing username', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          username: "testuser",
          password: "PLACEHOLDER",
          email: 'test@example.com'
        });

      // Second registration with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: "testuser",
          password: "PLACEHOLDER",
          email: 'test2@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields required');
    });

    it('should hash the password before storing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: "hashtest",
          password: "PLACEHOLDER",
          email: 'hash@example.com'
        });

      expect(response.status).toBe(201);
      // Password should not be returned in response
      expect(response.body.user).not.toHaveProperty("password");
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return authenticated status when logged in', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: "PLACEHOLDER"
        });

      // Check session
      const response = await agent
        .get('/api/auth/session');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("authenticated", true);
      expect(response.body.user).toHaveProperty("username", 'admin');
    });

    it('should return unauthenticated status when not logged in', async () => {
      const response = await request(app)
        .get('/api/auth/session');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("authenticated", false);
      expect(response.body).not.toHaveProperty('user');
    });
  });

  describe('Error handling', () => {
    it('should handle bcrypt errors gracefully', async () => {
      // Mock bcrypt to throw an error
      jest.spyOn(bcrypt, 'compare').mockImplementationOnce(() => {
        throw new Error('Bcrypt error');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: "PLACEHOLDER"
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Login failed');
    });

    it('should handle registration errors gracefully', async () => {
      jest.spyOn(bcrypt, 'hash').mockImplementationOnce(() => {
        throw new Error('Hash error');
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: "errortest",
          password: "PLACEHOLDER",
          email: 'error@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Registration failed');
    });
  });
});