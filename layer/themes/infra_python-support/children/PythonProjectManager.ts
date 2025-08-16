import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import * as toml from 'toml';
import { UVEnvironmentManager } from './UVEnvironmentManager';
import { execa } from 'execa';

export interface ProjectOptions {
  name: string;
  template: 'cli-app' | 'web-service' | 'library' | 'data-science' | 'basic';
  pythonVersion?: string;
  dependencies?: string[];
  devDependencies?: string[];
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
}

export interface Project {
  name: string;
  path: string;
  template: string;
  pythonVersion: string;
  created: Date;
  config: PyProjectConfig;
}

export interface PyProjectConfig {
  project: {
    name: string;
    version: string;
    description?: string;
    authors?: Array<{ name: string; email?: string }>;
    license?: string;
    readme?: string;
    'requires-python': string;
    dependencies?: string[];
    urls?: { [key: string]: string };
  };
  tool?: {
    uv?: {
      'dev-dependencies'?: string[];
    };
    pytest?: {
      'ini_options'?: {
        testpaths?: string[];
        python_files?: string[];
      };
    };
    ruff?: {
      'line-length'?: number;
      select?: string[];
    };
    black?: {
      'line-length'?: number;
      'target-version'?: string[];
    };
  };
  'build-system'?: {
    requires?: string[];
    'build-backend'?: string;
  };
}

export class PythonProjectManager {
  private projectsDir: string;
  private envManager: UVEnvironmentManager;
  private templatesDir: string;

  constructor(projectsDir: string = "projects", envDir: string = '.venvs') {
    this.projectsDir = path.resolve(projectsDir);
    this.envManager = new UVEnvironmentManager(envDir);
    this.templatesDir = path.join(__dirname, '..', "templates");
    
    // Ensure directories exist
    fs.ensureDirSync(this.projectsDir);
  }

  /**
   * Create a new Python project
   */
  async createProject(options: ProjectOptions): Promise<Project> {
    const projectPath = path.join(this.projectsDir, options.name);
    
    // Check if project already exists
    if (await fs.pathExists(projectPath)) {
      throw new Error(`Project '${options.name}' already exists`);
    }

    console.log(`Creating Python project '${options.name}' with template '${options.template}'...`);
    
    // Create project directory
    await fs.ensureDir(projectPath);
    
    // Create project structure based on template
    await this.createProjectStructure(projectPath, options.template);
    
    // Create pyproject.toml
    const config = this.createPyProjectConfig(options);
    await this.savePyProjectConfig(projectPath, config);
    
    // Create virtual environment
    const pythonVersion = options.pythonVersion || '3.11';
    await this.envManager.createEnvironment(options.name, pythonVersion);
    
    // Install dependencies
    if (options.dependencies && options.dependencies.length > 0) {
      await this.envManager.installPackages(options.name, options.dependencies);
    }
    
    // Install dev dependencies
    if (options.devDependencies && options.devDependencies.length > 0) {
      await this.envManager.installPackages(options.name, options.devDependencies);
    }
    
    // Create additional template-specific files
    await this.createTemplateFiles(projectPath, options);
    
    const project: Project = {
      name: options.name,
      path: projectPath,
      template: options.template,
      pythonVersion,
      created: new Date(),
      config
    };
    
    // Save project metadata
    await this.saveProjectMetadata(project);
    
    return project;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectName: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Deleting project '${projectName}'...`);
    
    // Delete virtual environment
    try {
      await this.envManager.deleteEnvironment(projectName);
    } catch {
      // Environment might not exist
    }
    
    // Delete project directory
    await fs.remove(projectPath);
  }

  /**
   * Build a project
   */
  async buildProject(projectName: string): Promise<{ success: boolean; output: string }> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Building project '${projectName}'...`);
    
