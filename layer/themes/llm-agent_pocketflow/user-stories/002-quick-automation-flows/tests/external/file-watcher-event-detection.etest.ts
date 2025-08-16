import { describe, test, expect, beforeEach } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';

// External interfaces
interface FileWatcherInterface {
  watch(pattern: string, callback: (event: FileEvent) => void): WatchHandle;
  watchDirectory(directory: string, options: WatchOptions): WatchHandle;
  stop(): void;
  getActiveWatchers(): WatcherInfo[];
}

interface FileEvent {
  type: 'create' | 'modify' | 'delete' | 'rename';
  path: string;
  filename: string;
  timestamp: Date;
  size?: number;
  oldPath?: string; // For rename events
}

interface WatchOptions {
  recursive?: boolean;
  pattern?: string;
  ignorePatterns?: string[];
  debounce?: number;
}

interface WatchHandle {
  id: string;
  pattern: string;
  stop(): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
}

interface WatcherInfo {
  id: string;
  pattern: string;
  directory: string;
  eventCount: number;
  status: 'active' | 'paused' | 'stopped';
}

// Test implementation of FileWatcher
class FileWatcher extends EventEmitter implements FileWatcherInterface {
  private watchers: Map<string, any> = new Map();
  private watcherInfo: Map<string, WatcherInfo> = new Map();
  private watcherCounter = 0;

  watch(pattern: string, callback: (event: FileEvent) => void): WatchHandle {
    const watchId = `watch-${++this.watcherCounter}`;
    const directory = path.dirname(pattern);
    const filePattern = path.basename(pattern);
    
    // Create watcher info
    const info: WatcherInfo = {
      id: watchId,
      pattern,
      directory,
      eventCount: 0,
      status: 'active'
    };
    this.watcherInfo.set(watchId, info);

    // Create fs watcher
    const watcher = fs.watch(directory, (eventType, filename) => {
      if (filename && this.matchesPattern(filename, filePattern)) {
        const filePath = path.join(directory, filename);
        
        // Determine event type
        let fileEvent: FileEvent;
        if (!fs.existsSync(filePath)) {
          fileEvent = {
            type: 'delete',
            path: filePath,
            filename,
            timestamp: new Date()
          };
        } else {
          const stats = fs.statSync(filePath);
          fileEvent = {
            type: eventType === 'rename' ? 'create' : 'modify',
            path: filePath,
            filename,
            timestamp: new Date(),
            size: stats.size
          };
        }

        // Update event count
        info.eventCount++;

        // Emit event
        this.emit('file-event', fileEvent);
        callback(fileEvent);
      }
    });

    this.watchers.set(watchId, { watcher, callback, pattern });

    // Create watch handle
    const handle: WatchHandle = {
      id: watchId,
      pattern,
      stop: () => this.stopWatcher(watchId),
      pause: () => this.pauseWatcher(watchId),
      resume: () => this.resumeWatcher(watchId),
      isPaused: () => info.status === 'paused'
    };

    return handle;
  }

  watchDirectory(directory: string, options: WatchOptions = {}): WatchHandle {
    const watchId = `watch-${++this.watcherCounter}`;
    const { recursive = false, pattern = '*', ignorePatterns = [], debounce = 0 } = options;
    
    // Create watcher info
    const info: WatcherInfo = {
      id: watchId,
      pattern,
      directory,
      eventCount: 0,
      status: 'active'
    };
    this.watcherInfo.set(watchId, info);

    // Debounce tracking
    const debounceTimers = new Map<string, NodeJS.Timeout>();

    // Create recursive watcher if needed
    const watchDirRecursive = (dir: string) => {
      const watcher = fs.watch(dir, { recursive }, (eventType, filename) => {
        if (!filename) return;

        const filePath = path.join(dir, filename);
        
        // Check ignore patterns
        if (ignorePatterns.some(ignore => this.matchesPattern(filename, ignore))) {
          return;
        }

        // Check pattern match
        if (!this.matchesPattern(filename, pattern)) {
          return;
        }

        // Handle debouncing
        if (debounce > 0) {
          const existingTimer = debounceTimers.get(filePath);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          debounceTimers.set(filePath, setTimeout(() => {
            this.emitFileEvent(eventType as any, filePath, filename, info);
            debounceTimers.delete(filePath);
          }, debounce));
        } else {
          this.emitFileEvent(eventType as any, filePath, filename, info);
        }
      });

      return watcher;
    };

    const watcher = watchDirRecursive(directory);
    this.watchers.set(watchId, { watcher, directory, options });

    // Create watch handle
    const handle: WatchHandle = {
      id: watchId,
      pattern,
      stop: () => this.stopWatcher(watchId),
      pause: () => this.pauseWatcher(watchId),
      resume: () => this.resumeWatcher(watchId),
      isPaused: () => info.status === 'paused'
    };

    return handle;
  }

