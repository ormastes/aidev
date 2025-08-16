/**
 * MFA Manager - Handles Multi-Factor Authentication
 */

import * as speakeasy from "speakeasy";
import * as QRCode from 'qrcode';
import { crypto } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from 'node:events';

export interface MFAConfig {
  appName: string;
  issuer: string;
  emailService?: EmailService;
  smsService?: SMSService;
}

export interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
}

export interface SMSService {
  sendSMS(to: string, message: string): Promise<boolean>;
}

export interface MFASecret {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface MFAVerification {
  success: boolean;
  error?: string;
  backupCodeUsed?: boolean;
}

export interface MFASettings {
  userId: string;
  totpEnabled: boolean;
  totpSecret?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string;
  backupCodes: string[];
  usedBackupCodes: Set<string>;
  createdAt: Date;
  lastUsed?: Date;
}

export class MFAManager extends EventEmitter {
  private config: MFAConfig;
  private userMFASettings: Map<string, MFASettings> = new Map();
  private pendingVerifications: Map<string, { code: string; expiresAt: Date; type: 'email' | 'sms' }> = new Map();

  constructor(config: MFAConfig) {
    super();
    this.config = config;
  }

  /**
   * Generate TOTP secret and QR code for a user
   */
  async generateTOTPSecret(userId: string, userEmail: string): Promise<MFASecret> {
    const secret = speakeasy.generateSecret({
      name: `${this.config.appName} (${userEmail})`,
      issuer: this.config.issuer,
      length: 32
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32!,
      qrCode,
      manualEntryKey: secret.base32!,
      backupCodes
    };
  }

  /**
   * Enable TOTP for a user
   */
  async enableTOTP(userId: string, secret: string, token: string): Promise<boolean> {
    // Verify the token before enabling
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!isValid) {
      return false;
    }

    let settings = this.userMFASettings.get(userId);
    if (!settings) {
      settings = {
        userId,
        totpEnabled: false,
        emailEnabled: false,
        smsEnabled: false,
        backupCodes: [],
        usedBackupCodes: new Set(),
        createdAt: new Date()
      };
    }

    settings.totpEnabled = true;
    settings.totpSecret = secret;
    settings.lastUsed = new Date();

    this.userMFASettings.set(userId, settings);
    this.emit("totpEnabled", { userId });

    return true;
  }

  /**
   * Disable TOTP for a user
   */
  async disableTOTP(userId: string): Promise<boolean> {
    const settings = this.userMFASettings.get(userId);
    if (!settings) {
      return false;
    }

    settings.totpEnabled = false;
    settings.totpSecret = undefined;
    this.userMFASettings.set(userId, settings);
    
    this.emit("totpDisabled", { userId });
    return true;
  }

