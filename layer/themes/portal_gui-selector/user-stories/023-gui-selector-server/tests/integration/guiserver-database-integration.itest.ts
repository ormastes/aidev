/**
 * Integration Test: GUIServer + Database Integration
 * 
 * This test verifies the integration between the GUIServer and Database components,
 * ensuring proper data persistence, retrieval, and transaction handling when these
 * components work together in template selection and user data management.
 */

import express from 'express';
import session from 'express-session';
import { Server } from 'http';

// Database interface from external tests
interface ThemeData {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'accessible';
  styles: Record<string, any>;
  metadata: {
    author: string;
    version: string;
    lastUpdated: string;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ScreenData {
  id: string;
  name: string;
  templatePath: string;
  componentData: Record<string, any>;
  createdAt: Date;
}

interface ThemeScreenAssociation {
  themeId: string;
  screenId: string;
  renderConfig: Record<string, any>;
  sortOrder: number;
}

interface SelectionData {
  id: string;
  userId: string;
  themeId: string;
  screenId?: string;
  selectionData: Record<string, any>;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DatabaseInterface {
  // Theme operations
  createTheme(theme: Omit<ThemeData, 'createdAt' | 'updatedAt'>): Promise<ThemeData>;
  getTheme(id: string): Promise<ThemeData | null>;
  updateTheme(id: string, updates: Partial<ThemeData>): Promise<ThemeData | null>;
  deleteTheme(id: string): Promise<boolean>;
  listThemes(category?: string): Promise<ThemeData[]>;
  
  // Screen operations
  createScreen(screen: Omit<ScreenData, 'createdAt'>): Promise<ScreenData>;
  getScreen(id: string): Promise<ScreenData | null>;
  listScreens(): Promise<ScreenData[]>;
  
  // Theme-Screen associations
  associateThemeScreen(association: ThemeScreenAssociation): Promise<boolean>;
  getThemeScreens(themeId: string): Promise<ScreenData[]>;
  getScreenThemes(screenId: string): Promise<ThemeData[]>;
  
  // Selection operations
  createSelection(selection: Omit<SelectionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<SelectionData>;
  getSelection(id: string): Promise<SelectionData | null>;
  getUserSelections(userId: string): Promise<SelectionData[]>;
  
  // Utility operations
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// GUIServer interface
interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'accessible';
  previewUrl: string;
  thumbnailUrl: string;
  features: string[];
  metadata: {
    author: string;
    version: string;
    lastUpdated: string;
    tags: string[];
  };
}

interface GUIServerInterface {
  getTemplates(category?: string): Promise<TemplateInfo[]>;
  getTemplate(id: string): Promise<TemplateInfo | null>;
  selectTemplate(templateId: string, userId: string, options: any): Promise<any>;
  getUserSelections(userId: string): Promise<any[]>;
  createCustomTheme(userId: string, themeData: any): Promise<any>;
  updateTemplateData(templateId: string, updates: any): Promise<any>;
}

// Mock Database implementation
class MockDatabase implements DatabaseInterface {
  private themes: Map<string, ThemeData> = new Map();
  private screens: Map<string, ScreenData> = new Map();
  private themeScreens: Map<string, ThemeScreenAssociation[]> = new Map();
  private selections: Map<string, SelectionData> = new Map();
  private transactionActive = false;
  private transactionData: any = null;

  constructor() {
    this.initializeTestData();
  }

  private initializeTestData(): void {
    // Create initial themes
    const themes: Omit<ThemeData, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'db-integration-modern-01',
        name: 'Database Modern Theme',
        description: 'Modern theme for database integration testing',
        category: 'modern',
        styles: {
          primaryColor: '#007bff',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          fontFamily: 'Arial, sans-serif'
        },
        metadata: {
          author: 'Database Team',
          version: '1.0.0',
          lastUpdated: '2024-01-15',
          tags: ['database', 'modern', 'integration']
        }
      },
      {
        id: 'db-integration-professional-01',
        name: 'Database Professional Theme',
        description: 'Professional theme for database integration testing',
        category: 'professional',
        styles: {
          primaryColor: '#6c757d',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontFamily: 'Georgia, serif'
        },
        metadata: {
          author: 'Database Team',
          version: '1.1.0',
          lastUpdated: '2024-01-10',
          tags: ['database', 'professional', 'integration']
        }
      }
    ];

    themes.forEach(theme => {
      const now = new Date();
      this.themes.set(theme.id, {
        ...theme,
        createdAt: now,
        updatedAt: now
      });
    });

    // Create initial screens
    const screens: Omit<ScreenData, 'createdAt'>[] = [
      {
        id: 'db-screen-dashboard',
        name: 'Dashboard Screen',
        templatePath: '/templates/dashboard.html',
        componentData: {
          layout: 'grid',
          widgets: ['header', 'sidebar', 'content', 'footer']
        }
      },
      {
        id: 'db-screen-settings',
        name: 'Settings Screen',
        templatePath: '/templates/settings.html',
        componentData: {
          layout: 'tabs',
          sections: ['profile', 'preferences', 'security']
        }
      }
    ];

    screens.forEach(screen => {
      this.screens.set(screen.id, {
        ...screen,
        createdAt: new Date()
      });
    });

    // Create theme-screen associations
    this.associateThemeScreen({
      themeId: 'db-integration-modern-01',
      screenId: 'db-screen-dashboard',
      renderConfig: { showAnimations: true },
      sortOrder: 1
    });

    this.associateThemeScreen({
      themeId: 'db-integration-professional-01',
      screenId: 'db-screen-settings',
      renderConfig: { showTooltips: true },
      sortOrder: 1
    });
  }

  async createTheme(theme: Omit<ThemeData, 'createdAt' | 'updatedAt'>): Promise<ThemeData> {
    const now = new Date();
    const newTheme: ThemeData = {
      ...theme,
      createdAt: now,
      updatedAt: now
    };
    
    const storage = this.transactionActive ? this.transactionData.themes : this.themes;
    storage.set(theme.id, newTheme);
    return { ...newTheme };
  }

  async getTheme(id: string): Promise<ThemeData | null> {
    const storage = this.transactionActive ? this.transactionData.themes : this.themes;
    return storage.get(id) ? { ...storage.get(id)! } : null;
  }

  async updateTheme(id: string, updates: Partial<ThemeData>): Promise<ThemeData | null> {
    const storage = this.transactionActive ? this.transactionData.themes : this.themes;
    const existing = storage.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    storage.set(id, updated);
    return { ...updated };
  }

  async deleteTheme(id: string): Promise<boolean> {
    const storage = this.transactionActive ? this.transactionData.themes : this.themes;
    return storage.delete(id);
  }

  async listThemes(category?: string): Promise<ThemeData[]> {
    const storage = this.transactionActive ? this.transactionData.themes : this.themes;
    let themes = Array.from(storage.values()) as ThemeData[];
    if (category) {
      themes = themes.filter(theme => theme.category === category);
    }
    return themes.map(theme => ({ ...theme }));
  }

  async createScreen(screen: Omit<ScreenData, 'createdAt'>): Promise<ScreenData> {
    const newScreen: ScreenData = {
      ...screen,
      createdAt: new Date()
    };
    
    const storage = this.transactionActive ? this.transactionData.screens : this.screens;
    storage.set(screen.id, newScreen);
    return { ...newScreen };
  }

  async getScreen(id: string): Promise<ScreenData | null> {
    const storage = this.transactionActive ? this.transactionData.screens : this.screens;
    return storage.get(id) ? { ...storage.get(id)! } : null;
  }

  async listScreens(): Promise<ScreenData[]> {
    const storage = this.transactionActive ? this.transactionData.screens : this.screens;
    return Array.from(storage.values()).map(screen => ({ ...(screen as ScreenData) }));
  }

  async associateThemeScreen(association: ThemeScreenAssociation): Promise<boolean> {
    const storage = this.transactionActive ? this.transactionData.themeScreens : this.themeScreens;
    const existing = storage.get(association.themeId) || [];
    
    const filtered = existing.filter((assoc: ThemeScreenAssociation) => assoc.screenId !== association.screenId);
    filtered.push(association);
    
    storage.set(association.themeId, filtered);
    return true;
  }

  async getThemeScreens(themeId: string): Promise<ScreenData[]> {
    const themeScreenStorage = this.transactionActive ? this.transactionData.themeScreens : this.themeScreens;
    const screenStorage = this.transactionActive ? this.transactionData.screens : this.screens;
    
    const associations = themeScreenStorage.get(themeId) || [];
    const screens = associations
      .sort((a: ThemeScreenAssociation, b: ThemeScreenAssociation) => a.sortOrder - b.sortOrder)
      .map((assoc: ThemeScreenAssociation) => screenStorage.get(assoc.screenId))
      .filter((screen: ScreenData | undefined) => screen !== undefined) as ScreenData[];
    
    return screens.map(screen => ({ ...screen }));
  }

  async getScreenThemes(screenId: string): Promise<ThemeData[]> {
    const themeScreenStorage = this.transactionActive ? this.transactionData.themeScreens : this.themeScreens;
    const themeStorage = this.transactionActive ? this.transactionData.themes : this.themes;
    
    const themes: ThemeData[] = [];
    for (const [themeId, associations] of themeScreenStorage.entries()) {
      if (associations.some((assoc: ThemeScreenAssociation) => assoc.screenId === screenId)) {
        const theme = themeStorage.get(themeId);
        if (theme) themes.push({ ...theme });
      }
    }
    return themes;
  }

  async createSelection(selection: Omit<SelectionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<SelectionData> {
    const now = new Date();
    const newSelection: SelectionData = {
      ...selection,
      id: `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    
    const storage = this.transactionActive ? this.transactionData.selections : this.selections;
    storage.set(newSelection.id, newSelection);
    return { ...newSelection };
  }

  async getSelection(id: string): Promise<SelectionData | null> {
    const storage = this.transactionActive ? this.transactionData.selections : this.selections;
    return storage.get(id) ? { ...storage.get(id)! } : null;
  }

  async getUserSelections(userId: string): Promise<SelectionData[]> {
    const storage = this.transactionActive ? this.transactionData.selections : this.selections;
    return Array.from(storage.values())
      .filter(selection => (selection as SelectionData).userId === userId)
      .map(selection => ({ ...(selection as SelectionData) }));
  }

  async beginTransaction(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already active');
    }
    
    this.transactionActive = true;
    this.transactionData = {
      themes: new Map(this.themes),
      screens: new Map(this.screens),
      themeScreens: new Map(this.themeScreens),
      selections: new Map(this.selections)
    };
  }

  async commitTransaction(): Promise<void> {
    if (!this.transactionActive || !this.transactionData) {
      throw new Error('No active transaction');
    }
    
    this.themes = this.transactionData.themes;
    this.screens = this.transactionData.screens;
    this.themeScreens = this.transactionData.themeScreens;
    this.selections = this.transactionData.selections;
    
    this.transactionActive = false;
    this.transactionData = null;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }
    
    this.transactionActive = false;
    this.transactionData = null;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test utility methods
  clear(): void {
    this.themes.clear();
    this.screens.clear();
    this.themeScreens.clear();
    this.selections.clear();
  }

  getThemeCount(): number {
    return this.themes.size;
  }

  getSelectionCount(): number {
    return this.selections.size;
  }
}

// Mock GUIServer implementation
class MockGUIServer implements GUIServerInterface {
  private database: DatabaseInterface;

  constructor(database: DatabaseInterface) {
    this.database = database;
  }

  async getTemplates(category?: string): Promise<TemplateInfo[]> {
    const themes = await this.database.listThemes(category);
    return themes.map(theme => this.convertThemeToTemplate(theme));
  }

  async getTemplate(id: string): Promise<TemplateInfo | null> {
    const theme = await this.database.getTheme(id);
    if (!theme) return null;
    return this.convertThemeToTemplate(theme);
  }

  async selectTemplate(templateId: string, userId: string, options: any): Promise<any> {
    const theme = await this.database.getTheme(templateId);
    if (!theme) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const selection = await this.database.createSelection({
      userId,
      themeId: templateId,
      screenId: options.screenId,
      selectionData: {
        customizations: options.customizations || {},
        selectedAt: new Date().toISOString(),
        metadata: options.metadata || {}
      },
      comments: options.comments
    });

    return {
      selectionId: selection.id,
      templateId,
      theme,
      selection,
      "success": true
    };
  }

  async getUserSelections(userId: string): Promise<any[]> {
    const selections = await this.database.getUserSelections(userId);
    
    // Enhance selections with theme data
    const enhancedSelections = await Promise.all(
      selections.map(async (selection) => {
        const theme = await this.database.getTheme(selection.themeId);
        return {
          ...selection,
          theme: theme ? this.convertThemeToTemplate(theme) : null
        };
      })
    );

    return enhancedSelections;
  }

  async createCustomTheme(userId: string, themeData: any): Promise<any> {
    const theme = await this.database.createTheme({
      id: `custom_${userId}_${Date.now()}`,
      name: themeData.name,
      description: themeData.description,
      category: themeData.category,
      styles: themeData.styles,
      metadata: {
        author: userId,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tags: themeData.tags || ['custom']
      }
    });

    return {
      theme,
      template: this.convertThemeToTemplate(theme),
      "success": true
    };
  }

  async updateTemplateData(templateId: string, updates: any): Promise<any> {
    const updatedTheme = await this.database.updateTheme(templateId, {
      name: updates.name,
      description: updates.description,
      styles: updates.styles,
      metadata: updates.metadata,
      updatedAt: new Date()
    });

    if (!updatedTheme) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return {
      theme: updatedTheme,
      template: this.convertThemeToTemplate(updatedTheme),
      "success": true
    };
  }

  private convertThemeToTemplate(theme: ThemeData): TemplateInfo {
    return {
      id: theme.id,
      name: theme.name,
      description: theme.description,
      category: theme.category,
      previewUrl: `/preview/${theme.id}`,
      thumbnailUrl: `/thumbs/${theme.id}.png`,
      features: theme.metadata.tags,
      metadata: theme.metadata
    };
  }
}

// Integrated Server that combines GUIServer and Database
class IntegratedGUIDBServer {
  private app: express.Application;
  private server: Server | null = null;
  private database: DatabaseInterface;
  private guiServer: GUIServerInterface;
  private integrationMetrics = {
    totalRequests: 0,
    databaseOperations: 0,
    templateOperations: 0,
    transactionOperations: 0,
    errors: 0
  };

  constructor(database: DatabaseInterface, guiServer: GUIServerInterface) {
    this.database = database;
    this.guiServer = guiServer;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use((req, res, next) => {
      this.integrationMetrics.totalRequests++;
      next();
    });

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Simple session middleware
    this.app.use((req, res, next) => {
      const userId = req.headers['x-user-id'] as string || `user_${Date.now()}`;
      (req as any).userId = userId;
      next();
    });
  }

  private setupRoutes(): void {
    // Get templates (GUIServer + Database)
    this.app.get('/api/templates', async (req, res) => {
      try {
        const category = req.query.category as string;
        const templates = await this.guiServer.getTemplates(category);
        this.integrationMetrics.templateOperations++;
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          templates,
          count: templates.length,
          category: category || 'all'
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Get specific template
    this.app.get('/api/templates/:templateId', async (req, res) => {
      try {
        const templateId = req.params.templateId;
        const template = await this.guiServer.getTemplate(templateId);
        this.integrationMetrics.templateOperations++;
        this.integrationMetrics.databaseOperations++;

        if (!template) {
          return res.status(404).json({ "success": false, error: 'Template not found' });
        }

        // Get associated screens
        const screens = await this.database.getThemeScreens(templateId);
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          template,
          screens,
          screenCount: screens.length
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Select template with transaction
    this.app.post('/api/templates/:templateId/select', async (req, res) => {
      const templateId = req.params.templateId;
      const userId = (req as any).userId;
      const { screenId, customizations, comments, useTransaction } = req.body;

      try {
        if (useTransaction) {
          await this.database.beginTransaction();
          this.integrationMetrics.transactionOperations++;
        }

        const result = await this.guiServer.selectTemplate(templateId, userId, {
          screenId,
          customizations,
          comments,
          metadata: { transactionUsed: useTransaction || false }
        });
        this.integrationMetrics.templateOperations++;
        this.integrationMetrics.databaseOperations++;

        if (useTransaction) {
          await this.database.commitTransaction();
          this.integrationMetrics.transactionOperations++;
        }

        res.json({
          "success": true,
          result,
          transactionUsed: useTransaction || false
        });
      } catch (error) {
        if (useTransaction) {
          try {
            await this.database.rollbackTransaction();
            this.integrationMetrics.transactionOperations++;
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Get user selections
    this.app.get('/api/user/selections', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const selections = await this.guiServer.getUserSelections(userId);
        this.integrationMetrics.templateOperations++;
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          selections,
          count: selections.length,
          userId
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Create custom theme
    this.app.post('/api/themes/custom', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const { name, description, category, styles, tags } = req.body;

        const result = await this.guiServer.createCustomTheme(userId, {
          name,
          description,
          category,
          styles,
          tags
        });
        this.integrationMetrics.templateOperations++;
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          customTheme: result
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Update template
    this.app.put('/api/templates/:templateId', async (req, res) => {
      try {
        const templateId = req.params.templateId;
        const updates = req.body;

        const result = await this.guiServer.updateTemplateData(templateId, updates);
        this.integrationMetrics.templateOperations++;
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          updated: result
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Database operations
    this.app.get('/api/database/themes', async (req, res) => {
      try {
        const category = req.query.category as string;
        const themes = await this.database.listThemes(category);
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          themes,
          count: themes.length
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    this.app.get('/api/database/screens', async (req, res) => {
      try {
        const screens = await this.database.listScreens();
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          screens,
          count: screens.length
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Theme-screen associations
    this.app.post('/api/themes/:themeId/screens/:screenId', async (req, res) => {
      try {
        const { themeId, screenId } = req.params;
        const { renderConfig, sortOrder } = req.body;

        const associated = await this.database.associateThemeScreen({
          themeId,
          screenId,
          renderConfig: renderConfig || {},
          sortOrder: sortOrder || 1
        });
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          associated,
          themeId,
          screenId
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Transaction testing endpoints
    this.app.post('/api/transaction/test', async (req, res) => {
      try {
        const { operation } = req.body;

        await this.database.beginTransaction();
        this.integrationMetrics.transactionOperations++;

        switch (operation) {
          case 'create_and_commit':
            await this.database.createTheme({
              id: `tx_test_${Date.now()}`,
              name: 'Transaction Test Theme',
              description: 'Created in transaction',
              category: 'modern',
              styles: {},
              metadata: {
                author: 'Transaction Test',
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                tags: ['transaction', 'test']
              }
            });
            await this.database.commitTransaction();
            this.integrationMetrics.transactionOperations++;
            break;

          case 'create_and_rollback':
            await this.database.createTheme({
              id: `tx_rollback_${Date.now()}`,
              name: 'Rollback Test Theme',
              description: 'Should be rolled back',
              category: 'modern',
              styles: {},
              metadata: {
                author: 'Rollback Test',
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                tags: ['rollback', 'test']
              }
            });
            await this.database.rollbackTransaction();
            this.integrationMetrics.transactionOperations++;
            break;

          default:
            await this.database.rollbackTransaction();
            this.integrationMetrics.transactionOperations++;
            throw new Error('Unknown operation');
        }

        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          operation
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Health and metrics
    this.app.get('/api/health', async (req, res) => {
      try {
        const dbHealthy = await this.database.healthCheck();
        this.integrationMetrics.databaseOperations++;

        res.json({
          "success": true,
          status: 'healthy',
          services: {
            database: dbHealthy ? 'healthy' : 'unhealthy',
            guiServer: 'healthy',
            integration: 'healthy'
          },
          metrics: this.integrationMetrics
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getMetrics() {
    return { ...this.integrationMetrics };
  }

  getDatabase(): DatabaseInterface {
    return this.database;
  }

  getGUIServer(): GUIServerInterface {
    return this.guiServer;
  }
}

describe('GUIServer + Database Integration Test', () => {
  let database: MockDatabase;
  let guiServer: MockGUIServer;
  let integratedServer: IntegratedGUIDBServer;
  const testPort = 3462;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    database = new MockDatabase();
    guiServer = new MockGUIServer(database);
    integratedServer = new IntegratedGUIDBServer(database, guiServer);
    await integratedServer.start(testPort);
  });

  afterAll(async () => {
    await integratedServer.stop();
  });

  beforeEach(() => {
    // Don't clear database since it has initial test data
    // Just reset metrics if needed
  });

  describe('Template and Database Integration', () => {
    test('should get templates from database through GUI server', async () => {
      const response = await fetch(`${baseUrl}/api/templates`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.templates).toHaveLength(2);
      expect(data.templates[0].id).toMatch(/db-integration/);
      expect(data.templates[0]).toHaveProperty('name');
      expect(data.templates[0]).toHaveProperty('category');
      expect(data.templates[0]).toHaveProperty('previewUrl');
    });

    test('should filter templates by category', async () => {
      const response = await fetch(`${baseUrl}/api/templates?category=modern`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.templates).toHaveLength(1);
      expect(data.templates[0].category).toBe('modern');
      expect(data.category).toBe('modern');
    });

    test('should get specific template with associated screens', async () => {
      const templateId = 'db-integration-modern-01';
      const response = await fetch(`${baseUrl}/api/templates/${templateId}`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.template.id).toBe(templateId);
      expect(data.screens).toHaveLength(1);
      expect(data.screens[0].id).toBe('db-screen-dashboard');
      expect(data.screenCount).toBe(1);
    });

    test('should handle non-existent template', async () => {
      const response = await fetch(`${baseUrl}/api/templates/non-existent`);
      expect(response.status).toBe(404);

      const data = await response.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Template not found');
    });
  });

  describe('Template Selection and Data Persistence', () => {
    test('should select template and persist selection to database', async () => {
      const templateId = 'db-integration-modern-01';
      const userId = 'test-user-001';

      const response = await fetch(`${baseUrl}/api/templates/${templateId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          screenId: 'db-screen-dashboard',
          customizations: {
            primaryColor: '#ff6b6b',
            theme: 'dark'
          },
          comments: 'Great theme for our dashboard!'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.result.templateId).toBe(templateId);
      expect(data.result.selection.userId).toBe(userId);
      expect(data.result.selection.themeId).toBe(templateId);
      expect(data.result.selection.selectionData.customizations.primaryColor).toBe('#ff6b6b');

      // Verify selection was persisted in database
      const userSelectionsResponse = await fetch(`${baseUrl}/api/user/selections`, {
        headers: { 'X-User-ID': userId }
      });
      const userSelectionsData = await userSelectionsResponse.json() as any;
      expect(userSelectionsData.success).toBe(true);
      expect(userSelectionsData.selections).toHaveLength(1);
      expect(userSelectionsData.selections[0].themeId).toBe(templateId);
    });

    test('should get user selections with enhanced theme data', async () => {
      const userId = 'test-user-002';

      // First, make a selection
      await fetch(`${baseUrl}/api/templates/db-integration-professional-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          screenId: 'db-screen-settings',
          customizations: { layout: 'tabs' },
          comments: 'Professional look for settings'
        })
      });

      // Get user selections
      const response = await fetch(`${baseUrl}/api/user/selections`, {
        headers: { 'X-User-ID': userId }
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.selections).toHaveLength(1);
      expect(data.userId).toBe(userId);
      
      // Check that selection includes enhanced theme data
      const selection = data.selections[0];
      expect(selection.theme).toBeTruthy();
      expect(selection.theme.id).toBe('db-integration-professional-01');
      expect(selection.theme.name).toBe('Database Professional Theme');
      expect(selection.theme.previewUrl).toBeTruthy();
    });

    test('should handle multiple selections for same user', async () => {
      const userId = 'test-user-003';

      // Make multiple selections
      await fetch(`${baseUrl}/api/templates/db-integration-modern-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          screenId: 'db-screen-dashboard',
          customizations: { theme: 'light' }
        })
      });

      await fetch(`${baseUrl}/api/templates/db-integration-professional-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          screenId: 'db-screen-settings',
          customizations: { theme: 'dark' }
        })
      });

      // Get all selections
      const response = await fetch(`${baseUrl}/api/user/selections`, {
        headers: { 'X-User-ID': userId }
      });

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.selections).toHaveLength(2);
      expect(data.selections.map((s: any) => s.themeId)).toEqual(
        expect.arrayContaining(['db-integration-modern-01', 'db-integration-professional-01'])
      );
    });
  });

  describe('Custom Theme Creation and Management', () => {
    test('should create custom theme and persist to database', async () => {
      const userId = 'theme-creator-001';

      const response = await fetch(`${baseUrl}/api/themes/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          name: 'My Custom Theme',
          description: 'A personalized theme for my project',
          category: 'creative',
          styles: {
            primaryColor: '#9c27b0',
            backgroundColor: '#fce4ec',
            borderRadius: '12px'
          },
          tags: ['custom', 'purple', 'creative']
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.customTheme.theme.name).toBe('My Custom Theme');
      expect(data.customTheme.theme.category).toBe('creative');
      expect(data.customTheme.theme.metadata.author).toBe(userId);
      expect(data.customTheme.template.id).toMatch(/^custom_/);

      // Verify theme can be retrieved
      const getResponse = await fetch(`${baseUrl}/api/templates/${data.customTheme.theme.id}`);
      const getStatus = await getResponse.json() as any;
      expect(getStatus.success).toBe(true);
      expect(getStatus.template.name).toBe('My Custom Theme');
    });

