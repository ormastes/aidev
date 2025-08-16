import { fileAPI } from '../utils/file-api';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

// Interface definitions
export interface WorkspaceContext {
  path: string;
  themes: string[];
  activeProjects: string[];
  settings: Record<string, any>;
  metadata: {
    lastModified: Date;
    version: string;
    totalFiles: number;
  };
}

export interface FileInfo {
  path: string;
  content: string;
  size: number;
  lastModified: Date;
  encoding: string;
}

export interface DirectoryInfo {
  path: string;
  files: string[];
  directories: string[];
  totalSize: number;
  fileCount: number;
}

export interface ContextCache {
  workspace?: WorkspaceContext;
  files: Map<string, FileInfo>;
  directories: Map<string, DirectoryInfo>;
  lastUpdated: Date;
  hits: number;
  misses: number;
}

export class ContextProvider {
  private baseDir: string;
  private aidevDir: string;
  private cache: ContextCache;
  private cacheEnabled: boolean;
  private cacheTTL: number; // Cache time-to-live in milliseconds

  constructor(baseDir: string = process.cwd(), cacheEnabled: boolean = true, cacheTTL: number = 300000) {
    this.baseDir = baseDir;
    this.aidevDir = path.join(baseDir, '..', '_aidev');
    this.cacheEnabled = cacheEnabled;
    this.cacheTTL = cacheTTL;
    this.cache = {
      files: new Map(),
      directories: new Map(),
      lastUpdated: new Date(),
      hits: 0,
      misses: 0
    };
  }

