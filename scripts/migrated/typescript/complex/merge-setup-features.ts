#!/usr/bin/env bun
/**
 * Migrated from: merge-setup-features.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.720Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Merge setup folder features into the filesystem-mcp theme
  // This consolidates the setup capabilities into the theme structure
  await $`set -e`;
  await $`THEME_DIR="layer/themes/infra_filesystem-mcp"`;
  await $`SETUP_DIR="setup"`;
  await $`BACKUP_DIR="setup_backup_20250816_014001"`;
  console.log("=== Merging Setup Features into Theme ===");
  // Create setup module within the theme
  await mkdir(""$THEME_DIR/children/setup"", { recursive: true });
  // Move configuration templates to theme
  console.log("Moving configuration templates...");
  await copyFile("-r "$SETUP_DIR/templates"", ""$THEME_DIR/children/setup/"");
  await copyFile("-r "$SETUP_DIR/config"", ""$THEME_DIR/children/setup/"");
  // Move hello world tests to theme examples
  console.log("Moving hello world examples...");
  await mkdir(""$THEME_DIR/examples/hello-world"", { recursive: true });
  await copyFile("-r "$SETUP_DIR/hello_world_tests"", ""$THEME_DIR/examples/hello-world/"");
  await copyFile("-r "$SETUP_DIR/hello_demo"", ""$THEME_DIR/examples/hello-world/"");
  // Move docker configurations
  console.log("Moving docker configurations...");
  await mkdir(""$THEME_DIR/docker"", { recursive: true });
  await copyFile("-r "$SETUP_DIR/docker"", ""$THEME_DIR/"");
  // Move QEMU configurations
  console.log("Moving QEMU configurations...");
  await mkdir(""$THEME_DIR/qemu"", { recursive: true });
  await copyFile("-r "$SETUP_DIR/qemu"", ""$THEME_DIR/"");
  // Move test scripts to theme scripts
  console.log("Moving test scripts...");
  await copyFile(""$SETUP_DIR"/*.sh "$THEME_DIR/scripts/" 2>/dev/null ||", "true");
  // Move documentation
  console.log("Moving documentation...");
  await copyFile(""$SETUP_DIR"/*.md "$THEME_DIR/docs/" 2>/dev/null ||", "true");
  // Create a setup wrapper module
  await $`cat > "$THEME_DIR/children/setup/SetupManager.ts" << 'EOF'`;
  await $`/**`;
  await $`* SetupManager - Manages project setup and configuration`;
  await $`* Migrated from standalone setup folder to theme integration`;
  await $`*/`;
  await $`import * as fs from 'fs';`;
  await $`import * as path from 'path';`;
  await $`import { exec } from 'child_process';`;
  await $`import { promisify } from 'util';`;
  await $`const execAsync = promisify(exec);`;
  await $`export interface SetupConfig {`;
  await $`language: string;`;
  await $`platform: string;`;
  await $`framework?: string;`;
  await $`buildSystem: string;`;
  await $`testFramework?: string;`;
  await $`}`;
  await $`export class SetupManager {`;
  await $`private configPath: string;`;
  await $`private templatesPath: string;`;
  await $`constructor(basePath: string = '.') {`;
  await $`this.configPath = path.join(basePath, 'children/setup/config');`;
  await $`this.templatesPath = path.join(basePath, 'children/setup/templates');`;
  await $`}`;
  await $`/**`;
  await $`* Initialize a project with the specified configuration`;
  await $`*/`;
  await $`async initializeProject(config: SetupConfig): Promise<void> {`;
  await $`console.log('Initializing project with config:', config);`;
  // Load template based on configuration
  await $`const template = await this.loadTemplate(config);`;
  // Apply template to project
  await $`await this.applyTemplate(template, config);`;
  // Run setup scripts
  await $`await this.runSetupScripts(config);`;
  await $`}`;
  await $`/**`;
  await $`* Load configuration template`;
  await $`*/`;
  await $`private async loadTemplate(config: SetupConfig): Promise<any> {`;
  await $`const templatePath = path.join(`;
  await $`this.templatesPath,`;
  await $`config.language,`;
  await $``${config.platform}.json``;
  await $`);`;
  await $`if (!fs.existsSync(templatePath)) {`;
  await $`throw new Error(`Template not found: ${templatePath}`);`;
  await $`}`;
  await $`return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));`;
  await $`}`;
  await $`/**`;
  await $`* Apply template to create project structure`;
  await $`*/`;
  await $`private async applyTemplate(template: any, config: SetupConfig): Promise<void> {`;
  // Create project directories
  await $`for (const dir of template.directories || []) {`;
  await $`fs.mkdirSync(dir, { recursive: true });`;
  await $`}`;
  // Copy template files
  await $`for (const file of template.files || []) {`;
  await $`const sourcePath = path.join(this.templatesPath, file.source);`;
  await $`const destPath = file.destination;`;
  await $`if (fs.existsSync(sourcePath)) {`;
  await $`fs.copyFileSync(sourcePath, destPath);`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`/**`;
  await $`* Run setup scripts for the configuration`;
  await $`*/`;
  await $`private async runSetupScripts(config: SetupConfig): Promise<void> {`;
  await $`const scriptPath = path.join(this.configPath, `setup_${config.language}.sh`);`;
  await $`if (fs.existsSync(scriptPath)) {`;
  await $`await execAsync(`bash ${scriptPath}`);`;
  await $`}`;
  await $`}`;
  await $`/**`;
  await $`* Verify hello world works for the configuration`;
  await $`*/`;
  await $`async verifyHelloWorld(config: SetupConfig): Promise<boolean> {`;
  await $`const verifyScript = path.join(`;
  await $`this.templatesPath,`;
  await $`'verify_hello_world.sh'`;
  await $`);`;
  await $`try {`;
  await $`const { stdout } = await execAsync(`bash ${verifyScript} ${config.language}`);`;
  await $`return stdout.includes('Hello World');`;
  await $`} catch (error) {`;
  await $`console.error('Hello world verification failed:', error);`;
  await $`return false;`;
  await $`}`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Create package.json for the setup module
  await $`cat > "$THEME_DIR/children/setup/package.json" << 'EOF'`;
  await $`{`;
  await $`"name": "@aidev/setup-manager",`;
  await $`"version": "1.0.0",`;
  await $`"description": "Setup and configuration management integrated with filesystem-mcp theme",`;
  await $`"main": "SetupManager.ts",`;
  await $`"scripts": {`;
  await $`"test": "bun test",`;
  await $`"setup": "bash setup.sh",`;
  await $`"verify": "bash verify_hello_world.sh"`;
  await $`},`;
  await $`"dependencies": {`;
  await $`"@types/node": "^20.0.0"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Create integration script
  await $`cat > "$THEME_DIR/children/setup/integrate-setup.sh" << 'EOF'`;
  // Integration script to use setup features from the theme
  await $`set -e`;
  console.log("Setup features are now integrated into the filesystem-mcp theme");
  console.log("Usage:");
  console.log("  - Configuration templates: children/setup/templates/");
  console.log("  - Docker environments: docker/");
  console.log("  - QEMU environments: qemu/");
  console.log("  - Examples: examples/hello-world/");
  console.log("");
  console.log("To use setup features:");
  console.log("  1. Import SetupManager from children/setup/SetupManager.ts");
  console.log("  2. Configure using templates in children/setup/templates/");
  console.log("  3. Run verification with examples/hello-world/");
  await $`EOF`;
  await $`chmod +x "$THEME_DIR/children/setup/integrate-setup.sh"`;
  console.log("=== Setup Features Merged Successfully ===");
  console.log("");
  console.log("Next steps:");
  console.log("1. Test the integrated setup features");
  console.log("2. Remove the redundant setup folders");
  console.log("3. Update references to use the theme-integrated setup");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}