import { EventEmitter } from '../../../../../infra_external-log-lib/src';

export interface ToolPermission {
  name: string;
  allowed: boolean;
  requiresConfirmation: boolean;
  restrictions?: ToolRestriction[];
}

export interface ToolRestriction {
  type: 'path' | 'pattern' | 'size' | 'custom';
  value: any;
  message?: string;
}

export interface PermissionProfile {
  name: string;
  dangerousMode: boolean;
  allowedTools: string[];
  deniedTools: string[];
  toolPermissions: Map<string, ToolPermission>;
  globalRestrictions: ToolRestriction[];
}

export interface PermissionRequest {
  tool: string;
  action: string;
  target?: string;
  context?: Record<string, any>;
  sessionId?: string;
}

export interface PermissionDecision {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  restrictions?: ToolRestriction[];
}

export interface PermissionAuditEntry {
  timestamp: Date;
  request: PermissionRequest;
  decision: PermissionDecision;
  profile: string;
  dangerousMode: boolean;
}

export class PermissionManager extends EventEmitter {
  private profiles: Map<string, PermissionProfile>;
  private activeProfile: string;
  private auditLog: PermissionAuditEntry[];
  private maxAuditEntries: number;
  private dangerousModeOverride: boolean;

  constructor(config: { maxAuditEntries?: number } = {}) {
    super();
    
    this.profiles = new Map();
    this.activeProfile = 'default';
    this.auditLog = [];
    this.maxAuditEntries = config.maxAuditEntries || 1000;
    this.dangerousModeOverride = false;

    // Initialize default profiles
    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles(): void {
    // Safe default profile
    this.profiles.set('default', {
      name: 'default',
      dangerousMode: false,
      allowedTools: ['read_file', 'list_directory', 'search_files'],
      deniedTools: ['delete_file', 'execute_command', 'modify_system'],
      toolPermissions: new Map([
        ['read_file', {
          name: 'read_file',
          allowed: true,
          requiresConfirmation: false,
          restrictions: [
            {
              type: 'path',
              value: /^(?!\/etc|\/sys|\/proc)/,
              message: 'Cannot read system directories'
            }
          ]
        }],
        ['write_file', {
          name: 'write_file',
          allowed: true,
          requiresConfirmation: true,
          restrictions: [
            {
              type: 'path',
              value: /^(?!\/etc|\/sys|\/proc|\/boot)/,
              message: 'Cannot write to system directories'
            },
            {
              type: 'size',
              value: 10 * 1024 * 1024, // 10MB
              message: 'File size limit: 10MB'
            }
          ]
        }]
      ]),
      globalRestrictions: []
    });

    // Development profile - more permissive
    this.profiles.set('development', {
      name: 'development',
      dangerousMode: false,
      allowedTools: [
        'read_file', 'write_file', 'list_directory', 
        'search_files', 'execute_command', 'create_directory'
      ],
      deniedTools: ['delete_system_file', 'modify_boot'],
      toolPermissions: new Map([
        ['execute_command', {
          name: 'execute_command',
          allowed: true,
          requiresConfirmation: true,
          restrictions: [
            {
              type: 'pattern',
              value: /^(?!sudo|rm -rf|dd if)/,
              message: 'Dangerous commands blocked'
            }
          ]
        }]
      ]),
      globalRestrictions: [
        {
          type: 'path',
          value: /^(?!\/)/,
          message: 'Must use absolute paths'
        }
      ]
    });

    // Dangerous mode profile - use with extreme caution
    this.profiles.set('dangerous', {
      name: 'dangerous',
      dangerousMode: true,
      allowedTools: ['*'], // All tools allowed
      deniedTools: [],
      toolPermissions: new Map([
        ['*', {
          name: '*',
          allowed: true,
          requiresConfirmation: false,
          restrictions: [] // No restrictions in dangerous mode
        }]
      ]),
      globalRestrictions: []
    });
  }

  async checkPermission(request: PermissionRequest): Promise<PermissionDecision> {
    const profile = this.profiles.get(this.activeProfile);
    if (!profile) {
      throw new Error(`Unknown permission profile: ${this.activeProfile}`);
    }

    let decision: PermissionDecision;

    // Check if dangerous mode is active
    if (profile.dangerousMode || this.dangerousModeOverride) {
      decision = {
        allowed: true,
        requiresConfirmation: false,
        reason: 'Dangerous mode active - all permissions granted'
      };
    } else {
      decision = await this.evaluatePermission(request, profile);
    }

    // Audit the decision
    this.auditDecision(request, decision, profile);

    // Emit permission check event
    this.emit('permission_checked', {
      request,
      decision,
      profile: profile.name,
      dangerousMode: profile.dangerousMode || this.dangerousModeOverride
    });

    return decision;
  }

  private async evaluatePermission(
    request: PermissionRequest,
    profile: PermissionProfile
  ): Promise<PermissionDecision> {
    // Check if tool is explicitly denied
    if (profile.deniedTools.includes(request.tool)) {
      return {
        allowed: false,
        reason: `Tool '${request.tool}' is explicitly denied in profile '${profile.name}'`,
        requiresConfirmation: false
      };
    }

    // Check if tool is in allowed list (unless * is allowed)
    if (!profile.allowedTools.includes('*') && !profile.allowedTools.includes(request.tool)) {
      return {
        allowed: false,
        reason: `Tool '${request.tool}' is not in allowed list for profile '${profile.name}'`,
        requiresConfirmation: false
      };
    }

    // Get tool-specific permissions
    const toolPermission = profile.toolPermissions.get(request.tool) || 
                          profile.toolPermissions.get('*');

    if (!toolPermission || !toolPermission.allowed) {
      return {
        allowed: false,
        reason: `No permission configuration for tool '${request.tool}'`,
        requiresConfirmation: false
      };
    }

    // Check restrictions
    const failedRestrictions: ToolRestriction[] = [];
    
    // Check tool-specific restrictions
    if (toolPermission.restrictions) {
      for (const restriction of toolPermission.restrictions) {
        if (!this.checkRestriction(restriction, request)) {
          failedRestrictions.push(restriction);
        }
      }
    }

    // Check global restrictions
    for (const restriction of profile.globalRestrictions) {
      if (!this.checkRestriction(restriction, request)) {
        failedRestrictions.push(restriction);
      }
    }

    if (failedRestrictions.length > 0) {
      return {
        allowed: false,
        reason: 'Failed restrictions',
        restrictions: failedRestrictions,
        requiresConfirmation: false
      };
    }

    return {
      allowed: true,
      requiresConfirmation: toolPermission.requiresConfirmation,
      restrictions: [...(toolPermission.restrictions || []), ...profile.globalRestrictions]
    };
  }

  private checkRestriction(restriction: ToolRestriction, request: PermissionRequest): boolean {
    switch (restriction.type) {
      case 'path':
        if (request.target && restriction.value instanceof RegExp) {
          return restriction.value.test(request.target);
        }
        break;

      case 'pattern':
        const value = request.target || request.context?.command || '';
        if (restriction.value instanceof RegExp) {
          return restriction.value.test(value);
        }
        break;

      case 'size':
        const size = request.context?.size;
        if (typeof size === 'number' && typeof restriction.value === 'number') {
          return size <= restriction.value;
        }
        break;

      case 'custom':
        if (typeof restriction.value === 'function') {
          return restriction.value(request);
        }
        break;
    }

    // If we can't evaluate the restriction, fail safe
    return false;
  }

  private auditDecision(
    request: PermissionRequest,
    decision: PermissionDecision,
    profile: PermissionProfile
  ): void {
    const entry: PermissionAuditEntry = {
      timestamp: new Date(),
      request,
      decision,
      profile: profile.name,
      dangerousMode: profile.dangerousMode || this.dangerousModeOverride
    };

    this.auditLog.push(entry);

    // Limit audit log size
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }

    this.emit('permission_audited', entry);
  }

