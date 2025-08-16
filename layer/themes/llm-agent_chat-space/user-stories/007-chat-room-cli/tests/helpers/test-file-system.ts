import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { os } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

/**
 * Test file system helper for chat-space tests
 * Provides real file system operations for testing without mocks
 */
export class TestFileSystem {
  private tempDirs: string[] = [];
  private mockFiles: Map<string, string> = new Map();

  /**
   * Create a temporary directory
   */
  async createTempDir(prefix: string = 'chat-space-test-'): Promise<string> {
    const tempDir = await fs.mkdtemp(join(os.tmpdir(), prefix));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a test workspace with common AI dev files
   */
  async createTestWorkspace(): Promise<string> {
    const workspaceDir = await this.createTempDir('test-workspace-');
    
    // Create common AI dev files
    await this.createFile(workspaceDir, 'README.md', '# Test Project\n\nThis is a test project.');
    await this.createFile(workspaceDir, 'TASK_QUEUE.md', '# Task Queue\n\n- [ ] Test task 1\n- [ ] Test task 2');
    await this.createFile(workspaceDir, 'FEATURE.md', '# Features\n\n## Feature 1\nDescription');
    await this.createFile(workspaceDir, 'CLAUDE.md', '# Claude Configuration\n\nTest configuration');
    
    // Create directory structure
    await fs.mkdir(join(workspaceDir, 'docs'), { recursive: true });
    await fs.mkdir(join(workspaceDir, 'src'), { recursive: true });
    await fs.mkdir(join(workspaceDir, 'tests'), { recursive: true });
    
    // Add some source files
    await this.createFile(workspaceDir, 'src/index.ts', 'export const hello = () => "Hello, World!";');
    await this.createFile(workspaceDir, 'tests/index.test.ts', 'import { hello } from "../src";\ntest("hello", () => expect(hello()).toBe("Hello, World!"));');
    
    return workspaceDir;
  }

  /**
   * Create a file with content
   */
  async createFile(dir: string, filename: string, content: string): Promise<string> {
    const filepath = join(dir, filename);
    const dirPath = path.dirname(filepath);
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.writeFile(filepath, content);
    
    return filepath;
  }

  /**
   * Create multiple files at once
   */
  async createFiles(dir: string, files: Record<string, string>): Promise<void> {
    for (const [filename, content] of Object.entries(files)) {
      await this.createFile(dir, filename, content);
    }
  }

  /**
   * Read a file
   */
  async readFile(filepath: string): Promise<string> {
    return fs.readFile(filepath, 'utf-8');
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
    this.mockFiles.clear();
  }

  /**
   * Get stats for a file
   */
  async getStats(filepath: string): Promise<any> {
    return fs.stat(filepath);
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  /**
   * Create a directory
   */
  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Remove a file
   */
  async removeFile(filepath: string): Promise<void> {
    await fs.unlink(filepath);
  }

  /**
   * Remove a directory
   */
  async removeDirectory(dirPath: string): Promise<void> {
    await fs.rm(dirPath, { recursive: true, force: true });
  }
}

/**
 * Directory structure type
 */
export type DirectoryStructure = {
  [key: string]: string | null | DirectoryStructure;
};

/**
 * Test data factory for common scenarios
 */
export class TestDataFactory {
  static createMockWorkspaceFiles(): Record<string, string> {
    return {
      'README.md': '# AI Development Platform\n\nAdvanced AI-powered development tools.',
      'TASK_QUEUE.md': '# Task Queue\n\n## High Priority\n- [ ] Implement feature X\n- [ ] Fix bug Y\n\n## Medium Priority\n- [ ] Refactor module Z',
      'FEATURE.md': '# Feature Backlog\n\n## Feature: Chat Integration\nStatus: In Progress\n\n## Feature: Code Generation\nStatus: Planning',
      'CLAUDE.md': '# Claude Configuration\n\n## Rules\n1. Always use Mock Free Test Oriented Development\n2. Follow HEA architecture',
      'docs/ARCHITECTURE.md': '# Architecture Overview\n\n## Layers\n- Domain\n- External\n- Internal',
      'src/index.ts': 'export * from "./main";\nexport * from "./utils";',
      'src/main.ts': 'export function main(): void {\n  console.log("AI Dev Platform");\n}',
      'src/utils.ts': 'export function formatDate(date: Date): string {\n  return date.toISOString();\n}'
    };
  }

  static createLargeFile(sizeInKB: number): string {
    const line = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10);
    const linesNeeded = Math.ceil((sizeInKB * 1024) / line.length);
    return Array(linesNeeded).fill(line).join('\n');
  }

  static createChatContext(roomId: string, messages: number = 10): string {
    const contextMessages = [];
    for (let i = 0; i < messages; i++) {
      contextMessages.push({
        id: `msg-${i}`,
        user: i % 2 === 0 ? 'user' : "assistant",
        content: `Message ${i} in room ${roomId}`,
        timestamp: new Date(Date.now() - (messages - i) * 60000).toISOString()
      });
    }
    return JSON.stringify({
      roomId,
      messages: contextMessages,
      metadata: {
        created: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }
    }, null, 2);
  }
}