import { fileAPI } from '../utils/file-api';
/**
 * Plugin System - Extensible architecture for test-as-manual converter
 * Based on _aidev's theme-based modular approach
 */

import { TestSuite, TestScenario } from '../entities/TestScenario';
import { ManualTestSuite } from '../entities/ManualTest';

// Plugin Interfaces
export interface Plugin {
  name: string;
  version: string;
  description: string;
  type: PluginType;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

export enum PluginType {
  PARSER = 'parser',
  FORMATTER = "formatter",
  CAPTURE = 'capture',
  ANALYZER = "analyzer",
  INTEGRATION = "integration"
}

// Parser Plugin
export interface ParserPlugin extends Plugin {
  type: PluginType.PARSER;
  supportedExtensions: string[];
  canParse(file: string, content?: string): boolean;
  parse(content: string, filePath: string): Promise<TestSuite>;
}

// Formatter Plugin
export interface FormatterPlugin extends Plugin {
  type: PluginType.FORMATTER;
  format: string;
  supportedFormats: string[];
  canFormat(format: string): boolean;
  format(suite: ManualTestSuite, options?: any): Promise<string>;
  getFileExtension(): string;
}

// Capture Plugin
export interface CapturePlugin extends Plugin {
  type: PluginType.CAPTURE;
  platform: string;
  supportedPlatforms: string[];
  canCapture(platform: string): boolean;
  capture(options: CaptureOptions): Promise<CaptureResult>;
}

// Analyzer Plugin
export interface AnalyzerPlugin extends Plugin {
  type: PluginType.ANALYZER;
  analyze(suite: TestSuite): Promise<AnalysisResult>;
}

// Integration Plugin
export interface IntegrationPlugin extends Plugin {
  type: PluginType.INTEGRATION;
  service: string;
  connect(config: any): Promise<void>;
  disconnect(): Promise<void>;
  sync(data: any): Promise<void>;
}

// Plugin Manager
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private parserPlugins: Map<string, ParserPlugin> = new Map();
  private formatterPlugins: Map<string, FormatterPlugin> = new Map();
  private capturePlugins: Map<string, CapturePlugin> = new Map();
  private analyzerPlugins: Map<string, AnalyzerPlugin> = new Map();
  private integrationPlugins: Map<string, IntegrationPlugin> = new Map();

  private static instance: PluginManager;

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    await plugin.initialize();
    this.plugins.set(plugin.name, plugin);

    // Add to specific type map
    switch (plugin.type) {
      case PluginType.PARSER:
        this.parserPlugins.set(plugin.name, plugin as ParserPlugin);
        break;
      case PluginType.FORMATTER:
        this.formatterPlugins.set(plugin.name, plugin as FormatterPlugin);
        break;
      case PluginType.CAPTURE:
        this.capturePlugins.set(plugin.name, plugin as CapturePlugin);
        break;
      case PluginType.ANALYZER:
        this.analyzerPlugins.set(plugin.name, plugin as AnalyzerPlugin);
        break;
      case PluginType.INTEGRATION:
        this.integrationPlugins.set(plugin.name, plugin as IntegrationPlugin);
        break;
    }

    console.log(`Plugin ${plugin.name} v${plugin.version} registered successfully`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    await plugin.destroy();
    this.plugins.delete(pluginName);

    // Remove from specific type map
    switch (plugin.type) {
      case PluginType.PARSER:
        this.parserPlugins.delete(pluginName);
        break;
      case PluginType.FORMATTER:
        this.formatterPlugins.delete(pluginName);
        break;
      case PluginType.CAPTURE:
        this.capturePlugins.delete(pluginName);
        break;
      case PluginType.ANALYZER:
        this.analyzerPlugins.delete(pluginName);
        break;
      case PluginType.INTEGRATION:
        this.integrationPlugins.delete(pluginName);
        break;
    }
  }

