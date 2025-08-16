import { VFThemeStorageExtended, GUIDesignCandidate, StoryTestReport } from './VFThemeStorageExtended';
import { SecurityContext } from './VFThemeStorageWrapper';
import { JWTService } from './JWTService';
import { ExternalLogService } from './ExternalLogService';
import { path } from '../../../../../infra_external-log-lib/src';

export interface GUISelection {
  id: string;
  themeId: string;
  epicId: string;
  appId: string;
  selectedCandidateId: string;
  selectedAt: string;
  selectedBy: string;
  reason?: string;
  metadata?: any;
}

export interface GUIReport {
  id: string;
  themeId: string;
  epicId?: string;
  appId?: string;
  type: "selection" | "performance" | "usability" | "accessibility";
  title: string;
  content: string;
  generatedAt: string;
  generatedBy: string;
  data?: any;
}

export interface ThemeTemplate {
  id: string;
  themeId: string;
  name: string;
  description: string;
  category: string;
  preview?: string;
  source?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export class ThemeStorageService {
  private storage: VFThemeStorageExtended;
  private jwtService: JWTService;
  private logger: ExternalLogService;
  private basePath: string;

  constructor(
    jwtService: JWTService,
    logger: ExternalLogService,
    basePath: string = path.join(process.cwd(), 'data', 'theme-storage')
  ) {
    this.jwtService = jwtService;
    this.logger = logger;
    this.basePath = basePath;
    this.storage = new VFThemeStorageExtended(this.basePath);
  }

  // Initialize security context from JWT token or session
  async initializeSecurityContext(tokenOrSessionId: string): Promise<void> {
    try {
      let securityContext: SecurityContext;
      
      if (tokenOrSessionId.startsWith('session-')) {
        // Handle session-based authentication
        const userId = tokenOrSessionId.substring(8);
        securityContext = {
          userId: userId || "anonymous",
          roles: ['user'], // Default role for session users
          permissions: this.mapRolesToPermissions(['user'])
        };
      } else {
        // Handle JWT token
        const decoded = this.jwtService.verifyAccessToken(tokenOrSessionId);
        const userRoles = decoded.role ? [decoded.role] : ['user'];
        securityContext = {
          userId: String(decoded.userId || decoded.username || "anonymous"),
          roles: userRoles,
          permissions: this.mapRolesToPermissions(userRoles)
        };
      }
      
      this.storage.setSecurityContext(securityContext);
    } catch (error) {
      this.logger.error('Failed to initialize security context', error);
      // Set a default context instead of throwing
      this.storage.setSecurityContext({
        userId: "anonymous",
        roles: ['user'],
        permissions: this.mapRolesToPermissions(['user'])
      });
    }
  }

  // Map roles to permissions
  private mapRolesToPermissions(roles: string[]): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: [
        'theme:create', 'theme:read', 'theme:update', 'theme:delete', 'theme:export',
        'epic:create', 'epic:read', 'epic:update', 'epic:delete',
        'app:create', 'app:read', 'app:update', 'app:delete',
        'storage_gui_selector:read', 'storage_gui_selector:write',
        'storage_story_report:read', 'storage_story_report:write',
        'storage_test_manual:read', 'storage_test_manual:write'
      ],
      developer: [
        'theme:read', 'theme:update',
        'epic:create', 'epic:read', 'epic:update',
        'app:create', 'app:read', 'app:update',
        'storage_gui_selector:read', 'storage_gui_selector:write',
        'storage_story_report:read', 'storage_story_report:write',
        'storage_test_manual:read', 'storage_test_manual:write'
      ],
      designer: [
        'theme:read',
        'epic:read',
        'app:read',
        'storage_gui_selector:read', 'storage_gui_selector:write'
      ],
      tester: [
        'theme:read',
        'epic:read',
        'app:read',
        'storage_story_report:read', 'storage_story_report:write',
        'storage_test_manual:read', 'storage_test_manual:write'
      ],
      user: [
        'theme:read',
        'epic:read',
        'app:read',
        'storage_gui_selector:read',
        'storage_story_report:read',
        'storage_test_manual:read'
      ]
    };

    const permissions = new Set<string>();
    roles.forEach(role => {
      const rolePermissions = permissionMap[role] || permissionMap['user'];
      rolePermissions.forEach(perm => permissions.add(perm));
    });

