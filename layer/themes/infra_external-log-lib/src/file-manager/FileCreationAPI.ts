/**
 * FileCreationAPI - Centralized file creation with type-based routing and validation
 * 
 * This API ensures all file creation goes through proper validation and logging.
 * It integrates with filesystem-mcp for structure validation and provides
 * fraud detection for unauthorized file operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileViolationPreventer } from '../validators/FileViolationPreventer';
import { ComprehensiveLogger } from '../loggers/ComprehensiveLogger';
import { strictEnforcement, isDirectFSAllowed, TYPE_ROUTING_MAP } from '../config/enforcement-config';

export enum FileType {
  DOCUMENT = 'doc',
  REPORT = 'report',
  TEMPORARY = 'temp',
  LOG = 'log',
  DATA = 'data',
  CONFIG = 'config',
  TEST = 'test',
  SOURCE = 'source',
  GENERATED = 'gen',
  DEMO = 'demo',
  SCRIPT = 'script',
  FIXTURE = 'fixture',
  COVERAGE = 'coverage',
  BUILD = 'build'
}

export interface FileCreationOptions {
  type: FileType;
  template?: string;
  metadata?: Record<string, any>;
  validate?: boolean;
  backup?: boolean;
  atomic?: boolean;
  encoding?: BufferEncoding;
  mode?: number;
}

export interface FileCreationResult {
  success: boolean;
  path: string;
  type: FileType;
  size?: number;
  error?: string;
  violations?: string[];
  timestamp: Date;
}

export interface FileAuditEntry {
  operation: 'create' | 'write' | 'append' | 'delete' | 'mkdir';
  path: string;
  type: FileType;
  timestamp: Date;
  success: boolean;
  caller?: string;
  metadata?: Record<string, any>;
}

interface FileTypeConfig {
  baseDir: string;
  pattern?: RegExp;
  allowedExtensions?: string[];
  requiresApproval?: boolean;
  maxSize?: number;
}

export class FileCreationAPI {
  private validator: FileViolationPreventer;
  private logger: ComprehensiveLogger;
  private basePath: string;
  private auditLog: FileAuditEntry[] = [];
  private fileTypeConfigs: Map<FileType, FileTypeConfig>;
  private mpcValidationEnabled: boolean = true;
  private fraudDetectionEnabled: boolean = true;

  constructor(
    basePath: string = process.cwd(),
    enableStrictMode: boolean = true
  ) {
    this.basePath = basePath;
    this.validator = new FileViolationPreventer(basePath, {
      enabled: enableStrictMode,
      inheritToChildren: true,
      logWarnings: !enableStrictMode,
      throwOnViolation: enableStrictMode
    });
    
    this.logger = new ComprehensiveLogger({
      logDir: path.join(basePath, 'logs'),
      appName: 'FileCreationAPI',
      enableConsole: true,
      enableFile: true
    });

    this.fileTypeConfigs = this.initializeFileTypeConfigs();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.validator.initialize();
    this.logger.info('FileCreationAPI initialized', {
      basePath: this.basePath,
      strictMode: this.validator.getStrictModeConfig().enabled
    });
  }

  private initializeFileTypeConfigs(): Map<FileType, FileTypeConfig> {
    const configs = new Map<FileType, FileTypeConfig>();

    // Use automatic routing from enforcement config
    configs.set(FileType.DOCUMENT, {
      baseDir: TYPE_ROUTING_MAP['doc'] || 'gen/doc',
      allowedExtensions: ['.md', '.txt', '.pdf', '.html'],
      maxSize: 10 * 1024 * 1024 // 10MB
    });

    configs.set(FileType.REPORT, {
      baseDir: TYPE_ROUTING_MAP['report'] || 'gen/reports',
      pattern: /report|analysis|summary/i,
      allowedExtensions: ['.md', '.json', '.html', '.pdf'],
      maxSize: 5 * 1024 * 1024 // 5MB
    });

    configs.set(FileType.TEMPORARY, {
      baseDir: TYPE_ROUTING_MAP['temp'] || 'temp',
      maxSize: 100 * 1024 * 1024, // 100MB
      requiresApproval: false
    });

    configs.set(FileType.LOG, {
      baseDir: TYPE_ROUTING_MAP['log'] || 'logs',
      allowedExtensions: ['.log', '.txt', '.json'],
      maxSize: 50 * 1024 * 1024 // 50MB
    });

    configs.set(FileType.DATA, {
      baseDir: TYPE_ROUTING_MAP['data'] || 'data',
      allowedExtensions: ['.json', '.csv', '.xml', '.yaml', '.yml'],
      maxSize: 100 * 1024 * 1024 // 100MB
    });

    configs.set(FileType.CONFIG, {
      baseDir: TYPE_ROUTING_MAP['config'] || 'config',
      allowedExtensions: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'],
      requiresApproval: true,
      maxSize: 1 * 1024 * 1024 // 1MB
    });

    configs.set(FileType.TEST, {
      baseDir: 'tests',
      pattern: /\.(test|spec|e2e)\.(ts|js|tsx|jsx)$/,
      allowedExtensions: ['.ts', '.js', '.tsx', '.jsx'],
      maxSize: 5 * 1024 * 1024 // 5MB
    });

    configs.set(FileType.SOURCE, {
      baseDir: 'src',
      allowedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h'],
      maxSize: 5 * 1024 * 1024 // 5MB
    });

    configs.set(FileType.GENERATED, {
      baseDir: 'gen',
      maxSize: 50 * 1024 * 1024 // 50MB
    });

    configs.set(FileType.DEMO, {
      baseDir: 'demo',
      maxSize: 10 * 1024 * 1024 // 10MB
    });

    configs.set(FileType.SCRIPT, {
      baseDir: 'scripts',
      allowedExtensions: ['.sh', '.bat', '.ps1', '.py', '.js', '.ts'],
      requiresApproval: true,
      maxSize: 1 * 1024 * 1024 // 1MB
    });

    configs.set(FileType.FIXTURE, {
      baseDir: 'fixtures',
      maxSize: 10 * 1024 * 1024 // 10MB
    });

    configs.set(FileType.COVERAGE, {
      baseDir: 'coverage',
      allowedExtensions: ['.json', '.html', '.lcov', '.xml'],
      maxSize: 50 * 1024 * 1024 // 50MB
    });

    configs.set(FileType.BUILD, {
      baseDir: 'dist',
      maxSize: 500 * 1024 * 1024 // 500MB
    });

    return configs;
  }

  /**
   * Create a file with type-based validation and routing
   */
  async createFile(
    filePath: string,
    content: string | Buffer,
    options: FileCreationOptions
  ): Promise<FileCreationResult> {
    const startTime = Date.now();
    
    // Check enforcement first
    const callerPath = this.getCallerPath();
    const enforcement = strictEnforcement.getEnforcementReport(callerPath);
    
    // If not exempt, require type and use auto-routing
    if (!enforcement.isExempt) {
      if (!options.type) {
        throw new Error(`File type is required for non-exempt themes. Caller: ${callerPath}`);
      }
      
      // Override path with auto-routed folder based on type
      const autoFolder = TYPE_ROUTING_MAP[options.type.toLowerCase()];
      if (autoFolder) {
        const fileName = path.basename(filePath);
        filePath = path.join(this.basePath, autoFolder, fileName);
        
        this.logger.info('Auto-routing file based on type', {
          originalPath: filePath,
          type: options.type,
          autoFolder,
          newPath: filePath
        });
      }
    }
    
    const absolutePath = this.resolveFilePath(filePath, options.type);
    
    try {
      // Step 1: Validate file type and path
      const typeValidation = await this.validateFileType(absolutePath, options.type);
      if (!typeValidation.valid) {
        throw new Error(`File type validation failed: ${typeValidation.reason}`);
      }

      // Step 2: Check filesystem MCP structure
      if (this.mpcValidationEnabled) {
        await this.validateWithMCP(absolutePath, 'create');
      }

      // Step 3: Fraud detection
      if (this.fraudDetectionEnabled) {
        const fraudCheck = await this.detectFraud(absolutePath, options);
        if (fraudCheck.suspicious) {
          this.logger.warn('Suspicious file creation detected', {
            path: absolutePath,
            reason: fraudCheck.reason
          });
          
          if (fraudCheck.block) {
            throw new Error(`File creation blocked: ${fraudCheck.reason}`);
          }
        }
      }

      // Step 4: Create directory if needed
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        await this.createDirectory(dir);
      }

      // Step 5: Apply template if specified
      let finalContent = content;
      if (options.template) {
        finalContent = await this.applyTemplate(options.template, content, options.metadata);
      }

      // Step 6: Write file (atomic if requested)
      if (options.atomic) {
        await this.atomicWrite(absolutePath, finalContent, options.encoding);
      } else {
        await fs.promises.writeFile(absolutePath, finalContent, {
          encoding: options.encoding || 'utf8',
          mode: options.mode
        });
      }

      // Step 7: Audit log
      const auditEntry: FileAuditEntry = {
        operation: 'create',
        path: absolutePath,
        type: options.type,
        timestamp: new Date(),
        success: true,
        caller: this.getCallerInfo(),
        metadata: options.metadata
      };
      this.auditLog.push(auditEntry);

      // Step 8: Log success
      this.logger.info('File created successfully', {
        path: absolutePath,
        type: options.type,
        size: Buffer.isBuffer(finalContent) ? finalContent.length : Buffer.byteLength(finalContent),
        duration: Date.now() - startTime
      });

      const stats = fs.statSync(absolutePath);
      return {
        success: true,
        path: absolutePath,
        type: options.type,
        size: stats.size,
        timestamp: new Date()
      };

    } catch (error: any) {
      // Audit failed attempt
      const auditEntry: FileAuditEntry = {
        operation: 'create',
        path: absolutePath,
        type: options.type,
        timestamp: new Date(),
        success: false,
        caller: this.getCallerInfo(),
        metadata: { error: error.message }
      };
      this.auditLog.push(auditEntry);

      this.logger.error('File creation failed', {
        path: absolutePath,
        type: options.type,
        error: error.message
      });

      return {
        success: false,
        path: absolutePath,
        type: options.type,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Write to an existing file with validation
   */
  async writeFile(
    filePath: string,
    content: string | Buffer,
    options: Partial<FileCreationOptions> = {}
  ): Promise<FileCreationResult> {
    const type = options.type || this.detectFileType(filePath);
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);

    try {
      // Validate with MCP
      if (this.mpcValidationEnabled) {
        await this.validateWithMCP(absolutePath, 'write');
      }

      // Backup if requested
      if (options.backup && fs.existsSync(absolutePath)) {
        await this.createBackup(absolutePath);
      }

      // Write file
      await fs.promises.writeFile(absolutePath, content, {
        encoding: options.encoding || 'utf8',
        mode: options.mode
      });

      // Audit log
      const auditEntry: FileAuditEntry = {
        operation: 'write',
        path: absolutePath,
        type,
        timestamp: new Date(),
        success: true,
        caller: this.getCallerInfo()
      };
      this.auditLog.push(auditEntry);

      const stats = fs.statSync(absolutePath);
      return {
        success: true,
        path: absolutePath,
        type,
        size: stats.size,
        timestamp: new Date()
      };

    } catch (error: any) {
      return {
        success: false,
        path: absolutePath,
        type,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Create a directory with validation
   */
  async createDirectory(dirPath: string): Promise<void> {
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.join(this.basePath, dirPath);
    
    if (this.mpcValidationEnabled) {
      await this.validateWithMCP(absolutePath, 'mkdir');
    }

    await fs.promises.mkdir(absolutePath, { recursive: true });
    
    const auditEntry: FileAuditEntry = {
      operation: 'mkdir',
      path: absolutePath,
      type: FileType.TEMPORARY,
      timestamp: new Date(),
      success: true,
      caller: this.getCallerInfo()
    };
    this.auditLog.push(auditEntry);
  }

  /**
   * Batch file creation with transaction support
   */
  async createBatch(
    files: Array<{
      path: string;
      content: string | Buffer;
      options: FileCreationOptions;
    }>
  ): Promise<FileCreationResult[]> {
    const results: FileCreationResult[] = [];
    const createdFiles: string[] = [];

    try {
      for (const file of files) {
        const result = await this.createFile(file.path, file.content, file.options);
        results.push(result);
        
        if (result.success) {
          createdFiles.push(result.path);
        } else {
          // Rollback on failure
          throw new Error(`Batch operation failed at ${file.path}: ${result.error}`);
        }
      }

      return results;

    } catch (error: any) {
      // Rollback created files
      this.logger.warn('Batch operation failed, rolling back', { error: error.message });
      
      for (const filePath of createdFiles) {
        try {
          await fs.promises.unlink(filePath);
        } catch (rollbackError) {
          this.logger.error('Rollback failed', { path: filePath, error: rollbackError });
        }
      }

      throw error;
    }
  }

  /**
   * Validate file type and location
   */
  private async validateFileType(
    filePath: string,
    type: FileType
  ): Promise<{ valid: boolean; reason?: string }> {
    const config = this.fileTypeConfigs.get(type);
    if (!config) {
      return { valid: false, reason: `Unknown file type: ${type}` };
    }

    const ext = path.extname(filePath);
    
    // Check allowed extensions
    if (config.allowedExtensions && !config.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        reason: `Extension ${ext} not allowed for type ${type}`
      };
    }

    // Check pattern
    if (config.pattern && !config.pattern.test(filePath)) {
      return {
        valid: false,
        reason: `File path doesn't match required pattern for type ${type}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate with filesystem MCP
   */
  private async validateWithMCP(filePath: string, operation: 'create' | 'write' | 'mkdir'): Promise<void> {
    try {
      // Import filesystem MCP validator dynamically
      const mpcModule = await import('../../../infra_filesystem-mcp/pipe');
      const structureWrapper = mpcModule.createFileStructureWrapper(this.basePath);
      
      // Validate against structure
      const validation = await structureWrapper.validatePath(filePath);
      if (!validation.valid) {
        throw new Error(`MCP validation failed: ${validation.message}`);
      }
    } catch (error: any) {
      // If MCP module not available, use local validator
      await this.validator.validateFileOperation(operation, filePath);
    }
  }

  /**
   * Detect potential fraud
   */
  private async detectFraud(
    filePath: string,
    options: FileCreationOptions
  ): Promise<{ suspicious: boolean; reason?: string; block?: boolean }> {
    const suspiciousPatterns = [
      /\.(bak|backup|tmp)$/i,
      /node_modules/,
      /\.git\//,
      /password|secret|key|token/i
    ];

    // Check for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(filePath)) {
        return {
          suspicious: true,
          reason: `Path matches suspicious pattern: ${pattern}`,
          block: pattern.test(/\.(bak|backup)$/i) // Block backup files
        };
      }
    }

    // Check for root directory creation
    const relativePath = path.relative(this.basePath, filePath);
    if (!relativePath || relativePath.startsWith('..')) {
      return {
        suspicious: true,
        reason: 'Attempting to create file outside project directory',
        block: true
      };
    }

    // Check file size limits
    const config = this.fileTypeConfigs.get(options.type);
    if (config?.maxSize && Buffer.isBuffer(options) && options.length > config.maxSize) {
      return {
        suspicious: true,
        reason: `File size exceeds limit for type ${options.type}`,
        block: false
      };
    }

    return { suspicious: false };
  }

  /**
   * Resolve file path based on type
   */
  private resolveFilePath(filePath: string, type: FileType): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    const config = this.fileTypeConfigs.get(type);
    if (config?.baseDir) {
      // Check if path already includes base directory
      if (!filePath.startsWith(config.baseDir)) {
        return path.join(this.basePath, config.baseDir, filePath);
      }
    }

    return path.join(this.basePath, filePath);
  }

  /**
   * Detect file type from path
   */
  private detectFileType(filePath: string): FileType {
    const relativePath = path.relative(this.basePath, filePath);
    const segments = relativePath.split(path.sep);

    // Check by directory
    if (segments[0] === 'gen' && segments[1] === 'doc') return FileType.DOCUMENT;
    if (segments[0] === 'temp') return FileType.TEMPORARY;
    if (segments[0] === 'logs') return FileType.LOG;
    if (segments[0] === 'tests' || segments[0] === 'test') return FileType.TEST;
    if (segments[0] === 'src') return FileType.SOURCE;
    if (segments[0] === 'scripts') return FileType.SCRIPT;
    if (segments[0] === 'demo') return FileType.DEMO;
    if (segments[0] === 'coverage') return FileType.COVERAGE;
    if (segments[0] === 'dist' || segments[0] === 'build') return FileType.BUILD;
    if (segments[0] === 'config') return FileType.CONFIG;

    // Check by extension
    const ext = path.extname(filePath);
    if (['.md', '.txt', '.pdf', '.html'].includes(ext)) return FileType.DOCUMENT;
    if (['.log'].includes(ext)) return FileType.LOG;
    if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) return FileType.CONFIG;
    
    // Check by pattern
    if (/report|analysis|summary/i.test(filePath)) return FileType.REPORT;
    if (/\.(test|spec)\.(ts|js)$/.test(filePath)) return FileType.TEST;

    return FileType.TEMPORARY;
  }

  /**
   * Apply template to content
   */
  private async applyTemplate(
    templateName: string,
    content: string | Buffer,
    metadata?: Record<string, any>
  ): Promise<string | Buffer> {
    // For now, just return content
    // TODO: Implement template system
    return content;
  }

  /**
   * Atomic write operation
   */
  private async atomicWrite(
    filePath: string,
    content: string | Buffer,
    encoding?: BufferEncoding
  ): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    
    try {
      await fs.promises.writeFile(tempPath, content, { encoding: encoding || 'utf8' });
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.promises.unlink(tempPath);
      } catch {}
      throw error;
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.promises.copyFile(filePath, backupPath);
  }

  /**
   * Get caller information for audit
   */
  private getCallerInfo(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // Skip first 3 lines (Error, this function, and calling function)
    const callerLine = lines[3];
    if (!callerLine) return 'unknown';
    
    const match = callerLine.match(/at\s+(.+?)\s+\(/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get caller file path for enforcement checking
   */
  private getCallerPath(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    
    const lines = stack.split('\n');
    // Look for the first line with a file path that's not this file
    for (const line of lines) {
      const match = line.match(/\((.+?\.(ts|js|tsx|jsx)):\d+:\d+\)/);
      if (match && !match[1].includes('FileCreationAPI')) {
        // Return relative path from project root
        const fullPath = match[1];
        if (fullPath.includes(this.basePath)) {
          return fullPath.replace(this.basePath + '/', '');
        }
        return fullPath;
      }
    }
    
    return '';
  }

  /**
   * Get audit log
   */
  getAuditLog(): FileAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Export audit log to file
   */
  async exportAuditLog(outputPath?: string): Promise<string> {
    const exportPath = outputPath || path.join(this.basePath, 'logs', `audit-${Date.now()}.json`);
    const content = JSON.stringify(this.auditLog, null, 2);
    
    await this.createFile(exportPath, content, {
      type: FileType.LOG,
      validate: false // Don't validate audit log export
    });
    
    return exportPath;
  }

  /**
   * Enable/disable MCP validation
   */
  setMCPValidation(enabled: boolean): void {
    this.mpcValidationEnabled = enabled;
  }

  /**
   * Enable/disable fraud detection
   */
  setFraudDetection(enabled: boolean): void {
    this.fraudDetectionEnabled = enabled;
  }
}

export default FileCreationAPI;