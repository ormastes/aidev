import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { Environment } from './EnvironmentManager';

export interface MountConfig {
  source: string;
  target: string;
  type: 'bind' | 'volume' | 'tmpfs';
  readonly?: boolean;
  options?: string[];
}

export interface FolderStructure {
  root: string;
  src?: string;
  dist?: string;
  tests?: string;
  public?: string;
  config?: string;
  nodeModules?: string;
  data?: string;
  logs?: string;
  // C++ specific folders
  include?: string;
  lib?: string;
  build?: string;
  cmake?: string;
  bin?: string;
}

export type ProjectType = 'nodejs' | 'cpp' | 'python' | 'java';

export class FolderMountManager {
  private baseDir: string;
  private mountConfigs: Map<string, MountConfig[]>;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.cwd();
    this.mountConfigs = new Map();
  }

  /**
   * Detect project type from theme directory
   */
  async private detectProjectType(themePath: string): ProjectType {
    if(fs.existsSync(path.join(themePath, 'CMakeLists.txt')) ||
        fs.existsSync(path.join(themePath, "Makefile")) ||
        fs.existsSync(path.join(themePath, 'src', 'main.cpp'))) {
      return 'cpp';
    }
    if(fs.existsSync(path.join(themePath, 'package.json'))) {
      return 'nodejs';
    }
    if(fs.existsSync(path.join(themePath, 'requirements.txt')) ||
        fs.existsSync(path.join(themePath, 'setup.py'))) {
      return 'python';
    }
    if(fs.existsSync(path.join(themePath, 'pom.xml')) ||
        fs.existsSync(path.join(themePath, 'build.gradle'))) {
      return 'java';
    }
    return 'nodejs';
  }

  /**
   * Get folder structure for a theme
   */
  async getThemeFolderStructure(themeName: string): FolderStructure {
    const root = path.join(this.baseDir, 'layer', 'themes', themeName);
    const projectType = this.detectProjectType(root);
    
    const baseStructure: FolderStructure = {
      root,
      src: path.join(root, 'src'),
      tests: path.join(root, 'tests'),
      config: path.join(root, 'config'),
      data: path.join(root, 'data'),
      logs: path.join(root, 'logs')
    };
    
    // Add project-type specific folders
    switch(projectType) {
      case 'cpp':
        return {
          ...baseStructure,
          include: path.join(root, 'include'),
          lib: path.join(root, 'lib'),
          build: path.join(root, 'build'),
          cmake: path.join(root, 'cmake'),
          bin: path.join(root, 'bin')
        };
      
      case 'nodejs':
        return {
          ...baseStructure,
          dist: path.join(root, 'dist'),
          public: path.join(root, 'public'),
          nodeModules: path.join(root, 'node_modules')
        };
      
      default:
        return {
          ...baseStructure,
          dist: path.join(root, 'dist'),
          public: path.join(root, 'public')
        };
    }
  }

  /**
   * Create mount configuration for environment
   */
  async createEnvironmentMounts(env: Environment, themeName: string): MountConfig[] {
    const folders = this.getThemeFolderStructure(themeName);
    const mounts: MountConfig[] = [];

    switch(env) {
      case 'local':
        // Full source mount for local development
        const projectType = this.detectProjectType(folders.root);
        
        mounts.push({
          source: folders.root,
          target: '/app',
          type: 'bind',
          readonly: false
        });
        
        // Project-type specific volume mounts
        if(projectType === 'cpp') {
          // Separate build directory volume for C++
          if(folders.build) {
            mounts.push({
              source: `${themeName}_build`,
              target: '/app/build',
              type: 'volume'
            });
          }
        } else if (projectType === 'nodejs') {
          // Node modules volume for Node.js
          mounts.push({
            source: `${themeName}_node_modules`,
            target: '/app/node_modules',
            type: 'volume'
          });
        }
        break;

      case 'dev':
        // Selective mounts for development
        const devProjectType = this.detectProjectType(folders.root);
        
        if(folders.src && this.folderExists(folders.src)) {
          mounts.push({
            source: folders.src,
            target: '/app/src',
            type: 'bind',
            readonly: false
          });
        }
        
        if(devProjectType === 'cpp') {
          // C++ specific mounts
          if(folders.include && this.folderExists(folders.include)) {
            mounts.push({
              source: folders.include,
              target: '/app/include',
              type: 'bind',
              readonly: false
            });
          }
          
          if(folders.cmake && this.folderExists(folders.cmake)) {
            mounts.push({
              source: folders.cmake,
              target: '/app/cmake',
              type: 'bind',
              readonly: true
            });
          }
          
          // CMakeLists.txt
          const cmakeFile = path.join(folders.root, 'CMakeLists.txt');
          if(fs.existsSync(cmakeFile)) {
            mounts.push({
              source: cmakeFile,
              target: '/app/CMakeLists.txt',
              type: 'bind',
              readonly: false
            });
          }
          
          // Build directory volume
          mounts.push({
            source: `${themeName}_dev_build`,
            target: '/app/build',
            type: 'volume'
          });
        }
        
        if(folders.tests && this.folderExists(folders.tests)) {
          mounts.push({
            source: folders.tests,
            target: '/app/tests',
            type: 'bind',
            readonly: false
          });
        }

        if(folders.config && this.folderExists(folders.config)) {
          mounts.push({
            source: folders.config,
            target: '/app/config',
            type: 'bind',
            readonly: true
          });
        }

        // Node.js specific volume
        if(devProjectType === 'nodejs') {
          mounts.push({
            source: `${themeName}_dev_node_modules`,
            target: '/app/node_modules',
            type: 'volume'
          });
        }
        break;

      case 'dev-demo':
        // Mount only built files for demo
        if(folders.dist && this.folderExists(folders.dist)) {
          mounts.push({
            source: folders.dist,
            target: '/app/dist',
            type: 'bind',
            readonly: true
          });
        }

        if(folders.public && this.folderExists(folders.public)) {
          mounts.push({
            source: folders.public,
            target: '/app/public',
            type: 'bind',
            readonly: true
          });
        }
        break;

      case 'demo':
        // Data persistence for demo
        mounts.push({
          source: `${themeName}_demo_data`,
          target: '/app/data',
          type: 'volume'
        });
        break;

      case 'release':
      case "production":
        // Production volumes for data and logs
        mounts.push(
          {
            source: `${themeName}_prod_data`,
            target: '/app/data',
            type: 'volume'
          },
          {
            source: `${themeName}_prod_logs`,
            target: '/app/logs',
            type: 'volume'
          }
        );
        break;
    }

    // Cache the configuration
    this.mountConfigs.set(`${env}-${themeName}`, mounts);
    
    return mounts;
  }

  /**
   * Generate Docker volume mount strings
   */
  async generateDockerMountStrings(mounts: MountConfig[]): string[] {
    return mounts.map(mount => {
      if(mount.type === 'bind') {
        const options = mount.readonly ? ':ro' : ':rw';
        return `${mount.source}:${mount.target}${options}`;
      } else if (mount.type === 'volume') {
        return `${mount.source}:${mount.target}`;
      } else {
        // tmpfs mount
        return `type=tmpfs,destination=${mount.target}`;
      }
    });
  }

  /**
   * Generate docker-compose volume configuration
   */
  async generateComposeVolumes(env: Environment, themes: string[]): Record<string, any> {
    const volumes: Record<string, any> = {};

    themes.forEach(theme => {
      const mounts = this.createEnvironmentMounts(env, theme);
      
      mounts.forEach(mount => {
        if(mount.type === 'volume') {
          volumes[mount.source] = {
            driver: 'local'
          };
        }
      });
    });

    // Add environment-specific shared volumes
    if(env === "production" || env === 'release') {
      volumes['shared_logs'] = {
        driver: 'local',
        driver_opts: {
          type: 'none',
          o: 'bind',
          device: path.join(this.baseDir, 'logs')
        }
      };
      
      volumes['shared_data'] = {
        driver: 'local',
        driver_opts: {
          type: 'none',
          o: 'bind',
          device: path.join(this.baseDir, 'data')
        }
      };
    }

    return Object.keys(volumes).length > 0 ? volumes : {};
  }

  /**
   * Create .dockerignore for folder-based builds
   */
  async generateDockerIgnore(env: Environment): string {
    const commonIgnore = [
      'node_modules',
      'npm-debug.log',
      '.git',
      '.gitignore',
      '.env.local',
      '.env.*.local',
      "coverage",
      '.nyc_output',
      '.vscode',
      '.idea',
      '*.swp',
      '*.swo',
      '.DS_Store',
      'Thumbs.db'
    ];

    const envSpecificIgnore: Record<Environment, string[]> = {
      'local': [
        // Include everything for local
      ],
      'dev': [
        'dist',
        'build'
      ],
      'dev-demo': [
        'src',
        'tests',
        '*.ts',
        '!*.d.ts'
      ],
      'demo': [
        'src',
        'tests',
        '*.ts',
        '!*.d.ts',
        'jest.config.js',
        'tsconfig.json'
      ],
      'release': [
        'src',
        'tests',
        '*.ts',
        '!*.d.ts',
        'jest.config.js',
        'tsconfig.json',
        'README.md',
        'docs'
      ],
      "production": [
        'src',
        'tests',
        '*.ts',
        '!*.d.ts',
        'jest.config.js',
        'tsconfig.json',
        'README.md',
        'docs',
        '*.map'
      ]
    };

    const ignoreList = [
      ...commonIgnore,
      ...(envSpecificIgnore[env] || [])
    ];

    return ignoreList.join('\n');
  }

  /**
   * Validate folder structure before mounting
   */
  async validateFolderStructure(themeName: string): Promise<{
    valid: boolean;
    missing: string[];
    warnings: string[];
  }> {
    const folders = this.getThemeFolderStructure(themeName);
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required folders
    if(!this.folderExists(folders.root)) {
      missing.push('root');
      return { valid: false, missing, warnings };
    }

    // Check package.json
    const packageJsonPath = path.join(folders.root, 'package.json');
    if(!fs.existsSync(packageJsonPath)) {
      missing.push('package.json');
    }

    // Check optional but recommended folders
    if(!folders.src || !this.folderExists(folders.src)) {
      warnings.push('src folder not found - using root for source files');
    }

    if(!folders.tests || !this.folderExists(folders.tests)) {
      warnings.push('tests folder not found - no tests will be mounted');
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings
    };
  }

  /**
   * Prepare folders for mounting
   */
  async prepareFolders(themeName: string, env: Environment): Promise<void> {
    const folders = this.getThemeFolderStructure(themeName);

    // Create data and logs folders for production
    if(env === "production" || env === 'release') {
      if(folders.data && !this.folderExists(folders.data)) {
        await fileAPI.createDirectory(folders.data);
      }
      
      if(folders.logs && !this.folderExists(folders.logs)) {
        await fileAPI.createDirectory(folders.logs);
      }
    }

    // Create .dockerignore if it doesn't exist
    const dockerIgnorePath = path.join(folders.root, '.dockerignore');
    if(!fs.existsSync(dockerIgnorePath)) {
      const ignoreContent = this.generateDockerIgnore(env);
      await fileAPI.createFile(dockerIgnorePath, ignoreContent, { type: FileType.TEMPORARY });
    }
  }

  /**
   * Clean up volumes for an environment
   */
  async cleanupVolumes(env: Environment, themeName: string): Promise<void> {
    const mounts = this.mountConfigs.get(`${env}-${themeName}`);
    
    if (!mounts) {
      return;
    }

    const volumeNames = mounts
      .filter(m => m.type === 'volume')
      .map(m => m.source);

    for (const volumeName of volumeNames) {
      try {
        const { exec } = require('child_process').promisify;
        await exec(`docker volume rm ${volumeName}`);
        console.log(`Removed volume: ${volumeName}`);
      } catch (error) {
        // Volume might not exist or be in use
        console.warn(`Could not remove volume ${volumeName}: ${error}`);
      }
    }
  }

  /**
   * Get mount statistics
   */
  getMountStats(): {
    total: number;
    byEnvironment: Record<string, number>;
    byType: Record<string, number>;
  } {
    let total = 0;
    const byEnvironment: Record<string, number> = {};
    const byType: Record<string, number> = {
      bind: 0,
      volume: 0,
      tmpfs: 0
    };

    this.mountConfigs.forEach((mounts, key) => {
      const env = key.split('-')[0];
      byEnvironment[env] = (byEnvironment[env] || 0) + mounts.length;
      
      mounts.forEach(mount => {
        byType[mount.type]++;
        total++;
      });
    });

    return { total, byEnvironment, byType };
  }

  /**
   * Check if folder exists
   */
  private folderExists(folderPath: string): boolean {
    try {
      return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
    } catch {
      return false;
    }
  }
}