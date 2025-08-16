import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { v4 as uuidv4 } from 'uuid';

export interface ThemeMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  permissions: ThemePermissions;
  dependencies?: string[];
}

export interface EpicMetadata {
  id: string;
  themeId: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AppMetadata {
  id: string;
  epicId: string;
  themeId: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  updatedAt: string;
}

export interface ThemePermissions {
  owner: string;
  readAccess: string[];
  writeAccess: string[];
  adminAccess: string[];
}

export interface StorageLayer {
  type: 'gui_selector' | 'story_report' | 'test_manual';
  themeId: string;
  epicId?: string;
  appId?: string;
  data: any;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

export interface SecurityContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

export class VFThemeStorageWrapper {
  protected basePath: string;
  protected securityContext?: SecurityContext;

  constructor(basePath: string = './setup/theme_storage') {
    this.basePath = basePath;
    this.ensureDirectoryStructure();
  }

  private ensureDirectoryStructure(): void {
    const dirs = [
      'themes',
      'epics', 
      'apps',
      'gui_selector',
      'story_reports',
      'test_manual',
      'security',
      'security/audit_logs'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.basePath, dir);
      if (!fs.existsSync(fullPath)) {
        await fileAPI.createDirectory(fullPath);
      }
    });
  }

  setSecurityContext(context: SecurityContext): void {
    this.securityContext = context;
    this.auditLog('security_context_set', { userId: context.userId });
  }

  protected checkPermission(resource: string, action: string): boolean {
    if (!this.securityContext) {
      throw new Error('Security context not set');
    }

    const requiredPermission = `${resource}:${action}`;
    return this.securityContext.permissions.includes(requiredPermission) ||
           this.securityContext.roles.includes('admin');
  }

  protected auditLog(action: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: this.securityContext?.userId || 'system',
      details
    };

    const logFile = path.join(this.basePath, 'security/audit_logs', 
      `${new Date().toISOString().split('T')[0]}.log`);
    
