/**
 * FileViolationPreventer
 * 
 * Prevents file creation violations by checking against FILE_STRUCTURE.vf.json
 * Uses filesystem-mcp logic to validate operations before execution
 * Supports strict mode (throws exceptions) and non-strict mode (logs warnings)
 */

import * as fs from 'fs';
import * as path from 'path';
import { getFileAPI, FileType } from '../../pipe';

const fileAPI = getFileAPI();


interface FileStructureDefinition {
  metadata: {
    level: string;
    version: string;
    supports_freeze?: boolean;
  };
  templates: {
    [key: string]: TemplateDefinition;
  };
}

interface TemplateDefinition {
  id: string;
  type: 'directory' | 'file';
  freeze?: boolean;
  freeze_message?: string;
  required_children?: ChildDefinition[];
  optional_children?: ChildDefinition[];
  allowed_patterns?: string[];
}

interface ChildDefinition {
  name: string;
  type: 'directory' | 'file' | 'feature_file';
  required?: boolean;
  children?: ChildDefinition[];
  freeze?: boolean;
}

export interface StrictModeConfig {
  enabled: boolean;
  inheritToChildren: boolean;
  logWarnings: boolean;
  throwOnViolation: boolean;
}

export class FileViolationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly violationType: string
  ) {
    super(message);
    this.name = 'FileViolationError';
  }
}

export class FileViolationPreventer {
  private fileStructure: FileStructureDefinition | null = null;
  private strictConfig: StrictModeConfig;
  private basePath: string;
  private themePath: string;

  constructor(
    basePath: string = process.cwd(),
    strictMode: boolean | StrictModeConfig = false
  ) {
    this.basePath = basePath;
    this.themePath = path.join(basePath, 'layer/themes/infra_external-log-lib');
    
    // Set up strict mode configuration
    if (typeof strictMode === 'boolean') {
      this.strictConfig = {
        enabled: strictMode,
        inheritToChildren: true,
        logWarnings: !strictMode,
        throwOnViolation: strictMode
      };
    } else {
      this.strictConfig = {
        enabled: false,
        inheritToChildren: true,
        logWarnings: true,
        throwOnViolation: false,
        ...strictMode
      };
    }
  }

  /**
   * Initialize by loading FILE_STRUCTURE.vf.json
   */
  async initialize(): Promise<void> {
    const structurePath = path.join(this.basePath, 'FILE_STRUCTURE.vf.json');
    
    if (!fs.existsSync(structurePath)) {
      this.logWarn(`FILE_STRUCTURE.vf.json not found at ${structurePath}`);
      return;
    }

    try {
      const content = fs.readFileSync(structurePath, 'utf8');
      this.fileStructure = JSON.parse(content);
    } catch (error) {
      this.logWarn(`Failed to load FILE_STRUCTURE.vf.json: ${error}`);
    }
  }

  /**
   * Check if strict mode is enabled for a given path
   */
  async isStrictModeEnabled(filePath: string): boolean {
    // Check if path is within this theme or its children
    const relativePath = path.relative(this.themePath, filePath);
    const isInTheme = !relativePath.startsWith('..');
    
    if (isInTheme) {
      if (this.strictConfig.inheritToChildren) {
        return this.strictConfig.enabled;
      }
      // Only apply to direct theme files, not children
      const segments = relativePath.split(path.sep);
      return this.strictConfig.enabled && segments.length <= 1;
    }
    
    return false;
  }

  /**
   * Validate a file operation before execution
   */
  async validateFileOperation(
    operation: 'create' | 'write' | 'mkdir',
    targetPath: string
  ): Promise<void> {
    if (!this.fileStructure) {
      await this.initialize();
    }

    // Skip validation if not in strict mode for this path
    if (!this.isStrictModeEnabled(targetPath)) {
      return;
    }

    const violations = await this.checkViolations(operation, targetPath);
    
    if (violations.length > 0) {
      const message = this.formatViolations(violations, targetPath);
      
      if (this.strictConfig.throwOnViolation) {
        throw new FileViolationError(message, targetPath, violations[0].type);
      } else if (this.strictConfig.logWarnings) {
        this.logWarn(message);
      }
    }
  }

  /**
   * Check for violations using filesystem-mcp logic
   */
  private async checkViolations(
    operation: string,
    targetPath: string
  ): Promise<Array<{type: string, message: string}>> {
    const violations: Array<{type: string, message: string}> = [];
    
    if (!this.fileStructure) {
      return violations;
    }

    const relativePath = path.relative(this.basePath, targetPath);
    const segments = relativePath.split(path.sep);
    
    // Check if creating in frozen directory
    const parentDir = path.dirname(targetPath);
    const isFrozen = await this.isDirectoryFrozen(parentDir);
    
    if (isFrozen) {
      const allowedInFrozen = await this.isAllowedInFrozenDirectory(parentDir, path.basename(targetPath));
      if (!allowedInFrozen) {
        violations.push({
          type: 'freeze_violation',
          message: `Cannot ${operation} '${path.basename(targetPath)}' in frozen directory '${parentDir}'`
        });
      }
    }

    // Check theme-specific rules
    if (relativePath.startsWith('layer/themes/infra_external-log-lib')) {
      const themeViolations = await this.checkThemeSpecificRules(operation, targetPath);
      violations.push(...themeViolations);
    }

    // Check pattern matching
    const patternViolation = await this.checkPatternViolation(targetPath);
    if (patternViolation) {
      violations.push(patternViolation);
    }

    return violations;
  }

