/**
 * Permission Manager implementation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IPermissionManager,
  Operation,
  PermissionContext,
  AuditEntry,
  AuditFilter
} from '../../xlib/interfaces/infrastructure.interfaces';

interface DangerousMode {
  enabled: boolean;
  reason: string;
  enabledAt: Date;
  expiresAt?: Date;
}

export class PermissionManager implements IPermissionManager {
  private dangerousMode: DangerousMode;
  private auditLog: AuditEntry[];
  private maxAuditEntries: number;
  private permissionRules: Map<string, PermissionRule>;

  constructor(config?: {
    maxAuditEntries?: number;
  }) {
    this.dangerousMode = {
      enabled: false,
      reason: '',
      enabledAt: new Date()
    };
    this.auditLog = [];
    this.maxAuditEntries = config?.maxAuditEntries || 10000;
    this.permissionRules = new Map();

    // Initialize default permission rules
    this.initializeDefaultRules();
  }

  async checkPermission(operation: Operation, context: PermissionContext): Promise<boolean> {
    // Check dangerous mode first
    if (this.isDangerousModeEnabled()) {
      await this.auditOperation(operation, { allowed: true, reason: 'dangerous_mode' }, context);
      return true;
    }

    // Check specific permission rules
    const allowed = await this.evaluatePermission(operation, context);
    
    await this.auditOperation(operation, { allowed }, context);
    
    return allowed;
  }

  async requestPermission(operation: Operation, reason: string): Promise<boolean> {
    // In this implementation, we'll auto-approve with logging
    // In production, this might trigger a UI prompt or workflow
    
    const context: PermissionContext = {
      metadata: { reason, requestId: uuidv4() }
    };

    const allowed = await this.checkPermission(operation, context);
    
    if (!allowed) {
      // Log the denial with reason
      await this.auditOperation(operation, {
        allowed: false,
        denialReason: 'Permission request denied',
        requestReason: reason
      }, context);
    }

    return allowed;
  }

  async enableDangerousMode(reason: string, duration?: number): Promise<void> {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Dangerous mode requires a detailed reason (min 10 characters)');
    }

    const now = new Date();
    const expiresAt = duration ? new Date(now.getTime() + duration) : undefined;

    this.dangerousMode = {
      enabled: true,
      reason,
      enabledAt: now,
      expiresAt
    };

    // Audit the dangerous mode activation
    await this.auditOperation(
      {
        type: 'admin',
        resource: 'system',
        action: 'enable_dangerous_mode'
      },
      {
        allowed: true,
        reason,
        duration,
        expiresAt
      },
      {}
    );
  }

  async disableDangerousMode(): Promise<void> {
    const wasEnabled = this.dangerousMode.enabled;
    
    this.dangerousMode = {
      enabled: false,
      reason: '',
      enabledAt: new Date()
    };

    if (wasEnabled) {
      // Audit the dangerous mode deactivation
      await this.auditOperation(
        {
          type: 'admin',
          resource: 'system',
          action: 'disable_dangerous_mode'
        },
        { allowed: true },
        {}
      );
    }
  }

  isDangerousModeEnabled(): boolean {
    if (!this.dangerousMode.enabled) {
      return false;
    }

    // Check if dangerous mode has expired
    if (this.dangerousMode.expiresAt && this.dangerousMode.expiresAt < new Date()) {
      this.dangerousMode.enabled = false;
      return false;
    }

    return true;
  }

  async auditOperation(operation: Operation, result: any, context: PermissionContext): Promise<void> {
    const entry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      operation,
      result: result.allowed ? 'success' : 'denied',
      context,
      details: result
    };

    this.auditLog.push(entry);

    // Trim audit log if it's too large
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }
  }

  async getAuditLog(filter?: AuditFilter): Promise<AuditEntry[]> {
    let entries = [...this.auditLog];

    if (filter) {
      entries = entries.filter(entry => {
        if (filter.startDate && entry.timestamp < filter.startDate) return false;
        if (filter.endDate && entry.timestamp > filter.endDate) return false;
        if (filter.user && entry.context.user?.id !== filter.user) return false;
        if (filter.agent && entry.context.agent !== filter.agent) return false;
        if (filter.operation && entry.operation.action !== filter.operation) return false;
        if (filter.result && entry.result !== filter.result) return false;
        
        return true;
      });
    }

    // Return in reverse chronological order
    return entries.reverse();
  }

  // Private helper methods
  private async evaluatePermission(operation: Operation, context: PermissionContext): Promise<boolean> {
    // Check user permissions
    if (context.user) {
      const userPermissions = context.user.permissions || [];
      
      // Check for wildcard permission
      if (userPermissions.includes('*')) {
        return true;
      }

      // Check for specific permission
      const requiredPermission = `${operation.resource}:${operation.action}`;
      if (userPermissions.includes(requiredPermission)) {
        return true;
      }

      // Check for resource wildcard
      const resourceWildcard = `${operation.resource}:*`;
      if (userPermissions.includes(resourceWildcard)) {
        return true;
      }
    }

    // Check environment-based rules
    if (context.environment === 'development') {
      // More permissive in development
      if (operation.type === 'read') return true;
    }

    // Check custom permission rules
    const ruleKey = `${operation.type}:${operation.resource}:${operation.action}`;
    const rule = this.permissionRules.get(ruleKey);
    if (rule) {
      return rule.evaluate(operation, context);
    }

    // Default deny for write/delete/admin operations
    if (operation.type === 'write' || operation.type === 'delete' || operation.type === 'admin') {
      return false;
    }

    // Default allow for read operations
    return operation.type === 'read';
  }

  private initializeDefaultRules(): void {
    // Add some default permission rules
    
    // Allow all read operations on public resources
    this.addRule('read:public:*', {
      evaluate: () => true
    });

    // Deny all delete operations on system resources
    this.addRule('delete:system:*', {
      evaluate: (op, ctx) => {
        // Only allow if user has admin role
        return ctx.user?.roles?.includes('admin') || false;
      }
    });

    // Allow agent operations for authenticated agents
    this.addRule('*:agent:*', {
      evaluate: (op, ctx) => {
        return !!ctx.agent && !!ctx.session;
      }
    });
  }

  private addRule(pattern: string, rule: PermissionRule): void {
    this.permissionRules.set(pattern, rule);
  }

  // Statistics methods
  getStatistics(): {
    totalOperations: number;
    allowedOperations: number;
    deniedOperations: number;
    dangerousModeActivations: number;
  } {
    let allowed = 0;
    let denied = 0;
    let dangerousActivations = 0;

    for (const entry of this.auditLog) {
      if (entry.result === 'success') allowed++;
      else if (entry.result === 'denied') denied++;
      
      if (entry.operation.action === 'enable_dangerous_mode') {
        dangerousActivations++;
      }
    }

    return {
      totalOperations: this.auditLog.length,
      allowedOperations: allowed,
      deniedOperations: denied,
      dangerousModeActivations: dangerousActivations
    };
  }

  // Export audit log
  async exportAuditLog(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.auditLog, null, 2);
    }

    // CSV format
    const headers = ['ID', 'Timestamp', 'Operation Type', 'Resource', 'Action', 'Result', 'User', 'Agent'];
    const rows = [headers];

    for (const entry of this.auditLog) {
      rows.push([
        entry.id,
        entry.timestamp.toISOString(),
        entry.operation.type,
        entry.operation.resource,
        entry.operation.action,
        entry.result,
        entry.context.user?.username || '',
        entry.context.agent || ''
      ]);
    }

    return rows.map(row => row.join(',')).join('\n');
  }
}

interface PermissionRule {
  evaluate(operation: Operation, context: PermissionContext): boolean;
}

// Singleton instance
let permissionManagerInstance: PermissionManager | null = null;

export function getPermissionManager(config?: {
  maxAuditEntries?: number;
}): PermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager(config);
  }
  return permissionManagerInstance;
}