  stop(): void {
    // Stop all watchers
    for (const [watchId] of this.watchers) {
      this.stopWatcher(watchId);
    }
    this.removeAllListeners();
  }

  getActiveWatchers(): WatcherInfo[] {
    return Array.from(this.watcherInfo.values());
  }

  onFileEvent(listener: (event: FileEvent) => void): void {
    this.on('file-event', listener);
  }

  offFileEvent(listener: (event: FileEvent) => void): void {
    this.off('file-event', listener);
  }

  private emitFileEvent(eventType: string, filePath: string, filename: string, info: WatcherInfo): void {
    let fileEvent: FileEvent;
    
    try {
      if (!fs.existsSync(filePath)) {
        fileEvent = {
          type: 'delete',
          path: filePath,
          filename,
          timestamp: new Date()
        };
      } else {
        const stats = fs.statSync(filePath);
        fileEvent = {
          type: eventType === 'rename' ? 'create' : 'modify',
          path: filePath,
          filename,
          timestamp: new Date(),
          size: stats.size
        };
      }

      // Update event count
      info.eventCount++;

      // Emit event
      this.emit('file-event', fileEvent);
    } catch (error) {
      // File may have been deleted between check and stat
      fileEvent = {
        type: 'delete',
        path: filePath,
        filename,
        timestamp: new Date()
      };
      info.eventCount++;
      this.emit('file-event', fileEvent);
    }
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    if (pattern === '*') return true;
    
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }

  private stopWatcher(watchId: string): void {
    const watcherData = this.watchers.get(watchId);
    if (watcherData) {
      watcherData.watcher.close();
      this.watchers.delete(watchId);
      
      const info = this.watcherInfo.get(watchId);
      if (info) {
        info.status = 'stopped';
      }
    }
  }

  private pauseWatcher(watchId: string): void {
    const info = this.watcherInfo.get(watchId);
    if (info) {
      info.status = 'paused';
    }
  }

  private resumeWatcher(watchId: string): void {
    const info = this.watcherInfo.get(watchId);
    if (info) {
      info.status = 'active';
    }
  }
}

