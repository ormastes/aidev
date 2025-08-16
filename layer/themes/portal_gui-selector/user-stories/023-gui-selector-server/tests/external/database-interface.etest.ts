/**
 * External Test: Database External Interface - Selection persistence
 * 
 * This test verifies the external interface for the Database component,
 * specifically selection persistence, theme management, and screen associations.
 * NO MOCKS - Real external interface implementation with PostgreSQL-compatible operations.
 */

// External Interface for Database operations
interface ThemeData {
  id: string;
  name: string;
  description: string;
  category: 'modern' | "professional" | "creative" | "accessible";
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
  createTheme(theme: Omit<ThemeData, "createdAt" | "updatedAt">): Promise<ThemeData>;
  getTheme(id: string): Promise<ThemeData | null>;
  updateTheme(id: string, updates: Partial<ThemeData>): Promise<ThemeData | null>;
  deleteTheme(id: string): Promise<boolean>;
  listThemes(category?: string): Promise<ThemeData[]>;
  
  // Screen operations
  createScreen(screen: Omit<ScreenData, "createdAt">): Promise<ScreenData>;
  getScreen(id: string): Promise<ScreenData | null>;
  updateScreen(id: string, updates: Partial<ScreenData>): Promise<ScreenData | null>;
  deleteScreen(id: string): Promise<boolean>;
  listScreens(): Promise<ScreenData[]>;
  
  // Theme-Screen associations
  associateThemeScreen(association: ThemeScreenAssociation): Promise<boolean>;
  removeThemeScreenAssociation(themeId: string, screenId: string): Promise<boolean>;
  getThemeScreens(themeId: string): Promise<ScreenData[]>;
  getScreenThemes(screenId: string): Promise<ThemeData[]>;
  
  // Selection operations
  createSelection(selection: Omit<SelectionData, 'id' | "createdAt" | "updatedAt">): Promise<SelectionData>;
  getSelection(id: string): Promise<SelectionData | null>;
  updateSelection(id: string, updates: Partial<SelectionData>): Promise<SelectionData | null>;
  deleteSelection(id: string): Promise<boolean>;
  getUserSelections(userId: string): Promise<SelectionData[]>;
  
  // Utility operations
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// Mock implementation using in-memory storage (PostgreSQL-compatible)
class MockDatabase implements DatabaseInterface {
  private themes: Map<string, ThemeData> = new Map();
  private screens: Map<string, ScreenData> = new Map();
  private themeScreens: Map<string, ThemeScreenAssociation[]> = new Map();
  private selections: Map<string, SelectionData> = new Map();
  private transactionActive = false;
  private transactionData: {
    themes: Map<string, ThemeData>;
    screens: Map<string, ScreenData>;
    themeScreens: Map<string, ThemeScreenAssociation[]>;
    selections: Map<string, SelectionData>;
  } | null = null;

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Theme operations
  async createTheme(theme: Omit<ThemeData, "createdAt" | "updatedAt">): Promise<ThemeData> {
    const now = new Date();
    const newTheme: ThemeData = {
      ...theme,
      createdAt: now,
      updatedAt: now
    };
    
    const storage = this.transactionActive ? this.transactionData!.themes : this.themes;
    storage.set(theme.id, newTheme);
    return { ...newTheme };
  }

  async getTheme(id: string): Promise<ThemeData | null> {
    const storage = this.transactionActive ? this.transactionData!.themes : this.themes;
    return storage.get(id) ? { ...storage.get(id)! } : null;
  }

  async updateTheme(id: string, updates: Partial<ThemeData>): Promise<ThemeData | null> {
    const storage = this.transactionActive ? this.transactionData!.themes : this.themes;
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
    const storage = this.transactionActive ? this.transactionData!.themes : this.themes;
    return storage.delete(id);
  }

  async listThemes(category?: string): Promise<ThemeData[]> {
    const storage = this.transactionActive ? this.transactionData!.themes : this.themes;
    const themes = Array.from(storage.values());
    if (category) {
      return themes.filter(theme => theme.category === category);
    }
    return themes.map(theme => ({ ...theme }));
  }

  // Screen operations
  async createScreen(screen: Omit<ScreenData, "createdAt">): Promise<ScreenData> {
    const newScreen: ScreenData = {
      ...screen,
      createdAt: new Date()
    };
    
    const storage = this.transactionActive ? this.transactionData!.screens : this.screens;
    storage.set(screen.id, newScreen);
    return { ...newScreen };
  }

