import { ThemeService } from '../../../src/services/ThemeService';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { themes } from '../../../src/config/themes.config';

// Mock dependencies
jest.mock('../../../src/services/DatabaseService');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe("ThemeService", () => {
  let themeService: ThemeService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    themeService = new ThemeService();
    mockDb = (themeService as any).db;
  });

  describe("getAllThemes", () => {
    it('should return all themes for web platform', async () => {
      const result = await themeService.getAllThemes();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(themes);
    });

    it('should return filtered themes for specific platform', async () => {
      const result = await themeService.getAllThemes('ios');
      
      expect(result).toBeInstanceOf(Array);
      // Should still return all themes as we don't have platform-specific filtering yet
      expect(result).toEqual(themes);
    });
  });

  describe("getTheme", () => {
    it('should return specific theme by ID', async () => {
      const result = await themeService.getTheme('modern');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('modern');
      expect(result?.name).toBe('Modern Dashboard');
    });

    it('should throw error for non-existent theme', async () => {
      await expect(themeService.getTheme('non-existent'))
        .rejects.toThrow('Theme non-existent not found');
    });
  });

  describe("applyTheme", () => {
    it('should apply theme successfully', async () => {
      const result = await themeService.applyTheme('modern', 'web', 'device-123', 1);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('applied successfully');
    });

    it('should handle invalid theme ID', async () => {
      await expect(themeService.applyTheme('invalid-theme', 'web', 'device-123'))
        .rejects.toThrow('Theme invalid-theme not found');
    });
  });

  describe("syncTheme", () => {
    it('should sync theme between devices', async () => {
      const result = await themeService.syncTheme('device-1', 'device-2', 'modern', 1);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain("synchronized");
    });
  });

  describe("exportTheme", () => {
    it('should export theme as CSS', async () => {
      const result = await themeService.exportTheme('modern', 'css');
      
      expect(result).toHaveProperty("filename");
      expect(result.filename).toContain('.css');
      expect(result).toHaveProperty("contentType", 'text/css');
      expect(result).toHaveProperty('content');
      expect(result.content).toContain(':root');
    });

    it('should export theme as TypeScript', async () => {
      const result = await themeService.exportTheme('modern', 'ts');
      
      expect(result).toHaveProperty("filename");
      expect(result.filename).toContain('.ts');
      expect(result).toHaveProperty("contentType", 'text/typescript');
      expect(result).toHaveProperty('content');
      expect(result.content).toContain('export const');
    });

    it('should export theme as JSON', async () => {
      const result = await themeService.exportTheme('modern', 'json');
      
      expect(result).toHaveProperty("filename");
      expect(result.filename).toContain('.json');
      expect(result).toHaveProperty("contentType", 'application/json');
      expect(result).toHaveProperty('content');
      
      const parsed = JSON.parse(result.content);
      expect(parsed).toHaveProperty('id', 'modern');
    });

    it('should throw error for invalid format', async () => {
      await expect(themeService.exportTheme('modern', 'invalid'))
        .rejects.toThrow('Unsupported export format');
    });

    it('should throw error for invalid theme', async () => {
      await expect(themeService.exportTheme('invalid-theme', 'css'))
        .rejects.toThrow('Theme invalid-theme not found');
    });
  });

  describe("getThemeStatistics", () => {
    it('should return theme statistics', async () => {
      mockDb.all = jest.fn()
        .mockResolvedValueOnce([
          { themeId: 'modern', usage_count: 10 },
          { themeId: "professional", usage_count: 5 }
        ])
        .mockResolvedValueOnce([
          { total: 15 }
        ]);

      const result = await themeService.getThemeStatistics();
      
      expect(result).toHaveProperty("totalThemes", themes.length);
      expect(result).toHaveProperty("themePopularity");
      expect(result.themePopularity).toHaveLength(2);
      expect(result.themePopularity[0]).toHaveProperty('themeId', 'modern');
      expect(result).toHaveProperty("dailyUsage");
      expect(result.dailyUsage[0]).toHaveProperty('total', 15);
    });

    it('should handle database errors by throwing', async () => {
      mockDb.all = jest.fn().mockRejectedValue(new Error('DB Error'));

      await expect(themeService.getThemeStatistics())
        .rejects.toThrow('DB Error');
    });
  });

  describe("getUserThemePreference", () => {
    it('should return user theme preference', async () => {
      const mockPreference = {
        user_id: 1,
        theme_id: 'modern',
        color_mode: 'dark',
        device_id: 'device-123',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockDb.get = jest.fn().mockResolvedValue(mockPreference);

      const result = await themeService.getUserThemePreference(1, 'device-123');
      
      expect(result).toEqual({
        userId: 1,
        themeId: 'modern',
        colorMode: 'dark',
        deviceId: 'device-123',
        updatedAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should return null when no preference found', async () => {
      mockDb.get = jest.fn().mockResolvedValue(null);

      const result = await themeService.getUserThemePreference(1);
      
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDb.get = jest.fn().mockRejectedValue(new Error('DB Error'));

      const result = await themeService.getUserThemePreference(1);
      
      expect(result).toBeNull();
    });
  });

  describe("saveUserThemePreference", () => {
    it('should save user theme preference', async () => {
      mockDb.run = jest.fn().mockResolvedValue({ changes: 1 });

      const result = await themeService.saveUserThemePreference(1, 'modern', 'dark', 'device-123');
      
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        expect.arrayContaining([1, 'modern', 'dark', 'device-123'])
      );
    });

    it('should handle database errors', async () => {
      mockDb.run = jest.fn().mockRejectedValue(new Error('DB Error'));

      const result = await themeService.saveUserThemePreference(1, 'modern');
      
      expect(result).toBe(false);
    });
  });
});