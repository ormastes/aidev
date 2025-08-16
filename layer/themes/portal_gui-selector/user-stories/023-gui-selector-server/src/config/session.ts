import { SessionOptions } from 'express-session';

export const sessionConfig: SessionOptions = {
  secret: process.env.SESSION_SECRET || 'gui-selector-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for development, should be true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'gui-selector-session'
};