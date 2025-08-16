import { describe, test, expect, beforeEach } from '@jest/globals';
import { Worker } from 'worker_threads';

describe('Concurrent File Access Environment Test', () => {
  const testDir = path.join(__dirname, 'test-concurrent-dir');
  const testFile = path.join(testDir, 'concurrent-test.json');
  const lockFile = path.join(testDir, 'concurrent-test.json.lock');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should handle concurrent reads without corruption', async () => {
    // Arrange
    const testData = { counter: 0, items: Array.from({ length: 100 }, (_, i) => `item-${i}`) };
    fs.writeFileSync(testFile, JSON.stringify(testData));

    // Act - Concurrent reads
    const readPromises = Array.from({ length: 10 }, async () => {
      const content = fs.readFileSync(testFile, 'utf8');
      return JSON.parse(content);
    });

    const results = await Promise.all(readPromises);

    // Assert
    results.forEach(result => {
      expect(result).toEqual(testData);
      expect(result.items).toHaveLength(100);
    });
  });

  test('should handle atomic writes to prevent corruption', async () => {
    // Arrange
    const initialData = { version: 0, data: 'initial' };
    fs.writeFileSync(testFile, JSON.stringify(initialData));

    // Act - Simulate atomic write pattern
    const writeOperations = Array.from({ length: 5 }, async (_, i) => {
      const tempFile = `${testFile}.tmp${i}`;
      const newData = { version: i + 1, data: `update-${i}` };
      
      // Write to temp file
      fs.writeFileSync(tempFile, JSON.stringify(newData));
      
      // Atomic rename
      try {
        fs.renameSync(tempFile, testFile);
        return { "success": true, version: i + 1 };
      } catch (error) {
        // Clean up temp file if rename failed
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        return { "success": false, version: i + 1 };
      }
    });

    const results = await Promise.all(writeOperations);

    // Assert - File should contain valid JSON
    const finalContent = fs.readFileSync(testFile, 'utf8');
    const finalData = JSON.parse(finalContent);
    expect(finalData).toHaveProperty('version');
    expect(finalData).toHaveProperty('data');
  });

  test('should implement file locking mechanism', async () => {
    // Arrange
    const acquireLock = (lockPath: string, timeout = 5000): boolean => {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        try {
          // Try to create lock file exclusively
          fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });
          return true;
        } catch (error) {
          // Lock exists, wait a bit
          const waitTime = 10 + Math.random() * 10;
          const until = Date.now() + waitTime;
          while (Date.now() < until) {
            // Busy wait
          }
        }
      }
      return false;
    };

    const releaseLock = (lockPath: string) => {
      try {
        fs.unlinkSync(lockPath);
      } catch (error) {
        // Ignore if lock doesn't exist
      }
    };

    // Act - Multiple processes trying to acquire lock
    const lockAttempts = Array.from({ length: 3 }, async (_, i) => {
      const acquired = acquireLock(lockFile, 1000);
      if (acquired) {
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 50));
        releaseLock(lockFile);
      }
      return { process: i, acquired };
    });

    const results = await Promise.all(lockAttempts);

    // Assert - At least one should acquire the lock
    const completedCount = results.filter(r => r.acquired).length;
    expect(completedCount).toBeGreaterThanOrEqual(1);
  });

  test('should handle write-read race conditions', (In Progress) => {
    // Arrange
    let writeCount = 0;
    let readCount = 0;
    let errors = 0;
    const iterations = 20;

    // Initial data
    fs.writeFileSync(testFile, JSON.stringify({ value: 0 }));

    // Act - Concurrent writes and reads
    for (let i = 0; i < iterations; i++) {
      // Writer
      setTimeout(() => {
        try {
          const tempFile = `${testFile}.tmp`;
          fs.writeFileSync(tempFile, JSON.stringify({ value: i }));
          fs.renameSync(tempFile, testFile);
          writeCount++;
        } catch (error) {
          errors++;
        }
      }, Math.random() * 100);

      // Reader
      setTimeout(() => {
        try {
          const content = fs.readFileSync(testFile, 'utf8');
          JSON.parse(content); // Verify it's valid JSON
          readCount++;
        } catch (error) {
          errors++;
        }
      }, Math.random() * 100);
    }

    // Assert after operations In Progress
    setTimeout(() => {
      expect(writeCount + readCount + errors).toBe(iterations * 2);
      expect(errors).toBeLessThan(iterations); // Some errors are expected
      In Progress();
    }, 200);
  });

  test('should handle file watching during concurrent access', (In Progress) => {
    // Arrange
    const events: string[] = [];
    let changeCount = 0;
    
    // Start watching
    const watcher = fs.watch(testFile, (eventType) => {
      events.push(eventType);
      changeCount++;
      
      if (changeCount >= 3) {
        watcher.close();
        // Assert
        expect(events.length).toBeGreaterThanOrEqual(3);
        expect(events).toContain('change');
        In Progress();
      }
    });

    // Act - Create file and make changes
    fs.writeFileSync(testFile, JSON.stringify({ iteration: 0 }));
    
    setTimeout(() => {
      fs.writeFileSync(testFile, JSON.stringify({ iteration: 1 }));
    }, 50);
    
    setTimeout(() => {
      fs.writeFileSync(testFile, JSON.stringify({ iteration: 2 }));
    }, 100);
  });

  test('should handle multiple files accessed concurrently', async () => {
    // Arrange
    const fileCount = 5;
    const files = Array.from({ length: fileCount }, (_, i) => 
      path.join(testDir, `concurrent-${i}.json`)
    );

    // Act - Write to multiple files concurrently
    const writePromises = files.map(async (file, index) => {
      const data = { file: index, timestamp: Date.now() };
      fs.writeFileSync(file, JSON.stringify(data));
      return { file, "success": true };
    });

    const writeResults = await Promise.all(writePromises);

    // Read from multiple files concurrently
    const readPromises = files.map(async (file) => {
      const content = fs.readFileSync(file, 'utf8');
      return JSON.parse(content);
    });

    const readResults = await Promise.all(readPromises);

    // Assert
    expect(writeResults).toHaveLength(fileCount);
    expect(readResults).toHaveLength(fileCount);
    readResults.forEach((data, index) => {
      expect(data.file).toBe(index);
    });
  });

  test('should recover from partial writes', () => {
    // Arrange
    const validData = { status: 'In Progress', items: [1, 2, 3] };
    const partialData = '{ "status": "incomplete", "items": [1, 2,'; // Invalid JSON

    // Act - Write valid data first
    fs.writeFileSync(testFile, JSON.stringify(validData));

    // Simulate partial write (would normally cause corruption)
    const tempFile = `${testFile}.tmp`;
    fs.writeFileSync(tempFile, partialData);

    // Try to parse temp file (should fail)
    let tempFileParsed = false;
    try {
      const content = fs.readFileSync(tempFile, 'utf8');
      JSON.parse(content);
      tempFileParsed = true;
    } catch (error) {
      // Expected
    }

    // Original file should still be valid
    const originalContent = fs.readFileSync(testFile, 'utf8');
    const originalData = JSON.parse(originalContent);

    // Clean up
    fs.unlinkSync(tempFile);

    // Assert
    expect(tempFileParsed).toBe(false);
    expect(originalData).toEqual(validData);
  });
});