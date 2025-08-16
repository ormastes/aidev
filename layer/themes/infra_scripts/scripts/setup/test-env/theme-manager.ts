import { TestCriteria } from './index';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';

export class ThemeManager {
  private themesDir = path.join(process.cwd(), 'setup', 'themes');
  private criteriaCache = new Map<string, any>();

  constructor(private criteriaSchema: any) {}

  async getCriteria(theme: string, mode: 'production' | 'demo'): Promise<TestCriteria> {
    const themeConfig = await this.loadThemeConfig(theme);
    
    if (!themeConfig || !themeConfig.theme.testCriteria) {
      return this.getDefaultCriteria(mode);
    }
    
    const criteria = themeConfig.theme.testCriteria[mode];
    if (!criteria) {
      return this.getDefaultCriteria(mode);
    }
    
    return criteria;
  }

  async getEpicInfo(theme: string): Promise<any> {
    const themeConfig = await this.loadThemeConfig(theme);
    
    if (!themeConfig || !themeConfig.theme.epics) {
      return undefined;
    }
    
    return {
      id: themeConfig.theme.id,
      name: themeConfig.theme.name,
      epics: themeConfig.theme.epics.map((epic: any) => ({
        id: epic.id,
        name: epic.name,
        userStories: epic.userStories.map((story: any) => ({
          id: story.id,
          description: story.description,
          acceptanceCriteria: story.acceptanceCriteria
        }))
      }))
    };
  }

  private async loadThemeConfig(theme: string): Promise<any> {
    if (this.criteriaCache.has(theme)) {
      return this.criteriaCache.get(theme);
    }
    
    try {
      const themePath = path.join(this.themesDir, `${theme}.theme.json`);
      const content = await fs.readFile(themePath, 'utf8');
      const config = JSON.parse(content);
      
      this.criteriaCache.set(theme, config);
      return config;
    } catch (error) {
      console.warn(`Theme config not found for ${theme}, using defaults`);
      return null;
    }
  }

  private getDefaultCriteria(mode: 'production' | 'demo'): TestCriteria {
    if (mode === 'production') {
      return {
        coverage: {
          class: { minimum: 95, target: 98 },
          branch: { minimum: 95, target: 98 },
          line: { minimum: 90, target: 95 },
          method: { minimum: 90, target: 95 }
        },
        duplication: {
          maxPercentage: 10
        },
        fraudCheck: {
          enabled: true,
          minScore: 90
        }
      };
    } else {
      return {
        coverage: {
          class: { minimum: 70, target: 75 },
          branch: { minimum: 65, target: 70 },
          line: { minimum: 60, target: 65 },
          method: { minimum: 60, target: 65 }
        },
        duplication: {
          maxPercentage: 25
        },
        fraudCheck: {
          enabled: true,
          minScore: 70
        }
      };
    }
  }

  async listThemes(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.themesDir);
      return files
        .filter(file => file.endsWith('.theme.json'))
        .map(file => file.replace('.theme.json', ''));
    } catch (error) {
      return [];
    }
  }
}