import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';

/**
 * Test file system helper for creating real files and directories
 * without using mocks
 */
export class TestFileSystem {
  private tempDirs: string[] = [];

  /**
   * Create a temporary directory
   */
  async createTempDir(prefix: string = 'test-'): Promise<string> {
    const tempDir = await fs.mkdtemp(join(os.tmpdir(), prefix));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a file with content
   */
  async createFile(dir: string, filename: string, content: string): Promise<string> {
    const filepath = join(dir, filename);
    const dirPath = join(dir, ...filename.split('/').slice(0, -1));
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.writeFile(filepath, content);
    
    return filepath;
  }

  /**
   * Create a JSON file
   */
  async createJsonFile(dir: string, filename: string, data: any): Promise<string> {
    return this.createFile(dir, filename, JSON.stringify(data, null, 2));
  }

  /**
   * Read a file
   */
  async readFile(filepath: string): Promise<string> {
    return fs.readFile(filepath, 'utf-8');
  }

  /**
   * Read a JSON file
   */
  async readJsonFile(filepath: string): Promise<any> {
    const content = await this.readFile(filepath);
    return JSON.parse(content);
  }

  /**
   * Check if file exists
   */
  async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory structure
   */
  async createDirectoryStructure(baseDir: string, structure: DirectoryStructure): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
      const fullPath = join(baseDir, name);
      
      if (typeof content === 'string') {
        // It's a file
        await this.createFile(baseDir, name, content);
      } else if (content === null) {
        // It's an empty directory
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        // It's a nested directory
        await fs.mkdir(fullPath, { recursive: true });
        await this.createDirectoryStructure(fullPath, content);
      }
    }
  }

  /**
   * Clean up all temporary directories
   */
  async cleanup(): Promise<void> {
    for (const dir of this.tempDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.tempDirs = [];
  }

  /**
   * Simulate file system errors
   */
  async simulateError(type: 'permission' | 'not-found' | 'disk-full'): Promise<Error> {
    switch (type) {
      case 'permission':
        // Create a file and make it read-only
        const tempDir = await this.createTempDir('permission-test-');
        const filepath = join(tempDir, 'readonly.txt');
        await fs.writeFile(filepath, 'test');
        await fs.chmod(filepath, 0o444);
        
        try {
          await fs.writeFile(filepath, 'should fail');
          throw new Error('Expected permission error');
        } catch (error) {
          return error as Error;
        }
        
      case 'not-found':
        try {
          await fs.readFile('/non/existent/path/file.txt');
          throw new Error('Expected not found error');
        } catch (error) {
          return error as Error;
        }
        
      case 'disk-full':
        // Simulate by trying to write a very large file
        // This is platform-dependent and may not actually fail
        return new Error('ENOSPC: no space left on device');
        
      default:
        throw new Error(`Unknown error type: ${type}`);
    }
  }
}

/**
 * Directory structure type for creating nested directories and files
 */
export type DirectoryStructure = {
  [key: string]: string | null | DirectoryStructure;
};

/**
 * Test data factory for common file structures
 */
export class TestDataFactory {
  static createCucumberReport(scenarios: any[]): any {
    return [{
      id: 'test-feature',
      name: 'Test Feature',
      description: 'Test feature description',
      keyword: 'Feature',
      uri: 'test.feature',
      elements: scenarios
    }];
  }

  static createPassingScenario(name: string = 'Test Scenario'): any {
    return {
      id: 'test-scenario',
      name,
      description: '',
      keyword: 'Scenario',
      type: 'scenario',
      steps: [
        {
          keyword: 'Given ',
          name: 'a test step',
          result: {
            status: 'In Progress',
            duration: 1000000
          }
        }
      ]
    };
  }

  static createFailingScenario(name: string = 'Failing Scenario', error: string = 'Test error'): any {
    return {
      id: 'failing-scenario',
      name,
      description: '',
      keyword: 'Scenario',
      type: 'scenario',
      steps: [
        {
          keyword: 'When ',
          name: 'something goes wrong',
          result: {
            status: 'failed',
            error_message: error,
            duration: 1000000
          }
        }
      ]
    };
  }

  static createTestConfiguration(overrides: any = {}): any {
    return {
      testSuiteId: 'test-suite',
      featureFiles: ['test.feature'],
      stepDefinitions: ['steps.js'],
      outputDirectory: './test-results',
      timeout: 30000,
      ...overrides
    };
  }
}