    test('should update existing theme', async () => {
      const templateId = 'db-integration-modern-01';

      const response = await fetch(`${baseUrl}/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Modern Theme',
          description: 'Updated description for modern theme',
          styles: {
            primaryColor: '#00bcd4',
            backgroundColor: '#e0f2f1'
          },
          metadata: {
            author: 'Update Team',
            version: '2.0.0',
            lastUpdated: new Date().toISOString(),
            tags: ['updated', 'modern', 'v2']
          }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.updated.theme.name).toBe('Updated Modern Theme');
      expect(data.updated.theme.metadata.version).toBe('2.0.0');

      // Verify update persisted
      const getResponse = await fetch(`${baseUrl}/api/templates/${templateId}`);
      const getData = await getResponse.json() as any;
      expect(getData.template.name).toBe('Updated Modern Theme');
    });
  });

  describe('Database Operations and Associations', () => {
    test('should access database operations directly', async () => {
      const themesResponse = await fetch(`${baseUrl}/api/database/themes`);
      expect(themesResponse.status).toBe(200);

      const themesData = await themesResponse.json() as any;
      expect(themesData.success).toBe(true);
      expect(themesData.themes.length).toBeGreaterThanOrEqual(2);

      const screensResponse = await fetch(`${baseUrl}/api/database/screens`);
      expect(screensResponse.status).toBe(200);

      const screensData = await screensResponse.json() as any;
      expect(screensData.success).toBe(true);
      expect(screensData.screens).toHaveLength(2);
      expect(screensData.screens[0]).toHaveProperty('templatePath');
    });

    test('should create theme-screen associations', async () => {
      const themeId = 'db-integration-professional-01';
      const screenId = 'db-screen-dashboard';

      const response = await fetch(`${baseUrl}/api/themes/${themeId}/screens/${screenId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renderConfig: {
            showAnimations: false,
            compactMode: true
          },
          sortOrder: 2
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.associated).toBe(true);
      expect(data.themeId).toBe(themeId);
      expect(data.screenId).toBe(screenId);

      // Verify association by getting theme screens
      const themeResponse = await fetch(`${baseUrl}/api/templates/${themeId}`);
      const themeData = await themeResponse.json() as any;
      expect(themeData.screens.length).toBeGreaterThanOrEqual(1);
    });

    test('should filter themes by category at database level', async () => {
      const response = await fetch(`${baseUrl}/api/database/themes?category=professional`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.themes).toHaveLength(1);
      expect(data.themes[0].category).toBe('professional');
    });
  });

  describe('Transaction Handling', () => {
    test('should select template with transaction and commit', async () => {
      const templateId = 'db-integration-modern-01';
      const userId = 'transaction-user-001';

      const response = await fetch(`${baseUrl}/api/templates/${templateId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          screenId: 'db-screen-dashboard',
          customizations: { transactionTest: true },
          useTransaction: true
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.transactionUsed).toBe(true);
      expect(data.result.selection.selectionData.metadata.transactionUsed).toBe(true);

      // Verify selection was persisted (transaction committed)
      const selectionsResponse = await fetch(`${baseUrl}/api/user/selections`, {
        headers: { 'X-User-ID': userId }
      });
      const selectionsData = await selectionsResponse.json() as any;
      expect(selectionsData.selections).toHaveLength(1);
    });

    test('should handle transaction commit', async () => {
      const response = await fetch(`${baseUrl}/api/transaction/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'create_and_commit' })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.operation).toBe('create_and_commit');
      expect(data.success).toBe(true);

      // Verify theme was created and committed
      const themesResponse = await fetch(`${baseUrl}/api/database/themes`);
      const themesData = await themesResponse.json() as any;
      const txTheme = themesData.themes.find((t: any) => t.id.startsWith('tx_test_'));
      expect(txTheme).toBeTruthy();
      expect(txTheme.name).toBe('Transaction Test Theme');
    });

    test('should handle transaction rollback', async () => {
      // Get initial theme count
      const initialResponse = await fetch(`${baseUrl}/api/database/themes`);
      const initialData = await initialResponse.json() as any;
      const initialCount = initialData.themes.length;

      const response = await fetch(`${baseUrl}/api/transaction/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'create_and_rollback' })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.operation).toBe('create_and_rollback');

      // Verify theme was not persisted (transaction rolled back)
      const finalResponse = await fetch(`${baseUrl}/api/database/themes`);
      const finalData = await finalResponse.json() as any;
      expect(finalData.themes.length).toBe(initialCount);
      
      const rollbackTheme = finalData.themes.find((t: any) => t.id.startsWith('tx_rollback_'));
      expect(rollbackTheme).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database errors gracefully', async () => {
      // Try to select non-existent template
      const response = await fetch(`${baseUrl}/api/templates/non-existent/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'error-test-user'
        },
        body: JSON.stringify({
          screenId: 'some-screen',
          customizations: {}
        })
      });

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain('Template not found');
    });

    test('should handle update of non-existent template', async () => {
      const response = await fetch(`${baseUrl}/api/templates/non-existent/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name'
        })
      });

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain('Template not found');
    });
  });

  describe('Performance and Health Monitoring', () => {
    test('should track integration metrics', async () => {
      // Perform several operations to generate metrics
      await fetch(`${baseUrl}/api/templates`);
      await fetch(`${baseUrl}/api/templates/db-integration-modern-01`);
      await fetch(`${baseUrl}/api/database/themes`);

      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.services.database).toBe('healthy');
      expect(data.services.guiServer).toBe('healthy');
      expect(data.services.integration).toBe('healthy');
      
      expect(data.metrics.totalRequests).toBeGreaterThan(0);
      expect(data.metrics.databaseOperations).toBeGreaterThan(0);
      expect(data.metrics.templateOperations).toBeGreaterThan(0);
    });

    test('should handle concurrent database operations', async () => {
      const userId = 'concurrent-user';
      const concurrentOperations = 5;

      const operations = Array.from({ length: concurrentOperations }, (_, index) =>
        fetch(`${baseUrl}/api/templates/db-integration-modern-01/select`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': `${userId}_${index}`
          },
          body: JSON.stringify({
            screenId: 'db-screen-dashboard',
            customizations: { operationIndex: index },
            comments: `Concurrent operation ${index}`
          })
        })
      );

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify all selections were persisted
      for (let i = 0; i < concurrentOperations; i++) {
        const userSelectionsResponse = await fetch(`${baseUrl}/api/user/selections`, {
          headers: { 'X-User-ID': `${userId}_${i}` }
        });
        const userSelectionsData = await userSelectionsResponse.json() as any;
        expect(userSelectionsData.selections).toHaveLength(1);
        expect(userSelectionsData.selections[0].selectionData.customizations.operationIndex).toBe(i);
      }
    });

    test('should maintain data consistency under load', async () => {
      const initialMetrics = integratedServer.getMetrics();
      const loadOperations = 20;

      const operations = Array.from({ length: loadOperations }, (_, index) => {
        if (index % 4 === 0) {
          return fetch(`${baseUrl}/api/templates`);
        } else if (index % 4 === 1) {
          return fetch(`${baseUrl}/api/database/themes`);
        } else if (index % 4 === 2) {
          return fetch(`${baseUrl}/api/templates/db-integration-modern-01`);
        } else {
          return fetch(`${baseUrl}/api/database/screens`);
        }
      });

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify metrics increased
      const finalMetrics = integratedServer.getMetrics();
      expect(finalMetrics.totalRequests).toBeGreaterThan(initialMetrics.totalRequests);
      expect(finalMetrics.databaseOperations).toBeGreaterThan(initialMetrics.databaseOperations);
      expect(finalMetrics.templateOperations).toBeGreaterThan(initialMetrics.templateOperations);
    });
  });
});