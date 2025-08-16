import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { 
  themes, 
  getThemeById, 
  getDefaultTheme, 
  getThemesByCategory,
  convertToReactNativeTheme,
  exportThemeAsCSS,
  exportThemeAsTypeScript,
  WebTheme
} from '../config/themes.config';

interface UserThemePreference {
  userId: number;
  themeId: string;
  colorMode: 'light' | 'dark';
  deviceId?: string;
  updatedAt: string;
}

export class ThemeService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Create user theme preferences table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS user_theme_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          theme_id TEXT NOT NULL,
          color_mode TEXT DEFAULT 'light',
          device_id TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, device_id)
        )
      `);

      // Create theme usage analytics table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS theme_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          theme_id TEXT NOT NULL,
          user_id INTEGER,
          action TEXT NOT NULL,
          platform TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('Theme database tables initialized');
    } catch (error) {
      logger.error('Failed to initialize theme database:', error);
    }
  }

  // Get all available themes
  async getAllThemes(platform?: string): Promise<any[]> {
    try {
      // Log theme request
      await this.logThemeUsage(null, null, 'list_themes', platform);

      if (platform === 'react-native' || platform === 'mobile') {
        return themes.map(theme => convertToReactNativeTheme(theme));
      }
      
      return themes;
    } catch (error) {
      logger.error('Error fetching themes:', error);
      throw error;
    }
  }

  // Get theme by ID
  async getTheme(themeId: string, platform?: string): Promise<any> {
    try {
      const theme = getThemeById(themeId);
      
      if (!theme) {
        throw new Error(`Theme ${themeId} not found`);
      }

      // Log theme access
      await this.logThemeUsage(themeId, null, 'view_theme', platform);

      if (platform === 'react-native' || platform === 'mobile') {
        return convertToReactNativeTheme(theme);
      }

      return theme;
    } catch (error) {
      logger.error(`Error fetching theme ${themeId}:`, error);
      throw error;
    }
  }

  // Get user's theme preference
  async getUserThemePreference(userId: number, deviceId?: string): Promise<UserThemePreference | null> {
    try {
      const query = deviceId
        ? 'SELECT * FROM user_theme_preferences WHERE user_id = ? AND device_id = ?'
        : 'SELECT * FROM user_theme_preferences WHERE user_id = ? AND device_id IS NULL';
      
      const params = deviceId ? [userId, deviceId] : [userId];
      const preference = await this.db.get(query, params);

      if (preference) {
        return {
          userId: preference.user_id,
          themeId: preference.theme_id,
          colorMode: preference.color_mode,
          deviceId: preference.device_id,
          updatedAt: preference.updated_at
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching user theme preference:', error);
      return null;
    }
  }

  // Save user's theme preference
  async saveUserThemePreference(
    userId: number, 
    themeId: string, 
    colorMode: 'light' | 'dark' = 'light',
    deviceId?: string
  ): Promise<boolean> {
    try {
      // Validate theme exists
      const theme = getThemeById(themeId);
      if (!theme) {
        throw new Error(`Invalid theme ID: ${themeId}`);
      }

      await this.db.run(`
        INSERT OR REPLACE INTO user_theme_preferences 
        (user_id, theme_id, color_mode, device_id, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, themeId, colorMode, deviceId || null]);

      // Log theme selection
      await this.logThemeUsage(themeId, userId, 'select_theme');

      logger.info(`Theme preference saved for user ${userId}: ${themeId}`);
      return true;
    } catch (error) {
      logger.error('Error saving theme preference:', error);
      return false;
    }
  }

  // Apply theme to device
  async applyTheme(themeId: string, platform: string, deviceId: string, userId?: number): Promise<any> {
    try {
      const theme = await this.getTheme(themeId, platform);

      // Save preference if user is authenticated
      if (userId) {
        await this.saveUserThemePreference(userId, themeId, 'light', deviceId);
      }

      // Log theme application
      await this.logThemeUsage(themeId, userId || null, 'apply_theme', platform);

      return {
        success: true,
        message: `Theme ${themeId} applied successfully`,
        theme,
        appliedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error applying theme:', error);
      throw error;
    }
  }

  // Sync theme between devices
  async syncTheme(fromDevice: string, toDevice: string, themeId: string, userId?: number): Promise<any> {
    try {
      // Validate theme
      const theme = getThemeById(themeId);
      if (!theme) {
        throw new Error(`Invalid theme ID: ${themeId}`);
      }

      // Log sync action
      await this.logThemeUsage(themeId, userId || null, 'sync_theme');

      // In a real implementation, this would:
      // 1. Send push notification to target device
      // 2. Update device-specific preferences
      // 3. Handle WebSocket communication

      return {
        success: true,
        message: `Theme ${themeId} synchronized from ${fromDevice} to ${toDevice}`,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error syncing theme:', error);
      throw error;
    }
  }

  // Export theme in various formats
  async exportTheme(themeId: string, format: string): Promise<{ content: string; contentType: string; filename: string }> {
    try {
      const theme = getThemeById(themeId);
      if (!theme) {
        throw new Error(`Theme ${themeId} not found`);
      }

      let content: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'json':
          const reactNativeTheme = convertToReactNativeTheme(theme);
          content = JSON.stringify(reactNativeTheme, null, 2);
          contentType = 'application/json';
          filename = `theme-${themeId}.json`;
          break;

        case 'css':
          content = exportThemeAsCSS(theme, 'light') + '\n\n' + exportThemeAsCSS(theme, 'dark');
          contentType = 'text/css';
          filename = `theme-${themeId}.css`;
          break;

        case 'ts':
        case 'typescript':
          content = exportThemeAsTypeScript(theme);
          contentType = 'text/typescript';
          filename = `theme-${themeId}.ts`;
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Log export action
      await this.logThemeUsage(themeId, null, 'export_theme', format);

      return { content, contentType, filename };
    } catch (error) {
      logger.error('Error exporting theme:', error);
      throw error;
    }
  }

  // Get theme usage statistics
  async getThemeStatistics(): Promise<any> {
    try {
      const stats = await this.db.all(`
        SELECT 
          theme_id,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_actions,
          MAX(timestamp) as last_used
        FROM theme_usage
        WHERE action = 'select_theme'
        GROUP BY theme_id
        ORDER BY unique_users DESC
      `);

      const dailyUsage = await this.db.all(`
        SELECT 
          DATE(timestamp) as date,
          theme_id,
          COUNT(*) as usage_count
        FROM theme_usage
        WHERE timestamp >= DATE('now', '-7 days')
        GROUP BY DATE(timestamp), theme_id
        ORDER BY date DESC
      `);

      return {
        themePopularity: stats,
        dailyUsage,
        totalThemes: themes.length
      };
    } catch (error) {
      logger.error('Error fetching theme statistics:', error);
      throw error;
    }
  }

  // Log theme usage for analytics
  private async logThemeUsage(
    themeId: string | null, 
    userId: number | null, 
    action: string, 
    platform?: string
  ): Promise<void> {
    try {
      await this.db.run(`
        INSERT INTO theme_usage (theme_id, user_id, action, platform)
        VALUES (?, ?, ?, ?)
      `, [themeId, userId, action, platform || 'web']);
    } catch (error) {
      logger.error('Error logging theme usage:', error);
    }
  }
}

// Export singleton instance
export const themeService = new ThemeService();