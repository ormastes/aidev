import { fileAPI } from '../utils/file-api';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { VFThemeStorageWrapper, ThemeMetadata, EpicMetadata, AppMetadata, StorageLayer } from './VFThemeStorageWrapper';

export interface GUIDesignCandidate {
  candidateId: string;
  name: string;
  category: 'modern' | "professional" | "creative" | "accessible";
  assets: {
    preview: string;
    mockups: string[];
    source?: string;
  };
  metadata: {
    designer: string;
    createdAt: string;
    tags: string[];
  };
}

export interface StoryTestReport {
  executionId: string;
  storyId: string;
  environment: "development" | 'staging' | "production";
  results: {
    passed: number;
    failed: number;
    skipped: number;
    duration: string;
  };
  failures: Array<{
    test: string;
    error: string;
    stack?: string;
  }>;
  timestamp: string;
}

export interface ManualTestCase {
  testId: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  steps: Array<{
    step: number;
    action: string;
    expectedResult: string;
  }>;
  preconditions: string[];
  tags: string[];
}

export interface SearchFilter {
  themeIds?: string[];
  epicIds?: string[];
  appIds?: string[];
  storageTypes?: StorageLayer['type'][];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  status?: string[];
}

export class VFThemeStorageExtended extends VFThemeStorageWrapper {
  constructor(basePath: string = './setup/theme_storage') {
    super(basePath);
  }

  // GUI Selector Storage Operations
  async saveGUIDesignCandidate(
    themeId: string,
    epicId: string,
    appId: string,
    candidate: GUIDesignCandidate
  ): Promise<void> {
    const storageData: StorageLayer = {
      type: 'gui_selector',
      themeId,
      epicId,
      appId,
      data: candidate,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: this.securityContext?.userId || 'system'
      }
    };

