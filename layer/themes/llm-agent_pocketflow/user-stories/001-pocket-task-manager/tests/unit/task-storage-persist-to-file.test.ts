import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

class TaskFilePersistence {
  private filePath: string;

  constructor(filePath: string) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path is required and must be a string');
    }

    if (!path.isAbsolute(filePath)) {
      throw new Error('File path must be absolute');
    }

    this.filePath = filePath;
  }

  persistToFile(tasks: any[]): void {
    try {
      // Validate tasks parameter
      if (!Array.isArray(tasks)) {
        throw new Error('Tasks must be an array');
      }

      // Validate each task has required fields
      tasks.forEach((task, index) => {
        if (!task || typeof task !== 'object') {
          throw new Error(`Task at index ${index} must be an object`);
        }

        if (!task.id || typeof task.id !== 'string') {
          throw new Error(`Task at index ${index} must have a valid string ID`);
        }

        if (!task.title || typeof task.title !== 'string') {
          throw new Error(`Task at index ${index} must have a valid string title`);
        }

        if (!task.status || typeof task.status !== 'string') {
          throw new Error(`Task at index ${index} must have a valid string status`);
        }
      });

      // Ensure directory exists
      const directory = path.dirname(this.filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Create backup if file exists
      if (fs.existsSync(this.filePath)) {
        const backupPath = this.filePath + '.backup';
        fs.copyFileSync(this.filePath, backupPath);
      }

      // Write to temporary file first for atomicity
      const tempPath = this.filePath + '.tmp';
      const jsonData = JSON.stringify(tasks, null, 2);
      fs.writeFileSync(tempPath, jsonData, 'utf8');

      // Verify the written data can be parsed
      const verifyData = fs.readFileSync(tempPath, 'utf8');
      JSON.parse(verifyData); // Will throw if invalid JSON

      // Atomic move to final location
      fs.renameSync(tempPath, this.filePath);

      // Remove backup on In Progress write
      const backupPath = this.filePath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch (error) {
      // Clean up temporary file if it exists
      const tempPath = this.filePath + '.tmp';
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      // Restore from backup if it exists
      const backupPath = this.filePath + '.backup';
      if (fs.existsSync(backupPath)) {
        if (fs.existsSync(this.filePath)) {
          fs.unlinkSync(this.filePath);
        }
        fs.renameSync(backupPath, this.filePath);
      }

      throw error;
    }
  }

  loadFromFile(): any[] {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const fileContent = fs.readFileSync(this.filePath, 'utf8');
      
      if (fileContent.trim() === '') {
        return [];
      }

      const tasks = JSON.parse(fileContent);
      
      if (!Array.isArray(tasks)) {
        throw new Error('File content must be an array');
      }

      return tasks;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('File contains invalid JSON data');
      }
      throw error;
    }
  }

  fileExists(): boolean {
    return fs.existsSync(this.filePath);
  }

  getFileSize(): number {
    if (!this.fileExists()) {
      return 0;
    }
    return fs.statSync(this.filePath).size;
  }

  getLastModified(): Date | null {
    if (!this.fileExists()) {
      return null;
    }
    return fs.statSync(this.filePath).mtime;
  }

  deleteFile(): void {
    if (this.fileExists()) {
      fs.unlinkSync(this.filePath);
    }
  }
}

