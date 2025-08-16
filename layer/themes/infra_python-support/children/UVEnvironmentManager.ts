import { execa, ExecaReturnValue } from 'execa';
import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import * as semver from 'semver';

export interface Environment {
  name: string;
  pythonVersion: string;
  path: string;
  packages: string[];
  created: Date;
  lastModified: Date;
}

export interface UVConfig {
  pythonPreference: 'only-managed' | 'managed' | 'system' | 'only-system';
  cacheDir: string;
  systemPython: boolean;
  indexUrl?: string;
  extraIndexUrl?: string[];
}

export class UVEnvironmentManager {
  private baseDir: string;
  private config: UVConfig;

  constructor(baseDir: string = '.venvs', config?: Partial<UVConfig>) {
    this.baseDir = path.resolve(baseDir);
    this.config = {
      pythonPreference: 'only-managed',
      cacheDir: '.uv-cache',
      systemPython: false,
      ...config
    };
    
    // Ensure base directory exists
    fs.ensureDirSync(this.baseDir);
  }

  /**
   * Check if UV is installed
   */
  async isUVInstalled(): Promise<boolean> {
    try {
      await execa('uv', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install UV if not already installed
   */
  async installUV(): Promise<void> {
    if (await this.isUVInstalled()) {
      console.log('UV is already installed');
      return;
    }

    console.log('Installing UV...');
    const installScript = `curl -LsSf https://astral.sh/uv/install.sh | sh`;
    await execa('bash', ['-c', installScript], { stdio: 'inherit' });
    
    // Verify installation
    if (!await this.isUVInstalled()) {
      throw new Error('UV installation failed');
    }
  }

  /**
   * Create a new Python virtual environment
   */
  async createEnvironment(projectName: string, pythonVersion: string = '3.11'): Promise<Environment> {
    const envPath = path.join(this.baseDir, projectName);
    
    // Check if environment already exists
    if (await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' already exists`);
    }

    // Validate Python version
    if (!semver.valid(semver.coerce(pythonVersion))) {
      throw new Error(`Invalid Python version: ${pythonVersion}`);
    }

    console.log(`Creating environment '${projectName}' with Python ${pythonVersion}...`);
    
    // Create virtual environment with UV
    await execa('uv', [
      'venv',
      envPath,
      '--python', pythonVersion
    ]);

    // Create environment metadata
    const metadata: Environment = {
      name: projectName,
      pythonVersion,
      path: envPath,
      packages: [],
      created: new Date(),
      lastModified: new Date()
    };

    await this.saveMetadata(projectName, metadata);
    
    return metadata;
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(projectName: string): Promise<void> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    console.log(`Deleting environment '${projectName}'...`);
    await fs.remove(envPath);
  }

  /**
   * Activate an environment (returns activation command)
   */
  getActivationCommand(projectName: string): string {
    const envPath = path.join(this.baseDir, projectName);
    const activateScript = process.platform === 'win32' 
      ? path.join(envPath, 'Scripts', "activate")
      : path.join(envPath, 'bin', "activate");
    
    return process.platform === 'win32'
      ? `${activateScript}`
      : `source ${activateScript}`;
  }

  /**
   * Install packages in an environment
   */
  async installPackages(projectName: string, packages: string[]): Promise<void> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    console.log(`Installing packages in '${projectName}': ${packages.join(', ')}`);
    
    // Use UV pip to install packages
    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python')
      : path.join(envPath, 'bin', 'python');

    await execa('uv', [
      'pip',
      'install',
      '--python', pythonPath,
      ...packages
    ]);

    // Update metadata
    const metadata = await this.loadMetadata(projectName);
    metadata.packages.push(...packages);
    metadata.lastModified = new Date();
    await this.saveMetadata(projectName, metadata);
  }

  /**
   * Update all packages in an environment
   */
  async updatePackages(projectName: string): Promise<void> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    console.log(`Updating packages in '${projectName}'...`);
    
    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python')
      : path.join(envPath, 'bin', 'python');

    // First, list outdated packages
    const { stdout } = await execa('uv', [
      'pip',
      'list',
      '--python', pythonPath,
      '--outdated'
    ]);

    console.log('Outdated packages:', stdout);

    // Update all packages
    await execa('uv', [
      'pip',
      'install',
      '--python', pythonPath,
      '--upgrade',
      '--all'
    ]);

    // Update metadata
    const metadata = await this.loadMetadata(projectName);
    metadata.lastModified = new Date();
    await this.saveMetadata(projectName, metadata);
  }

  /**
   * Lock dependencies for an environment
   */
  async lockDependencies(projectName: string): Promise<string> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    console.log(`Locking dependencies for '${projectName}'...`);
    
    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python')
      : path.join(envPath, 'bin', 'python');

    // Generate requirements.txt
    const { stdout } = await execa('uv', [
      'pip',
      'freeze',
      '--python', pythonPath
    ]);

    const requirementsPath = path.join(envPath, 'requirements.lock');
    await fileAPI.createFile(requirementsPath, stdout);
    
    console.log(`Dependencies locked to ${requirementsPath}`);
    return requirementsPath;
  }

