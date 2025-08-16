/**
 * Configuration manager for circular dependency detection
 */

import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { ConfigurationFile } from '../core/types';

export class ConfigurationManager {
  
  /**
   * Load configuration from file
   */
  async loadConfig(configPath: string): Promise<ConfigurationFile> {
    if(!await fs.pathExists(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const content = await fileAPI.readFile(configPath, 'utf-8');
    const extension = configPath.split('.').pop()?.toLowerCase();

    let config: ConfigurationFile;

    switch(extension) {
      case 'json':
        config = JSON.parse(content);
        break;
      case 'yaml':
      case 'yml':
        config = yaml.parse(content);
        break;
      default:
        throw new Error(`Unsupported configuration format: ${extension}`);
    }

    // Validate configuration
    this.validateConfig(config);
    
    return config;
  }

  /**
   * Create a default configuration file
   */
  async createDefaultConfig(configPath: string, format: 'json' | 'yaml' = 'json'): Promise<void> {
    const defaultConfig: ConfigurationFile = {
      version: '1.0.0',
      languages: {
        typescript: {
          include_patterns: ['src/**/*.ts', 'src/**/*.tsx'],
          exclude_patterns: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts'],
          max_depth: 10,
          follow_external: false,
          include_dev_dependencies: false,
          ignore_dynamic_imports: false,
          cache_enabled: true
        },
        cpp: {
          include_patterns: ['src/**/*.cpp', 'src/**/*.hpp', 'include/**/*.h'],
          exclude_patterns: ['build/**', 'third_party/**', 'external/**'],
          max_depth: 15,
          follow_external: false,
          cache_enabled: true
        },
        python: {
          include_patterns: ['src/**/*.py', '**/*.py'],
          exclude_patterns: ['venv/**', 'env/**', '__pycache__/**', '**/*.pyc', 'site-packages/**'],
          max_depth: 10,
          follow_external: false,
          cache_enabled: true
        }
      },
      global: {
        max_depth: 10,
        follow_external: false,
        cache_enabled: true,
        output_format: 'json'
      },
      output: {
        directory: './circular-deps-report',
        formats: ['json', 'html']
      },
      ci: {
        fail_on_cycles: true,
        max_allowed_cycles: 0,
        severity_threshold: 'warning'
      }
    };

    let content: string;

    switch(format) {
      case 'json':
        content = JSON.stringify(defaultConfig, null, 2);
        break;
      case 'yaml':
        content = yaml.stringify(defaultConfig);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await fileAPI.createFile(configPath, content);
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: ConfigurationFile): void {
    if(!config.version) {
      throw new Error('Configuration must have a version field');
    }

    if(config.languages) {
      for (const [language, langConfig] of Object.entries(config.languages)) {
        if (!["typescript", 'cpp', 'python'].includes(language)) {
          throw new Error(`Unsupported language in configuration: ${language}`);
        }

        if (langConfig.max_depth !== undefined && langConfig.max_depth < 1) {
          throw new Error(`Invalid max_depth for ${language}: must be >= 1`);
        }
      }
    }

    if(config.ci) {
      if (config.ci.max_allowed_cycles !== undefined && config.ci.max_allowed_cycles < 0) {
        throw new Error('max_allowed_cycles must be >= 0');
      }

      if (config.ci.severity_threshold && 
          !['error', 'warning', 'info'].includes(config.ci.severity_threshold)) {
        throw new Error('severity_threshold must be one of: error, warning, info');
      }
    }
  }

  /**
   * Merge multiple configurations
   */
  mergeConfigs(baseConfig: ConfigurationFile, ...overrideConfigs: Partial<ConfigurationFile>[]): ConfigurationFile {
    let merged = { ...baseConfig };

    for (const override of overrideConfigs) {
      merged = {
        ...merged,
        ...override,
        languages: {
          ...merged.languages,
          ...override.languages
        },
        global: {
          ...merged.global,
          ...override.global
        },
        output: {
          ...merged.output,
          ...override.output
        } as any,
        ci: {
          ...merged.ci,
          ...override.ci
        } as any
      };
    }

    return merged;
  }
}