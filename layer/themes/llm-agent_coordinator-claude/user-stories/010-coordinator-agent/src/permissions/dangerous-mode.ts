import { EventEmitter } from 'node:events';
import { PermissionManager, PermissionRequest, PermissionDecision } from './permission-manager';

export interface DangerousModeConfig {
  confirmationTimeout?: number;
  warningMessage?: string;
  allowedDuration?: number;
  requireReason?: boolean;
  auditAllActions?: boolean;
}

export interface DangerousModeSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  reason?: string;
  actionsExecuted: DangerousModeAction[];
  warningsIssued: number;
  active: boolean;
}

export interface DangerousModeAction {
  timestamp: Date;
  tool: string;
  action: string;
  target?: string;
  result?: 'IN_PROGRESS' | 'error' | 'aborted';
  error?: string;
}

export class DangerousModeManager extends EventEmitter {
  private config: Required<DangerousModeConfig>;
  private permissionManager: PermissionManager;
  private currentSession?: DangerousModeSession;
  private sessionHistory: DangerousModeSession[];
  private warningShown: boolean;
  private autoDisableTimer?: NodeJS.Timeout;

  constructor(
    permissionManager: PermissionManager,
    config: DangerousModeConfig = {}
  ) {
    super();
    
    this.permissionManager = permissionManager;
    this.config = {
      confirmationTimeout: config.confirmationTimeout || 30000, // 30 seconds
      warningMessage: config.warningMessage || this.getDefaultWarning(),
      allowedDuration: config.allowedDuration || 3600000, // 1 hour
      requireReason: config.requireReason !== false,
      auditAllActions: config.auditAllActions !== false
    };
    
    this.sessionHistory = [];
    this.warningShown = false;
  }

  private getDefaultWarning(): string {
    return `
⚠️  DANGEROUS MODE WARNING ⚠️

You are about to enable DANGEROUS MODE. This will:

- BYPASS ALL SAFETY CHECKS
- Allow UNRESTRICTED file system access
- Enable SYSTEM-LEVEL command execution  
- Permit DESTRUCTIVE operations without confirmation
- Remove ALL permission barriers

Risks include:
- Permanent data loss
- System corruption
- Security vulnerabilities
- Unrecoverable damage to development environment

This mode should ONLY be used when absolutely necessary and with extreme caution.

To confirm, you must acknowledge these risks.
`;
  }