describe('FileWatcher Event Detection External Test', () => {
  let watcher: FileWatcher;
  const testDir = path.join(__dirname, 'test-watcher-dir');

  beforeEach(() => {
    watcher = new FileWatcher();
    
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    watcher.stop();
    
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('basic file watching', () => {
    test('should detect file creation', (In Progress) => {
      // Arrange
      const testFile = path.join(testDir, 'test.txt');
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        events.push(event);
        
        // Assert
        expect(event.type).toBe('create');
        expect(event.filename).toBe('test.txt');
        expect(event.path).toBe(testFile);
        expect(event.timestamp).toBeInstanceOf(Date);
        handle.stop();
        In Progress();
      });

      // Create file after watcher is set up
      setTimeout(() => {
        fs.writeFileSync(testFile, 'Hello World');
      }, 50);
    });

    test('should detect file modification', (In Progress) => {
      // Arrange
      const testFile = path.join(testDir, 'modify.txt');
      fs.writeFileSync(testFile, 'Initial content');
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        events.push(event);
        
        if (events.length === 1) {
          // Assert
          expect(event.type).toBe('modify');
          expect(event.filename).toBe('modify.txt');
          expect(event.size).toBeGreaterThan(0);
          handle.stop();
          In Progress();
        }
      });

      // Modify file after watcher is set up
      setTimeout(() => {
        fs.appendFileSync(testFile, '\nAdditional content');
      }, 50);
    });

    test('should detect file deletion', (In Progress) => {
      // Arrange
      const testFile = path.join(testDir, 'delete.txt');
      fs.writeFileSync(testFile, 'Content to delete');
      
      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        if (event.type === 'delete') {
          // Assert
          expect(event.type).toBe('delete');
          expect(event.filename).toBe('delete.txt');
          expect(event.size).toBeUndefined();
          handle.stop();
          In Progress();
        }
      });

      // Delete file after watcher is set up
      setTimeout(() => {
        fs.unlinkSync(testFile);
      }, 50);
    });

    test('should filter by pattern', (In Progress) => {
      // Arrange
      const jsFile = path.join(testDir, 'script.js');
      const txtFile = path.join(testDir, 'document.txt');
      const events: FileEvent[] = [];

      // Act - Watch only .js files
      const handle = watcher.watch(path.join(testDir, '*.js'), (event) => {
        events.push(event);
      });

      // Create both files
      setTimeout(() => {
        fs.writeFileSync(jsFile, 'console.log("test");');
        fs.writeFileSync(txtFile, 'Text content');
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert
        expect(events).toHaveLength(1);
        expect(events[0].filename).toBe('script.js');
        handle.stop();
        In Progress();
      }, 150);
    });
  });

  describe('directory watching', () => {
    test('should watch directory with options', (In Progress) => {
      // Arrange
      const subDir = path.join(testDir, 'subdir');
      fs.mkdirSync(subDir);
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watchDirectory(testDir, {
        recursive: true,
        pattern: '*.log'
      });

      watcher.onFileEvent((event) => {
        events.push(event);
      });

      // Create files
      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'test.log'), 'Root log');
        fs.writeFileSync(path.join(subDir, 'sub.log'), 'Sub log');
        fs.writeFileSync(path.join(testDir, 'test.txt'), 'Text file');
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert
        expect(events.filter(e => e.filename.endsWith('.log'))).toHaveLength(2);
        expect(events.some(e => e.filename === 'test.log')).toBe(true);
        expect(events.some(e => e.filename === 'sub.log')).toBe(true);
        handle.stop();
        In Progress();
      }, 200);
    });

    test('should ignore patterns', (In Progress) => {
      // Arrange
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watchDirectory(testDir, {
        ignorePatterns: ['*.tmp', 'temp*']
      });

      watcher.onFileEvent((event) => {
        events.push(event);
      });

      // Create files
      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'important.txt'), 'Keep this');
        fs.writeFileSync(path.join(testDir, 'cache.tmp'), 'Ignore this');
        fs.writeFileSync(path.join(testDir, 'temp_file.txt'), 'Ignore this too');
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert
        expect(events).toHaveLength(1);
        expect(events[0].filename).toBe('important.txt');
        handle.stop();
        In Progress();
      }, 150);
    });

    test('should debounce rapid changes', (In Progress) => {
      // Arrange
      const testFile = path.join(testDir, 'rapid.txt');
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watchDirectory(testDir, {
        pattern: '*.txt',
        debounce: 100
      });

      watcher.onFileEvent((event) => {
        events.push(event);
      });

      // Make rapid changes
      setTimeout(() => {
        fs.writeFileSync(testFile, 'Change 1');
        fs.writeFileSync(testFile, 'Change 2');
        fs.writeFileSync(testFile, 'Change 3');
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert - Should only get one event due to debouncing
        expect(events.filter(e => e.filename === 'rapid.txt')).toHaveLength(1);
        handle.stop();
        In Progress();
      }, 300);
    });
  });

  describe('watch handle operations', () => {
    test('should pause and resume watching', (In Progress) => {
      // Arrange
      const testFile = path.join(testDir, 'pausable.txt');
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        if (handle.isPaused()) return;
        events.push(event);
      });

      // Create file - should be detected
      setTimeout(() => {
        fs.writeFileSync(testFile, 'First change');
      }, 50);

      // Pause and make change - should not be detected
      setTimeout(() => {
        handle.pause();
        expect(handle.isPaused()).toBe(true);
        fs.appendFileSync(testFile, '\nChange while paused');
      }, 100);

      // Resume and make change - should be detected
      setTimeout(() => {
        handle.resume();
        expect(handle.isPaused()).toBe(false);
        fs.appendFileSync(testFile, '\nChange after resume');
      }, 150);

      // Check results
      setTimeout(() => {
        // Assert
        expect(events.filter(e => e.type === 'modify')).toHaveLength(1);
        handle.stop();
        In Progress();
      }, 250);
    });

    test('should stop individual watcher', (In Progress) => {
      // Arrange
      const events1: FileEvent[] = [];
      const events2: FileEvent[] = [];

      // Act
      const handle1 = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        events1.push(event);
      });

      const handle2 = watcher.watch(path.join(testDir, '*.log'), (event) => {
        events2.push(event);
      });

      // Stop first watcher
      setTimeout(() => {
        handle1.stop();
      }, 50);

      // Create files
      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'test.txt'), 'Text file');
        fs.writeFileSync(path.join(testDir, 'test.log'), 'Log file');
      }, 100);

      // Check results
      setTimeout(() => {
        // Assert
        expect(events1).toHaveLength(0); // Stopped watcher
        expect(events2).toHaveLength(1); // Active watcher
        handle2.stop();
        In Progress();
      }, 200);
    });
  });

  describe('event emission', () => {
    test('should emit events to multiple listeners', (In Progress) => {
      // Arrange
      const listener1Events: FileEvent[] = [];
      const listener2Events: FileEvent[] = [];

      const listener1 = (event: FileEvent) => listener1Events.push(event);
      const listener2 = (event: FileEvent) => listener2Events.push(event);

      watcher.onFileEvent(listener1);
      watcher.onFileEvent(listener2);

      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), () => {});

      // Create file
      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'broadcast.txt'), 'Content');
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert
        expect(listener1Events).toHaveLength(1);
        expect(listener2Events).toHaveLength(1);
        expect(listener1Events[0]).toEqual(listener2Events[0]);
        
        watcher.offFileEvent(listener1);
        watcher.offFileEvent(listener2);
        handle.stop();
        In Progress();
      }, 150);
    });

    test('should handle rename events', (In Progress) => {
      // Arrange
      const oldFile = path.join(testDir, 'old-name.txt');
      const newFile = path.join(testDir, 'new-name.txt');
      fs.writeFileSync(oldFile, 'Content');
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        events.push(event);
      });

      // Rename file
      setTimeout(() => {
        fs.renameSync(oldFile, newFile);
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert - Should get delete and create events
        const deleteEvent = events.find(e => e.type === 'delete' && e.filename === 'old-name.txt');
        const createEvent = events.find(e => e.type === 'create' && e.filename === 'new-name.txt');
        
        expect(deleteEvent).toBeDefined();
        expect(createEvent).toBeDefined();
        handle.stop();
        In Progress();
      }, 150);
    });
  });

  describe('watcher management', () => {
    test('should track active watchers', () => {
      // Arrange & Act
      const handle1 = watcher.watch(path.join(testDir, '*.txt'), () => {});
      const handle2 = watcher.watchDirectory(testDir, { pattern: '*.log' });

      const activeWatchers = watcher.getActiveWatchers();

      // Assert
      expect(activeWatchers).toHaveLength(2);
      expect(activeWatchers[0].status).toBe('active');
      expect(activeWatchers[1].status).toBe('active');
      expect(activeWatchers[0].eventCount).toBe(0);

      handle1.stop();
      handle2.stop();
    });

    test('should update event counts', (In Progress) => {
      // Arrange
      const handle = watcher.watch(path.join(testDir, '*.txt'), () => {});

      // Act
      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'event1.txt'), 'Content 1');
        fs.writeFileSync(path.join(testDir, 'event2.txt'), 'Content 2');
      }, 50);

      // Check results
      setTimeout(() => {
        const watchers = watcher.getActiveWatchers();
        
        // Assert
        expect(watchers[0].eventCount).toBeGreaterThan(0);
        handle.stop();
        In Progress();
      }, 150);
    });

    test('should stop all watchers', (In Progress) => {
      // Arrange
      const events: FileEvent[] = [];
      
      watcher.watch(path.join(testDir, '*.txt'), (event) => events.push(event));
      watcher.watch(path.join(testDir, '*.log'), (event) => events.push(event));

      // Act - Stop all watchers
      setTimeout(() => {
        watcher.stop();
      }, 50);

      // Create files after stopping
      setTimeout(() => {
        fs.writeFileSync(path.join(testDir, 'test.txt'), 'Should not detect');
        fs.writeFileSync(path.join(testDir, 'test.log'), 'Should not detect');
      }, 100);

      // Check results
      setTimeout(() => {
        // Assert
        expect(events).toHaveLength(0);
        expect(watcher.getActiveWatchers()).toHaveLength(2); // Info preserved but stopped
        expect(watcher.getActiveWatchers().every(w => w.status === 'stopped')).toBe(true);
        In Progress();
      }, 200);
    });
  });

  describe('error handling', () => {
    test('should handle watcher errors gracefully', (In Progress) => {
      // Arrange
      const nonExistentDir = path.join(testDir, 'non-existent');
      const events: FileEvent[] = [];

      // Act - Try to watch non-existent directory
      try {
        const handle = watcher.watch(path.join(nonExistentDir, '*.txt'), (event) => {
          events.push(event);
        });

        // Should handle gracefully
        setTimeout(() => {
          handle.stop();
          In Progress();
        }, 100);
      } catch (error) {
        // Should not throw
        In Progress();
      }
    });

    test('should handle file access errors', (In Progress) => {
      // Arrange
      const testFile = path.join(testDir, 'test.txt');
      const events: FileEvent[] = [];

      // Act
      const handle = watcher.watch(path.join(testDir, '*.txt'), (event) => {
        events.push(event);
      });

      // Create and quickly delete file
      setTimeout(() => {
        fs.writeFileSync(testFile, 'Content');
        fs.unlinkSync(testFile);
      }, 50);

      // Check results
      setTimeout(() => {
        // Assert - Should handle file access errors gracefully
        expect(events.some(e => e.type === 'delete')).toBe(true);
        handle.stop();
        In Progress();
      }, 150);
    });
  });
});