    await this.saveStorageLayer(storageData);
  }

  async getGUIDesignCandidates(
    themeId: string,
    epicId?: string,
    appId?: string,
    category?: GUIDesignCandidate["category"]
  ): Promise<GUIDesignCandidate[]> {
    const storageData = await this.getStorageLayerData('gui_selector', themeId, epicId, appId);
    
    let candidates = storageData.map(layer => layer.data as GUIDesignCandidate);
    
    if (category) {
      candidates = candidates.filter(c => c.category === category);
    }
    
    return candidates;
  }

  // Story Report Storage Operations
  async saveStoryTestReport(
    themeId: string,
    epicId: string,
    report: StoryTestReport
  ): Promise<void> {
    const storageData: StorageLayer = {
      type: 'story_report',
      themeId,
      epicId,
      data: report,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: this.securityContext?.userId || 'system'
      }
    };

    await this.saveStorageLayer(storageData);
  }

  async getStoryTestReports(
    themeId: string,
    epicId?: string,
    storyId?: string
  ): Promise<StoryTestReport[]> {
    const storageData = await this.getStorageLayerData('story_report', themeId, epicId);
    
    let reports = storageData.map(layer => layer.data as StoryTestReport);
    
    if (storyId) {
      reports = reports.filter(r => r.storyId === storyId);
    }
    
    return reports.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Manual Test Storage Operations
  async saveManualTestCase(
    themeId: string,
    epicId: string,
    appId: string,
    testCase: ManualTestCase
  ): Promise<void> {
    const storageData: StorageLayer = {
      type: 'test_manual',
      themeId,
      epicId,
      appId,
      data: testCase,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: this.securityContext?.userId || 'system'
      }
    };

    await this.saveStorageLayer(storageData);
  }

  async getManualTestCases(
    themeId: string,
    epicId?: string,
    appId?: string,
    priority?: ManualTestCase["priority"]
  ): Promise<ManualTestCase[]> {
    const storageData = await this.getStorageLayerData('test_manual', themeId, epicId, appId);
    
    let testCases = storageData.map(layer => layer.data as ManualTestCase);
    
    if (priority) {
      testCases = testCases.filter(tc => tc.priority === priority);
    }
    
    return testCases;
  }

  // Batch Operations
  async bulkImportTheme(importData: {
    theme: Omit<ThemeMetadata, 'id' | "createdAt" | "updatedAt">;
    epics?: Array<Omit<EpicMetadata, 'id' | 'themeId' | "createdAt" | "updatedAt">>;
    apps?: Array<{
      epicName: string;
      app: Omit<AppMetadata, 'id' | 'epicId' | 'themeId' | "createdAt" | "updatedAt">;
    }>;
  }): Promise<{
    themeId: string;
    epicIds: Map<string, string>;
    appIds: string[];
  }> {
    // Create theme
    const theme = await this.createTheme(importData.theme);
    const epicIds = new Map<string, string>();
    const appIds: string[] = [];

    // Create epics
    if (importData.epics) {
      for (const epicData of importData.epics) {
        const epic = await this.createEpic({
          ...epicData,
          themeId: theme.id
        });
        epicIds.set(epicData.name, epic.id);
      }
    }

    // Create apps
    if (importData.apps) {
      for (const appData of importData.apps) {
        const epicId = epicIds.get(appData.epicName);
        if (epicId) {
          const app = await this.createApp({
            ...appData.app,
            epicId,
            themeId: theme.id
          });
          appIds.push(app.id);
        }
      }
    }

    return {
      themeId: theme.id,
      epicIds,
      appIds
    };
  }

  // Helper method for date range filtering
  private filterByDateRange(
    data: StorageLayer[], 
    dateRange?: { start: string; end: string }
  ): StorageLayer[] {
    if (!dateRange) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.metadata.createdAt);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  // Search and Filtering
  async searchStorageData(filter: SearchFilter): Promise<{
    themes: ThemeMetadata[];
    storageData: StorageLayer[];
    count: number;
  }> {
    const results: StorageLayer[] = [];
    const themes: ThemeMetadata[] = [];
    
    // Get all themes or filtered themes
    const themePath = path.join(this.basePath, 'themes');
    const themeIds = filter.themeIds || (
      fs.existsSync(themePath) ? fs.readdirSync(themePath) : []
    );

    for (const themeId of themeIds) {
      const theme = await this.getTheme(themeId);
      if (theme) {
        themes.push(theme);
        
        // Search through storage layers
        const storageTypes = filter.storageTypes || ['gui_selector', 'story_report', 'test_manual'];
        
        for (const type of storageTypes) {
          // Get data at theme level
          const themeData = await this.getStorageLayerData(
            type as StorageLayer['type'],
            themeId
          );
          results.push(...this.filterByDateRange(themeData, filter.dateRange));
          
          // Get data at epic level
          const epicsPath = path.join(this.basePath, 'themes', themeId, 'epics');
          if (fs.existsSync(epicsPath)) {
            const epicIds = fs.readdirSync(epicsPath);
            for (const epicId of epicIds) {
              const epicData = await this.getStorageLayerData(
                type as StorageLayer['type'],
                themeId,
                epicId
              );
              results.push(...this.filterByDateRange(epicData, filter.dateRange));
              
              // Get data at app level
              const appsPath = path.join(epicsPath, epicId, 'apps');
              if (fs.existsSync(appsPath)) {
                const appIds = fs.readdirSync(appsPath);
                for (const appId of appIds) {
                  const appData = await this.getStorageLayerData(
                    type as StorageLayer['type'],
                    themeId,
                    epicId,
                    appId
                  );
                  results.push(...this.filterByDateRange(appData, filter.dateRange));
                }
              }
            }
          }
        }
      }
    }

    return {
      themes,
      storageData: results,
      count: results.length
    };
  }

  // Data Migration Utilities
  async migrateThemeData(
    sourceThemeId: string,
    targetThemeId: string,
    options: {
      includeEpics?: boolean;
      includeApps?: boolean;
      includeStorage?: boolean;
    } = {}
  ): Promise<void> {
    const sourceTheme = await this.getTheme(sourceThemeId);
    if (!sourceTheme) {
      throw new Error('Source theme not found');
    }

    const targetTheme = await this.getTheme(targetThemeId);
    if (!targetTheme) {
      throw new Error('Target theme not found');
    }

    // Validate permissions
    if (!this.checkPermission('theme', 'export') || !this.checkPermission('theme', 'update')) {
      throw new Error('Insufficient permissions for theme migration');
    }

    if (options.includeStorage) {
      // Migrate storage data at all levels
      const storageTypes: StorageLayer['type'][] = ['gui_selector', 'story_report', 'test_manual'];
      
      // Search for all storage data in source theme
      const searchResult = await this.searchStorageData({
        themeIds: [sourceThemeId],
        storageTypes
      });
      
      // Migrate each item to target theme at theme level only
      for (const item of searchResult.storageData) {
        const migratedItem: StorageLayer = {
          type: item.type,
          themeId: targetThemeId,
          data: {
            ...item.data,
            _migrated: true,
            _originalLocation: {
              themeId: item.themeId,
              epicId: item.epicId,
              appId: item.appId
            }
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: this.securityContext?.userId || 'system'
          }
        };
        
        await this.saveStorageLayer(migratedItem);
      }
    }

    this.auditLog('theme_migrated', {
      sourceThemeId,
      targetThemeId,
      options
    });
  }

  // Analytics and Reporting
  async generateThemeAnalytics(themeId: string): Promise<{
    theme: ThemeMetadata;
    epicCount: number;
    appCount: number;
    storageMetrics: {
      guiDesigns: number;
      testReports: number;
      manualTests: number;
    };
    activityTimeline: Array<{
      date: string;
      actions: number;
    }>;
  }> {
    const theme = await this.getTheme(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    // Count epics
    const epicsPath = path.join(this.basePath, 'themes', themeId, 'epics');
    const epicCount = fs.existsSync(epicsPath) ? fs.readdirSync(epicsPath).length : 0;

    // Count apps
    let appCount = 0;
    if (fs.existsSync(epicsPath)) {
      const epicDirs = fs.readdirSync(epicsPath);
      for (const epicDir of epicDirs) {
        const appsPath = path.join(epicsPath, epicDir, 'apps');
        if (fs.existsSync(appsPath)) {
          appCount += fs.readdirSync(appsPath).length;
        }
      }
    }

    // Count storage items across all levels
    const searchResult = await this.searchStorageData({
      themeIds: [themeId],
      storageTypes: ['gui_selector', 'story_report', 'test_manual']
    });
    
    const guiData = searchResult.storageData.filter(item => item.type === 'gui_selector');
    const reportData = searchResult.storageData.filter(item => item.type === 'story_report');
    const manualData = searchResult.storageData.filter(item => item.type === 'test_manual');

    // Generate activity timeline (last 30 days)
    const activityMap = new Map<string, number>();
    const allData = [...guiData, ...reportData, ...manualData];
    
    allData.forEach(item => {
      const date = new Date(item.metadata.createdAt).toISOString().split('T')[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    const activityTimeline = Array.from(activityMap.entries())
      .map(([date, actions]) => ({ date, actions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      theme,
      epicCount,
      appCount,
      storageMetrics: {
        guiDesigns: guiData.length,
        testReports: reportData.length,
        manualTests: manualData.length
      },
      activityTimeline
    };
  }
}

export default VFThemeStorageExtended;