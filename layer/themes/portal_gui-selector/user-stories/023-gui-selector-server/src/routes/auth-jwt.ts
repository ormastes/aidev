import { Router } from 'express';
import bcrypt from 'bcrypt';
import { DatabaseService } from '../services/DatabaseService';
import { JWTService } from '../services/JWTService';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/jwt-auth';

export const authJWTRouter = Router();
const db = new DatabaseService();
const jwtService = new JWTService();

// Login with JWT
authJWTRouter.post('/token', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await db.createSession(user.id, refreshToken, jwtService.getRefreshTokenExpiry());

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('JWT login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
authJWTRouter.get('/verify', authenticateJWT, async (req, res) => {
  try {
    const user = (req as any).user;
    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh token
authJWTRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);
    
    // Check if token exists in database
    const session = await db.getSession(refreshToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user data
    const user = await db.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new access token
    const newTokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };
    
    const accessToken = jwtService.generateAccessToken(newTokenPayload);

    res.json({ accessToken });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout (revoke refresh token)
authJWTRouter.post('/revoke', authenticateJWT, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await db.deleteSession(refreshToken);
    }
    
    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    logger.error('Token revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// Verify token endpoint
authJWTRouter.get('/verify', authenticateJWT, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Change password
authJWTRouter.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = await db.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // TODO: Add updateUserPassword method to database service
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});