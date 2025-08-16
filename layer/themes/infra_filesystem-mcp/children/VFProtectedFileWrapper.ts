import { VFFileWrapper } from './VFFileWrapper';
import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ProtectionConfig {
  patterns: string[];
  allowedCallers?: string[];
  requireValidation?: boolean;
  auditLog?: boolean;
  customValidator?: (content: any, operation: string) => Promise<boolean>;
  bypassToken?: string;
}

export interface AuditEntry {
  timestamp: string;
  operation: 'read' | 'write' | 'delete' | 'update';
  file: string;
  caller: string;
  allowed: boolean;
  reason?: string;
  changes?: any;
}

export class VFProtectedFileWrapper extends VFFileWrapper {
  private protectionConfig: ProtectionConfig;
  private auditLog: AuditEntry[] = [];
  private static readonly DEFAULT_PROTECTED_PATTERNS = [
    '**/FEATURE.vf.json',
    '**/FEATURES.vf.json',
    '**/TASK_QUEUE.vf.json',
    '**/FILE_STRUCTURE.vf.json',
    '**/NAME_ID.vf.json'
  ];

  constructor(basePath: string, config?: Partial<ProtectionConfig>) {
    super(basePath);
    this.protectionConfig = {
      patterns: config?.patterns || VFProtectedFileWrapper.DEFAULT_PROTECTED_PATTERNS,
      allowedCallers: config?.allowedCallers || ['FeatureStatusManager', 'VFTaskQueueWrapper'],
      requireValidation: config?.requireValidation ?? true,
      auditLog: config?.auditLog ?? true,
      customValidator: config?.customValidator,
      bypassToken: config?.bypassToken
    };
  }

