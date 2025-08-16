/**
 * Credential API - REST API for credential management
 * 
 * Provides secure endpoints for storing, retrieving, and managing credentials
 */

import { Router, Request, Response, NextFunction } from 'express';
import { CredentialStore, StoredCredential, CredentialType } from './CredentialStore';
import { AuthService } from './AuthService';
import { AuditLogger } from './AuditLogger';
import { UserRole } from '../common/types/User';

export interface CredentialRequest {
  type: CredentialType;
  apiKey?: string;
  metadata?: Record<string, any>;
  autoRotate?: boolean;
  rotationDays?: number;
}

export interface CredentialResponse {
  success: boolean;
  credential?: Partial<StoredCredential>;
  message?: string;
}

export interface CredentialRotationConfig {
  enabled: boolean;
  intervalDays: number;
  notifyBeforeDays: number;
}

export class CredentialAPI {
  private router: Router;
  private credentialStore: CredentialStore;
  private authService: AuthService;
  private auditLogger: AuditLogger;
  private rotationConfigs: Map<string, CredentialRotationConfig>;

  constructor(
    credentialStore: CredentialStore,
    authService: AuthService,
    auditLogger: AuditLogger
  ) {
    this.router = Router();
    this.credentialStore = credentialStore;
    this.authService = authService;
    this.auditLogger = auditLogger;
    this.rotationConfigs = new Map();
    
    this.setupRoutes();
    this.startRotationScheduler();
  }