  /**
   * Verify TOTP token
   */
  async verifyTOTP(userId: string, token: string): Promise<MFAVerification> {
    const settings = this.userMFASettings.get(userId);
    
    if (!settings || !settings.totpEnabled || !settings.totpSecret) {
      return {
        success: false,
        error: 'TOTP not enabled for user'
      };
    }

    const isValid = speakeasy.totp.verify({
      secret: settings.totpSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (isValid) {
      settings.lastUsed = new Date();
      this.userMFASettings.set(userId, settings);
      this.emit("totpVerified", { userId });
    }

    return {
      success: isValid,
      error: isValid ? undefined : 'Invalid TOTP token'
    };
  }

  /**
   * Send email verification code
   */
  async sendEmailCode(userId: string, email: string): Promise<boolean> {
    if (!this.config.emailService) {
      return false;
    }

    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.pendingVerifications.set(`${userId}-email`, {
      code,
      expiresAt,
      type: 'email'
    });

    const subject = `${this.config.appName} - Verification Code`;
    const body = `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`;

    try {
      await this.config.emailService.sendEmail(email, subject, body);
      this.emit("emailCodeSent", { userId, email });
      return true;
    } catch (error) {
      this.pendingVerifications.delete(`${userId}-email`);
      this.emit("emailCodeError", { userId, email, error });
      return false;
    }
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<boolean> {
    if (!this.config.smsService) {
      return false;
    }

    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.pendingVerifications.set(`${userId}-sms`, {
      code,
      expiresAt,
      type: 'sms'
    });

    const message = `${this.config.appName} verification code: ${code}. Expires in 10 minutes.`;

    try {
      await this.config.smsService.sendSMS(phoneNumber, message);
      this.emit("smsCodeSent", { userId, phoneNumber });
      return true;
    } catch (error) {
      this.pendingVerifications.delete(`${userId}-sms`);
      this.emit("smsCodeError", { userId, phoneNumber, error });
      return false;
    }
  }

  /**
   * Verify email or SMS code
   */
  async verifyCode(userId: string, code: string, type: 'email' | 'sms'): Promise<MFAVerification> {
    const key = `${userId}-${type}`;
    const pending = this.pendingVerifications.get(key);

    if (!pending) {
      return {
        success: false,
        error: 'No verification code found'
      };
    }

    if (pending.expiresAt < new Date()) {
      this.pendingVerifications.delete(key);
      return {
        success: false,
        error: 'Verification code expired'
      };
    }

    if (pending.code !== code) {
      return {
        success: false,
        error: 'Invalid verification code'
      };
    }

    this.pendingVerifications.delete(key);
    
    // Update user settings
    let settings = this.userMFASettings.get(userId);
    if (!settings) {
      settings = {
        userId,
        totpEnabled: false,
        emailEnabled: false,
        smsEnabled: false,
        backupCodes: [],
        usedBackupCodes: new Set(),
        createdAt: new Date()
      };
    }

    if (type === 'email') {
      settings.emailEnabled = true;
    } else {
      settings.smsEnabled = true;
    }
    settings.lastUsed = new Date();

    this.userMFASettings.set(userId, settings);
    this.emit(`${type}Verified`, { userId });

    return {
      success: true
    };
  }

  /**
   * Generate new backup codes for a user
   */
  async generateNewBackupCodes(userId: string): Promise<string[]> {
    const settings = this.userMFASettings.get(userId);
    if (!settings) {
      return [];
    }

    const backupCodes = this.generateBackupCodes();
    settings.backupCodes = backupCodes;
    settings.usedBackupCodes.clear();
    
    this.userMFASettings.set(userId, settings);
    this.emit("backupCodesGenerated", { userId });

    return backupCodes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MFAVerification> {
    const settings = this.userMFASettings.get(userId);
    
    if (!settings) {
      return {
        success: false,
        error: 'User MFA settings not found'
      };
    }

    if (settings.usedBackupCodes.has(code)) {
      return {
        success: false,
        error: 'Backup code already used'
      };
    }

    if (!settings.backupCodes.includes(code)) {
      return {
        success: false,
        error: 'Invalid backup code'
      };
    }

    settings.usedBackupCodes.add(code);
    settings.lastUsed = new Date();
    
    this.userMFASettings.set(userId, settings);
    this.emit("backupCodeUsed", { userId, code });

    return {
      success: true,
      backupCodeUsed: true
    };
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    methods: {
      totp: boolean;
      email: boolean;
      sms: boolean;
    };
    backupCodesRemaining: number;
  }> {
    const settings = this.userMFASettings.get(userId);
    
    if (!settings) {
      return {
        enabled: false,
        methods: {
          totp: false,
          email: false,
          sms: false
        },
        backupCodesRemaining: 0
      };
    }

    return {
      enabled: settings.totpEnabled || settings.emailEnabled || settings.smsEnabled,
      methods: {
        totp: settings.totpEnabled,
        email: settings.emailEnabled,
        sms: settings.smsEnabled
      },
      backupCodesRemaining: settings.backupCodes.length - settings.usedBackupCodes.size
    };
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string): Promise<boolean> {
    const settings = this.userMFASettings.get(userId);
    if (!settings) {
      return false;
    }

    settings.totpEnabled = false;
    settings.emailEnabled = false;
    settings.smsEnabled = false;
    settings.totpSecret = undefined;
    settings.backupCodes = [];
    settings.usedBackupCodes.clear();

    this.userMFASettings.set(userId, settings);
    this.emit("mfaDisabled", { userId });

    return true;
  }

  /**
   * Clean up expired verification codes
   */
  async cleanupExpiredCodes(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, pending] of this.pendingVerifications.entries()) {
      if (pending.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.pendingVerifications.delete(key));
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Generate 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}