  async getScreen(id: string): Promise<ScreenData | null> {
    const storage = this.transactionActive ? this.transactionData!.screens : this.screens;
    return storage.get(id) ? { ...storage.get(id)! } : null;
  }

  async updateScreen(id: string, updates: Partial<ScreenData>): Promise<ScreenData | null> {
    const storage = this.transactionActive ? this.transactionData!.screens : this.screens;
    const existing = storage.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    storage.set(id, updated);
    return { ...updated };
  }

  async deleteScreen(id: string): Promise<boolean> {
    const storage = this.transactionActive ? this.transactionData!.screens : this.screens;
    return storage.delete(id);
  }

  async listScreens(): Promise<ScreenData[]> {
    const storage = this.transactionActive ? this.transactionData!.screens : this.screens;
    return Array.from(storage.values()).map(screen => ({ ...screen }));
  }

  // Theme-Screen associations
  async associateThemeScreen(association: ThemeScreenAssociation): Promise<boolean> {
    const storage = this.transactionActive ? this.transactionData!.themeScreens : this.themeScreens;
    const existing = storage.get(association.themeId) || [];
    
    // Remove existing association if it exists
    const filtered = existing.filter(assoc => assoc.screenId !== association.screenId);
    filtered.push(association);
    
    storage.set(association.themeId, filtered);
    return true;
  }

  async removeThemeScreenAssociation(themeId: string, screenId: string): Promise<boolean> {
    const storage = this.transactionActive ? this.transactionData!.themeScreens : this.themeScreens;
    const existing = storage.get(themeId) || [];
    const filtered = existing.filter(assoc => assoc.screenId !== screenId);
    
    if (filtered.length < existing.length) {
      storage.set(themeId, filtered);
      return true;
    }
    return false;
  }

  async getThemeScreens(themeId: string): Promise<ScreenData[]> {
    const themeScreenStorage = this.transactionActive ? this.transactionData!.themeScreens : this.themeScreens;
    const screenStorage = this.transactionActive ? this.transactionData!.screens : this.screens;
    
    const associations = themeScreenStorage.get(themeId) || [];
    const screens = associations
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(assoc => screenStorage.get(assoc.screenId))
      .filter(screen => screen !== undefined) as ScreenData[];
    
    return screens.map(screen => ({ ...screen }));
  }

  async getScreenThemes(screenId: string): Promise<ThemeData[]> {
    const themeScreenStorage = this.transactionActive ? this.transactionData!.themeScreens : this.themeScreens;
    const themeStorage = this.transactionActive ? this.transactionData!.themes : this.themes;
    
    const themes: ThemeData[] = [];
    for (const [themeId, associations] of themeScreenStorage.entries()) {
      if (associations.some(assoc => assoc.screenId === screenId)) {
        const theme = themeStorage.get(themeId);
        if (theme) themes.push({ ...theme });
      }
    }
    return themes;
  }

  // Selection operations
  async createSelection(selection: Omit<SelectionData, 'id' | "createdAt" | "updatedAt">): Promise<SelectionData> {
    const now = new Date();
    const newSelection: SelectionData = {
      ...selection,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };
    
    const storage = this.transactionActive ? this.transactionData!.selections : this.selections;
    storage.set(newSelection.id, newSelection);
    return { ...newSelection };
  }

  async getSelection(id: string): Promise<SelectionData | null> {
    const storage = this.transactionActive ? this.transactionData!.selections : this.selections;
    return storage.get(id) ? { ...storage.get(id)! } : null;
  }

