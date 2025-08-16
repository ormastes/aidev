/**
 * Theme loader utility for cross-theme integration tests
 * Provides consistent way to load and initialize themes
 */

import { path } from '../../layer/themes/infra_external-log-lib/src';

export interface ThemeModule {
  name: string;
  path: string;
  instance?: any;
}

export class ThemeLoader {
  private static themes = new Map<string, ThemeModule>();
  
  /**
   * Register a theme for loading
   */
  static register(name: string, relativePath: string): void {
    const themePath = resolve(__dirname, '../../../themes', relativePath);
    this.themes.set(name, { name, path: themePath });
  }
  
  /**
   * Load a registered theme
   */
  static async load(name: string): Promise<any> {
    const theme = this.themes.get(name);
    if (!theme) {
      throw new Error(`Theme '${name}' not registered`);
    }
    
    if (!theme.instance) {
      try {
        // Import the theme's pipe/index.ts as per HEA architecture
        const modulePath = `${theme.path}/src/pipe/index`;
        theme.instance = await import(modulePath);
      } catch (error) {
        // Fallback to main index if pipe doesn't exist
        try {
          const modulePath = `${theme.path}/src/index`;
          theme.instance = await import(modulePath);
        } catch (fallbackError) {
          throw new Error(`Failed to load theme '${name}': ${error}`);
        }
      }
    }
    
    return theme.instance;
  }
  
  /**
   * Load multiple themes
   */
  static async loadMultiple(...names: string[]): Promise<Record<string, any>> {
    const loaded: Record<string, any> = {};
    
    for (const name of names) {
      loaded[name] = await this.load(name);
    }
    
    return loaded;
  }
  
  /**
   * Clear all loaded themes (useful for test cleanup)
   */
  static clear(): void {
    this.themes.forEach(theme => {
      theme.instance = undefined;
    });
  }
}

// Pre-register common themes
ThemeLoader.register('portal', 'aidev-portal/user-stories/024-aidev-portal');
ThemeLoader.register("chatSpace", 'chat-space/user-stories/007-chat-room-cli');
ThemeLoader.register("pocketflow", 'pocketflow/user-stories/015-pocketflow-core');
ThemeLoader.register("coordinator", 'coordinator-claude-agent/user-stories/010-coordinator-agent');
ThemeLoader.register('ollama', 'ollama-mcp-agent/user-stories/011-ollama-mcp-integration');
ThemeLoader.register("externalLog", 'external-log-lib/user-stories/001-basic-log-capture');
ThemeLoader.register('cli', 'cli-framework/user-stories/002-cli-base-structure');
ThemeLoader.register('hea', 'hea-architecture/user-stories/006-hea-implementation');
ThemeLoader.register("typescript", 'typescript-config/user-stories/004-strict-typescript');