  async loadAidevContext(): Promise<WorkspaceContext> {
    if (this.cacheEnabled && this.cache.workspace && this.isCacheValid()) {
      this.cache.hits++;
      return this.cache.workspace;
    }

    try {
      // Verify aidev directory exists
      await this.ensureAidevDirectory();

      // Load workspace settings
      const settings = await this.loadWorkspaceSettings();
      
      // Discover themes
      const themes = await this.discoverThemes();
      
      // Find active projects
      const activeProjects = await this.discoverActiveProjects();
      
      // Get metadata
      const metadata = await this.getWorkspaceMetadata();

      const context: WorkspaceContext = {
        path: this.aidevDir,
        themes,
        activeProjects,
        settings,
        metadata
      };

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.workspace = context;
        this.cache.lastUpdated = new Date();
        this.cache.misses++;
      }

      return context;
    } catch (error) {
      throw new Error(`Failed to load aidev context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCurrentContext(): Promise<{
    workspace: WorkspaceContext;
    currentDirectory: string;
    environmentInfo: Record<string, any>;
  }> {
    const workspace = await this.loadAidevContext();
    const currentDirectory = process.cwd();
    const environmentInfo = await this.getEnvironmentInfo();

    return {
      workspace,
      currentDirectory,
      environmentInfo
    };
  }

  async getFileContent(filePath: string): Promise<string> {
    const absolutePath = this.resolveFilePath(filePath);
    
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.cache.files.get(absolutePath);
      if (cached && this.isCacheValid()) {
        this.cache.hits++;
        return cached.content;
      }
    }

    try {
      const content = await fileAPI.readFile(absolutePath, 'utf-8');
      const stats = await /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(absolutePath) */ */;

      const fileInfo: FileInfo = {
        path: absolutePath,
        content,
        size: stats.size,
        lastModified: stats.mtime,
        encoding: 'utf-8'
      };

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.files.set(absolutePath, fileInfo);
        this.cache.misses++;
      }

      return content;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileInfo(filePath: string): Promise<FileInfo> {
    const absolutePath = this.resolveFilePath(filePath);
    
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.cache.files.get(absolutePath);
      if (cached && this.isCacheValid()) {
        this.cache.hits++;
        return cached;
      }
    }

    try {
      const content = await fileAPI.readFile(absolutePath, 'utf-8');
      const stats = await /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(absolutePath) */ */;

      const fileInfo: FileInfo = {
        path: absolutePath,
        content,
        size: stats.size,
        lastModified: stats.mtime,
        encoding: 'utf-8'
      };

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.files.set(absolutePath, fileInfo);
        this.cache.misses++;
      }

      return fileInfo;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to get file info for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDirectoryInfo(dirPath: string): Promise<DirectoryInfo> {
    const absolutePath = this.resolveFilePath(dirPath);
    
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.cache.directories.get(absolutePath);
      if (cached && this.isCacheValid()) {
        this.cache.hits++;
        return cached;
      }
    }

    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      const files: string[] = [];
      const directories: string[] = [];
      let totalSize = 0;

      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(entry.name);
          try {
            const filePath = path.join(absolutePath, entry.name);
            const stats = await /* FRAUD_FIX: fs.stat(filePath) */;
            totalSize += stats.size;
          } catch {
            // Ignore stat errors for individual files
          }
        } else if (entry.isDirectory()) {
          directories.push(entry.name);
        }
      }

      const dirInfo: DirectoryInfo = {
        path: absolutePath,
        files,
        directories,
        totalSize,
        fileCount: files.length
      };

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.directories.set(absolutePath, dirInfo);
        this.cache.misses++;
      }

      return dirInfo;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      throw new Error(`Failed to get directory info for ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchFiles(pattern: string, directory?: string, options: {
    recursive?: boolean;
    includeContent?: boolean;
    maxResults?: number;
  } = {}): Promise<Array<{
    path: string;
    matches: string[];
    content?: string;
  }>> {
    const searchDir = directory ? this.resolveFilePath(directory) : this.baseDir;
    const { recursive = true, includeContent = false, maxResults = 100 } = options;
    const regex = new RegExp(pattern, 'gi');
    const results: Array<{ path: string; matches: string[]; content?: string }> = [];

    try {
      await this.searchInDirectory(searchDir, regex, results, recursive, includeContent, maxResults);
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  private async searchInDirectory(
    dirPath: string,
    regex: RegExp,
    results: Array<{ path: string; matches: string[]; content?: string }>,
    recursive: boolean,
    includeContent: boolean,
    maxResults: number
  ): Promise<void> {
    if (results.length >= maxResults) {
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) {
          break;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isFile() && this.isTextFile(entry.name)) {
          try {
            const content = await fileAPI.readFile(fullPath, 'utf-8');
            const matches = content.match(regex);
            
            if (matches && matches.length > 0) {
              results.push({
                path: fullPath,
                matches: Array.from(new Set(matches)), // Remove duplicates
                content: includeContent ? content : undefined
              });
            }
          } catch {
            // Ignore files that can't be read
          }
        } else if (entry.isDirectory() && recursive && !this.isIgnoredDirectory(entry.name)) {
          await this.searchInDirectory(fullPath, regex, results, recursive, includeContent, maxResults);
        }
      }
    } catch {
      // Ignore directory access errors
    }
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = ['.txt', '.md', '.js', '.ts', '.json', '.yml', '.yaml', '.xml', '.html', '.css', '.py', '.java', '.cpp', '.c', '.h'];
    const ext = path.extname(filename).toLowerCase();
    return textExtensions.includes(ext) || !path.extname(filename); // Include files without extension
  }

  private isIgnoredDirectory(dirname: string): boolean {
    const ignoredDirs = ['node_modules', '.git', '.vscode', 'build', 'dist', "coverage", '.next', '__pycache__'];
    return ignoredDirs.includes(dirname) || dirname.startsWith('.');
  }

  // Cache management
  clearCache(): void {
    this.cache = {
      files: new Map(),
      directories: new Map(),
      lastUpdated: new Date(),
      hits: 0,
      misses: 0
    };
  }

  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    lastUpdated: Date;
  } {
    const totalRequests = this.cache.hits + this.cache.misses;
    const hitRate = totalRequests > 0 ? this.cache.hits / totalRequests : 0;

    return {
      size: this.cache.files.size + this.cache.directories.size,
      hits: this.cache.hits,
      misses: this.cache.misses,
      hitRate,
      lastUpdated: this.cache.lastUpdated
    };
  }

  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  private isCacheValid(): boolean {
    const now = new Date();
    return (now.getTime() - this.cache.lastUpdated.getTime()) < this.cacheTTL;
  }

  // Helper methods
  private resolveFilePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Check if it's relative to aidev directory
    if (filePath.startsWith('_aidev/') || filePath.startsWith('aidev/')) {
      return path.join(this.aidevDir, filePath.replace(/^_?aidev\//, ''));
    }
    
    // Default to base directory
    return path.join(this.baseDir, filePath);
  }

  private async ensureAidevDirectory(): Promise<void> {
    try {
      await fs.access(this.aidevDir);
    } catch {
      throw new Error(`Aidev directory not found: ${this.aidevDir}`);
    }
  }

  private async loadWorkspaceSettings(): Promise<Record<string, any>> {
    try {
      const settingsPath = path.join(this.aidevDir, 'settings.json');
      const content = await fileAPI.readFile(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {}; // Return empty settings if file doesn't exist
    }
  }

  private async discoverThemes(): Promise<string[]> {
    try {
      const layerDir = path.join(this.aidevDir, 'layer', 'themes');
      const entries = await fs.readdir(layerDir, { withFileTypes: true });
      return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    } catch {
      return []; // Return empty array if themes directory doesn't exist
    }
  }

  private async discoverActiveProjects(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const projects: string[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && !this.isIgnoredDirectory(entry.name)) {
          // Check if it's a project directory (has package.json, pyproject.toml, etc.)
          const projectPath = path.join(this.baseDir, entry.name);
          const hasProjectFile = await this.hasProjectFiles(projectPath);
          if (hasProjectFile) {
            projects.push(entry.name);
          }
        }
      }
      
      return projects;
    } catch {
      return [];
    }
  }

  private async hasProjectFiles(dirPath: string): Promise<boolean> {
    const projectFiles = ['package.json', 'pyproject.toml', 'Cargo.toml', 'pom.xml', 'build.gradle'];
    
    for (const file of projectFiles) {
      try {
        await fs.access(path.join(dirPath, file));
        return true;
      } catch {
        // Continue checking other files
      }
    }
    
    return false;
  }

  private async getWorkspaceMetadata(): Promise<{
    lastModified: Date;
    version: string;
    totalFiles: number;
  }> {
    try {
      const stats = await /* FRAUD_FIX: fs.stat(this.aidevDir) */;
      let totalFiles = 0;
      
      // Count files recursively
      const countFiles = async (dir: string): Promise<number> => {
        let count = 0;
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile()) {
              count++;
            } else if (entry.isDirectory() && !this.isIgnoredDirectory(entry.name)) {
              count += await countFiles(path.join(dir, entry.name));
            }
          }
        } catch {
          // Ignore access errors
        }
        return count;
      };

      totalFiles = await countFiles(this.aidevDir);

      return {
        lastModified: stats.mtime,
        version: '1.0.0', // Could be read from a version file
        totalFiles
      };
    } catch {
      return {
        lastModified: new Date(),
        version: '1.0.0',
        totalFiles: 0
      };
    }
  }

  private async getEnvironmentInfo(): Promise<Record<string, any>> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PATH: process.env.PATH?.split(path.delimiter).slice(0, 5) // First 5 PATH entries only
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Public getters
  getBaseDirectory(): string {
    return this.baseDir;
  }

  getAidevDirectory(): string {
    return this.aidevDir;
  }

  isCacheEnabled(): boolean {
    return this.cacheEnabled;
  }
}