  /**
   * Check if a directory is frozen
   */
  private async isDirectoryFrozen(dirPath: string): Promise<boolean> {
    if (!this.fileStructure) return false;

    const relativePath = path.relative(this.basePath, dirPath);
    
    // Check root freeze
    if (relativePath === '' || relativePath === '.') {
      return this.fileStructure.templates.workspace?.freeze || false;
    }

    // Check theme freeze rules
    if (relativePath.startsWith('layer/themes')) {
      const template = this.fileStructure.templates.theme;
      if (template && template.freeze) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file is allowed in a frozen directory
   */
  private async isAllowedInFrozenDirectory(
    dirPath: string,
    fileName: string
  ): Promise<boolean> {
    if (!this.fileStructure) return true;

    const relativePath = path.relative(this.basePath, dirPath);
    
    // Check root allowed files
    if (relativePath === '' || relativePath === '.') {
      const workspace = this.fileStructure.templates.workspace;
      if (!workspace) return false;

      const allowedFiles = new Set<string>();
      
      // Add required children
      workspace.required_children?.forEach(child => {
        allowedFiles.add(child.name);
      });
      
      // Add optional children
      workspace.optional_children?.forEach(child => {
        allowedFiles.add(child.name);
      });

      return allowedFiles.has(fileName);
    }

    return true;
  }

  /**
   * Check theme-specific rules
   */
  private async checkThemeSpecificRules(
    operation: string,
    targetPath: string
  ): Promise<Array<{type: string, message: string}>> {
    const violations: Array<{type: string, message: string}> = [];
    const fileName = path.basename(targetPath);
    const dirName = path.basename(path.dirname(targetPath));

    // Prevent creation of backup files
    if (fileName.endsWith('.bak') || fileName.endsWith('.backup')) {
      violations.push({
        type: 'backup_file',
        message: 'Backup files are not allowed. Use version control instead.'
      });
    }

    // Prevent duplicate mock files
    if (fileName.includes('mock') && fileName.endsWith('.js')) {
      const tsVersion = fileName.replace('.js', '.ts');
      const tsPath = path.join(path.dirname(targetPath), tsVersion);
      if (fs.existsSync(tsPath)) {
        violations.push({
          type: 'duplicate_mock',
          message: `JavaScript mock file not allowed when TypeScript version exists: ${tsVersion}`
        });
      }
    }

    // Check for proper directory structure
    const allowedThemeDirs = [
      'src', 'tests', 'pipe', 'children', 'common', 'research',
      'resources', 'user-stories', 'docs', 'gen', 'dist', 'coverage',
      'examples', 'scripts', 'node_modules', 'logs', 'utils'
    ];

    const relativePath = path.relative(this.themePath, targetPath);
    const topLevelDir = relativePath.split(path.sep)[0];

    if (operation === 'mkdir' && !allowedThemeDirs.includes(topLevelDir)) {
      violations.push({
        type: 'unexpected_directory',
        message: `Directory '${topLevelDir}' not in allowed list: ${allowedThemeDirs.join(', ')}`
      });
    }

    return violations;
  }

  /**
   * Check pattern violations
   */
  private async checkPatternViolation(
    targetPath: string
  ): Promise<{type: string, message: string} | null> {
    const fileName = path.basename(targetPath);
    
    // Check theme naming pattern
    if (targetPath.includes('layer/themes/')) {
      const themeMatch = targetPath.match(/layer\/themes\/([^/]+)/);
      if (themeMatch) {
        const themeName = themeMatch[1];
        const themePattern = /^[a-z][a-z0-9_-]*$/;
        if (!themePattern.test(themeName)) {
          return {
            type: 'pattern_violation',
            message: `Theme name '${themeName}' doesn't match pattern: ^[a-z][a-z0-9_-]*$`
          };
        }
      }
    }

    // Check file naming patterns
    if (fileName.includes(' ')) {
      return {
        type: 'pattern_violation',
        message: 'File names should not contain spaces'
      };
    }

    return null;
  }

  /**
   * Format violations for output
   */
  private formatViolations(
    violations: Array<{type: string, message: string}>,
    targetPath: string
  ): string {
    const lines = [`File operation violation for: ${targetPath}`];
    violations.forEach(v => {
      lines.push(`  [${v.type}] ${v.message}`);
    });
    return lines.join('\n');
  }

  /**
   * Safe file write with violation checking
   */
  async safeWriteFile(filePath: string, content: string): Promise<void> {
    await this.validateFileOperation('write', filePath);
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  /**
   * Safe file creation with violation checking
   */
  async safeCreateFile(filePath: string, content: string = ''): Promise<void> {
    await this.validateFileOperation('create', filePath);
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  /**
   * Safe directory creation with violation checking
   */
  async safeMkdir(dirPath: string, options?: fs.MakeDirectoryOptions): Promise<void> {
    await this.validateFileOperation('mkdir', dirPath);
    await fileAPI.createDirectory(dirPath);
  }

  /**
   * Get current strict mode configuration
   */
  async getStrictModeConfig(): StrictModeConfig {
    return { ...this.strictConfig };
  }

  /**
   * Update strict mode configuration
   */
  async setStrictModeConfig(config: Partial<StrictModeConfig>): void {
    this.strictConfig = { ...this.strictConfig, ...config };
  }

  /**
   * Enable strict mode for this theme and children
   */
  async enableStrictMode(): void {
    this.strictConfig.enabled = true;
    this.strictConfig.throwOnViolation = true;
    this.strictConfig.logWarnings = false;
  }

  /**
   * Disable strict mode (default)
   */
  async disableStrictMode(): void {
    this.strictConfig.enabled = false;
    this.strictConfig.throwOnViolation = false;
    this.strictConfig.logWarnings = true;
  }

  /**
   * Log warning message
   */
  private async logWarn(message: string): void {
    if (this.strictConfig.logWarnings) {
      console.warn(`[FileViolationPreventer] ${message}`);
    }
  }
}

export default FileViolationPreventer;