  /**
   * Get parser for file
   */
  getParser(filePath: string, content?: string): ParserPlugin | null {
    for (const parser of this.parserPlugins.values()) {
      if (parser.canParse(filePath, content)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Get formatter for format
   */
  getFormatter(format: string): FormatterPlugin | null {
    for (const formatter of this.formatterPlugins.values()) {
      if (formatter.canFormat(format)) {
        return formatter;
      }
    }
    return null;
  }

  /**
   * Get capture plugin for platform
   */
  getCapturePlugin(platform: string): CapturePlugin | null {
    for (const capture of this.capturePlugins.values()) {
      if (capture.canCapture(platform)) {
        return capture;
      }
    }
    return null;
  }

  /**
   * Get all analyzers
   */
  getAnalyzers(): AnalyzerPlugin[] {
    return Array.from(this.analyzerPlugins.values());
  }

  /**
   * Get integration by service
   */
  getIntegration(service: string): IntegrationPlugin | null {
    for (const integration of this.integrationPlugins.values()) {
      if (integration.service === service) {
        return integration;
      }
    }
    return null;
  }

  /**
   * List all plugins
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      type: plugin.type
    }));
  }

  /**
   * Load plugins from directory
   */
  async loadPluginsFromDirectory(pluginDir: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    
    if (!fs.existsSync(pluginDir)) {
      console.warn(`Plugin directory ${pluginDir} does not exist`);
      return;
    }

    const entries = fs.readdirSync(pluginDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(pluginDir, entry.name);
        const manifestPath = path.join(pluginPath, 'plugin.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fileAPI.readFileSync(manifestPath, 'utf-8'));
            const mainFile = path.join(pluginPath, manifest.main || 'index.js');
            
            if (fs.existsSync(mainFile)) {
              const pluginModule = await import(mainFile);
              const PluginClass = pluginModule.default || pluginModule[manifest.className];
              
              if (PluginClass) {
                const plugin = new PluginClass();
                await this.register(plugin);
              }
            }
          } catch (error) {
            console.error(`Failed to load plugin from ${pluginPath}:`, error);
          }
        }
      }
    }
  }
}

// Plugin Base Classes
export abstract class BasePlugin implements Plugin {
  abstract name: string;
  abstract version: string;
  abstract description: string;
  abstract type: PluginType;

  async initialize(): Promise<void> {
    // Override in subclass if needed
  }

  async destroy(): Promise<void> {
    // Override in subclass if needed
  }
}

export abstract class BaseParserPlugin extends BasePlugin implements ParserPlugin {
  type = PluginType.PARSER;
  abstract supportedExtensions: string[];

  canParse(file: string, content?: string): boolean {
    return this.supportedExtensions.some(ext => file.endsWith(ext));
  }

  abstract parse(content: string, filePath: string): Promise<TestSuite>;
}

export abstract class BaseFormatterPlugin extends BasePlugin implements FormatterPlugin {
  type = PluginType.FORMATTER;
  abstract format: string;
  abstract supportedFormats: string[];

  canFormat(format: string): boolean {
    return this.supportedFormats.includes(format);
  }

  abstract format(suite: ManualTestSuite, options?: any): Promise<string>;
  abstract getFileExtension(): string;
}

export abstract class BaseCapturePlugin extends BasePlugin implements CapturePlugin {
  type = PluginType.CAPTURE;
  abstract platform: string;
  abstract supportedPlatforms: string[];

  canCapture(platform: string): boolean {
    return this.supportedPlatforms.includes(platform);
  }

  abstract capture(options: CaptureOptions): Promise<CaptureResult>;
}

// Types
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  type: PluginType;
}

export interface CaptureOptions {
  platform: string;
  outputPath: string;
  [key: string]: any;
}

export interface CaptureResult {
  success: boolean;
  filePath?: string;
  error?: string;
  metadata?: any;
}

export interface AnalysisResult {
  insights: string[];
  metrics: Record<string, number>;
  recommendations: string[];
}