    return Array.from(permissions);
  }

  // GUI Design Candidate Management
  async saveGUICandidate(
    themeId: string,
    epicId: string,
    appId: string,
    candidate: Omit<GUIDesignCandidate, "candidateId">
  ): Promise<GUIDesignCandidate> {
    const fullCandidate: GUIDesignCandidate = {
      candidateId: this.generateId(),
      ...candidate
    };

    await this.storage.saveGUIDesignCandidate(themeId, epicId, appId, fullCandidate);
    this.logger.info('GUI design candidate saved', { themeId, epicId, appId, candidateId: fullCandidate.candidateId });
    return fullCandidate;
  }

  async getGUICandidates(
    themeId: string,
    epicId?: string,
    appId?: string,
    category?: GUIDesignCandidate["category"]
  ): Promise<GUIDesignCandidate[]> {
    return await this.storage.getGUIDesignCandidates(themeId, epicId, appId, category);
  }

  // GUI Selection Management
  async saveGUISelection(selection: Omit<GUISelection, 'id' | "selectedAt">): Promise<GUISelection> {
    const fullSelection: GUISelection = {
      id: this.generateId(),
      selectedAt: new Date().toISOString(),
      ...selection
    };

    // Save as a special type of GUI selector data
    await this.storage.saveStorageLayer({
      type: 'gui_selector',
      themeId: selection.themeId,
      epicId: selection.epicId,
      appId: selection.appId,
      data: {
        type: "selection",
        selection: fullSelection
      },
      metadata: {
        createdAt: fullSelection.selectedAt,
        updatedAt: fullSelection.selectedAt,
        createdBy: selection.selectedBy
      }
    });

    this.logger.info('GUI selection saved', { selectionId: fullSelection.id, themeId: selection.themeId });
    return fullSelection;
  }

  async getGUISelections(themeId: string, epicId?: string, appId?: string): Promise<GUISelection[]> {
    const storageData = await this.storage.getStorageLayerData('gui_selector', themeId, epicId, appId);
    
    return storageData
      .filter(layer => layer.data?.type === "selection")
      .map(layer => layer.data.selection as GUISelection)
      .sort((a, b) => new Date(b.selectedAt).getTime() - new Date(a.selectedAt).getTime());
  }

  // Report Management
  async saveReport(report: Omit<GUIReport, 'id' | "generatedAt">): Promise<GUIReport> {
    const fullReport: GUIReport = {
      id: this.generateId(),
      generatedAt: new Date().toISOString(),
      ...report
    };

    // Save as story report
    await this.storage.saveStorageLayer({
      type: 'story_report',
      themeId: report.themeId,
      epicId: report.epicId,
      appId: report.appId,
      data: fullReport,
      metadata: {
        createdAt: fullReport.generatedAt,
        updatedAt: fullReport.generatedAt,
        createdBy: report.generatedBy
      }
    });

    this.logger.info('Report saved', { reportId: fullReport.id, type: report.type });
    return fullReport;
  }

  async getReports(
    themeId: string,
    epicId?: string,
    appId?: string,
    type?: GUIReport['type']
  ): Promise<GUIReport[]> {
    const storageData = await this.storage.getStorageLayerData('story_report', themeId, epicId, appId);
    
    let reports = storageData.map(layer => layer.data as GUIReport);
    
    if (type) {
      reports = reports.filter(r => r.type === type);
    }
    
    return reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  // Template Management
  async saveTemplate(template: Omit<ThemeTemplate, 'id' | "createdAt" | "updatedAt">): Promise<ThemeTemplate> {
    const fullTemplate: ThemeTemplate = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...template
    };

    // Save template as GUI selector data
    await this.storage.saveStorageLayer({
      type: 'gui_selector',
      themeId: template.themeId,
      data: {
        type: "template",
        template: fullTemplate
      },
      metadata: {
        createdAt: fullTemplate.createdAt,
        updatedAt: fullTemplate.updatedAt,
        createdBy: this.storage["securityContext"]?.userId || 'system'
      }
    });

    this.logger.info('Template saved', { templateId: fullTemplate.id, themeName: template.name });
    return fullTemplate;
  }

  async getTemplates(themeId: string, category?: string): Promise<ThemeTemplate[]> {
    const storageData = await this.storage.getStorageLayerData('gui_selector', themeId);
    
    let templates = storageData
      .filter(layer => layer.data?.type === "template")
      .map(layer => layer.data.template as ThemeTemplate);
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    return templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Theme Management (delegated to storage)
  async createTheme(theme: Parameters<VFThemeStorageExtended["createTheme"]>[0]) {
    return await this.storage.createTheme(theme);
  }

  async getTheme(themeId: string) {
    return await this.storage.getTheme(themeId);
  }

  // Epic Management (delegated to storage)
  async createEpic(epic: Parameters<VFThemeStorageExtended["createEpic"]>[0]) {
    return await this.storage.createEpic(epic);
  }

  // App Management (delegated to storage)
  async createApp(app: Parameters<VFThemeStorageExtended["createApp"]>[0]) {
    return await this.storage.createApp(app);
  }

  // Analytics
  async getThemeAnalytics(themeId: string) {
    const baseAnalytics = await this.storage.generateThemeAnalytics(themeId);
    
    // Add GUI-specific analytics
    const selections = await this.getGUISelections(themeId);
    const reports = await this.getReports(themeId);
    const templates = await this.getTemplates(themeId);
    
    return {
      ...baseAnalytics,
      guiMetrics: {
        totalSelections: selections.length,
        totalReports: reports.length,
        totalTemplates: templates.length,
        reportsByType: {
          selection: reports.filter(r => r.type === "selection").length,
          performance: reports.filter(r => r.type === "performance").length,
          usability: reports.filter(r => r.type === "usability").length,
          accessibility: reports.filter(r => r.type === "accessibility").length
        }
      }
    };
  }

  // Search functionality
  async searchAll(query: string, filters?: {
    themeIds?: string[];
    types?: ("candidate" | "selection" | 'report' | "template")[];
    dateRange?: { start: string; end: string };
  }) {
    const results = {
      candidates: [] as GUIDesignCandidate[],
      selections: [] as GUISelection[],
      reports: [] as GUIReport[],
      templates: [] as ThemeTemplate[]
    };

    const searchFilter = {
      themeIds: filters?.themeIds,
      storageTypes: ['gui_selector', 'story_report'] as any[],
      dateRange: filters?.dateRange
    };

    const searchResult = await this.storage.searchStorageData(searchFilter);
    
    // Filter and categorize results
    for (const item of searchResult.storageData) {
      if (item.type === 'gui_selector') {
        if (item.data?.type === "selection" && (!filters?.types || filters.types.includes("selection"))) {
          const selection = item.data.selection as GUISelection;
          if (this.matchesQuery(selection, query)) {
            results.selections.push(selection);
          }
        } else if (item.data?.type === "template" && (!filters?.types || filters.types.includes("template"))) {
          const template = item.data.template as ThemeTemplate;
          if (this.matchesQuery(template, query)) {
            results.templates.push(template);
          }
        } else if (item.data?.candidateId && (!filters?.types || filters.types.includes("candidate"))) {
          const candidate = item.data as GUIDesignCandidate;
          if (this.matchesQuery(candidate, query)) {
            results.candidates.push(candidate);
          }
        }
      } else if (item.type === 'story_report' && (!filters?.types || filters.types.includes('report'))) {
        const report = item.data as GUIReport;
        if (this.matchesQuery(report, query)) {
          results.reports.push(report);
        }
      }
    }

    return results;
  }

  // Helper to match query against object
  private matchesQuery(obj: any, query: string): boolean {
    const searchStr = JSON.stringify(obj).toLowerCase();
    return searchStr.includes(query.toLowerCase());
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Migration helper for existing database data
  async migrateFromDatabase(databaseService: any): Promise<{
    migratedThemes: number;
    migratedSelections: number;
    migratedReports: number;
    migratedTemplates: number;
  }> {
    const results = {
      migratedThemes: 0,
      migratedSelections: 0,
      migratedReports: 0,
      migratedTemplates: 0
    };

    try {
      // This is a placeholder for the actual migration logic
      // You would need to implement the actual database queries
      // and data transformation based on your database schema

      this.logger.info('Database migration completed', results);
      return results;
    } catch (error) {
      this.logger.error('Database migration failed', error);
      throw error;
    }
  }
}

export default ThemeStorageService;