  /**
   * Get the Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Middleware to ensure authentication
    this.router.use(this.requireAuth.bind(this));

    // Store a new credential
    this.router.post('/credentials', this.storeCredential.bind(this));

    // Get a specific credential
    this.router.get('/credentials/:type', this.getCredential.bind(this));

    // List all user credentials (metadata only)
    this.router.get('/credentials', this.listCredentials.bind(this));

    // Update a credential
    this.router.put('/credentials/:type', this.updateCredential.bind(this));

    // Delete a credential
    this.router.delete('/credentials/:type', this.deleteCredential.bind(this));

    // Rotate a credential
    this.router.post('/credentials/:type/rotate', this.rotateCredential.bind(this));

    // Shared app credentials (admin only)
    this.router.post('/credentials/shared/:appName', this.requireAdmin.bind(this), this.storeSharedCredential.bind(this));
    this.router.get('/credentials/shared/:appName', this.getSharedCredential.bind(this));

    // Audit log endpoints (admin only)
    this.router.get('/credentials/audit/logs', this.requireAdmin.bind(this), this.getAuditLogs.bind(this));
    this.router.get('/credentials/audit/user/:userId', this.requireAdmin.bind(this), this.getUserAuditLogs.bind(this));
  }

  /**
   * Middleware to require authentication
   */
  private async requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = await this.authService.getCurrentUser(req);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    (req as any).user = user;
    next();
  }

  /**
   * Middleware to require admin role
   */
  private async requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;
    
    if (!user?.roles?.includes(UserRole.ADMIN)) {
      await this.auditLogger.log({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        userId: user?.id || 'unknown',
        resource: req.path,
        ip: req.ip
      });

      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    next();
  }

  /**
   * Store a new credential
   */
  private async storeCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const credentialReq: CredentialRequest = req.body;

      // Validate request
      if (!credentialReq.type) {
        res.status(400).json({
          success: false,
          message: 'Credential type is required'
        });
        return;
      }

      // Store the credential
      const credential: StoredCredential = {
        userId: user.id,
        type: credentialReq.type,
        apiKey: credentialReq.apiKey,
        metadata: credentialReq.metadata,
        createdAt: new Date()
      };

      await this.credentialStore.storeCredential(credential);

      // Set up rotation if requested
      if (credentialReq.autoRotate) {
        this.rotationConfigs.set(
          `${user.id}:${credentialReq.type}`,
          {
            enabled: true,
            intervalDays: credentialReq.rotationDays || 90,
            notifyBeforeDays: 7
          }
        );
      }

      // Audit log
      await this.auditLogger.log({
        action: 'CREDENTIAL_STORED',
        userId: user.id,
        resource: `credential:${credentialReq.type}`,
        details: {
          type: credentialReq.type,
          autoRotate: credentialReq.autoRotate
        }
      });

      res.json({
        success: true,
        credential: {
          type: credential.type,
          metadata: credential.metadata,
          createdAt: credential.createdAt
        }
      });
    } catch (error: any) {
      console.error('Failed to store credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to store credential'
      });
    }
  }

  /**
   * Get a specific credential
   */
  private async getCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const type = req.params.type as CredentialType;

      const credential = await this.credentialStore.getCredential(user.id, type);

      if (!credential) {
        res.status(404).json({
          success: false,
          message: 'Credential not found'
        });
        return;
      }

      // Audit log
      await this.auditLogger.log({
        action: 'CREDENTIAL_ACCESSED',
        userId: user.id,
        resource: `credential:${type}`,
        ip: req.ip
      });

      // Don't send password hash directly
      const response: Partial<StoredCredential> = {
        type: credential.type,
        metadata: credential.metadata,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt
      };

      // Include API key only if explicitly requested
      if (req.query.includeSecret === 'true' && credential.apiKey) {
        response.apiKey = credential.apiKey;
        
        // Extra audit log for secret access
        await this.auditLogger.log({
          action: 'CREDENTIAL_SECRET_ACCESSED',
          userId: user.id,
          resource: `credential:${type}`,
          ip: req.ip,
          severity: 'HIGH'
        });
      }

      res.json({
        success: true,
        credential: response
      });
    } catch (error: any) {
      console.error('Failed to get credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve credential'
      });
    }
  }

  /**
   * List all user credentials (metadata only)
   */
  private async listCredentials(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const credentials = await this.credentialStore.getUserCredentials(user.id);

      // Audit log
      await this.auditLogger.log({
        action: 'CREDENTIALS_LISTED',
        userId: user.id,
        details: { count: credentials.length }
      });

      res.json({
        success: true,
        credentials
      });
    } catch (error: any) {
      console.error('Failed to list credentials:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list credentials'
      });
    }
  }

  /**
   * Update a credential
   */
  private async updateCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const type = req.params.type as CredentialType;
      const updates: CredentialRequest = req.body;

      // Get existing credential
      const existing = await this.credentialStore.getCredential(user.id, type);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Credential not found'
        });
        return;
      }

      // Update credential
      const updated: StoredCredential = {
        ...existing,
        apiKey: updates.apiKey || existing.apiKey,
        metadata: { ...existing.metadata, ...updates.metadata },
        updatedAt: new Date()
      };

      await this.credentialStore.storeCredential(updated);

      // Audit log
      await this.auditLogger.log({
        action: 'CREDENTIAL_UPDATED',
        userId: user.id,
        resource: `credential:${type}`,
        details: { hasNewSecret: !!updates.apiKey }
      });

      res.json({
        success: true,
        credential: {
          type: updated.type,
          metadata: updated.metadata,
          updatedAt: updated.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Failed to update credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update credential'
      });
    }
  }

  /**
   * Delete a credential
   */
  private async deleteCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const type = req.params.type as CredentialType;

      await this.credentialStore.deleteCredential(user.id, type);

      // Remove rotation config
      this.rotationConfigs.delete(`${user.id}:${type}`);

      // Audit log
      await this.auditLogger.log({
        action: 'CREDENTIAL_DELETED',
        userId: user.id,
        resource: `credential:${type}`,
        severity: 'HIGH'
      });

      res.json({
        success: true,
        message: 'Credential deleted successfully'
      });
    } catch (error: any) {
      console.error('Failed to delete credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete credential'
      });
    }
  }

  /**
   * Rotate a credential
   */
  private async rotateCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const type = req.params.type as CredentialType;

      // Generate new credential value
      const newApiKey = this.generateSecureApiKey();

      // Update credential
      const credential: StoredCredential = {
        userId: user.id,
        type,
        apiKey: newApiKey,
        metadata: {
          rotatedAt: new Date(),
          rotatedBy: user.id
        },
        createdAt: new Date()
      };

      await this.credentialStore.storeCredential(credential);

      // Audit log
      await this.auditLogger.log({
        action: 'CREDENTIAL_ROTATED',
        userId: user.id,
        resource: `credential:${type}`,
        severity: 'HIGH',
        details: { manual: true }
      });

      res.json({
        success: true,
        credential: {
          type: credential.type,
          apiKey: newApiKey,
          rotatedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Failed to rotate credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rotate credential'
      });
    }
  }

  /**
   * Store shared app credentials (admin only)
   */
  private async storeSharedCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const appName = req.params.appName;
      const credentials = req.body;

      await this.credentialStore.storeSharedCredentials(appName, credentials);

      // Audit log
      await this.auditLogger.log({
        action: 'SHARED_CREDENTIAL_STORED',
        userId: user.id,
        resource: `app:${appName}`,
        severity: 'HIGH',
        details: { credentialKeys: Object.keys(credentials) }
      });

      res.json({
        success: true,
        message: `Shared credentials stored for ${appName}`
      });
    } catch (error: any) {
      console.error('Failed to store shared credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to store shared credential'
      });
    }
  }

  /**
   * Get shared app credentials
   */
  private async getSharedCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const appName = req.params.appName;

      const credentials = await this.credentialStore.getSharedCredentials(appName);

      if (!credentials) {
        res.status(404).json({
          success: false,
          message: 'Shared credentials not found'
        });
        return;
      }

      // Audit log
      await this.auditLogger.log({
        action: 'SHARED_CREDENTIAL_ACCESSED',
        userId: user.id,
        resource: `app:${appName}`,
        ip: req.ip
      });

      res.json({
        success: true,
        credentials
      });
    } catch (error: any) {
      console.error('Failed to get shared credential:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve shared credential'
      });
    }
  }

  /**
   * Get audit logs (admin only)
   */
  private async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const severity = req.query.severity as string;

      const logs = await this.auditLogger.getLogs({
        limit,
        offset,
        severity
      });

      res.json({
        success: true,
        logs
      });
    } catch (error: any) {
      console.error('Failed to get audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs'
      });
    }
  }

  /**
   * Get user-specific audit logs (admin only)
   */
  private async getUserAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 100;

      const logs = await this.auditLogger.getUserLogs(userId, limit);

      res.json({
        success: true,
        logs
      });
    } catch (error: any) {
      console.error('Failed to get user audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user audit logs'
      });
    }
  }

  /**
   * Generate a secure API key
   */
  private generateSecureApiKey(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Start automatic credential rotation scheduler
   */
  private startRotationScheduler(): void {
    // Check for credentials needing rotation every day
    setInterval(async () => {
      await this.checkAndRotateCredentials();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Check and rotate credentials that need rotation
   */
  private async checkAndRotateCredentials(): Promise<void> {
    for (const [key, config] of this.rotationConfigs) {
      if (!config.enabled) continue;

      const [userId, type] = key.split(':');
      const credential = await this.credentialStore.getCredential(userId, type as CredentialType);

      if (!credential) continue;

      const daysSinceUpdate = Math.floor(
        (Date.now() - (credential.updatedAt || credential.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if rotation is needed
      if (daysSinceUpdate >= config.intervalDays) {
        const newApiKey = this.generateSecureApiKey();
        
        await this.credentialStore.storeCredential({
          ...credential,
          apiKey: newApiKey,
          metadata: {
            ...credential.metadata,
            autoRotatedAt: new Date()
          }
        });

        // Audit log
        await this.auditLogger.log({
          action: 'CREDENTIAL_AUTO_ROTATED',
          userId,
          resource: `credential:${type}`,
          severity: 'HIGH',
          details: { 
            daysSinceUpdate,
            intervalDays: config.intervalDays
          }
        });
      }
      // Send notification if rotation is coming soon
      else if (daysSinceUpdate >= (config.intervalDays - config.notifyBeforeDays)) {
        await this.auditLogger.log({
          action: 'CREDENTIAL_ROTATION_PENDING',
          userId,
          resource: `credential:${type}`,
          details: { 
            daysUntilRotation: config.intervalDays - daysSinceUpdate
          }
        });
      }
    }
  }
}