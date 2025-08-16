/**
 * Security Manager - Handles advanced security features
 */

import { RateLimiterMemory, RateLimiterRedis, IRateLimiterOptions } from 'rate-limiter-flexible';
import * as geoip from 'geoip-lite';
import { crypto } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from 'node:events';

export interface SecurityConfig {
  rateLimiting: {
    login: IRateLimiterOptions;
    api: IRateLimiterOptions;
    global: IRateLimiterOptions;
  };
  accountLockout: {
    maxAttempts: number;
    lockoutDuration: number; // in seconds
    resetAfter: number; // in seconds
  };
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  suspiciousActivityThreshold: {
    newLocationWeight: number;
    newDeviceWeight: number;
    timeBasedWeight: number;
    maxScore: number;
  };
  passwordPolicy: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventCommonPasswords: boolean;
    preventUserDataInPassword: boolean;
    passwordHistory: number;
    maxAge: number; // in days
  };
}

export interface LoginAttempt {
  userId?: string;
  username: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates: [number, number];
  };
  deviceFingerprint?: string;
  suspiciousScore: number;
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  type: 'login_success' | 'login_failure' | 'account_locked' | 'suspicious_activity' | 'password_changed' | 'mfa_enabled' | 'mfa_disabled';
  severity: 'low' | 'medium' | 'high' | "critical";
  details: any;
  ip: string;
  userAgent: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface DeviceInfo {
  fingerprint: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  lastSeen: Date;
  firstSeen: Date;
  trusted: boolean;
}

export interface PasswordHistoryEntry {
  hash: string;
  createdAt: Date;
}

export interface UserSecurityProfile {
  userId: string;
  passwordHistory: PasswordHistoryEntry[];
  knownDevices: Map<string, DeviceInfo>;
  knownLocations: Set<string>; // country:region:city
  lastPasswordChange?: Date;
  accountLocked: boolean;
  lockoutUntil?: Date;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  suspiciousActivityScore: number;
  securityLevel: 'low' | 'medium' | 'high';
}