    await fileAPI.writeFile(logFile, JSON.stringify(logEntry, { append: true }) + '\n');
  }

  // Theme Management
  async createTheme(theme: Omit<ThemeMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThemeMetadata> {
    if (!this.checkPermission('theme', 'create')) {
      throw new Error('Insufficient permissions to create theme');
    }

    const themeData: ThemeMetadata = {
      ...theme,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const themePath = path.join(this.basePath, 'themes', themeData.id);
    await fileAPI.createDirectory(themePath);

    // Create isolated directories for this theme
    ['epics', 'apps', 'gui_selector', 'story_reports', 'test_manual'].forEach(dir => {
      await fileAPI.createDirectory(path.join(themePath), { recursive: true });
    });

    const metadataPath = path.join(themePath, 'metadata.json');
    await fileAPI.createFile(metadataPath, JSON.stringify(themeData, { type: FileType.TEMPORARY }));

    this.auditLog('theme_created', { themeId: themeData.id, themeName: theme.name });
    return themeData;
  }

  async getTheme(themeId: string): Promise<ThemeMetadata | null> {
    if (!this.checkPermission('theme', 'read')) {
      throw new Error('Insufficient permissions to read theme');
    }

    const metadataPath = path.join(this.basePath, 'themes', themeId, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    const themeData = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    this.auditLog('theme_accessed', { themeId });
    return themeData;
  }

  // Epic Management with Theme Isolation
  async createEpic(epic: Omit<EpicMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<EpicMetadata> {
    if (!this.checkPermission('epic', 'create')) {
      throw new Error('Insufficient permissions to create epic');
    }

    // Verify theme exists and user has access
    const theme = await this.getTheme(epic.themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    const epicData: EpicMetadata = {
      ...epic,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const epicPath = path.join(this.basePath, 'themes', epic.themeId, 'epics', epicData.id);
    await fileAPI.createDirectory(epicPath);

    // Create isolated directories for this epic
    ['apps', 'gui_selector', 'story_reports', 'test_manual'].forEach(dir => {
      await fileAPI.createDirectory(path.join(epicPath), { recursive: true });
    });

    const metadataPath = path.join(epicPath, 'metadata.json');
    await fileAPI.createFile(metadataPath, JSON.stringify(epicData, { type: FileType.TEMPORARY }));

    this.auditLog('epic_created', { epicId: epicData.id, themeId: epic.themeId });
    return epicData;
  }

  // App Management with Epic/Theme Isolation
  async createApp(app: Omit<AppMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppMetadata> {
    if (!this.checkPermission('app', 'create')) {
      throw new Error('Insufficient permissions to create app');
    }

    const appData: AppMetadata = {
      ...app,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const appPath = path.join(this.basePath, 'themes', app.themeId, 'epics', app.epicId, 'apps', appData.id);
    await fileAPI.createDirectory(appPath);

    // Create app-specific storage directories
    ['gui_selector', 'story_reports', 'test_manual', 'builds', 'deployments'].forEach(dir => {
      await fileAPI.createDirectory(path.join(appPath), { recursive: true });
    });

    const metadataPath = path.join(appPath, 'metadata.json');
    await fileAPI.createFile(metadataPath, JSON.stringify(appData, { type: FileType.TEMPORARY }));

    this.auditLog('app_created', { appId: appData.id, epicId: app.epicId, themeId: app.themeId });
    return appData;
  }

  // Storage Layer Operations
  async saveStorageLayer(layer: StorageLayer): Promise<void> {
    if (!this.checkPermission(`storage_${layer.type}`, 'write')) {
      throw new Error(`Insufficient permissions to write to ${layer.type} storage`);
    }

    let storagePath: string;
    if (layer.appId) {
      storagePath = path.join(this.basePath, 'themes', layer.themeId, 'epics', layer.epicId!, 'apps', layer.appId, layer.type);
    } else if (layer.epicId) {
      storagePath = path.join(this.basePath, 'themes', layer.themeId, 'epics', layer.epicId, layer.type);
    } else {
      storagePath = path.join(this.basePath, 'themes', layer.themeId, layer.type);
    }

    // Ensure the storage directory exists
    if (!fs.existsSync(storagePath)) {
      await fileAPI.createDirectory(storagePath);
    }

    const fileName = `${new Date().getTime()}_${uuidv4()}.json`;
    const filePath = path.join(storagePath, fileName);

    await fileAPI.createFile(filePath, JSON.stringify(layer, { type: FileType.TEMPORARY }));
    this.auditLog('storage_layer_saved', { type: layer.type, path: filePath });
  }

  async getStorageLayerData(
    type: StorageLayer['type'],
    themeId: string,
    epicId?: string,
    appId?: string
  ): Promise<StorageLayer[]> {
    if (!this.checkPermission(`storage_${type}`, 'read')) {
      throw new Error(`Insufficient permissions to read from ${type} storage`);
    }

    let storagePath: string;
    if (appId) {
      storagePath = path.join(this.basePath, 'themes', themeId, 'epics', epicId!, 'apps', appId, type);
    } else if (epicId) {
      storagePath = path.join(this.basePath, 'themes', themeId, 'epics', epicId, type);
    } else {
      storagePath = path.join(this.basePath, 'themes', themeId, type);
    }

    if (!fs.existsSync(storagePath)) {
      return [];
    }

    const files = fs.readdirSync(storagePath)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(storagePath, file), 'utf-8');
        return JSON.parse(content) as StorageLayer;
      });

    this.auditLog('storage_layer_accessed', { type, count: files.length });
    return files;
  }

  // Virtual Space Separation Utilities
  async validateAccessBoundary(
    userId: string,
    themeId: string,
    epicId?: string,
    appId?: string
  ): Promise<boolean> {
    const theme = await this.getTheme(themeId);
    if (!theme) return false;

    const hasThemeAccess = 
      theme.permissions.owner === userId ||
      theme.permissions.readAccess.includes(userId) ||
      theme.permissions.writeAccess.includes(userId) ||
      theme.permissions.adminAccess.includes(userId);

    if (!hasThemeAccess) {
      this.auditLog('access_denied', { userId, themeId, epicId, appId });
      return false;
    }

    // Additional checks for epic and app level access can be implemented here
    return true;
  }

  // Security and Isolation Features
  async exportThemeData(themeId: string, includeSecrets: boolean = false): Promise<any> {
    if (!this.checkPermission('theme', 'export')) {
      throw new Error('Insufficient permissions to export theme');
    }

    const theme = await this.getTheme(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    const exportData = {
      theme,
      epics: [],
      apps: [],
      storageData: {
        gui_selector: [],
        story_reports: [],
        test_manual: []
      }
    };

    // Recursively collect all data while respecting boundaries
    // Implementation would include filtering sensitive data if !includeSecrets

    this.auditLog('theme_exported', { themeId, includeSecrets });
    return exportData;
  }
}

export default VFThemeStorageWrapper;