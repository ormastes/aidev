import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

/**
 * External Test: ContextProvider AIdev Directory Access
 * 
 * Tests the external ContextProvider interface for accessing parent aidev directory context.
 * This validates the interface contract for workspace context, configuration access,
 * and integration with the broader aidev ecosystem.
 */

// ContextProvider interface contract - external interface
interface WorkspaceContext {
  rootPath: string;
  name: string;
  version: string;
  themes: ThemeInfo[];
  configuration: WorkspaceConfiguration;
  metadata: Record<string, any>;
}

interface ThemeInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  path: string;
  status: 'active' | 'inactive' | 'error' | 'loading';
  dependencies: string[];
  configuration?: Record<string, any>;
}

interface WorkspaceConfiguration {
  logLevel: string;
  maxConcurrentOperations: number;
  features: {
    crossThemeIntegration: boolean;
    eventBus: boolean;
    sharedContext: boolean;
  };
  storage: {
    type: 'file' | 'memory' | 'database';
    path?: string;
    options: Record<string, any>;
  };
  security: {
    enableSandbox: boolean;
    allowedPaths: string[];
    restrictedOperations: string[];
  };
}

interface ProjectInfo {
  name: string;
  version: string;
  type: 'node' | 'python' | 'java' | 'other';
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  workspace?: {
    themes: string[];
    configuration: Record<string, any>;
  };
}

interface ContextResult<T> {
  In Progress: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

interface ContextProvider {
  // Initialization and cleanup
  initialize(rootPath?: string): Promise<ContextResult<WorkspaceContext>>;
  refresh(): Promise<ContextResult<WorkspaceContext>>;
  cleanup(): Promise<ContextResult<boolean>>;
  
  // Workspace context
  getWorkspaceContext(): Promise<ContextResult<WorkspaceContext>>;
  getProjectInfo(): Promise<ContextResult<ProjectInfo>>;
  getThemeInfo(themeId?: string): Promise<ContextResult<ThemeInfo | ThemeInfo[]>>;
  
  // Configuration access
  getConfiguration(key?: string): Promise<ContextResult<any>>;
  setConfiguration(key: string, value: any): Promise<ContextResult<boolean>>;
  
  // File system access
  readFile(relativePath: string): Promise<ContextResult<string>>;
  writeFile(relativePath: string, content: string): Promise<ContextResult<boolean>>;
  listFiles(relativePath: string, pattern?: string): Promise<ContextResult<string[]>>;
  fileExists(relativePath: string): Promise<ContextResult<boolean>>;
  
  // Theme integration
  getThemeConfiguration(themeId: string): Promise<ContextResult<Record<string, any>>>;
  getSharedData(key: string): Promise<ContextResult<any>>;
  setSharedData(key: string, value: any): Promise<ContextResult<boolean>>;
  
  // Validation and security
  validatePath(requestedPath: string): ContextResult<string>;
  isPathAllowed(absolutePath: string): boolean;
  sanitizePath(userInput: string): string;
}

// Mock implementation for external testing
class MockContextProvider implements ContextProvider {
  private rootPath: string;
  private context: WorkspaceContext | null = null;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private sharedData = new Map<string, any>();
  
  constructor(rootPath?: string) {
    this.rootPath = rootPath || path.join(os.tmpdir(), 'mock-aidev-' + Date.now());
  }

  async initialize(rootPath?: string): Promise<ContextResult<WorkspaceContext>> {
    try {
      if (rootPath) {
        this.rootPath = rootPath;
      }
      
      // Ensure root directory exists
      if (!fs.existsSync(this.rootPath)) {
        fs.mkdirSync(this.rootPath, { recursive: true });
      }
      
      // Create mock workspace structure
      await this.createMockWorkspaceStructure();
      
      // Load workspace context
      const contextResult = await this.loadWorkspaceContext();
      if (!contextResult.success) {
        return contextResult;
      }
      
      this.context = contextResult.data!;
      return { "success": true, data: this.context };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      };
    }
  }