  /**
   * Check if a file path matches protected patterns
   */
  private async isProtectedFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    
    return this.protectionConfig.patterns.some(pattern => {
      // Simple pattern matching (could be enhanced with glob library)
      if (pattern.includes('**')) {
        const regex = pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\./g, '\\.')
          .replace(/\//g, '\\/');
        return new RegExp(regex).test(normalizedPath);
      }
      
      return normalizedPath.endsWith(pattern) || normalizedPath.includes(pattern);
    });
  }

  /**
   * Get the caller from the stack trace
   */
  private async getCaller(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // Skip first 3 lines (Error message, this function, and the calling function)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for allowed callers in the stack
      for (const allowedCaller of this.protectionConfig.allowedCallers || []) {
        if (line.includes(allowedCaller)) {
          return allowedCaller;
        }
      }
      
      // Extract the function/class name from the stack line
      const match = line.match(/at\s+([^\s(]+)/);
      if (match && match[1] !== 'async') {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  /**
   * Log an audit entry
   */
  private async logAudit(entry: AuditEntry): void {
    if (this.protectionConfig.auditLog) {
      this.auditLog.push(entry);
      
      // Also write to audit file
      const auditFilePath = path.join(this.basePath, '.audit', 'protected-files.log');
      const logLine = `[${entry.timestamp}] ${entry.operation} ${entry.file} by ${entry.caller}: ${entry.allowed ? 'ALLOWED' : 'DENIED'} ${entry.reason || ''}\n`;
      
      await fileAPI.createDirectory(path.dirname(auditFilePath))
        .then(() => await fileAPI.writeFile(auditFilePath, logLine))
        .catch(() => {}); // Ignore audit logging errors
    }
  }

  /**
   * Validate an operation on a protected file
   */
  private async validateOperation(
    filePath: string, options?: { append?: boolean }): Promise<{ allowed: boolean; reason?: string }> {
    const caller = this.getCaller();
    
    // Check if caller is allowed
    if (this.protectionConfig.allowedCallers?.includes(caller)) {
      return { allowed: true, reason: 'Allowed caller' };
    }
    
    // Check for bypass token
    if (this.protectionConfig.bypassToken && 
        process.env.FEATURE_PROTECTION_BYPASS === this.protectionConfig.bypassToken) {
      return { allowed: true, reason: 'Bypass token provided' };
    }
    
    // Run custom validator if provided
    if (this.protectionConfig.customValidator && content) {
      const customResult = await this.protectionConfig.customValidator(content, operation);
      if (customResult) {
        return { allowed: true, reason: 'Custom validation passed' };
      }
    }
    
    // Default deny for protected files
    return { 
      allowed: false, 
      reason: `Direct ${operation} not allowed for protected file. Use FeatureStatusManager instead.`
    };
  }

  /**
   * Override read to check protection
   */
  async read(queryPath: string): Promise<any> {
    const { path: cleanPath } = this.parseQueryParams(queryPath);
    
    if (this.isProtectedFile(cleanPath)) {
      const validation = await this.validateOperation(cleanPath, 'read');
      
      this.logAudit({
        timestamp: new Date().toISOString(),
        operation: 'read',
        file: cleanPath,
        caller: this.getCaller(),
        allowed: validation.allowed,
        reason: validation.reason
      });
      
      // Reading is generally allowed but logged
      return super.read(queryPath);
    }
    
    return super.read(queryPath);
  }

  /**
   * Override write to prevent direct updates to protected files
   */
  async write(queryPath: string, content: any): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(queryPath);
    
    if (this.isProtectedFile(cleanPath)) {
      const validation = await this.validateOperation(cleanPath, 'write', content);
      
      this.logAudit({
        timestamp: new Date().toISOString(),
        operation: 'write',
        file: cleanPath,
        caller: this.getCaller(),
        allowed: validation.allowed,
        reason: validation.reason,
        changes: validation.allowed ? undefined : content
      });
      
      if (!validation.allowed) {
        throw new Error(
          `❌ Protected File Error: ${validation.reason}\n` +
          `File: ${cleanPath}\n` +
          `Caller: ${this.getCaller()}\n` +
          `\n` +
          `To update features, use:\n` +
          `  const manager = createFeatureStatusManager();\n` +
          `  await manager.updateFeature({ ... });\n` +
          `\n` +
          `Protected patterns: ${this.protectionConfig.patterns.join(', ')}`
        );
      }
    }
    
    return super.write(queryPath, content);
  }

  /**
   * Override update to prevent direct updates to protected files
   */
  async update(queryPath: string, updates: any): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(queryPath);
    
    if (this.isProtectedFile(cleanPath)) {
      const validation = await this.validateOperation(cleanPath, 'update', updates);
      
      this.logAudit({
        timestamp: new Date().toISOString(),
        operation: 'update',
        file: cleanPath,
        caller: this.getCaller(),
        allowed: validation.allowed,
        reason: validation.reason,
        changes: validation.allowed ? undefined : updates
      });
      
      if (!validation.allowed) {
        throw new Error(
          `❌ Protected File Error: ${validation.reason}\n` +
          `File: ${cleanPath}\n` +
          `Caller: ${this.getCaller()}\n` +
          `\n` +
          `To update features, use:\n` +
          `  const manager = createFeatureStatusManager();\n` +
          `  await manager.updateFeature({ ... });\n` +
          `\n` +
          `Protected patterns: ${this.protectionConfig.patterns.join(', ')}`
        );
      }
    }
    
    return super.update(queryPath, updates);
  }

  /**
   * Override delete to prevent deletion of protected files
   */
  async delete(queryPath: string): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(queryPath);
    
    if (this.isProtectedFile(cleanPath)) {
      const validation = await this.validateOperation(cleanPath, 'delete');
      
      this.logAudit({
        timestamp: new Date().toISOString(),
        operation: 'delete',
        file: cleanPath,
        caller: this.getCaller(),
        allowed: validation.allowed,
        reason: validation.reason
      });
      
      if (!validation.allowed) {
        throw new Error(
          `❌ Protected File Error: Cannot delete protected file\n` +
          `File: ${cleanPath}\n` +
          `Protected patterns: ${this.protectionConfig.patterns.join(', ')}`
        );
      }
    }
    
    return super.delete(queryPath);
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(filter?: { 
    file?: string; 
    operation?: string; 
    allowed?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): AuditEntry[] {
    let entries = [...this.auditLog];
    
    if (filter) {
      if (filter.file) {
        entries = entries.filter(e => e.file.includes(filter.file!));
      }
      if (filter.operation) {
        entries = entries.filter(e => e.operation === filter.operation);
      }
      if (filter.allowed !== undefined) {
        entries = entries.filter(e => e.allowed === filter.allowed);
      }
      if (filter.startTime) {
        entries = entries.filter(e => new Date(e.timestamp) >= filter.startTime!);
      }
      if (filter.endTime) {
        entries = entries.filter(e => new Date(e.timestamp) <= filter.endTime!);
      }
    }
    
    return entries;
  }

  /**
   * Clear audit log
   */
  async clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Export audit log to file
   */
  async exportAuditLog(filePath: string): Promise<void> {
    const auditData = {
      exported: new Date().toISOString(),
      entries: this.auditLog,
      summary: {
        total: this.auditLog.length,
        allowed: this.auditLog.filter(e => e.allowed).length,
        denied: this.auditLog.filter(e => !e.allowed).length,
        byOperation: {
          read: this.auditLog.filter(e => e.operation === 'read').length,
          write: this.auditLog.filter(e => e.operation === 'write').length,
          update: this.auditLog.filter(e => e.operation === 'update').length,
          delete: this.auditLog.filter(e => e.operation === 'delete').length
        }
      }
    };
    
    await fileAPI.createFile(filePath, JSON.stringify(auditData, { type: FileType.TEMPORARY }));
  }

  /**
   * Add a new protected pattern
   */
  async addProtectedPattern(pattern: string): void {
    if (!this.protectionConfig.patterns.includes(pattern)) {
      this.protectionConfig.patterns.push(pattern);
    }
  }

  /**
   * Remove a protected pattern
   */
  async removeProtectedPattern(pattern: string): void {
    const index = this.protectionConfig.patterns.indexOf(pattern);
    if (index > -1) {
      this.protectionConfig.patterns.splice(index, 1);
    }
  }

  /**
   * Add an allowed caller
   */
  async addAllowedCaller(caller: string): void {
    if (!this.protectionConfig.allowedCallers?.includes(caller)) {
      if (!this.protectionConfig.allowedCallers) {
        this.protectionConfig.allowedCallers = [];
      }
      this.protectionConfig.allowedCallers.push(caller);
    }
  }

  /**
   * Remove an allowed caller
   */
  async removeAllowedCaller(caller: string): void {
    if (this.protectionConfig.allowedCallers) {
      const index = this.protectionConfig.allowedCallers.indexOf(caller);
      if (index > -1) {
        this.protectionConfig.allowedCallers.splice(index, 1);
      }
    }
  }

  /**
   * Get protection status for a file
   */
  async getProtectionStatus(filePath: string): {
    protected: boolean;
    pattern?: string;
    allowedCallers: string[];
  } {
    const isProtected = this.isProtectedFile(filePath);
    
    if (!isProtected) {
      return {
        protected: false,
        allowedCallers: []
      };
    }
    
    // Find which pattern matched
    const matchedPattern = this.protectionConfig.patterns.find(pattern => {
      if (pattern.includes('**')) {
        const regex = pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\./g, '\\.')
          .replace(/\//g, '\\/');
        return new RegExp(regex).test(filePath);
      }
      return filePath.endsWith(pattern) || filePath.includes(pattern);
    });
    
    return {
      protected: true,
      pattern: matchedPattern,
      allowedCallers: this.protectionConfig.allowedCallers || []
    };
  }
}

// Export factory function
export function createProtectedFileWrapper(
  basePath?: string,
  config?: Partial<ProtectionConfig>
): VFProtectedFileWrapper {
  return new VFProtectedFileWrapper(basePath || '', config);
}