import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VFProtectedFileWrapper, ProtectionConfig } from '../children/VFProtectedFileWrapper';
import { FeatureStatusManager } from '../children/FeatureStatusManager';
import { path } from '../../infra_external-log-lib/src';
import { fsPromises as fs } from 'fs/promises';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ProtectedMCPConfig {
  basePath: string;
  protectionConfig?: Partial<ProtectionConfig>;
  enableAuditLog?: boolean;
  warnOnViolation?: boolean;
  blockDirectUpdates?: boolean;
}

/**
 * Protected MCP Server that prevents direct updates to protected files
 */
export class ProtectedMCPServer {
  private server: Server;
  private protectedWrapper: VFProtectedFileWrapper;
  private featureManager: FeatureStatusManager;
  private config: ProtectedMCPConfig;
  private violationCount: Map<string, number> = new Map();

  constructor(config: ProtectedMCPConfig) {
    this.config = {
      enableAuditLog: true,
      warnOnViolation: true,
      blockDirectUpdates: true,
      ...config
    };

    this.server = new Server(
      {
        name: 'filesystem-mcp-protected',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize protected wrapper with custom config
    this.protectedWrapper = new VFProtectedFileWrapper(
      this.config.basePath,
      {
        ...this.config.protectionConfig,
        auditLog: this.config.enableAuditLog
      }
    );

    // Initialize feature manager
    this.featureManager = new FeatureStatusManager(this.config.basePath, true);

    this.setupHandlers();
  }

  private async setupHandlers() {
    // Handle file read requests
    this.server.setRequestHandler('vf.read', async (request) => {
      const { path: filePath } = request.params as { path: string };
      
      try {
        const content = await this.protectedWrapper.read(filePath);
        return { content };
      } catch (error: any) {
        this.logViolation('read', filePath, error.message);
        
        if (this.config.warnOnViolation) {
          return {
            content: null,
            warning: `Protected file access logged: ${filePath}`,
            error: error.message
          };
        }
        
        throw error;
      }
    });

    // Handle file write requests - BLOCKED for protected files
    this.server.setRequestHandler('vf.write', async (request) => {
      const { path: filePath, content } = request.params as { path: string; content: any };
      
      // Check if file is protected
      const protectionStatus = this.protectedWrapper.getProtectionStatus(filePath);
      
      if (protectionStatus.protected && this.config.blockDirectUpdates) {
        const errorMessage = this.createProtectionErrorMessage(filePath, 'write');
        this.logViolation('write', filePath, errorMessage);
        
        // For FEATURE.vf.json files, provide specific guidance
        if (filePath.includes('FEATURE.vf.json') || filePath.includes('FEATURES.vf.json')) {
          throw new Error(
            `❌ Direct update to ${filePath} is not allowed.\n\n` +
            `To update features, use the feature management API:\n\n` +
            `Example:\n` +
            `{\n` +
            `  "tool": "feature.update",\n` +
            `  "params": {\n` +
            `    "featureId": "feature-123",\n` +
            `    "categoryName": "infrastructure",\n` +
            `    "updates": {\n` +
            `      "status": "implemented"\n` +
            `    },\n` +
            `    "userStoryReportPath": "/path/to/report.json"\n` +
            `  }\n` +
            `}\n\n` +
            `This ensures proper validation and quality checks.`
          );
        }
        
        throw new Error(errorMessage);
      }
      
      try {
        await this.protectedWrapper.write(filePath, content);
        return { success: true };
      } catch (error: any) {
        this.logViolation('write', filePath, error.message);
        throw error;
      }
    });

    // Handle file update requests - BLOCKED for protected files
    this.server.setRequestHandler('vf.update', async (request) => {
      const { path: filePath, updates } = request.params as { path: string; updates: any };
      
      // Check if file is protected
      const protectionStatus = this.protectedWrapper.getProtectionStatus(filePath);
      
      if (protectionStatus.protected && this.config.blockDirectUpdates) {
        const errorMessage = this.createProtectionErrorMessage(filePath, 'update');
        this.logViolation('update', filePath, errorMessage);
        throw new Error(errorMessage);
      }
      
      try {
        await this.protectedWrapper.update(filePath, updates);
        return { success: true };
      } catch (error: any) {
        this.logViolation('update', filePath, error.message);
        throw error;
      }
    });

    // Handle file delete requests - BLOCKED for protected files
    this.server.setRequestHandler('vf.delete', async (request) => {
      const { path: filePath } = request.params as { path: string };
      
      // Check if file is protected
      const protectionStatus = this.protectedWrapper.getProtectionStatus(filePath);
      
      if (protectionStatus.protected) {
        const errorMessage = `Cannot delete protected file: ${filePath}`;
        this.logViolation('delete', filePath, errorMessage);
        throw new Error(errorMessage);
      }
      
      try {
        await this.protectedWrapper.delete(filePath);
        return { success: true };
      } catch (error: any) {
        this.logViolation('delete', filePath, error.message);
        throw error;
      }
    });

    // Add feature management handlers
    this.setupFeatureHandlers();
    
    // Add audit log handlers
    this.setupAuditHandlers();
  }

  private async setupFeatureHandlers() {
    // Handle feature add requests
    this.server.setRequestHandler('feature.add', async (request) => {
      const { categoryName, feature } = request.params as {
        categoryName: string;
        feature: any;
      };
      
      try {
        const result = await this.featureManager.addFeature(categoryName, feature);
        return result;
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle feature update requests
    this.server.setRequestHandler('feature.update', async (request) => {
      const updateRequest = request.params as any;
      
      try {
        const validation = await this.featureManager.updateFeature(updateRequest);
        
        if (!validation.isValid) {
          return {
            success: false,
            validation,
            message: 'Feature update failed validation',
            errors: validation.errors
          };
        }
        
        return {
          success: true,
          validation,
          message: 'Feature updated successfully'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle feature status summary requests
    this.server.setRequestHandler('feature.getStatusSummary', async () => {
      try {
        const summary = await this.featureManager.getStatusSummary();
        return { summary };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle feature report generation
    this.server.setRequestHandler('feature.generateReport', async () => {
      try {
        const report = await this.featureManager.generateStatusReport();
        return { report };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle get features by status
    this.server.setRequestHandler('feature.getByStatus', async (request) => {
      const { status } = request.params as { status: string };
      
      try {
        const features = await this.featureManager.getFeaturesByStatus(status);
        return { features };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  private async setupAuditHandlers() {
    // Handle audit log retrieval
    this.server.setRequestHandler('audit.getLog', async (request) => {
      const filter = request.params as any;
      
      try {
        const entries = this.protectedWrapper.getAuditLog(filter);
        return { entries };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle audit log export
    this.server.setRequestHandler('audit.export', async (request) => {
      const { filePath } = request.params as { filePath: string };
      
      try {
        await this.protectedWrapper.exportAuditLog(filePath);
        return { 
          success: true,
          message: `Audit log exported to ${filePath}`
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle audit log clear
    this.server.setRequestHandler('audit.clear', async () => {
      try {
        this.protectedWrapper.clearAuditLog();
        return { 
          success: true,
          message: 'Audit log cleared'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle violation report
    this.server.setRequestHandler('audit.getViolations', async () => {
      const violations: any[] = [];
      
      this.violationCount.forEach((count, file) => {
        violations.push({ file, count });
      });
      
      // Sort by violation count
      violations.sort((a, b) => b.count - a.count);
      
      return {
        violations,
        total: violations.reduce((sum, v) => sum + v.count, 0)
      };
    });
  }

  private async createProtectionErrorMessage(filePath: string, operation: string): string {
    const fileName = path.basename(filePath);
    const violations = this.violationCount.get(filePath) || 0;
    
    let message = `❌ Protected File Violation\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Operation: ${operation.toUpperCase()}\n`;
    message += `File: ${filePath}\n`;
    message += `Violations for this file: ${violations + 1}\n\n`;
    
    if (fileName.includes('FEATURE')) {
      message += `📋 This is a protected FEATURE file.\n`;
      message += `Features must be updated through the FeatureStatusManager to ensure:\n`;
      message += `  • Status transition validation\n`;
      message += `  • Coverage requirements are met\n`;
      message += `  • Duplication checks pass\n`;
      message += `  • User story reports are validated\n`;
      message += `  • Audit trail is maintained\n\n`;
      message += `✅ Use the feature management API instead:\n`;
      message += `  - feature.add\n`;
      message += `  - feature.update\n`;
      message += `  - feature.getStatusSummary\n`;
      message += `  - feature.generateReport\n`;
    } else if (fileName.includes('TASK_QUEUE')) {
      message += `📋 This is a protected TASK_QUEUE file.\n`;
      message += `Use the VFTaskQueueWrapper API to manage tasks.\n`;
    } else {
      message += `📋 This file is protected by the system.\n`;
      message += `Direct modifications are not allowed.\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 For emergency access, contact system administrator.`;
    
    return message;
  }

  private async logViolation(operation: string, filePath: string, message: string) {
    // Increment violation count
    const currentCount = this.violationCount.get(filePath) || 0;
    this.violationCount.set(filePath, currentCount + 1);
    
    // Log to console if configured
    if (this.config.warnOnViolation) {
      console.warn(`[PROTECTION] ${operation} violation on ${filePath}: ${message}`);
    }
    
    // Write to violation log file
    const logDir = path.join(this.config.basePath, '.protection');
    const logFile = path.join(logDir, 'violations.log');
    const logEntry = `[${new Date().toISOString()}] ${operation} ${filePath}: ${message}\n`;
    
    await fileAPI.createDirectory(logDir)
      .then(() => await fileAPI.writeFile(logFile, logEntry))
      .catch(() => {}); // Ignore logging errors
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Protected MCP Server started');
    console.error('Protection enabled for:', { append: true });
    console.error('Audit logging:', this.config.enableAuditLog ? 'ENABLED' : "DISABLED");
    console.error('Block direct updates:', this.config.blockDirectUpdates ? 'ENABLED' : "DISABLED");
  }
}

// Export factory function
export function createProtectedMCPServer(config: ProtectedMCPConfig): ProtectedMCPServer {
  return new ProtectedMCPServer(config);
}

// Main entry point
if (require.main === module) {
  const server = new ProtectedMCPServer({
    basePath: process.cwd(),
    blockDirectUpdates: true,
    enableAuditLog: true,
    warnOnViolation: true,
    protectionConfig: {
      patterns: [
        '**/FEATURE.vf.json',
        '**/FEATURES.vf.json',
        '**/TASK_QUEUE.vf.json',
        '**/FILE_STRUCTURE.vf.json',
        '**/NAME_ID.vf.json'
      ],
      allowedCallers: ["FeatureStatusManager", "VFTaskQueueWrapper", "VFDistributedFeatureWrapper"],
      requireValidation: true
    }
  });
  
  server.start().catch(console.error);
}