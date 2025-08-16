import { Router } from 'express';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

export const authRouter = Router();

// In-memory user store (replace with database in production)
const users = new Map();

// Session extension
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = (req as any).db;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Try database first
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash || user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    // Save session before sending response
    req.session.save((err) => {
      if (err) {
        logger.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        redirectUrl: '/dashboard'
      });
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Register
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (users.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}`;
    
    const newUser = {
      id: userId,
      username,
      password: hashedPassword,
      email,
      role: 'user',
      createdAt: new Date()
    };

    users.set(username, newUser);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: userId,
        username,
        email,
        role: 'user'
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get session
authRouter.get('/session', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Initialize default admin user
(async () => {
  const adminPassword = await bcrypt.hash('admin123', 10);
  users.set('admin', {
    id: 'admin-001',
    username: 'admin',
    password: adminPassword,
    email: 'admin@guiselector.local',
    role: 'admin',
    createdAt: new Date()
  });
  logger.info('Default admin user created');
})();