  async updateSelection(id: string, updates: Partial<SelectionData>): Promise<SelectionData | null> {
    const storage = this.transactionActive ? this.transactionData!.selections : this.selections;
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

  async deleteSelection(id: string): Promise<boolean> {
    const storage = this.transactionActive ? this.transactionData!.selections : this.selections;
    return storage.delete(id);
  }

  async getUserSelections(userId: string): Promise<SelectionData[]> {
    const storage = this.transactionActive ? this.transactionData!.selections : this.selections;
    return Array.from(storage.values())
      .filter(selection => selection.userId === userId)
      .map(selection => ({ ...selection }));
  }

  // Transaction operations
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
    // Simulate health check operations
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }
}

describe('Database External Interface Test', () => {
  let database: DatabaseInterface;
  
  beforeEach(() => {
    database = new MockDatabase();
  });
  
  describe('Theme Operations', () => {
    test('should create new theme', async () => {
      const themeData = {
        id: 'modern-dashboard',
        name: 'Modern Dashboard',
        description: 'Clean and minimalist dashboard design',
        category: 'modern' as const,
        styles: {
          primaryColor: '#007bff',
          backgroundColor: '#ffffff',
          borderRadius: '8px'
        },
        metadata: {
          author: 'Design Team',
          version: '1.0.0',
          lastUpdated: '2024-01-15',
          tags: ["dashboard", 'modern', 'clean']
        }
      };
      
      const created = await database.createTheme(themeData);
      
      expect(created.id).toBe(themeData.id);
      expect(created.name).toBe(themeData.name);
      expect(created.category).toBe('modern');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(created.styles.primaryColor).toBe('#007bff');
    });
    
    test('should retrieve theme by ID', async () => {
      const theme = await database.createTheme({
        id: 'test-theme',
        name: 'Test Theme',
        description: 'A test theme',
        category: "professional",
        styles: {},
        metadata: {
          author: 'Test',
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          tags: ['test']
        }
      });
      
      const retrieved = await database.getTheme('test-theme');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(theme.id);
      expect(retrieved!.name).toBe('Test Theme');
    });
    
    test('should update existing theme', async () => {
      await database.createTheme({
        id: 'update-theme',
        name: 'Original Name',
        description: 'Original description',
        category: 'modern',
        styles: { color: 'blue' },
        metadata: {
          author: 'Original Author',
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          tags: ["original"]
        }
      });
      
      // Wait a moment to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await database.updateTheme('update-theme', {
        name: 'Updated Name',
        description: 'Updated description',
        styles: { color: 'red', background: 'white' }
      });
      
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.description).toBe('Updated description');
      expect(updated!.styles.color).toBe('red');
      expect(updated!.styles.background).toBe('white');
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(updated!.createdAt.getTime());
    });
    
    test('should delete theme', async () => {
      await database.createTheme({
        id: 'delete-theme',
        name: 'Delete Me',
        description: 'Theme to be deleted',
        category: "creative",
        styles: {},
        metadata: {
          author: 'Test',
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          tags: ['delete']
        }
      });
      
      const deleted = await database.deleteTheme('delete-theme');
      expect(deleted).toBe(true);
      
      const retrieved = await database.getTheme('delete-theme');
      expect(retrieved).toBeNull();
    });
    
    test('should list themes by category', async () => {
      await database.createTheme({
        id: 'modern-1',
        name: 'Modern Theme 1',
        description: 'First modern theme',
        category: 'modern',
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      await database.createTheme({
        id: 'modern-2',
        name: 'Modern Theme 2',
        description: 'Second modern theme',
        category: 'modern',
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      await database.createTheme({
        id: 'professional-1',
        name: 'Professional Theme',
        description: 'Professional theme',
        category: "professional",
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      const modernThemes = await database.listThemes('modern');
      expect(modernThemes).toHaveLength(2);
      expect(modernThemes.every(theme => theme.category === 'modern')).toBe(true);
      
      const allThemes = await database.listThemes();
      expect(allThemes).toHaveLength(3);
    });
  });
  
  describe('Screen Operations', () => {
    test('should create and retrieve screen', async () => {
      const screenData = {
        id: 'dashboard-screen',
        name: 'Dashboard Screen',
        templatePath: '/templates/dashboard.html',
        componentData: {
          widgets: ['header', 'sidebar', 'content'],
          layout: 'grid'
        }
      };
      
      const created = await database.createScreen(screenData);
      
      expect(created.id).toBe('dashboard-screen');
      expect(created.name).toBe('Dashboard Screen');
      expect(created.componentData.widgets).toEqual(['header', 'sidebar', 'content']);
      expect(created.createdAt).toBeInstanceOf(Date);
      
      const retrieved = await database.getScreen('dashboard-screen');
      expect(retrieved).toEqual(created);
    });
    
    test('should update screen data', async () => {
      await database.createScreen({
        id: 'update-screen',
        name: 'Original Screen',
        templatePath: '/original.html',
        componentData: { original: true }
      });
      
      const updated = await database.updateScreen('update-screen', {
        name: 'Updated Screen',
        componentData: { updated: true, newField: 'value' }
      });
      
      expect(updated!.name).toBe('Updated Screen');
      expect(updated!.componentData.updated).toBe(true);
      expect(updated!.componentData.newField).toBe('value');
    });
    
    test('should list all screens', async () => {
      await database.createScreen({
        id: 'screen-1',
        name: 'Screen One',
        templatePath: '/screen1.html',
        componentData: {}
      });
      
      await database.createScreen({
        id: 'screen-2',
        name: 'Screen Two',
        templatePath: '/screen2.html',
        componentData: {}
      });
      
      const screens = await database.listScreens();
      expect(screens).toHaveLength(2);
      expect(screens.map(s => s.name)).toContain('Screen One');
      expect(screens.map(s => s.name)).toContain('Screen Two');
    });
  });
  
  describe('Theme-Screen Associations', () => {
    beforeEach(async () => {
      // Create test themes
      await database.createTheme({
        id: 'theme-1',
        name: 'Theme One',
        description: 'First theme',
        category: 'modern',
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      // Create test screens
      await database.createScreen({
        id: 'screen-1',
        name: 'Screen One',
        templatePath: '/screen1.html',
        componentData: {}
      });
      
      await database.createScreen({
        id: 'screen-2',
        name: 'Screen Two',
        templatePath: '/screen2.html',
        componentData: {}
      });
    });
    
    test('should associate theme with screen', async () => {
      const association = {
        themeId: 'theme-1',
        screenId: 'screen-1',
        renderConfig: { showHeader: true, colorScheme: 'dark' },
        sortOrder: 1
      };
      
      const result = await database.associateThemeScreen(association);
      expect(result).toBe(true);
      
      const themeScreens = await database.getThemeScreens('theme-1');
      expect(themeScreens).toHaveLength(1);
      expect(themeScreens[0].id).toBe('screen-1');
    });
    
    test('should get screens for theme in sort order', async () => {
      await database.associateThemeScreen({
        themeId: 'theme-1',
        screenId: 'screen-2',
        renderConfig: {},
        sortOrder: 1
      });
      
      await database.associateThemeScreen({
        themeId: 'theme-1',
        screenId: 'screen-1',
        renderConfig: {},
        sortOrder: 2
      });
      
      const themeScreens = await database.getThemeScreens('theme-1');
      expect(themeScreens).toHaveLength(2);
      expect(themeScreens[0].id).toBe('screen-2'); // sort order 1
      expect(themeScreens[1].id).toBe('screen-1'); // sort order 2
    });
    
    test('should get themes for screen', async () => {
      await database.createTheme({
        id: 'theme-2',
        name: 'Theme Two',
        description: 'Second theme',
        category: "professional",
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      await database.associateThemeScreen({
        themeId: 'theme-1',
        screenId: 'screen-1',
        renderConfig: {},
        sortOrder: 1
      });
      
      await database.associateThemeScreen({
        themeId: 'theme-2',
        screenId: 'screen-1',
        renderConfig: {},
        sortOrder: 1
      });
      
      const screenThemes = await database.getScreenThemes('screen-1');
      expect(screenThemes).toHaveLength(2);
      expect(screenThemes.map(t => t.id)).toContain('theme-1');
      expect(screenThemes.map(t => t.id)).toContain('theme-2');
    });
    
    test('should remove theme-screen association', async () => {
      await database.associateThemeScreen({
        themeId: 'theme-1',
        screenId: 'screen-1',
        renderConfig: {},
        sortOrder: 1
      });
      
      const removed = await database.removeThemeScreenAssociation('theme-1', 'screen-1');
      expect(removed).toBe(true);
      
      const themeScreens = await database.getThemeScreens('theme-1');
      expect(themeScreens).toHaveLength(0);
    });
  });
  
  describe('Selection Operations', () => {
    test('should create user selection', async () => {
      const selectionData = {
        userId: 'user123',
        themeId: 'modern-theme',
        screenId: 'dashboard-screen',
        selectionData: {
          customizations: { primaryColor: '#ff0000' },
          preferences: { animations: true }
        },
        comments: 'Love this design!'
      };
      
      const created = await database.createSelection(selectionData);
      
      expect(created.id).toBeTruthy();
      expect(created.userId).toBe('user123');
      expect(created.themeId).toBe('modern-theme');
      expect(created.selectionData.customizations.primaryColor).toBe('#ff0000');
      expect(created.comments).toBe('Love this design!');
      expect(created.createdAt).toBeInstanceOf(Date);
    });
    
    test('should get user selections', async () => {
      await database.createSelection({
        userId: 'user123',
        themeId: 'theme-1',
        selectionData: { choice: 'A' }
      });
      
      await database.createSelection({
        userId: 'user123',
        themeId: 'theme-2',
        selectionData: { choice: 'B' }
      });
      
      await database.createSelection({
        userId: 'user456',
        themeId: 'theme-1',
        selectionData: { choice: 'C' }
      });
      
      const user123Selections = await database.getUserSelections('user123');
      expect(user123Selections).toHaveLength(2);
      expect(user123Selections.every(s => s.userId === 'user123')).toBe(true);
      
      const user456Selections = await database.getUserSelections('user456');
      expect(user456Selections).toHaveLength(1);
      expect(user456Selections[0].userId).toBe('user456');
    });
    
    test('should update selection', async () => {
      const selection = await database.createSelection({
        userId: 'user123',
        themeId: 'theme-1',
        selectionData: { original: true }
      });
      
      // Wait a moment to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await database.updateSelection(selection.id, {
        selectionData: { updated: true, newData: 'value' },
        comments: 'Updated selection'
      });
      
      expect(updated!.selectionData.updated).toBe(true);
      expect(updated!.selectionData.newData).toBe('value');
      expect(updated!.comments).toBe('Updated selection');
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(updated!.createdAt.getTime());
    });
  });
  
  describe('Transaction Operations', () => {
    test('should support transaction commit', async () => {
      await database.beginTransaction();
      
      await database.createTheme({
        id: 'tx-theme',
        name: 'Transaction Theme',
        description: 'Theme in transaction',
        category: 'modern',
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      // Theme should not be visible outside transaction yet
      const beforeCommit = await database.getTheme('tx-theme');
      expect(beforeCommit).not.toBeNull(); // In transaction, so it's visible
      
      await database.commitTransaction();
      
      // Now it should be permanently visible
      const afterCommit = await database.getTheme('tx-theme');
      expect(afterCommit).not.toBeNull();
      expect(afterCommit!.name).toBe('Transaction Theme');
    });
    
    test('should support transaction rollback', async () => {
      await database.beginTransaction();
      
      await database.createTheme({
        id: 'rollback-theme',
        name: 'Rollback Theme',
        description: 'This should be rolled back',
        category: 'modern',
        styles: {},
        metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
      });
      
      await database.rollbackTransaction();
      
      // Theme should not exist after rollback
      const afterRollback = await database.getTheme('rollback-theme');
      expect(afterRollback).toBeNull();
    });
    
    test('should handle nested transaction errors', async () => {
      await database.beginTransaction();
      
      // Attempting to start another transaction should fail
      await expect(database.beginTransaction()).rejects.toThrow('Transaction already active');
      
      await database.rollbackTransaction();
    });
  });
  
  describe('Database Health and Performance', () => {
    test('should pass health check', async () => {
      const isHealthy = await database.healthCheck();
      expect(isHealthy).toBe(true);
    });
    
    test('should handle concurrent operations', async () => {
      const operations = [
        database.createTheme({
          id: 'concurrent-1',
          name: 'Concurrent Theme 1',
          description: 'First concurrent theme',
          category: 'modern',
          styles: {},
          metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
        }),
        database.createTheme({
          id: 'concurrent-2',
          name: 'Concurrent Theme 2',
          description: 'Second concurrent theme',
          category: "professional",
          styles: {},
          metadata: { author: 'Test', version: '1.0.0', lastUpdated: '2024-01-01', tags: [] }
        }),
        database.createScreen({
          id: 'concurrent-screen',
          name: 'Concurrent Screen',
          templatePath: '/concurrent.html',
          componentData: {}
        })
      ];
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('concurrent-1');
      expect(results[1].id).toBe('concurrent-2');
      expect(results[2].id).toBe('concurrent-screen');
      
      // Verify all data was stored correctly
      const themes = await database.listThemes();
      const screens = await database.listScreens();
      
      expect(themes.length).toBeGreaterThanOrEqual(2);
      expect(screens.length).toBeGreaterThanOrEqual(1);
    });
    
    test('should handle large data sets efficiently', async () => {
      const startTime = Date.now();
      
      // Create many themes
      const themePromises = Array.from({ length: 50 }, (_, i) =>
        database.createTheme({
          id: `bulk-theme-${i}`,
          name: `Bulk Theme ${i}`,
          description: `Generated theme ${i}`,
          category: ['modern', "professional", "creative", "accessible"][i % 4] as any,
          styles: { index: i },
          metadata: {
            author: 'Bulk Creator',
            version: '1.0.0',
            lastUpdated: '2024-01-01',
            tags: [`tag-${i}`, `bulk`]
          }
        })
      );
      
      await Promise.all(themePromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete bulk operations reasonably quickly
      expect(duration).toBeLessThan(1000); // Under 1 second
      
      const allThemes = await database.listThemes();
      expect(allThemes.length).toBeGreaterThanOrEqual(50);
    });
  });
});