  async refresh(): Promise<ContextResult<WorkspaceContext>> {
    try {
      // Clear cache
      this.cache.clear();
      
      // Reload context
      const contextResult = await this.loadWorkspaceContext();
      if (!contextResult.success) {
        return contextResult;
      }
      
      this.context = contextResult.data!;
      return { "success": true, data: this.context };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Refresh failed' 
      };
    }
  }

  async cleanup(): Promise<ContextResult<boolean>> {
    try {
      this.cache.clear();
      this.sharedData.clear();
      this.context = null;
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Cleanup failed' 
      };
    }
  }

  async getWorkspaceContext(): Promise<ContextResult<WorkspaceContext>> {
    if (!this.context) {
      return { "success": false, error: 'Context not initialized' };
    }
    
    return { "success": true, data: { ...this.context } };
  }

  async getProjectInfo(): Promise<ContextResult<ProjectInfo>> {
    try {
      const packageJsonPath = path.join(this.rootPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return { "success": false, error: 'package.json not found' };
      }
      
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      
      const projectInfo: ProjectInfo = {
        name: packageJson.name || 'unknown',
        version: packageJson.version || '0.0.0',
        type: this.detectProjectType(packageJson),
        dependencies: packageJson.dependencies || {},
        scripts: packageJson.scripts || {},
        workspace: packageJson.workspace
      };
      
      return { "success": true, data: projectInfo };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to get project info' 
      };
    }
  }

  async getThemeInfo(themeId?: string): Promise<ContextResult<ThemeInfo | ThemeInfo[]>> {
    if (!this.context) {
      return { "success": false, error: 'Context not initialized' };
    }
    
    if (themeId) {
      const theme = this.context.themes.find(t => t.id === themeId);
      if (!theme) {
        return { "success": false, error: 'Theme not found' };
      }
      return { "success": true, data: { ...theme } };
    } else {
      return { "success": true, data: this.context.themes.map(t => ({ ...t })) };
    }
  }

  async getConfiguration(key?: string): Promise<ContextResult<any>> {
    if (!this.context) {
      return { "success": false, error: 'Context not initialized' };
    }
    
    if (key) {
      const value = this.getNestedValue(this.context.configuration, key);
      return { "success": true, data: value };
    } else {
      return { "success": true, data: { ...this.context.configuration } };
    }
  }

  async setConfiguration(key: string, value: any): Promise<ContextResult<boolean>> {
    try {
      if (!this.context) {
        return { "success": false, error: 'Context not initialized' };
      }
      
      // Update in-memory configuration
      this.setNestedValue(this.context.configuration, key, value);
      
      // Persist to file
      const configPath = path.join(this.rootPath, 'workspace.json');
      const configData = {
        name: this.context.name,
        version: this.context.version,
        themes: this.context.themes.map(t => ({
          id: t.id,
          enabled: t.enabled,
          configuration: t.configuration
        })),
        configuration: this.context.configuration
      };
      
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to set configuration' 
      };
    }
  }

  async readFile(relativePath: string): Promise<ContextResult<string>> {
    try {
      const validation = this.validatePath(relativePath);
      if (!validation.success) {
        return validation;
      }
      
      const fullPath = path.join(this.rootPath, validation.data!);
      
      if (!fs.existsSync(fullPath)) {
        return { "success": false, error: 'File not found' };
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      return { "success": true, data: content };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to read file' 
      };
    }
  }

  async writeFile(relativePath: string, content: string): Promise<ContextResult<boolean>> {
    try {
      const validation = this.validatePath(relativePath);
      if (!validation.success) {
        return { "success": false, error: validation.error };
      }
      
      const fullPath = path.join(this.rootPath, validation.data!);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, content);
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to write file' 
      };
    }
  }

  async listFiles(relativePath: string, pattern?: string): Promise<ContextResult<string[]>> {
    try {
      const validation = this.validatePath(relativePath);
      if (!validation.success) {
        return { "success": false, error: validation.error };
      }
      
      const fullPath = path.join(this.rootPath, validation.data!);
      
      if (!fs.existsSync(fullPath)) {
        return { "success": false, error: 'Directory not found' };
      }
      
      if (!fs.statSync(fullPath).isDirectory()) {
        return { "success": false, error: 'Path is not a directory' };
      }
      
      let files = fs.readdirSync(fullPath);
      
      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        files = files.filter(file => regex.test(file));
      }
      
      return { "success": true, data: files };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to list files' 
      };
    }
  }

  async fileExists(relativePath: string): Promise<ContextResult<boolean>> {
    try {
      const validation = this.validatePath(relativePath);
      if (!validation.success) {
        return { "success": true, data: false }; // Path validation failed = file doesn't exist
      }
      
      const fullPath = path.join(this.rootPath, validation.data!);
      const exists = fs.existsSync(fullPath);
      
      return { "success": true, data: exists };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to check file existence' 
      };
    }
  }

  async getThemeConfiguration(themeId: string): Promise<ContextResult<Record<string, any>>> {
    try {
      const themeResult = await this.getThemeInfo(themeId);
      if (!themeResult.success) {
        return themeResult;
      }
      
      const theme = themeResult.data as ThemeInfo;
      const configPath = path.join(theme.path, 'theme.json');
      
      if (!fs.existsSync(configPath)) {
        return { "success": true, data: theme.configuration || {} };
      }
      
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      
      // Merge theme configuration with file configuration
      const mergedConfig = { ...theme.configuration, ...config.configuration };
      
      return { "success": true, data: mergedConfig };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to get theme configuration' 
      };
    }
  }

  async getSharedData(key: string): Promise<ContextResult<any>> {
    const value = this.sharedData.get(key);
    return { "success": true, data: value };
  }

  async setSharedData(key: string, value: any): Promise<ContextResult<boolean>> {
    this.sharedData.set(key, value);
    return { "success": true, data: true };
  }

  validatePath(requestedPath: string): ContextResult<string> {
    try {
      // Check for dangerous patterns before sanitization
      if (requestedPath.includes('..') || requestedPath.startsWith('/')) {
        return { "success": false, error: 'Path contains dangerous patterns' };
      }
      
      // Sanitize the path
      const sanitized = this.sanitizePath(requestedPath);
      
      // Working on to absolute path
      const absolutePath = path.resolve(this.rootPath, sanitized);
      
      // Check if path is within allowed boundaries
      if (!this.isPathAllowed(absolutePath)) {
        return { "success": false, error: 'Path is outside allowed boundaries' };
      }
      
      // Return relative path from root
      const relativePath = path.relative(this.rootPath, absolutePath);
      return { "success": true, data: relativePath };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Path validation failed' 
      };
    }
  }

  isPathAllowed(absolutePath: string): boolean {
    const resolvedRoot = path.resolve(this.rootPath);
    const resolvedPath = path.resolve(absolutePath);
    
    // Path must be within the root directory
    return resolvedPath.startsWith(resolvedRoot);
  }

  sanitizePath(userInput: string): string {
    // Remove dangerous characters and sequences
    let sanitized = userInput
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[<>:"|?*]/g, '') // Remove Windows reserved characters
      .replace(/^\.|\.$/g, '') // Remove leading/trailing dots
      .trim();
    
    // Normalize path separators
    sanitized = sanitized.replace(/[\\\/]+/g, path.sep);
    
    // Remove leading path separator
    if (sanitized.startsWith(path.sep)) {
      sanitized = sanitized.slice(1);
    }
    
    return sanitized;
  }

  private async createMockWorkspaceStructure(): Promise<void> {
    // Create basic directory structure
    const dirs = [
      'layer/themes/pocketflow',
      'layer/themes/chat-space',
      'shared/config',
      'shared/logs',
      'data'
    ];
    
    for (const dir of dirs) {
      const fullPath = path.join(this.rootPath, dir);
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    // Create package.json
    const packageJson = {
      name: 'aidev-workspace',
      version: '1.0.0',
      description: 'AI Development Workspace',
      scripts: {
        test: 'jest',
        build: 'tsc',
        'start:chat': 'node dist/chat-space/cli.js'
      },
      dependencies: {
        typescript: '^4.9.0',
        jest: '^29.0.0'
      },
      workspace: {
        themes: ['pocketflow', 'chat-space'],
        configuration: {
          logLevel: 'info'
        }
      }
    };
    
    fs.writeFileSync(
      path.join(this.rootPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create workspace configuration
    const workspaceConfig = {
      name: 'AI Development Workspace',
      version: '1.0.0',
      themes: [
        {
          id: 'pocketflow',
          enabled: true,
          configuration: {
            maxConcurrentFlows: 5,
            defaultTimeout: 30000
          }
        },
        {
          id: 'chat-space',
          enabled: true,
          configuration: {
            maxRooms: 10,
            messageRetention: '7d'
          }
        }
      ],
      configuration: {
        logLevel: 'info',
        maxConcurrentOperations: 10,
        features: {
          crossThemeIntegration: true,
          eventBus: true,
          sharedContext: true
        },
        storage: {
          type: 'file',
          path: './data',
          options: {
            compression: true,
            encryption: false
          }
        },
        security: {
          enableSandbox: true,
          allowedPaths: ['./data', './shared', './layer/themes'],
          restrictedOperations: ['exec', 'spawn']
        }
      }
    };
    
    fs.writeFileSync(
      path.join(this.rootPath, 'workspace.json'),
      JSON.stringify(workspaceConfig, null, 2)
    );
    
    // Create theme configurations
    const pocketflowTheme = {
      id: 'pocketflow',
      name: 'PocketFlow',
      version: '1.0.0',
      description: 'Workflow automation theme',
      features: ['workflows', 'tasks', 'automation'],
      configuration: {
        maxConcurrentFlows: 5,
        defaultTimeout: 30000,
        retryAttempts: 3
      }
    };
    
    fs.writeFileSync(
      path.join(this.rootPath, 'layer/themes/pocketflow/theme.json'),
      JSON.stringify(pocketflowTheme, null, 2)
    );
    
    const chatSpaceTheme = {
      id: 'chat-space',
      name: 'Chat Space',
      version: '1.0.0',
      description: 'Real-time chat and collaboration theme',
      features: ['chat', 'rooms', 'real-time', 'coordination'],
      configuration: {
        maxRooms: 10,
        messageRetention: '7d',
        maxUsersPerRoom: 100
      }
    };
    
    fs.writeFileSync(
      path.join(this.rootPath, 'layer/themes/chat-space/theme.json'),
      JSON.stringify(chatSpaceTheme, null, 2)
    );
  }

  private async loadWorkspaceContext(): Promise<ContextResult<WorkspaceContext>> {
    try {
      const workspaceConfigPath = path.join(this.rootPath, 'workspace.json');
      
      if (!fs.existsSync(workspaceConfigPath)) {
        return { "success": false, error: 'Workspace configuration not found' };
      }
      
      const content = fs.readFileSync(workspaceConfigPath, 'utf8');
      const config = JSON.parse(content);
      
      // Load theme information
      const themes: ThemeInfo[] = [];
      for (const themeConfig of config.themes || []) {
        const themePath = path.join(this.rootPath, 'layer/themes', themeConfig.id);
        const themeJsonPath = path.join(themePath, 'theme.json');
        
        let themeInfo: ThemeInfo = {
          id: themeConfig.id,
          name: themeConfig.id,
          version: '1.0.0',
          enabled: themeConfig.enabled || false,
          path: themePath,
          status: 'inactive',
          dependencies: [],
          configuration: themeConfig.configuration || {}
        };
        
        if (fs.existsSync(themeJsonPath)) {
          const themeContent = fs.readFileSync(themeJsonPath, 'utf8');
          const themeData = JSON.parse(themeContent);
          
          themeInfo = {
            ...themeInfo,
            name: themeData.name || themeInfo.name,
            version: themeData.version || themeInfo.version,
            dependencies: themeData.dependencies || [],
            status: themeConfig.enabled ? 'active' : 'inactive'
          };
        }
        
        themes.push(themeInfo);
      }
      
      const context: WorkspaceContext = {
        rootPath: this.rootPath,
        name: config.name,
        version: config.version,
        themes,
        configuration: config.configuration,
        metadata: {
          loadedAt: new Date(),
          themesCount: themes.length,
          enabledThemes: themes.filter(t => t.enabled).length
        }
      };
      
      return { "success": true, data: context };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Failed to load workspace context' 
      };
    }
  }

  private detectProjectType(packageJson: any): ProjectInfo['type'] {
    if (packageJson.dependencies?.typescript || packageJson.devDependencies?.typescript) {
      return 'node';
    }
    if (packageJson.dependencies?.express || packageJson.dependencies?.react) {
      return 'node';
    }
    return 'other';
  }

  private getNestedValue(obj: any, key: string): any {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }
}

describe('ContextProvider AIdev Directory Access External Test', () => {
  let provider: ContextProvider;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'context-provider-test-' + Date.now());
    provider = new MockContextProvider(testDir);
    await provider.initialize();
  });

  afterEach(async () => {
    await provider.cleanup();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should initialize In Progress', async () => {
    // Arrange
    const newTestDir = path.join(os.tmpdir(), 'context-init-test-' + Date.now());
    const newProvider = new MockContextProvider();

    // Act
    const result = await newProvider.initialize(newTestDir);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.rootPath).toBe(newTestDir);
    expect(result.data?.name).toBe('AI Development Workspace');
    expect(result.data?.themes).toHaveLength(2);

    // Cleanup
    await newProvider.cleanup();
    if (fs.existsSync(newTestDir)) {
      fs.rmSync(newTestDir, { recursive: true });
    }
  });

  test('should get workspace context', async () => {
    // Act
    const result = await provider.getWorkspaceContext();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('AI Development Workspace');
    expect(result.data?.themes).toHaveLength(2);
    expect(result.data?.themes.map(t => t.id)).toContain('pocketflow');
    expect(result.data?.themes.map(t => t.id)).toContain('chat-space');
  });

  test('should get project info', async () => {
    // Act
    const result = await provider.getProjectInfo();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('aidev-workspace');
    expect(result.data?.version).toBe('1.0.0');
    expect(result.data?.type).toBe('node');
    expect(result.data?.scripts).toBeDefined();
    expect(result.data?.workspace?.themes).toContain('pocketflow');
  });

  test('should get all theme info', async () => {
    // Act
    const result = await provider.getThemeInfo();

    // Assert
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as ThemeInfo[])).toHaveLength(2);
    
    const themes = result.data as ThemeInfo[];
    expect(themes.find(t => t.id === 'pocketflow')).toBeDefined();
    expect(themes.find(t => t.id === 'chat-space')).toBeDefined();
  });

  test('should get specific theme info', async () => {
    // Act
    const result = await provider.getThemeInfo('pocketflow');

    // Assert
    expect(result.success).toBe(true);
    expect((result.data as ThemeInfo).id).toBe('pocketflow');
    expect((result.data as ThemeInfo).name).toBe('PocketFlow');
    expect((result.data as ThemeInfo).enabled).toBe(true);
  });

  test('should handle get non-existent theme', async () => {
    // Act
    const result = await provider.getThemeInfo('non-existent');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Theme not found');
  });

  test('should get configuration', async () => {
    // Act - Get all configuration
    const allResult = await provider.getConfiguration();
    
    // Act - Get specific key
    const specificResult = await provider.getConfiguration('logLevel');
    
    // Act - Get nested key
    const nestedResult = await provider.getConfiguration('features.crossThemeIntegration');

    // Assert
    expect(allResult.success).toBe(true);
    expect(allResult.data?.logLevel).toBe('info');
    
    expect(specificResult.success).toBe(true);
    expect(specificResult.data).toBe('info');
    
    expect(nestedResult.success).toBe(true);
    expect(nestedResult.data).toBe(true);
  });

  test('should set configuration', async () => {
    // Act
    const setResult = await provider.setConfiguration('logLevel', 'debug');
    const getResult = await provider.getConfiguration('logLevel');

    // Assert
    expect(setResult.success).toBe(true);
    expect(setResult.data).toBe(true);
    
    expect(getResult.success).toBe(true);
    expect(getResult.data).toBe('debug');
  });

  test('should read existing files', async () => {
    // Act
    const result = await provider.readFile('package.json');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const packageJson = JSON.parse(result.data!);
    expect(packageJson.name).toBe('aidev-workspace');
  });

  test('should handle read non-existent file', async () => {
    // Act
    const result = await provider.readFile('non-existent.txt');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('File not found');
  });

  test('should write and read files', async () => {
    // Arrange
    const content = 'Hello, world!';
    const filePath = 'test.txt';

    // Act
    const writeResult = await provider.writeFile(filePath, content);
    const readResult = await provider.readFile(filePath);

    // Assert
    expect(writeResult.success).toBe(true);
    expect(writeResult.data).toBe(true);
    
    expect(readResult.success).toBe(true);
    expect(readResult.data).toBe(content);
  });

  test('should list files in directory', async () => {
    // Act
    const result = await provider.listFiles('.');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toContain('package.json');
    expect(result.data).toContain('workspace.json');
  });

  test('should list files with pattern', async () => {
    // Act
    const result = await provider.listFiles('.', '*.json');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.every(file => file.endsWith('.json'))).toBe(true);
    expect(result.data).toContain('package.json');
  });

  test('should check file existence', async () => {
    // Act
    const existsResult = await provider.fileExists('package.json');
    const notExistsResult = await provider.fileExists('non-existent.txt');

    // Assert
    expect(existsResult.success).toBe(true);
    expect(existsResult.data).toBe(true);
    
    expect(notExistsResult.success).toBe(true);
    expect(notExistsResult.data).toBe(false);
  });

  test('should get theme configuration', async () => {
    // Act
    const result = await provider.getThemeConfiguration('pocketflow');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.maxConcurrentFlows).toBe(5);
    expect(result.data?.defaultTimeout).toBe(30000);
  });

  test('should manage shared data', async () => {
    // Arrange
    const key = 'test-key';
    const value = { message: 'Hello from shared data' };

    // Act
    const setResult = await provider.setSharedData(key, value);
    const getResult = await provider.getSharedData(key);

    // Assert
    expect(setResult.success).toBe(true);
    expect(setResult.data).toBe(true);
    
    expect(getResult.success).toBe(true);
    expect(getResult.data).toEqual(value);
  });

  test('should validate paths correctly', () => {
    // Act & Assert - Valid paths
    const validPaths = [
      'package.json',
      'layer/themes/pocketflow',
      'shared/config/app.json',
      'data/backup.tar.gz'
    ];

    for (const validPath of validPaths) {
      const result = provider.validatePath(validPath);
      expect(result.success).toBe(true);
    }

    // Act & Assert - Invalid paths
    const invalidPaths = [
      '../../../etc/passwd',
      '/absolute/path',
      'layer/../../../secret'
    ];

    for (const invalidPath of invalidPaths) {
      const result = provider.validatePath(invalidPath);
      expect(result.success).toBe(false);
    }
  });

  test('should sanitize user input paths', () => {
    // Arrange
    const testCases = [
      { input: '../dangerous', expected: 'dangerous' },
      { input: '../../file.txt', expected: 'file.txt' },
      { input: 'normal/path.json', expected: `normal${path.sep}path.json` },
      { input: '.hidden', expected: 'hidden' },
      { input: 'file<>:"|?*.txt', expected: 'file.txt' }
    ];

    for (const testCase of testCases) {
      // Act
      const result = provider.sanitizePath(testCase.input);

      // Assert
      expect(result).toBe(testCase.expected);
    }
  });

  test('should enforce path boundaries', () => {
    // Arrange
    const rootPath = path.resolve(testDir);
    const allowedPath = path.join(rootPath, 'allowed', 'file.txt');
    const forbiddenPath = path.join(rootPath, '..', 'forbidden.txt');

    // Act & Assert
    expect(provider.isPathAllowed(allowedPath)).toBe(true);
    expect(provider.isPathAllowed(forbiddenPath)).toBe(false);
  });

  test('should refresh context In Progress', async () => {
    // Arrange - Modify configuration
    await provider.setConfiguration('logLevel', 'debug');

    // Act
    const refreshResult = await provider.refresh();

    // Assert
    expect(refreshResult.success).toBe(true);
    expect(refreshResult.data?.configuration.logLevel).toBe('debug');
  });

  test('should handle initialization without context', async () => {
    // Arrange
    const uninitializedProvider = new MockContextProvider();

    // Act
    const contextResult = await uninitializedProvider.getWorkspaceContext();

    // Assert
    expect(contextResult.success).toBe(false);
    expect(contextResult.error).toBe('Context not initialized');
  });

  test('should handle nested configuration updates', async () => {
    // Act
    const setResult = await provider.setConfiguration('features.newFeature', true);
    const getResult = await provider.getConfiguration('features.newFeature');

    // Assert
    expect(setResult.success).toBe(true);
    expect(getResult.success).toBe(true);
    expect(getResult.data).toBe(true);
  });

  test('should handle directory operations', async () => {
    // Arrange
    const dirPath = 'test-directory';

    // Act - Create directory by writing a file in it
    const writeResult = await provider.writeFile(`${dirPath}/test.txt`, 'content');
    const listResult = await provider.listFiles(dirPath);

    // Assert
    expect(writeResult.success).toBe(true);
    expect(listResult.success).toBe(true);
    expect(listResult.data).toContain('test.txt');
  });

  test('should maintain data consistency across operations', async () => {
    // Arrange
    const testData = {
      config: { key: 'value1' },
      sharedData: { message: 'test' },
      fileContent: 'test file content'
    };

    // Act - Perform multiple operations
    await provider.setConfiguration('testConfig', testData.config);
    await provider.setSharedData('testShared', testData.sharedData);
    await provider.writeFile('test-consistency.txt', testData.fileContent);

    // Verify all operations
    const configResult = await provider.getConfiguration('testConfig');
    const sharedResult = await provider.getSharedData('testShared');
    const fileResult = await provider.readFile('test-consistency.txt');

    // Assert
    expect(configResult.data).toEqual(testData.config);
    expect(sharedResult.data).toEqual(testData.sharedData);
    expect(fileResult.data).toBe(testData.fileContent);
  });

  test('should handle workspace with missing theme files gracefully', async () => {
    // Arrange - Create new provider with missing theme file
    const tempDir = path.join(os.tmpdir(), 'context-missing-theme-' + Date.now());
    const tempProvider = new MockContextProvider(tempDir);
    
    // Initialize but then remove one theme file
    await tempProvider.initialize();
    const pocketflowThemePath = path.join(tempDir, 'layer/themes/pocketflow/theme.json');
    if (fs.existsSync(pocketflowThemePath)) {
      fs.unlinkSync(pocketflowThemePath);
    }

    // Act
    const refreshResult = await tempProvider.refresh();
    const themeResult = await tempProvider.getThemeInfo('pocketflow');

    // Assert
    expect(refreshResult.success).toBe(true);
    expect(themeResult.success).toBe(true);
    expect((themeResult.data as ThemeInfo).name).toBe('pocketflow'); // Falls back to ID

    // Cleanup
    await tempProvider.cleanup();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });
});