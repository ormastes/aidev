/**
 * Credential Store - Secure storage for user credentials
 * 
 * Handles encrypted storage of passwords, API keys, and other sensitive data
 */

import { crypto } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface StoredCredential {
  userId: string;
  type: CredentialType;
  passwordHash?: string;
  apiKey?: string;
  encryptedData?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export enum CredentialType {
  password: "PLACEHOLDER",
  apiKey = process.env.API_KEY || 'PLACEHOLDER_API_KEY',
  OAUTH_token: process.env.TOKEN || "PLACEHOLDER",
  CERTIFICATE = "certificate"
}

export interface CredentialStoreConfig {
  storagePath?: string;
  encryptionKey?: string;
  algorithm?: string;
}

export class CredentialStore {
  private storagePath: string;
  private encryptionKey: Buffer;
  private algorithm: string;
  private credentials: Map<string, StoredCredential>;

  constructor(config?: CredentialStoreConfig) {
    this.storagePath = config?.storagePath || path.join(process.cwd(), '.credentials');
    this.algorithm = config?.algorithm || 'aes-256-gcm';
    
    // Use provided key or generate from environment
    const keySource = config?.encryptionKey || process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(keySource, 'salt', 32);
    
    this.credentials = new Map();
    this.loadCredentials();
  }

  /**
   * Store a credential
   */
  async storeCredential(credential: StoredCredential): Promise<void> {
    const key = this.getCredentialKey(credential.userId, credential.type);
    
    // Encrypt sensitive data if needed
    if (credential.apiKey || credential.encryptedData) {
      credential = this.encryptCredential(credential);
    }
    
    this.credentials.set(key, {
      ...credential,
      updatedAt: new Date()
    });
    
    await this.saveCredentials();
  }

  /**
   * Get a credential
   */
  async getCredential(userId: string, type: CredentialType = CredentialType.PASSWORD): Promise<StoredCredential | null> {
    const key = this.getCredentialKey(userId, type);
    const credential = this.credentials.get(key);
    
    if (!credential) {
      return null;
    }
    
    // Decrypt if needed
    if (credential.encryptedData) {
      return this.decryptCredential(credential);
    }
    
    return credential;
  }

  /**
   * Delete a credential
   */
  async deleteCredential(userId: string, type: CredentialType): Promise<void> {
    const key = this.getCredentialKey(userId, type);
    this.credentials.delete(key);
    await this.saveCredentials();
  }

  /**
   * List all credentials for a user
   */
  async getUserCredentials(userId: string): Promise<StoredCredential[]> {
    const userCredentials: StoredCredential[] = [];
    
    for (const [key, credential] of this.credentials) {
      if (credential.userId === userId) {
        // Don't include sensitive data in list
        userCredentials.push({
          userId: credential.userId,
          type: credential.type,
          metadata: credential.metadata,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt
        });
      }
    }
    
    return userCredentials;
  }

  /**
   * Store shared credentials for apps
   */
  async storeSharedCredentials(appName: string, credentials: Record<string, any>): Promise<void> {
    const encrypted = this.encrypt(JSON.stringify(credentials));
    
    await this.storeCredential({
      userId: `app:${appName}`,
      type: CredentialType.API_KEY,
      encryptedData: encrypted,
      metadata: { appName },
      createdAt: new Date()
    });
  }

  /**
   * Get shared credentials for an app
   */
  async getSharedCredentials(appName: string): Promise<Record<string, any> | null> {
    const credential = await this.getCredential(`app:${appName}`, CredentialType.API_KEY);
    
    if (!credential || !credential.encryptedData) {
      return null;
    }
    
    try {
      const decrypted = this.decrypt(credential.encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt shared credentials:', error);
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   */
  private async encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private async decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    (decipher as any).setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt credential data
   */
  private async encryptCredential(credential: StoredCredential): StoredCredential {
    const toEncrypt: any = {};
    
    if (credential.apiKey) {
      toEncrypt.apiKey = credential.apiKey;
    }
    
    if (Object.keys(toEncrypt).length > 0) {
      return {
        ...credential,
        apiKey: undefined,
        encryptedData: this.encrypt(JSON.stringify(toEncrypt))
      };
    }
    
    return credential;
  }

  /**
   * Decrypt credential data
   */
  private async decryptCredential(credential: StoredCredential): StoredCredential {
    if (!credential.encryptedData) {
      return credential;
    }
    
    try {
      const decrypted = this.decrypt(credential.encryptedData);
      const data = JSON.parse(decrypted);
      
      return {
        ...credential,
        ...data,
        encryptedData: undefined
      };
    } catch (error) {
      console.error('Failed to decrypt credential:', error);
      return credential;
    }
  }

  /**
   * Get credential storage key
   */
  private async getCredentialKey(userId: string, type: CredentialType): string {
    return `${userId}:${type}`;
  }

  /**
   * Load credentials from disk
   */
  private async loadCredentials(): Promise<void> {
    try {
      const data = await fileAPI.readFile(this.storagePath, 'utf-8');
      const stored = JSON.parse(data);
      
      this.credentials = new Map(
        Object.entries(stored).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            createdAt: new Date(value.createdAt),
            updatedAt: value.updatedAt ? new Date(value.updatedAt) : undefined
          }
        ])
      );
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.credentials = new Map();
    }
  }

  /**
   * Save credentials to disk
   */
  private async saveCredentials(): Promise<void> {
    const stored: Record<string, any> = {};
    
    for (const [key, credential] of this.credentials) {
      stored[key] = credential;
    }
    
    await fileAPI.createDirectory(path.dirname(this.storagePath));
    await fileAPI.createFile(this.storagePath, JSON.stringify(stored, { type: FileType.TEMPORARY }));
  }
}