  setActiveProfile(profileName: string): void {
    if (!this.profiles.has(profileName)) {
      throw new Error(`Unknown profile: ${profileName}`);
    }

    const oldProfile = this.activeProfile;
    this.activeProfile = profileName;

    this.emit('profile_changed', {
      oldProfile,
      newProfile: profileName,
      profile: this.profiles.get(profileName)
    });
  }

  enableDangerousMode(reason?: string): void {
    this.dangerousModeOverride = true;
    
    this.emit('dangerous_mode_enabled', {
      reason,
      timestamp: new Date()
    });

    // Audit this action
    this.auditLog.push({
      timestamp: new Date(),
      request: {
        tool: 'system',
        action: 'enable_dangerous_mode',
        context: { reason }
      },
      decision: {
        allowed: true,
        reason: 'Dangerous mode enabled by user',
        requiresConfirmation: false
      },
      profile: this.activeProfile,
      dangerousMode: true
    });
  }

  disableDangerousMode(): void {
    this.dangerousModeOverride = false;
    
    this.emit('dangerous_mode_disabled', {
      timestamp: new Date()
    });

    // Audit this action
    this.auditLog.push({
      timestamp: new Date(),
      request: {
        tool: 'system',
        action: 'disable_dangerous_mode'
      },
      decision: {
        allowed: true,
        reason: 'Dangerous mode disabled',
        requiresConfirmation: false
      },
      profile: this.activeProfile,
      dangerousMode: false
    });
  }

