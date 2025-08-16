#!/bin/bash

# Merge setup folder features into the filesystem-mcp theme
# This consolidates the setup capabilities into the theme structure

set -e

THEME_DIR="layer/themes/infra_filesystem-mcp"
SETUP_DIR="setup"
BACKUP_DIR="setup_backup_20250816_014001"

echo "=== Merging Setup Features into Theme ==="

# Create setup module within the theme
mkdir -p "$THEME_DIR/children/setup"

# Move configuration templates to theme
echo "Moving configuration templates..."
cp -r "$SETUP_DIR/templates" "$THEME_DIR/children/setup/"
cp -r "$SETUP_DIR/config" "$THEME_DIR/children/setup/"

# Move hello world tests to theme examples
echo "Moving hello world examples..."
mkdir -p "$THEME_DIR/examples/hello-world"
cp -r "$SETUP_DIR/hello_world_tests" "$THEME_DIR/examples/hello-world/"
cp -r "$SETUP_DIR/hello_demo" "$THEME_DIR/examples/hello-world/"

# Move docker configurations
echo "Moving docker configurations..."
mkdir -p "$THEME_DIR/docker"
cp -r "$SETUP_DIR/docker" "$THEME_DIR/"

# Move QEMU configurations
echo "Moving QEMU configurations..."
mkdir -p "$THEME_DIR/qemu"
cp -r "$SETUP_DIR/qemu" "$THEME_DIR/"

# Move test scripts to theme scripts
echo "Moving test scripts..."
cp "$SETUP_DIR"/*.sh "$THEME_DIR/scripts/" 2>/dev/null || true

# Move documentation
echo "Moving documentation..."
cp "$SETUP_DIR"/*.md "$THEME_DIR/docs/" 2>/dev/null || true

# Create a setup wrapper module
cat > "$THEME_DIR/children/setup/SetupManager.ts" << 'EOF'
/**
 * SetupManager - Manages project setup and configuration
 * Migrated from standalone setup folder to theme integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

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
    
    return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  }

  /**
   * Apply template to create project structure
   */
  private async applyTemplate(template: any, config: SetupConfig): Promise<void> {
    // Create project directories
    for (const dir of template.directories || []) {
      fs.mkdirSync(dir, { recursive: true });
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
EOF

# Create package.json for the setup module
cat > "$THEME_DIR/children/setup/package.json" << 'EOF'
{
  "name": "@aidev/setup-manager",
  "version": "1.0.0",
  "description": "Setup and configuration management integrated with filesystem-mcp theme",
  "main": "SetupManager.ts",
  "scripts": {
    "test": "bun test",
    "setup": "bash setup.sh",
    "verify": "bash verify_hello_world.sh"
  },
  "dependencies": {
    "@types/node": "^20.0.0"
  }
}
EOF

# Create integration script
cat > "$THEME_DIR/children/setup/integrate-setup.sh" << 'EOF'
#!/bin/bash

# Integration script to use setup features from the theme

set -e

echo "Setup features are now integrated into the filesystem-mcp theme"
echo "Usage:"
echo "  - Configuration templates: children/setup/templates/"
echo "  - Docker environments: docker/"
echo "  - QEMU environments: qemu/"
echo "  - Examples: examples/hello-world/"
echo ""
echo "To use setup features:"
echo "  1. Import SetupManager from children/setup/SetupManager.ts"
echo "  2. Configure using templates in children/setup/templates/"
echo "  3. Run verification with examples/hello-world/"
EOF

chmod +x "$THEME_DIR/children/setup/integrate-setup.sh"

echo "=== Setup Features Merged Successfully ==="
echo ""
echo "Next steps:"
echo "1. Test the integrated setup features"
echo "2. Remove the redundant setup folders"
echo "3. Update references to use the theme-integrated setup"