export class SecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private loginLimiter: RateLimiterMemory;
  private apiLimiter: RateLimiterMemory;
  private globalLimiter: RateLimiterMemory;
  private userProfiles: Map<string, UserSecurityProfile> = new Map();
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private loginHistory: LoginAttempt[] = [];
  private commonPasswords: Set<string> = new Set();

  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    
    // Initialize rate limiters
    this.loginLimiter = new RateLimiterMemory(config.rateLimiting.login);
    this.apiLimiter = new RateLimiterMemory(config.rateLimiting.api);
    this.globalLimiter = new RateLimiterMemory(config.rateLimiting.global);
    
    // Load common passwords (in production, load from file)
    this.loadCommonPasswords();
    
    // Cleanup old events and history periodically
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Check if IP is allowed
   */
  async checkIPAccess(ip: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check blacklist first
    if (this.config.ipBlacklist?.includes(ip)) {
      this.logSecurityEvent({
        type: 'login_failure',
        severity: 'high',
        details: { reason: 'IP blacklisted', ip },
        ip,
        userAgent: 'unknown'
      });
      
      return { allowed: false, reason: 'IP address is blacklisted' };
    }

    // If whitelist is configured, check it
    if (this.config.ipWhitelist && this.config.ipWhitelist.length > 0) {
      if (!this.config.ipWhitelist.includes(ip)) {
        return { allowed: false, reason: 'IP address is not whitelisted' };
      }
    }

    return { allowed: true };
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(key: string, type: 'login' | 'api' | 'global'): Promise<{ allowed: boolean; resetTime?: Date }> {
    const limiter = type === 'login' ? this.loginLimiter : 
                   type === 'api' ? this.apiLimiter : this.globalLimiter;

    try {
      await limiter.consume(key);
      return { allowed: true };
    } catch (rejRes: any) {
      return {
        allowed: false,
        resetTime: new Date(Date.now() + rejRes.msBeforeNext)
      };
    }
  }

  /**
   * Validate password strength
   */
  async validatePassword(password: string, userData?: { username?: string; email?: string; fullName?: string }): Promise<{
    valid: boolean;
    score: number;
    feedback: string[];
  }> {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.config.passwordPolicy.minLength) {
      feedback.push(`Password must be at least ${this.config.passwordPolicy.minLength} characters long`);
    } else if (password.length >= this.config.passwordPolicy.minLength) {
      score += 1;
    }

    if (password.length > this.config.passwordPolicy.maxLength) {
      feedback.push(`Password must be no more than ${this.config.passwordPolicy.maxLength} characters long`);
    }

    // Character requirements
    if (this.config.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else if (this.config.passwordPolicy.requireUppercase && /[A-Z]/.test(password)) {
      score += 1;
    }

    if (this.config.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else if (this.config.passwordPolicy.requireLowercase && /[a-z]/.test(password)) {
      score += 1;
    }

    if (this.config.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else if (this.config.passwordPolicy.requireNumbers && /\d/.test(password)) {
      score += 1;
    }

    if (this.config.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else if (this.config.passwordPolicy.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    }

    // Common password check
    if (this.config.passwordPolicy.preventCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      feedback.push('Password is too common, please choose a different one');
    }

    // User data in password check
    if (this.config.passwordPolicy.preventUserDataInPassword && userData) {
      const lowercasePassword = password.toLowerCase();
      if (userData.username && lowercasePassword.includes(userData.username.toLowerCase())) {
        feedback.push('Password should not contain your username');
      }
      if (userData.email && lowercasePassword.includes(userData.email.split('@')[0].toLowerCase())) {
        feedback.push('Password should not contain your email address');
      }
      if (userData.fullName) {
        const nameParts = userData.fullName.toLowerCase().split(' ');
        for (const part of nameParts) {
          if (part.length > 2 && lowercasePassword.includes(part)) {
            feedback.push('Password should not contain parts of your name');
            break;
          }
        }
      }
    }

    // Additional complexity checks
    if (password.length >= 12) score += 1;
    if (/[A-Z].*[A-Z]/.test(password)) score += 1; // Multiple uppercase
    if (/\d.*\d/.test(password)) score += 1; // Multiple numbers
    if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1; // Multiple special chars

    const maxScore = 8;
    const valid = feedback.length === 0 && score >= 4;

    return {
      valid,
      score: Math.min(score, maxScore),
      feedback
    };
  }

  /**
   * Check password history
   */
  async checkPasswordHistory(userId: string, newPasswordHash: string): Promise<boolean> {
    const profile = this.userProfiles.get(userId);
    if (!profile || this.config.passwordPolicy.passwordHistory === 0) {
      return true; // No history to check
    }

    const recentPasswords = profile.passwordHistory
      .slice(-this.config.passwordPolicy.passwordHistory);

    return !recentPasswords.some(entry => entry.hash === newPasswordHash);
  }

  /**
   * Update password history
   */
  async updatePasswordHistory(userId: string, passwordHash: string): Promise<void> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserSecurityProfile(userId);
    }

    profile.passwordHistory.push({
      hash: passwordHash,
      createdAt: new Date()
    });

    // Keep only required history
    if (profile.passwordHistory.length > this.config.passwordPolicy.passwordHistory) {
      profile.passwordHistory = profile.passwordHistory
        .slice(-this.config.passwordPolicy.passwordHistory);
    }

    profile.lastPasswordChange = new Date();
    this.userProfiles.set(userId, profile);
  }

  /**
   * Record login attempt and analyze for suspicious activity
   */
  async recordLoginAttempt(attempt: Omit<LoginAttempt, "suspiciousScore">): Promise<{
    suspiciousScore: number;
    blocked: boolean;
    reason?: string;
  }> {
    const location = geoip.lookup(attempt.ip);
    const deviceFingerprint = this.generateDeviceFingerprint(attempt.userAgent, attempt.ip);
    
    const loginAttempt: LoginAttempt = {
      ...attempt,
      location: location ? {
        country: location.country,
        region: location.region,
        city: location.city,
        coordinates: [location.ll[0], location.ll[1]]
      } : undefined,
      deviceFingerprint,
      suspiciousScore: 0
    };

    // Calculate suspicious activity score
    const suspiciousScore = await this.calculateSuspiciousScore(loginAttempt);
    loginAttempt.suspiciousScore = suspiciousScore;

    // Store login attempt
    this.loginHistory.unshift(loginAttempt);
    if (this.loginHistory.length > 10000) {
      this.loginHistory = this.loginHistory.slice(0, 10000);
    }

    // Update user security profile
    if (attempt.userId) {
      await this.updateUserSecurityProfile(attempt.userId, loginAttempt);
    }

    // Check if attempt should be blocked
    const blocked = suspiciousScore >= this.config.suspiciousActivityThreshold.maxScore;
    
    if (blocked) {
      this.logSecurityEvent({
        userId: attempt.userId,
        type: 'suspicious_activity',
        severity: 'high',
        details: { suspiciousScore, location, deviceFingerprint },
        ip: attempt.ip,
        userAgent: attempt.userAgent
      });
    }

    return {
      suspiciousScore,
      blocked,
      reason: blocked ? 'Suspicious activity detected' : undefined
    };
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<{ locked: boolean; unlockTime?: Date }> {
    const profile = this.userProfiles.get(userId);
    
    if (!profile || !profile.accountLocked) {
      return { locked: false };
    }

    // Check if lockout period has expired
    if (profile.lockoutUntil && profile.lockoutUntil < new Date()) {
      profile.accountLocked = false;
      profile.lockoutUntil = undefined;
      profile.failedLoginAttempts = 0;
      this.userProfiles.set(userId, profile);
      
      this.logSecurityEvent({
        userId,
        type: 'login_success',
        severity: 'low',
        details: { reason: 'Account automatically unlocked' },
        ip: 'system',
        userAgent: 'system'
      });
      
      return { locked: false };
    }

    return {
      locked: true,
      unlockTime: profile.lockoutUntil
    };
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(userId: string, ip: string, userAgent: string): Promise<void> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserSecurityProfile(userId);
    }

    profile.failedLoginAttempts++;
    profile.lastFailedLogin = new Date();

    // Check if account should be locked
    if (profile.failedLoginAttempts >= this.config.accountLockout.maxAttempts) {
      profile.accountLocked = true;
      profile.lockoutUntil = new Date(Date.now() + this.config.accountLockout.lockoutDuration * 1000);
      
      this.logSecurityEvent({
        userId,
        type: 'account_locked',
        severity: 'high',
        details: { failedAttempts: profile.failedLoginAttempts },
        ip,
        userAgent
      });
    }

    this.userProfiles.set(userId, profile);
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(userId: string, ip: string, userAgent: string): Promise<void> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserSecurityProfile(userId);
    }

    // Reset failed login attempts
    profile.failedLoginAttempts = 0;
    profile.lastFailedLogin = undefined;
    profile.accountLocked = false;
    profile.lockoutUntil = undefined;

    this.userProfiles.set(userId, profile);
  }

  /**
   * Get security events for a user
   */
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    return Array.from(this.securityEvents.values())
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId: string, limit: number = 100): Promise<LoginAttempt[]> {
    return this.loginHistory
      .filter(attempt => attempt.userId === userId)
      .slice(0, limit);
  }

  /**
   * Trust a device for a user
   */
  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (profile) {
      const device = profile.knownDevices.get(deviceFingerprint);
      if (device) {
        device.trusted = true;
        profile.knownDevices.set(deviceFingerprint, device);
        this.userProfiles.set(userId, profile);
      }
    }
  }

  /**
   * Calculate suspicious activity score
   */
  private async calculateSuspiciousScore(attempt: LoginAttempt): Promise<number> {
    if (!attempt.userId) {
      return 0;
    }

    const profile = this.userProfiles.get(attempt.userId);
    if (!profile) {
      return 0;
    }

    let score = 0;

    // New location check
    if (attempt.location) {
      const locationKey = `${attempt.location.country}:${attempt.location.region}:${attempt.location.city}`;
      if (!profile.knownLocations.has(locationKey)) {
        score += this.config.suspiciousActivityThreshold.newLocationWeight;
      }
    }

    // New device check
    if (attempt.deviceFingerprint && !profile.knownDevices.has(attempt.deviceFingerprint)) {
      score += this.config.suspiciousActivityThreshold.newDeviceWeight;
    }

    // Time-based anomalies (login at unusual hours)
    const hour = attempt.timestamp.getHours();
    const recentLogins = this.loginHistory
      .filter(l => l.userId === attempt.userId && l.success)
      .slice(0, 50);

    if (recentLogins.length > 10) {
      const usualHours = new Set(recentLogins.map(l => l.timestamp.getHours()));
      if (!usualHours.has(hour)) {
        score += this.config.suspiciousActivityThreshold.timeBasedWeight;
      }
    }

    return Math.min(score, this.config.suspiciousActivityThreshold.maxScore);
  }

  /**
   * Update user security profile after login attempt
   */
  private async updateUserSecurityProfile(userId: string, attempt: LoginAttempt): Promise<void> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserSecurityProfile(userId);
    }

    // Update known locations
    if (attempt.location) {
      const locationKey = `${attempt.location.country}:${attempt.location.region}:${attempt.location.city}`;
      profile.knownLocations.add(locationKey);
    }

    // Update known devices
    if (attempt.deviceFingerprint) {
      const existingDevice = profile.knownDevices.get(attempt.deviceFingerprint);
      if (existingDevice) {
        existingDevice.lastSeen = attempt.timestamp;
      } else {
        const deviceInfo: DeviceInfo = {
          fingerprint: attempt.deviceFingerprint,
          name: this.parseDeviceName(attempt.userAgent),
          type: this.parseDeviceType(attempt.userAgent),
          os: this.parseOS(attempt.userAgent),
          browser: this.parseBrowser(attempt.userAgent),
          lastSeen: attempt.timestamp,
          firstSeen: attempt.timestamp,
          trusted: false
        };
        profile.knownDevices.set(attempt.deviceFingerprint, deviceInfo);
      }
    }

    // Update suspicious activity score
    profile.suspiciousActivityScore = attempt.suspiciousScore;

    this.userProfiles.set(userId, profile);
  }

  /**
   * Create new user security profile
   */
  private createUserSecurityProfile(userId: string): UserSecurityProfile {
    return {
      userId,
      passwordHistory: [],
      knownDevices: new Map(),
      knownLocations: new Set(),
      accountLocked: false,
      failedLoginAttempts: 0,
      suspiciousActivityScore: 0,
      securityLevel: 'medium'
    };
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(userAgent: string, ip: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userAgent}:${ip}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Parse device information from user agent
   */
  private parseDeviceName(userAgent: string): string {
    // Simple parsing - in production use a library like ua-parser-js
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows Computer';
    if (userAgent.includes("Macintosh")) return 'Mac Computer';
    if (userAgent.includes('Linux')) return 'Linux Computer';
    return 'Unknown Device';
  }

  private parseDeviceType(userAgent: string): DeviceInfo['type'] {
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return 'mobile';
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return 'tablet';
    }
    return 'desktop';
  }

  private parseOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes("Macintosh")) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('iPhone OS') || userAgent.includes('iOS')) return 'iOS';
    if (userAgent.includes('Android')) return 'Android';
    return 'Unknown';
  }

  private parseBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: Omit<SecurityEvent, 'id' | "timestamp" | "acknowledged">): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      acknowledged: false
    };

    this.securityEvents.set(securityEvent.id, securityEvent);
    this.emit("securityEvent", securityEvent);

    // Keep only recent events (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    for (const [id, evt] of this.securityEvents.entries()) {
      if (evt.timestamp < thirtyDaysAgo) {
        this.securityEvents.delete(id);
      }
    }
  }

  /**
   * Load common passwords (simplified version)
   */
  private loadCommonPasswords(): void {
    // In production, load from a file with common passwords
    const commonPasswords = [
      "password", '123456', "password123", 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', "1234567890", 'abc123'
    ];
    
    commonPasswords.forEach(pwd => this.commonPasswords.add(pwd));
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Clean up old login history
    this.loginHistory = this.loginHistory.filter(attempt => attempt.timestamp > sevenDaysAgo);

    // Clean up old security events
    for (const [id, event] of this.securityEvents.entries()) {
      if (event.timestamp < sevenDaysAgo) {
        this.securityEvents.delete(id);
      }
    }

    this.emit("cleanupCompleted", { timestamp: now });
  }
}