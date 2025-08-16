/**
 * Shared cryptographic utilities for all themes
 */

import { crypto } from '../../../infra_external-log-lib/src';

/**
 * Generates a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hashes a password using bcrypt-like algorithm (using scrypt for Node.js)
 */
export async function hashPassword(password: string, saltRounds: number = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(key === derivedKey.toString('hex'));
    });
  });
}

/**
 * Generates a JWT-like token (simplified, not for production)
 */
export function generateJWT(
  payload: Record<string, any>,
  secret: string,
  expiresIn: number = 3600
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Generates a random password
 */
export function generatePassword(
  length: number = 16,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;
  
  let charset = '';
  
  if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (!charset) {
    throw new Error('At least one character type must be enabled');
  }
  
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(crypto.randomInt(charset.length));
  }
  
  return password;
}

/**
 * Creates a hash of a string using SHA256
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Creates a hash of a string using MD5 (not for security, only for checksums)
 */
export function md5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Encrypts data using AES-256
 */
export function encrypt(text: string, password: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts data encrypted with encrypt()
 */
export function decrypt(encryptedText: string, password: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a random integer within a range
 */
export function randomInt(min: number, max: number): number {
  return crypto.randomInt(min, max + 1);
}

/**
 * Creates a deterministic hash from multiple inputs
 */
export function createHash(...inputs: string[]): string {
  const combined = inputs.join(':');
  return sha256(combined);
}

/**
 * Generates an API key
 */
export function generateApiKey(prefix: string = 'ak'): string {
  const token = generateSecureToken(24);
  return `${prefix}_${token}`;
}