/**
 * SetupManager - Manages project setup and configuration
 * Migrated from standalone setup folder to theme integration
 */

import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';
import { exec } from 'child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface SetupConfig {
  language: string;
  platform: string;
  framework?: string;
  buildSystem: string;
  testFramework?: string;
}

export class SetupManager {
  private configPath: string;
  private templatesPath: string;

  constructor(basePath: string = '.') {
    this.configPath = path.join(basePath, 'children/setup/config');
    this.templatesPath = path.join(basePath, 'children/setup/templates');
  }

  /**
   * Initialize a project with the specified configuration
   */
  async initializeProject(config: SetupConfig): Promise<void> {
    console.log('Initializing project with config:', config);
    
    // Load template based on configuration
    const template = await this.loadTemplate(config);
    
    // Apply template to project
    await this.applyTemplate(template, config);
    
    // Run setup scripts
    await this.runSetupScripts(config);
  }

  /**
   * Load configuration template
   */
  private async loadTemplate(config: SetupConfig): Promise<any> {
    const templatePath = path.join(
      this.templatesPath,
      config.language,
      `${config.platform}.json`
    );
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    
    return JSON.parse(fileAPI.readFileSync(templatePath, 'utf-8'));
  }

  /**
   * Apply template to create project structure
   */
  private async applyTemplate(template: any, config: SetupConfig): Promise<void> {
    // Create project directories
    for (const dir of template.directories || []) {
      await fileAPI.createDirectory(dir);
    }
    
    // Copy template files
    for (const file of template.files || []) {
      const sourcePath = path.join(this.templatesPath, file.source);
      const destPath = file.destination;
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Run setup scripts for the configuration
   */
  private async runSetupScripts(config: SetupConfig): Promise<void> {
    const scriptPath = path.join(this.configPath, `setup_${config.language}.sh`);
    
    if (fs.existsSync(scriptPath)) {
      await execAsync(`bash ${scriptPath}`);
    }
  }

  /**
   * Verify hello world works for the configuration
   */
  async verifyHelloWorld(config: SetupConfig): Promise<boolean> {
    const verifyScript = path.join(
      this.templatesPath,
      'verify_hello_world.sh'
    );
    
    try {
      const { stdout } = await execAsync(`bash ${verifyScript} ${config.language}`);
      return stdout.includes('Hello World');
    } catch (error) {
      console.error('Hello world verification failed:', error);
      return false;
    }
  }
}
