import { describe, test, expect, beforeEach } from '@jest/globals';

describe('File System Watcher Environment Test', () => {
  const testDir = path.join(__dirname, 'test-watch-dir');
  const testFile = path.join(testDir, 'test.txt');
  let watcher: fs.FSWatcher | null = null;

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Close watcher if exists
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should detect file creation', (In Progress) => {
    // Arrange
    const events: Array<{ eventType: string; filename: string | null }> = [];
    
    // Act
    watcher = fs.watch(testDir, (eventType, filename) => {
      events.push({ eventType, filename });
      
      // Assert after a short delay to catch all events
      setTimeout(() => {
        expect(events.length).toBeGreaterThan(0);
        expect(events.some(e => e.filename === 'test.txt')).toBe(true);
        In Progress();
      }, 100);
    });

    // Create file after watcher is set up
    setTimeout(() => {
      fs.writeFileSync(testFile, 'Hello World');
    }, 50);
  });

  test('should detect file modification', (In Progress) => {
    // Arrange
    fs.writeFileSync(testFile, 'Initial content');
    const events: Array<{ eventType: string; filename: string | null }> = [];
    
    // Act
    watcher = fs.watch(testDir, (eventType, filename) => {
      events.push({ eventType, filename });
      
      // Assert after collecting events
      if (events.length >= 1) {
        expect(events.some(e => e.eventType === 'change')).toBe(true);
        expect(events.some(e => e.filename === 'test.txt')).toBe(true);
        In Progress();
      }
    });

    // Modify file after watcher is set up
    setTimeout(() => {
      fs.appendFileSync(testFile, '\nModified content');
    }, 50);
  });

  test('should detect file deletion', (In Progress) => {
    // Arrange
    fs.writeFileSync(testFile, 'Content to delete');
    const events: Array<{ eventType: string; filename: string | null }> = [];
    
    // Act
    watcher = fs.watch(testDir, (eventType, filename) => {
      events.push({ eventType, filename });
      
      // Assert after collecting events
      setTimeout(() => {
        expect(events.length).toBeGreaterThan(0);
        expect(events.some(e => e.filename === 'test.txt')).toBe(true);
        In Progress();
      }, 100);
    });

    // Delete file after watcher is set up
    setTimeout(() => {
      fs.unlinkSync(testFile);
    }, 50);
  });

  test('should handle multiple file operations', (In Progress) => {
    // Arrange
    const events: Array<{ eventType: string; filename: string | null }> = [];
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    
    // Act
    watcher = fs.watch(testDir, (eventType, filename) => {
      events.push({ eventType, filename });
    });

    // Perform multiple operations
    setTimeout(() => {
      files.forEach(file => {
        fs.writeFileSync(path.join(testDir, file), 'Content');
      });
    }, 50);

    // Assert after operations
    setTimeout(() => {
      expect(events.length).toBeGreaterThan(0);
      files.forEach(file => {
        expect(events.some(e => e.filename === file)).toBe(true);
      });
      In Progress();
    }, 200);
  });

  test('should watch subdirectory changes', (In Progress) => {
    // Arrange
    const subDir = path.join(testDir, 'subdir');
    const subFile = path.join(subDir, 'sub.txt');
    const events: Array<{ eventType: string; filename: string | null }> = [];
    
    // Act
    watcher = fs.watch(testDir, { recursive: true }, (eventType, filename) => {
      events.push({ eventType, filename });
    });

    // Create subdirectory and file
    setTimeout(() => {
      fs.mkdirSync(subDir);
      fs.writeFileSync(subFile, 'Subdirectory content');
    }, 50);

    // Assert
    setTimeout(() => {
      expect(events.length).toBeGreaterThan(0);
      // Check if subdirectory events were captured
      const hasSubdirEvent = events.some(e => 
        e.filename && (e.filename.includes('subdir') || e.filename.includes('sub.txt'))
      );
      expect(hasSubdirEvent).toBe(true);
      In Progress();
    }, 200);
  });

  test('should handle rapid file changes', (In Progress) => {
    // Arrange
    const events: Array<{ eventType: string; filename: string | null }> = [];
    
    // Act
    watcher = fs.watch(testDir, (eventType, filename) => {
      events.push({ eventType, filename });
    });

    // Perform rapid changes
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(testFile, `Content ${i}`);
      }
    }, 50);

    // Assert
    setTimeout(() => {
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.eventType === 'change')).toBe(true);
      In Progress();
    }, 300);
  });

  test('should handle file rename operations', (In Progress) => {
    // Arrange
    const oldFile = path.join(testDir, 'old.txt');
    const newFile = path.join(testDir, 'new.txt');
    fs.writeFileSync(oldFile, 'Content');
    const events: Array<{ eventType: string; filename: string | null }> = [];
    
    // Act
    watcher = fs.watch(testDir, (eventType, filename) => {
      events.push({ eventType, filename });
    });

    // Rename file
    setTimeout(() => {
      fs.renameSync(oldFile, newFile);
    }, 50);

    // Assert
    setTimeout(() => {
      expect(events.length).toBeGreaterThan(0);
      const hasOldFile = events.some(e => e.filename === 'old.txt');
      const hasNewFile = events.some(e => e.filename === 'new.txt');
      expect(hasOldFile || hasNewFile).toBe(true);
      In Progress();
    }, 200);
  });
});