  /**
   * Install from requirements file
   */
  async installFromRequirements(projectName: string, { type: FileType.TEMPORARY }): Promise<void> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    if (!await fs.pathExists(requirementsPath)) {
      throw new Error(`Requirements file '${requirementsPath}' does not exist`);
    }

    console.log(`Installing from requirements file: ${requirementsPath}`);
    
    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python')
      : path.join(envPath, 'bin', 'python');

    await execa('uv', [
      'pip',
      'install',
      '--python', pythonPath,
      '-r', requirementsPath
    ]);

    // Update metadata
    const metadata = await this.loadMetadata(projectName);
    metadata.lastModified = new Date();
    await this.saveMetadata(projectName, metadata);
  }

  /**
   * List all environments
   */
  async listEnvironments(): Promise<Environment[]> {
    const environments: Environment[] = [];
    
    if (!await fs.pathExists(this.baseDir)) {
      return environments;
    }

    const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const metadata = await this.loadMetadata(entry.name);
          environments.push(metadata);
        } catch {
          // Skip directories without metadata
        }
      }
    }

    return environments;
  }

  /**
   * Get environment info
   */
  async getEnvironmentInfo(projectName: string): Promise<Environment> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    return await this.loadMetadata(projectName);
  }

  /**
   * Run Python script in environment
   */
  async runPythonScript(projectName: string, scriptPath: string, args: string[] = []): Promise<ExecaReturnValue> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python')
      : path.join(envPath, 'bin', 'python');

    return await execa(pythonPath, [scriptPath, ...args]);
  }

  /**
   * Run command in environment
   */
  async runCommand(projectName: string, command: string, args: string[] = []): Promise<ExecaReturnValue> {
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      throw new Error(`Environment '${projectName}' does not exist`);
    }

    const binPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts')
      : path.join(envPath, 'bin');

    const commandPath = path.join(binPath, command);
    
    if (!await fs.pathExists(commandPath)) {
      throw new Error(`Command '${command}' not found in environment`);
    }

    return await execa(commandPath, args);
  }

  /**
   * Check environment health
   */
  async checkHealth(projectName: string): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const envPath = path.join(this.baseDir, projectName);
    
    if (!await fs.pathExists(envPath)) {
      return { healthy: false, issues: ['Environment does not exist'] };
    }

    // Check Python executable
    const pythonPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'python')
      : path.join(envPath, 'bin', 'python');

    if (!await fs.pathExists(pythonPath)) {
      issues.push('Python executable not found');
    }

    // Check pip
    const pipPath = process.platform === 'win32'
      ? path.join(envPath, 'Scripts', 'pip')
      : path.join(envPath, 'bin', 'pip');

    if (!await fs.pathExists(pipPath)) {
      issues.push('pip not found');
    }

    // Try to run Python
    try {
      await execa(pythonPath, ['--version']);
    } catch (error) {
      issues.push(`Python not working: ${error}`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Save environment metadata
   */
  private async saveMetadata(projectName: string, metadata: Environment): Promise<void> {
    const metadataPath = path.join(this.baseDir, projectName, '.env-metadata.json');
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  }

  /**
   * Load environment metadata
   */
  private async loadMetadata(projectName: string): Promise<Environment> {
    const metadataPath = path.join(this.baseDir, projectName, '.env-metadata.json');
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error(`Metadata for environment '${projectName}' not found`);
    }

    const metadata = await fs.readJson(metadataPath);
    
    // Convert date strings back to Date objects
    metadata.created = new Date(metadata.created);
    metadata.lastModified = new Date(metadata.lastModified);
    
    return metadata;
  }
}