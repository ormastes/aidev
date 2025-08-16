import { z } from 'zod';

export type DeploymentType = 'demo' | 'epic' | 'theme' | 'story' | 'release' | 'test';

export const LanguageSchema = z.enum(['typescript', 'javascript', 'python']);
export type Language = z.infer<typeof LanguageSchema>;

export const ReleaseTypeSchema = z.enum(['web-server', 'mcp', 'cli', 'api', 'library']);
export type ReleaseType = z.infer<typeof ReleaseTypeSchema>;

export const ModeSchema = z.enum(['vf', 'md']);
export type Mode = z.infer<typeof ModeSchema>;

export interface BaseSetupOptions {
  appName: string;
  mode: Mode;
  skipDb?: boolean;
}

export interface DemoSetupOptions extends BaseSetupOptions {
  language: Language;
  configFile?: string;
}

export interface ThemeSetupOptions extends BaseSetupOptions {
  themeName: string;
  description?: string;
  epicId?: string;
}

export interface ReleaseSetupOptions extends BaseSetupOptions {
  releaseType: ReleaseType;
  domain?: string;
  dbHost?: string;
  dbPort?: string;
  port?: string;
}

export interface TestSetupOptions extends BaseSetupOptions {
  testFramework?: string;
}

export interface SetupConfig {
  description?: string;
  keywords?: string[];
  author?: string;
  license?: string;
  dependencies?: Record<string, string>;
  features?: string[];
}

export interface AgileSetupOptions extends BaseSetupOptions {
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  priority?: 'high' | 'medium' | 'low';
  storyPoints?: number;
}

export interface EpicSetupOptions extends AgileSetupOptions {
  themes?: string[];
  targetRelease?: string;
}

export interface StorySetupOptions extends AgileSetupOptions {
  epicId?: string;
  themeId?: string;
  tasks?: string[];
}

export interface PortAllocation {
  test: { start: 3100, end: 3199, main: 3100 };
  agile: { start: 3200, end: 3299, main: 3200 };  // For epic/theme/story
  demo: { start: 3300, end: 3399, main: 3300 };
  production: { start: 3400, end: 3499, main: 3456 };
}

export const PORT_ALLOCATIONS: PortAllocation = {
  test: { start: 3100, end: 3199, main: 3100 },
  agile: { start: 3200, end: 3299, main: 3200 },
  demo: { start: 3300, end: 3399, main: 3300 },
  production: { start: 3400, end: 3499, main: 3456 }
};