  async enable(options: {
    reason?: string;
    duration?: number;
    skipWarning?: boolean;
  } = {}): Promise<boolean> {
    // Check if already enabled
    if (this.isEnabled()) {
      this.emit('already_enabled', { session: this.currentSession });
      return true;
    }

    // Validate reason if required
    if (this.config.requireReason && !options.reason) {
      this.emit('error', {
        type: 'missing_reason',
        message: 'Reason required for enabling dangerous mode'
      });
      return false;
    }

    // Show warning unless skipped
    if (!options.skipWarning && !this.warningShown) {
      const confirmed = await this.showWarningAndConfirm();
      if (!confirmed) {
        this.emit('enable_cancelled', { reason: 'User declined warning' });
        return false;
      }
      this.warningShown = true;
    }

    // Create new session
    this.currentSession = {
      id: `dangerous-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      startTime: new Date(),
      reason: options.reason,
      actionsExecuted: [],
      warningsIssued: 0,
      active: true
    };

    // Enable in permission manager
    this.permissionManager.enableDangerousMode(options.reason);

    // Set auto-disable timer if duration specified
    const duration = options.duration || this.config.allowedDuration;
    if (duration > 0) {
      this.autoDisableTimer = setTimeout(() => {
        this.disable('Auto-disable: Duration expired');
      }, duration);
    }

    // Emit events
    this.emit('enabled', {
      session: this.currentSession,
      duration,
      reason: options.reason
    });

    // Log to session history
    this.sessionHistory.push(this.currentSession);

    return true;
  }

  async disable(reason?: string): Promise<void> {
    if (!this.isEnabled()) {
      this.emit('already_disabled');
      return;
    }

    // Clear auto-disable timer
    if (this.autoDisableTimer) {
      clearTimeout(this.autoDisableTimer);
      this.autoDisableTimer = undefined;
    }

    // Update session
    if (this.currentSession) {
      this.currentSession.active = false;
      this.currentSession.endTime = new Date();
    }

    // Disable in permission manager
    this.permissionManager.disableDangerousMode();

    // Emit event
    this.emit("disabled", {
      session: this.currentSession,
      reason,
      stats: this.getSessionStats()
    });

    // Clear current session
    this.currentSession = undefined;
  }

  isEnabled(): boolean {
    return this.permissionManager.isDangerousModeActive();
  }

  async executeAction(
    tool: string,
    action: string,
    executor: () => Promise<any>,
    options: {
      target?: string;
      context?: Record<string, any>;
    } = {}
  ): Promise<any> {
    if (!this.isEnabled()) {
      throw new Error('Dangerous mode is not enabled');
    }

    const actionEntry: DangerousModeAction = {
      timestamp: new Date(),
      tool,
      action,
      target: options.target
    };

    // Add to current session
    if (this.currentSession) {
      this.currentSession.actionsExecuted.push(actionEntry);
    }

    // Emit pre-execution event
    this.emit('action_pre_execute', {
      session: this.currentSession,
      action: actionEntry,
      context: options.context
    });

    try {
      // Execute the action
      const result = await executor();
      
      actionEntry.result = 'IN_PROGRESS';
      
      // Emit post-execution event
      this.emit('action_executed', {
        session: this.currentSession,
        action: actionEntry,
        result
      });

      return result;
    } catch (error) {
      actionEntry.result = 'error';
      actionEntry.error = error instanceof Error ? error.message : String(error);
      
      // Emit error event
      this.emit('action_error', {
        session: this.currentSession,
        action: actionEntry,
        error
      });

      throw error;
    }
  }

  async checkAndExecute(
    request: PermissionRequest,
    executor: () => Promise<any>
  ): Promise<any> {
    // In dangerous mode, we still check permissions but with dangerous mode active
    const decision = await this.permissionManager.checkPermission(request);
    
    if (!decision.allowed) {
      throw new Error(`Permission denied even in dangerous mode: ${decision.reason}`);
    }

    return this.executeAction(
      request.tool,
      request.action,
      executor,
      {
        target: request.target,
        context: request.context
      }
    );
  }

  issueWarning(message: string): void {
    if (this.currentSession) {
      this.currentSession.warningsIssued++;
    }

    this.emit('warning_issued', {
      session: this.currentSession,
      message,
      count: this.currentSession?.warningsIssued || 0
    });
  }

  getSessionStats(): {
    duration: number;
    actionsExecuted: number;
    warningsIssued: number;
    actionsByTool: Record<string, number>;
    errorRate: number;
  } | null {
    if (!this.currentSession) {
      return null;
    }

    const duration = this.currentSession.endTime
      ? this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()
      : Date.now() - this.currentSession.startTime.getTime();

    const actionsByTool: Record<string, number> = {};
    let errorCount = 0;

    for (const action of this.currentSession.actionsExecuted) {
      actionsByTool[action.tool] = (actionsByTool[action.tool] || 0) + 1;
      if (action.result === 'error') {
        errorCount++;
      }
    }

    return {
      duration,
      actionsExecuted: this.currentSession.actionsExecuted.length,
      warningsIssued: this.currentSession.warningsIssued,
      actionsByTool,
      errorRate: this.currentSession.actionsExecuted.length > 0
        ? errorCount / this.currentSession.actionsExecuted.length
        : 0
    };
  }

  getHistory(filter?: {
    since?: Date;
    limit?: number;
    includeActions?: boolean;
  }): DangerousModeSession[] {
    let sessions = [...this.sessionHistory];

    if (filter?.since) {
      sessions = sessions.filter(s => s.startTime > filter.since!);
    }

    if (!filter?.includeActions) {
      // Remove detailed actions for privacy/size
      sessions = sessions.map(s => ({
        ...s,
        actionsExecuted: []
      }));
    }

    if (filter?.limit) {
      sessions = sessions.slice(-filter.limit);
    }

    return sessions;
  }

  getCurrentSession(): DangerousModeSession | undefined {
    return this.currentSession;
  }

  private async showWarningAndConfirm(): Promise<boolean> {
    this.emit('warning_display', { 
      message: this.config.warningMessage 
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.emit('confirmation_timeout');
        resolve(false);
      }, this.config.confirmationTimeout);

      // Wait for confirmation event
      const confirmHandler = (data: { confirmed: boolean }) => {
        clearTimeout(timeout);
        this.off('user_confirmation', confirmHandler);
        resolve(data.confirmed);
      };

      this.once('user_confirmation', confirmHandler);

      // Emit event requesting confirmation
      this.emit('confirmation_requested', {
        timeout: this.config.confirmationTimeout
      });
    });
  }

  // Method to be called by UI/CLI to confirm
  confirmWarning(confirmed: boolean): void {
    this.emit('user_confirmation', { confirmed });
  }

  // Emergency stop - immediately disable without cleanup
  emergencyStop(): void {
    if (this.autoDisableTimer) {
      clearTimeout(this.autoDisableTimer);
    }

    if (this.currentSession) {
      this.currentSession.active = false;
      this.currentSession.endTime = new Date();
      
      // Add emergency stop action
      this.currentSession.actionsExecuted.push({
        timestamp: new Date(),
        tool: 'system',
        action: 'emergency_stop',
        result: 'IN_PROGRESS'
      });
    }

    this.permissionManager.disableDangerousMode();
    
    this.emit('emergency_stop', {
      session: this.currentSession,
      timestamp: new Date()
    });

    this.currentSession = undefined;
  }

  // Get risk assessment for current session
  getRiskAssessment(): {
    level: 'low' | 'medium' | 'high' | "critical";
    factors: string[];
    recommendations: string[];
  } {
    if (!this.currentSession) {
      return {
        level: 'low',
        factors: ['Dangerous mode not active'],
        recommendations: []
      };
    }

    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Calculate risk based on actions
    const stats = this.getSessionStats();
    if (stats) {
      if (stats.actionsExecuted > 50) {
        factors.push('High number of actions executed');
        riskScore += 2;
      }

      if (stats.errorRate > 0.1) {
        factors.push('High error rate in executed actions');
        riskScore += 2;
      }

      if (stats.duration > 1800000) { // 30 minutes
        factors.push('Extended dangerous mode session');
        recommendations.push('Consider disabling dangerous mode and re-enabling if needed');
        riskScore += 1;
      }

      if (stats.actionsByTool['execute_command'] > 10) {
        factors.push('Many system commands executed');
        recommendations.push('Review command history for unintended changes');
        riskScore += 3;
      }

      if (stats.actionsByTool['delete_file'] > 0) {
        factors.push('Destructive operations performed');
        recommendations.push('Verify no critical files were deleted');
        riskScore += 3;
      }
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | "critical";
    if (riskScore >= 8) {
      level = "critical";
      recommendations.push('Immediately disable dangerous mode and review all actions');
    } else if (riskScore >= 5) {
      level = 'high';
      recommendations.push('Consider disabling dangerous mode soon');
    } else if (riskScore >= 2) {
      level = 'medium';
      recommendations.push('Monitor actions closely');
    } else {
      level = 'low';
    }

    return { level, factors, recommendations };
  }
}