  isDangerousModeActive(): boolean {
    const profile = this.profiles.get(this.activeProfile);
    return this.dangerousModeOverride || (profile?.dangerousMode || false);
  }

  addProfile(profile: PermissionProfile): void {
    this.profiles.set(profile.name, profile);
    this.emit('profile_added', { profile });
  }

  getProfile(name: string): PermissionProfile | undefined {
    return this.profiles.get(name);
  }

  getActiveProfile(): PermissionProfile | undefined {
    return this.profiles.get(this.activeProfile);
  }

  getAuditLog(filter?: {
    since?: Date;
    tool?: string;
    allowed?: boolean;
    dangerousMode?: boolean;
  }): PermissionAuditEntry[] {
    let entries = [...this.auditLog];

    if (filter) {
      if (filter.since) {
        entries = entries.filter(e => e.timestamp > filter.since!);
      }
      if (filter.tool) {
        entries = entries.filter(e => e.request.tool === filter.tool);
      }
      if (filter.allowed !== undefined) {
        entries = entries.filter(e => e.decision.allowed === filter.allowed);
      }
      if (filter.dangerousMode !== undefined) {
        entries = entries.filter(e => e.dangerousMode === filter.dangerousMode);
      }
    }

    return entries;
  }

  clearAuditLog(): void {
    this.auditLog = [];
    this.emit('audit_log_cleared');
  }

  exportProfile(name: string): string {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    // Convert Map to array for serialization
    const toolPermissionsArray = Array.from(profile.toolPermissions.entries());
    
    return JSON.stringify({
      ...profile,
      toolPermissions: toolPermissionsArray
    }, null, 2);
  }

  importProfile(jsonData: string): void {
    const data = JSON.parse(jsonData);
    
    // Convert array back to Map
    const toolPermissions = new Map(data.toolPermissions);
    
    const profile: PermissionProfile = {
      ...data,
      toolPermissions
    };

    this.addProfile(profile);
  }

  getStats(): {
    totalChecks: number;
    allowed: number;
    denied: number;
    dangerousModeUsage: number;
    profileUsage: Record<string, number>;
  } {
    const stats = {
      totalChecks: this.auditLog.length,
      allowed: 0,
      denied: 0,
      dangerousModeUsage: 0,
      profileUsage: {} as Record<string, number>
    };

    for (const entry of this.auditLog) {
      if (entry.decision.allowed) {
        stats.allowed++;
      } else {
        stats.denied++;
      }

      if (entry.dangerousMode) {
        stats.dangerousModeUsage++;
      }

      stats.profileUsage[entry.profile] = (stats.profileUsage[entry.profile] || 0) + 1;
    }

    return stats;
  }
}