    try {
      // Run build command using UV
      const { stdout, stderr } = await execa('uv', [
        'build',
        '--project', projectPath
      ]);
      
      return {
        success: true,
        output: stdout + stderr
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message
      };
    }
  }

  /**
   * Package a project
   */
  async packageProject(projectName: string): Promise<string> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Packaging project '${projectName}'...`);
    
    // Build distributions
    const buildResult = await this.buildProject(projectName);
    
    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.output}`);
    }
    
    // Find generated packages
    const distDir = path.join(projectPath, 'dist');
    if (!await fs.pathExists(distDir)) {
      throw new Error('No dist directory found after build');
    }
    
    const files = await fs.readdir(distDir);
    const wheelFile = files.find(f => f.endsWith('.whl'));
    
    if (!wheelFile) {
      throw new Error('No wheel file generated');
    }
    
    return path.join(distDir, wheelFile);
  }

  /**
   * Run tests for a project
   */
  async runTests(projectName: string): Promise<{ passed: boolean; output: string }> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Running tests for project '${projectName}'...`);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'pytest', [
        projectPath,
        '-v'
      ]);
      
      return {
        passed: true,
        output: result.stdout
      };
    } catch (error: any) {
      return {
        passed: false,
        output: error.stdout || error.message
      };
    }
  }

  /**
   * Format project code
   */
  formatCode(projectName: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Formatting code for project '${projectName}'...`);
    
    // Run black
    await this.envManager.runCommand(projectName, 'black', [projectPath]);
    
    // Run isort for import sorting
    await this.envManager.runCommand(projectName, 'isort', [projectPath]);
  }

  /**
   * Lint project code
   */
  async lintCode(projectName: string): Promise<{ issues: number; output: string }> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Linting code for project '${projectName}'...`);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'ruff', [
        'check',
        projectPath
      ]);
      
      return {
        issues: 0,
        output: result.stdout
      };
    } catch (error: any) {
      // Ruff exits with non-zero if issues found
      const matches = error.stdout?.match(/Found (\d+) error/);
      const issues = matches ? parseInt(matches[1]) : -1;
      
      return {
        issues,
        output: error.stdout || error.message
      };
    }
  }

  /**
   * Type check project code
   */
  async typeCheck(projectName: string): Promise<{ errors: number; output: string }> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project '${projectName}' does not exist`);
    }

    console.log(`Type checking project '${projectName}'...`);
    
    try {
      const result = await this.envManager.runCommand(projectName, 'mypy', [
        projectPath,
        '--ignore-missing-imports'
      ]);
      
      return {
        errors: 0,
        output: result.stdout
      };
    } catch (error: any) {
      // MyPy exits with non-zero if errors found
      const matches = error.stdout?.match(/Found (\d+) error/);
      const errors = matches ? parseInt(matches[1]) : -1;
      
      return {
        errors,
        output: error.stdout || error.message
      };
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Project[]> {
    const projects: Project[] = [];
    
    if (!await fs.pathExists(this.projectsDir)) {
      return projects;
    }

    const entries = await fs.readdir(this.projectsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const metadata = await this.loadProjectMetadata(entry.name);
          projects.push(metadata);
        } catch {
          // Skip directories without metadata
        }
      }
    }

    return projects;
  }

  /**
   * Create project structure based on template
   */
  private async createProjectStructure(projectPath: string, template: string): Promise<void> {
    const structure = this.getTemplateStructure(template);
    
    for (const dir of structure.directories) {
      await fs.ensureDir(path.join(projectPath, dir));
    }
    
    for (const file of structure.files) {
      const filePath = path.join(projectPath, file.path);
      await fileAPI.createFile(filePath, file.content);
    }
  }

  /**
   * Get template structure
   */
  private getTemplateStructure(template: string): { directories: string[]; files: Array<{ path: string; content: string }> } {
    const baseStructure = {
      directories: ['src', { type: FileType.DATA }):
    """Example test."""
    assert 1 + 1 == 2
`
        }
      ]
    };

    // Add template-specific structure
    switch (template) {
      case 'cli-app':
        baseStructure.files.push({
          path: 'src/cli.py',
          content: `"""CLI application entry point."""

import click

@click.command()
@click.option('--name', default='World', help='Name to greet.')
def main(name: str) -> None:
    """Simple CLI application."""
    click.echo(f'Hello, {name}!')

if __name__ == '__main__':
    main()
`
        });
        break;

      case 'web-service':
        baseStructure.directories.push('src/api', 'src/models', 'src/services');
        baseStructure.files.push({
          path: 'src/main.py',
          content: `"""FastAPI application."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Python Web Service")

class HealthResponse(BaseModel):
    status: str
    version: str

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(status="healthy", version="1.0.0")

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to Python Web Service"}
`
        });
        break;

      case 'library':
        baseStructure.files.push({
          path: 'src/core.py',
          content: `"""Core library functionality."""

class LibraryClass:
    """Example library class."""
    
    def __init__(self, name: str) -> None:
        """Initialize library class."""
        self.name = name
    
    def process(self, data: str) -> str:
        """Process data."""
        return f"Processed: {data}"
`
        });
        break;

      case 'data-science':
        baseStructure.directories.push("notebooks", 'data', 'models', 'reports');
        baseStructure.files.push({
          path: 'src/analysis.py',
          content: `"""Data analysis module."""

import pandas as pd
import numpy as np

def load_data(filepath: str) -> pd.DataFrame:
    """Load data from file."""
    return pd.read_csv(filepath)

def analyze_data(df: pd.DataFrame) -> dict:
    """Analyze dataframe."""
    return {
        'shape': df.shape,
        'columns': list(df.columns),
        'dtypes': df.dtypes.to_dict(),
        'summary': df.describe().to_dict()
    }
`
        });
        break;
    }

    return baseStructure;
  }

  /**
   * Create pyproject.toml configuration
   */
  private createPyProjectConfig(options: ProjectOptions): PyProjectConfig {
    const config: PyProjectConfig = {
      project: {
        name: options.name,
        version: '0.1.0',
        description: options.description || `${options.name} - Python project`,
        'requires-python': `>=${options.pythonVersion || '3.11'}`,
        dependencies: options.dependencies || []
      },
      tool: {
        uv: {
          'dev-dependencies': options.devDependencies || [
            'pytest>=7.4.0',
            'pytest-cov>=4.1.0',
            'ruff>=0.1.0',
            'black>=23.7.0',
            'mypy>=1.5.0',
            'isort>=5.12.0'
          ]
        },
        pytest: {
          'ini_options': {
            testpaths: ['tests'],
            python_files: ['test_*.py', '*_test.py']
          }
        },
        ruff: {
          'line-length': 88,
          select: ['E', 'F', 'I', 'N', 'W']
        },
        black: {
          'line-length': 88,
          'target-version': ['py311']
        }
      },
      'build-system': {
        requires: ["hatchling"],
        'build-backend': 'hatchling.build'
      }
    };

    // Add author if provided
    if (options.author) {
      config.project.authors = [{ name: options.author }];
    }

    // Add license if provided
    if (options.license) {
      config.project.license = options.license;
    }

    // Add repository URL if provided
    if (options.repository) {
      config.project.urls = {
        Repository: options.repository
      };
    }

    // Add template-specific dependencies
    switch (options.template) {
      case 'cli-app':
        config.project.dependencies?.push('click>=8.1.0');
        break;
      case 'web-service':
        config.project.dependencies?.push('fastapi>=0.100.0', 'uvicorn[standard]>=0.23.0', 'pydantic>=2.0.0');
        break;
      case 'data-science':
        config.project.dependencies?.push('pandas>=2.0.0', 'numpy>=1.24.0', 'matplotlib>=3.7.0', 'scikit-learn>=1.3.0');
        break;
    }

    return config;
  }

  /**
   * Save pyproject.toml
   */
  private async savePyProjectConfig(projectPath: string, config: PyProjectConfig): Promise<void> {
    const configPath = path.join(projectPath, 'pyproject.toml');
    
    // Convert to TOML format manually (since toml library only parses, doesn't stringify)
    let content = '[project]\n';
    content += `name = "${config.project.name}"\n`;
    content += `version = "${config.project.version}"\n`;
    if (config.project.description) {
      content += `description = "${config.project.description}"\n`;
    }
    if (config.project.authors) {
      content += 'authors = [\n';
      for (const author of config.project.authors) {
        content += `    {name = "${author.name}"`;
        if (author.email) {
          content += `, email = "${author.email}"`;
        }
        content += '},\n';
      }
      content += ']\n';
    }
    if (config.project.license) {
      content += `license = "${config.project.license}"\n`;
    }
    content += `requires-python = "${config.project['requires-python']}"\n`;
    
    if (config.project.dependencies && config.project.dependencies.length > 0) {
      content += 'dependencies = [\n';
      for (const dep of config.project.dependencies) {
        content += `    "${dep}",\n`;
      }
      content += ']\n';
    }

    if (config.project.urls) {
      content += '\n[project.urls]\n';
      for (const [key, value] of Object.entries(config.project.urls)) {
        content += `${key} = "${value}"\n`;
      }
    }

    if (config.tool?.uv?.['dev-dependencies']) {
      content += '\n[tool.uv]\n';
      content += 'dev-dependencies = [\n';
      for (const dep of config.tool.uv['dev-dependencies']) {
        content += `    "${dep}",\n`;
      }
      content += ']\n';
    }

    if (config.tool?.pytest) {
      content += '\n[tool.pytest.ini_options]\n';
      if (config.tool.pytest['ini_options']?.testpaths) {
        content += 'testpaths = ["tests"]\n';
      }
      if (config.tool.pytest['ini_options']?.python_files) {
        content += 'python_files = ["test_*.py", "*_test.py"]\n';
      }
    }

    if (config.tool?.ruff) {
      content += '\n[tool.ruff]\n';
      content += `line-length = ${config.tool.ruff['line-length']}\n`;
      if (config.tool.ruff.select) {
        content += `select = [${config.tool.ruff.select.map(s => `"${s}"`).join(', ')}]\n`;
      }
    }

    if (config.tool?.black) {
      content += '\n[tool.black]\n';
      content += `line-length = ${config.tool.black['line-length']}\n`;
      if (config.tool.black['target-version']) {
        content += `target-version = [${config.tool.black['target-version'].map(v => `"${v}"`).join(', ')}]\n`;
      }
    }

    if (config['build-system']) {
      content += '\n[build-system]\n';
      content += `requires = [${config['build-system'].requires?.map(r => `"${r}"`).join(', ')}]\n`;
      content += `build-backend = "${config['build-system']['build-backend']}"\n`;
    }

    await fileAPI.createFile(configPath, content);
  }

  /**
   * Create template-specific files
   */
  private async createTemplateFiles(projectPath: string, { type: FileType.TEMPORARY }): Promise<void> {
    // Add any additional template-specific files here
    switch (options.template) {
      case 'web-service':
        // Create Dockerfile
        const dockerfile = `FROM python:${options.pythonVersion || '3.11'}-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install uv && uv pip install .

COPY src/ ./src/

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
        await fileAPI.createFile(path.join(projectPath, "Dockerfile"), { type: FileType.TEMPORARY });
        break;

      case 'cli-app':
        // Create setup script
        const setupScript = `#!/usr/bin/env python
"""Setup script for CLI application."""

from setuptools import setup, find_packages

setup(
    name="${options.name}",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    entry_points={
        "console_scripts": [
            "${options.name}=${options.name}.cli:main",
        ],
    },
)
`;
        await fileAPI.createFile(path.join(projectPath, 'setup.py'), { type: FileType.TEMPORARY });
        break;
    }
  }

  /**
   * Save project metadata
   */
  private async saveProjectMetadata(project: Project): Promise<void> {
    const metadataPath = path.join(project.path, '.project-metadata.json');
    await fs.writeJson(metadataPath, project, { spaces: 2 });
  }

  /**
   * Load project metadata
   */
  private async loadProjectMetadata(projectName: string): Promise<Project> {
    const projectPath = path.join(this.projectsDir, projectName);
    const metadataPath = path.join(projectPath, '.project-metadata.json');
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error(`Metadata for project '${projectName}' not found`);
    }

    const metadata = await fs.readJson(metadataPath);
    metadata.created = new Date(metadata.created);
    
    return metadata;
  }
}