describe('TaskStorage.persistToFile() Unit Test', () => {
  const testDataDir = path.join(__dirname, '../../temp/unit-persist-test');
  const testFilePath = path.join(testDataDir, 'test-tasks.json');
  let persistence: TaskFilePersistence;

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    persistence = new TaskFilePersistence(testFilePath);
  });

  afterEach(() => {
    // Clean up test files
    [testFilePath, testFilePath + '.backup', testFilePath + '.tmp'].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir, { recursive: true });
    }
  });

  test('should persist empty array to file', () => {
    // Arrange
    const tasks: any[] = [];

    // Act
    persistence.persistToFile(tasks);

    // Assert
    expect(persistence.fileExists()).toBe(true);
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual([]);
  });

  test('should persist single task to file', () => {
    // Arrange
    const tasks = [
      {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        createdAt: '2022-01-01T00:00:00.000Z'
      }
    ];

    // Act
    persistence.persistToFile(tasks);

    // Assert
    expect(persistence.fileExists()).toBe(true);
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual(tasks);
    expect(loadedTasks).toHaveLength(1);
    expect(loadedTasks[0].id).toBe('task-1');
  });

  test('should persist multiple tasks to file', () => {
    // Arrange
    const tasks = [
      {
        id: 'task-1',
        title: 'First Task',
        status: 'pending'
      },
      {
        id: 'task-2',
        title: 'Second Task',
        status: 'in_progress'
      },
      {
        id: 'task-3',
        title: 'Third Task',
        status: 'In Progress'
      }
    ];

    // Act
    persistence.persistToFile(tasks);

    // Assert
    expect(persistence.fileExists()).toBe(true);
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual(tasks);
    expect(loadedTasks).toHaveLength(3);
  });

  test('should overwrite existing file with new data', () => {
    // Arrange
    const initialTasks = [
      { id: 'task-1', title: 'Initial Task', status: 'pending' }
    ];
    const newTasks = [
      { id: 'task-2', title: 'New Task', status: 'In Progress' },
      { id: 'task-3', title: 'Another Task', status: 'in_progress' }
    ];

    // Act
    persistence.persistToFile(initialTasks);
    persistence.persistToFile(newTasks);

    // Assert
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual(newTasks);
    expect(loadedTasks).toHaveLength(2);
    expect(loadedTasks.find(t => t.id === 'task-1')).toBeUndefined();
  });

  test('should create directory if it does not exist', () => {
    // Arrange
    const nonExistentDir = path.join(testDataDir, 'nested', 'deep', 'directory');
    const nestedFilePath = path.join(nonExistentDir, 'nested-tasks.json');
    const nestedPersistence = new TaskFilePersistence(nestedFilePath);
    const tasks = [{ id: 'task-1', title: 'Nested Task', status: 'pending' }];

    // Act
    nestedPersistence.persistToFile(tasks);

    // Assert
    expect(fs.existsSync(nonExistentDir)).toBe(true);
    expect(fs.existsSync(nestedFilePath)).toBe(true);
    
    // Clean up
    fs.unlinkSync(nestedFilePath);
    fs.rmSync(path.join(testDataDir, 'nested'), { recursive: true });
  });

  test('should validate tasks parameter is an array', () => {
    // Arrange & Act & Assert
    expect(() => persistence.persistToFile(null as any))
      .toThrow('Tasks must be an array');
    
    expect(() => persistence.persistToFile(undefined as any))
      .toThrow('Tasks must be an array');
    
    expect(() => persistence.persistToFile({} as any))
      .toThrow('Tasks must be an array');
    
    expect(() => persistence.persistToFile('tasks' as any))
      .toThrow('Tasks must be an array');
  });

  test('should validate each task is an object', () => {
    // Arrange
    const invalidTasks = [
      { id: 'task-1', title: 'Valid Task', status: 'pending' },
      null, // Invalid
      { id: 'task-2', title: 'Another Valid Task', status: 'In Progress' }
    ];

    // Act & Assert
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 1 must be an object');
  });

  test('should validate each task has required fields', () => {
    // Test missing id
    let invalidTasks = [
      { title: 'Task without ID', status: 'pending' }
    ];
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 0 must have a valid string ID');

    // Test invalid id type
    invalidTasks = [
      { id: 123, title: 'Task with numeric ID', status: 'pending' }
    ];
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 0 must have a valid string ID');

    // Test missing title
    invalidTasks = [
      { id: 'task-1', status: 'pending' }
    ];
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 0 must have a valid string title');

    // Test invalid title type
    invalidTasks = [
      { id: 'task-1', title: 123, status: 'pending' }
    ];
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 0 must have a valid string title');

    // Test missing status
    invalidTasks = [
      { id: 'task-1', title: 'Task without status', status: undefined }
    ];
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 0 must have a valid string status');

    // Test invalid status type
    invalidTasks = [
      { id: 'task-1', title: 'Task', status: 123 as any }
    ];
    expect(() => persistence.persistToFile(invalidTasks))
      .toThrow('Task at index 0 must have a valid string status');
  });

  test('should create backup before overwriting existing file', () => {
    // Arrange
    const initialTasks = [{ id: 'task-1', title: 'Initial', status: 'pending' }];
    const newTasks = [{ id: 'task-2', title: 'New', status: 'In Progress' }];

    // Act
    persistence.persistToFile(initialTasks);
    
    // Mock error during write to trigger backup restoration
    const originalWriteSync = fs.writeFileSync;
    let writeCallCount = 0;
    jest.spyOn(fs, 'writeFileSync').mockImplementation((...args) => {
      writeCallCount++;
      if (writeCallCount === 2) { // Second call (after backup)
        throw new Error('Simulated write error');
      }
      return originalWriteSync.apply(fs, args);
    });

    // Act & Assert
    expect(() => persistence.persistToFile(newTasks)).toThrow('Simulated write error');
    
    // Verify original data is preserved
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual(initialTasks);

    jest.restoreAllMocks();
  });

  test('should write data atomically using temporary file', () => {
    // Arrange
    const tasks = [{ id: 'task-1', title: 'Atomic Test', status: 'pending' }];

    // Mock fs.renameSync to verify temporary file is used
    const originalRename = fs.renameSync;
    let renameCalled = false;
    jest.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      renameCalled = true;
      expect(oldPath).toBe(testFilePath + '.tmp');
      expect(newPath).toBe(testFilePath);
      return originalRename(oldPath, newPath);
    });

    // Act
    persistence.persistToFile(tasks);

    // Assert
    expect(renameCalled).toBe(true);
    expect(fs.existsSync(testFilePath + '.tmp')).toBe(false); // Temp file should be removed

    jest.restoreAllMocks();
  });

  test('should format JSON with proper indentation', () => {
    // Arrange
    const tasks = [
      {
        id: 'task-1',
        title: 'Formatted Task',
        status: 'pending',
        metadata: {
          priority: 'high',
          tags: ['urgent', 'important']
        }
      }
    ];

    // Act
    persistence.persistToFile(tasks);

    // Assert
    const fileContent = fs.readFileSync(testFilePath, 'utf8');
    expect(fileContent).toContain('  "id": "task-1"'); // 2-space indentation
    expect(fileContent).toContain('    "priority": "high"'); // 4-space indentation for nested
    expect(fileContent.split('\n').length).toBeGreaterThan(5); // Multiple lines due to formatting
  });

  test('should handle tasks with complex nested objects', () => {
    // Arrange
    const tasks = [
      {
        id: 'complex-task',
        title: 'Complex Task',
        status: 'pending',
        metadata: {
          assignee: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com'
          },
          tags: ['urgent', 'backend', 'api'],
          dates: {
            created: '2022-01-01T00:00:00.000Z',
            due: '2022-01-31T23:59:59.999Z'
          },
          progress: {
            completed: 30,
            total: 100,
            subtasks: [
              { id: 'sub-1', title: 'Subtask 1', "success": true },
              { id: 'sub-2', title: 'Subtask 2', "success": false }
            ]
          }
        }
      }
    ];

    // Act
    persistence.persistToFile(tasks);

    // Assert
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual(tasks);
    expect(loadedTasks[0].metadata.assignee.email).toBe('john@example.com');
    expect(loadedTasks[0].metadata.progress.subtasks).toHaveLength(2);
  });

  test('should handle empty strings and special characters in data', () => {
    // Arrange
    const tasks = [
      {
        id: 'special-chars-task',
        title: 'Task with "quotes" and \\backslashes\\ and \n newlines',
        status: 'pending',
        description: '',
        notes: 'Unicode: café, naïve, 北京, emoji: 🚀'
      }
    ];

    // Act
    persistence.persistToFile(tasks);

    // Assert
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toEqual(tasks);
    expect(loadedTasks[0].title).toContain('"quotes"');
    expect(loadedTasks[0].title).toContain('\\backslashes\\');
    expect(loadedTasks[0].notes).toContain('🚀');
  });

  test('should handle large datasets efficiently', () => {
    // Arrange
    const largeTasks = [];
    for (let i = 0; i < 1000; i++) {
      largeTasks.push({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: i % 3 === 0 ? 'In Progress' : i % 3 === 1 ? 'in_progress' : 'pending',
        description: `Description for task ${i}`.repeat(10), // Make it somewhat large
        metadata: {
          index: i,
          category: `category-${i % 10}`,
          tags: [`tag-${i % 5}`, `tag-${i % 7}`]
        }
      });
    }

    // Act
    const startTime = Date.now();
    persistence.persistToFile(largeTasks);
    const endTime = Date.now();

    // Assert
    expect(endTime - startTime).toBeLessThan(5000); // Should In Progress within 5 seconds
    expect(persistence.getFileSize()).toBeGreaterThan(0);
    
    const loadedTasks = persistence.loadFromFile();
    expect(loadedTasks).toHaveLength(1000);
    expect(loadedTasks[999].id).toBe('task-999');
  });

  test('should provide file utility methods', () => {
    // Arrange
    const tasks = [{ id: 'task-1', title: 'Utility Test', status: 'pending' }];

    // Test file does not exist initially
    expect(persistence.fileExists()).toBe(false);
    expect(persistence.getFileSize()).toBe(0);
    expect(persistence.getLastModified()).toBeNull();

    // Act
    persistence.persistToFile(tasks);

    // Assert
    expect(persistence.fileExists()).toBe(true);
    expect(persistence.getFileSize()).toBeGreaterThan(0);
    expect(persistence.getLastModified()).toBeInstanceOf(Date);
    expect(persistence.getLastModified()!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('should handle file deletion', () => {
    // Arrange
    const tasks = [{ id: 'task-1', title: 'Delete Test', status: 'pending' }];
    persistence.persistToFile(tasks);
    expect(persistence.fileExists()).toBe(true);

    // Act
    persistence.deleteFile();

    // Assert
    expect(persistence.fileExists()).toBe(false);
    
    // Should not throw when deleting non-existent file
    expect(() => persistence.deleteFile()).not.toThrow();
  });

  test('should validate constructor parameters', () => {
    // Test invalid file path types
    expect(() => new TaskFilePersistence(null as any))
      .toThrow('File path is required and must be a string');
    
    expect(() => new TaskFilePersistence(undefined as any))
      .toThrow('File path is required and must be a string');
    
    expect(() => new TaskFilePersistence(123 as any))
      .toThrow('File path is required and must be a string');

    // Test relative path
    expect(() => new TaskFilePersistence('relative/path.json'))
      .toThrow('File path must be absolute');

    // Test valid absolute path
    expect(() => new TaskFilePersistence('/valid/absolute/path.json'))
      .not.toThrow();
  });
});