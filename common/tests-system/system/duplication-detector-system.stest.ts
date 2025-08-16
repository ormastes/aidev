import { DuplicationDetector } from '../../setup/test-env/duplication-detector';
import * as fs from 'fs/promises';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

describe('DuplicationDetector System Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let duplicationDetector: DuplicationDetector;

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'duplication-detector-system-'));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    process.chdir(tempDir);
    duplicationDetector = new DuplicationDetector();
  });

  describe('Source File Collection', () => {
    test('should collect TypeScript and JavaScript files from src directory', async () => {
      // Create test source structure
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);
      
      const subDir = path.join(srcDir, 'utils');
      await fileAPI.createDirectory(subDir);

      // Create various file types
      await fileAPI.createFile(path.join(srcDir, 'main.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'helper.js'), { type: FileType.TEMPORARY }) {}');
      await fileAPI.createFile(path.join(subDir, 'utils.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'config.json'), { type: FileType.TEMPORARY }); // Should be ignored
      await fileAPI.createFile(path.join(srcDir, 'README.md'), { type: FileType.TEMPORARY }); // Should be ignored

      const metrics = await duplicationDetector.detect();

      // Should find files and calculate metrics
      expect(metrics.totalLines).toBeGreaterThan(0);
      expect(metrics.duplicatedLines).toBeGreaterThanOrEqual(0);
      expect(metrics.percentage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(metrics.duplicatedBlocks)).toBe(true);
    });

    test('should handle nested directory structures', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create deeply nested structure
      const deepPath = path.join(srcDir, 'level1', 'level2', 'level3');
      await fileAPI.createDirectory(deepPath);

      await fileAPI.createFile(path.join(deepPath, 'deep.ts'), { type: FileType.TEMPORARY }) { return true; } }');
      await fileAPI.createFile(path.join(srcDir, 'root.ts'), { type: FileType.TEMPORARY }) { return true; } }');

      const metrics = await duplicationDetector.detect();

      expect(metrics.totalLines).toBe(2); // Two lines total
      expect(metrics.duplicatedLines).toBe(0); // Not enough lines to be considered duplicated
    });

    test('should handle empty src directory', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      const metrics = await duplicationDetector.detect();

      expect(metrics.totalLines).toBe(0);
      expect(metrics.duplicatedLines).toBe(0);
      expect(metrics.percentage).toBe(0);
      expect(metrics.duplicatedBlocks).toEqual([]);
    });

    test('should handle missing src directory', async () => {
      // No src directory created
      await expect(duplicationDetector.detect()).rejects.toThrow();
    });
  });

  describe('Code Block Extraction and Tokenization', () => {
    test('should extract code blocks with minimum token and line requirements', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create file with code blocks that meet minimum requirements
      const longCode = `
export class Calculator {
  constructor(private precision: number = 2) {
    this.precision = Math.max(0, Math.min(10, precision));
  }

  add(a: number, b: number): number {
    const result = a + b;
    return this.roundToPrecision(result);
  }

  subtract(a: number, b: number): number {
    const result = a - b;
    return this.roundToPrecision(result);
  }

  multiply(a: number, b: number): number {
    const result = a * b;
    return this.roundToPrecision(result);
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    const result = a / b;
    return this.roundToPrecision(result);
  }

  private roundToPrecision(value: number): number {
    const factor = Math.pow(10, this.precision);
    return Math.round(value * factor) / factor;
  }
}`;

      await fileAPI.createFile(path.join(srcDir, 'calculator.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      expect(metrics.totalLines).toBeGreaterThan(20);
      expect(metrics.duplicatedLines).toBe(0); // Single file, no duplicates
      expect(metrics.percentage).toBe(0);
    });

    test('should detect exact code duplication between files', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      const duplicatedCode = `
export class DataProcessor {
  private data: any[] = [];
  
  constructor() {
    this.initializeData();
  }
  
  private initializeData(): void {
    this.data = [];
    console.log('Data initialized');
  }
  
  public addData(item: any): void {
    this.data.push(item);
    this.sortData();
  }
  
  private sortData(): void {
    this.data.sort((a, b) => a.id - b.id);
  }
  
  public getData(): any[] {
    return [...this.data];
  }
}`;

      // Create two files with identical code
      await fileAPI.createFile(path.join(srcDir, 'processor1.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'processor2.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      expect(metrics.totalLines).toBeGreaterThan(30); // Two files worth of lines
      expect(metrics.duplicatedLines).toBeGreaterThan(0); // Should detect duplicates
      expect(metrics.percentage).toBeGreaterThan(0);
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
      
      // Check duplicated block details
      const firstBlock = metrics.duplicatedBlocks[0];
      expect(firstBlock.files.length).toBe(2);
      expect(firstBlock.files).toContain(path.join(srcDir, 'processor1.ts'));
      expect(firstBlock.files).toContain(path.join(srcDir, 'processor2.ts'));
    });

    test('should handle code with comments and strings correctly', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      const codeWithComments = `
export class CommentedClass {
  /* This is a multi-line comment
     that should be ignored during
     duplication detection */
  
  method1(): string {
    // This is a single line comment
    const message = "Hello, world!"; // Another comment
    return message;
  }
  
  method2(): string {
    /* Another comment block */
    const message = "Different string";
    return message;
  }
}`;

      const similarCodeWithDifferentComments = `
export class CommentedClass {
  /* Different multi-line comment
     with different content
     but same structure */
  
  method1(): string {
    // Different single line comment
    const message = "Hello, world!"; // Different comment
    return message;
  }
  
  method2(): string {
    /* Different comment block */
    const message = "Different string";
    return message;
  }
}`;

      await fileAPI.createFile(path.join(srcDir, 'commented1.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'commented2.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      // Should detect duplication despite different comments
      expect(metrics.duplicatedLines).toBeGreaterThan(0);
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
    });

    test('should normalize strings and numbers during tokenization', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      const codeWithLiterals1 = `
export class LiteralProcessor {
  private config = {
    maxItems: 100,
    timeout: 5000,
    message: "Processing started",
    enabled: true
  };
  
  process(items: any[]): void {
    for (let i = 0; i < items.length; i++) {
      if (i >= 100) break;
      console.log("Processing item: " + i);
      this.processItem(items[i]);
    }
  }
  
  private processItem(item: any): void {
    console.log("Item processed");
  }
}`;

      const codeWithDifferentLiterals = `
export class LiteralProcessor {
  private config = {
    maxItems: 200,
    timeout: 3000,
    message: "Processing completed",
    enabled: false
  };
  
  process(items: any[]): void {
    for (let i = 0; i < items.length; i++) {
      if (i >= 200) break;
      console.log("Processing element: " + i);
      this.processItem(items[i]);
    }
  }
  
  private processItem(item: any): void {
    console.log("Element processed");
  }
}`;

      await fileAPI.createFile(path.join(srcDir, 'literals1.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'literals2.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      // Should detect structural similarity despite different literal values
      expect(metrics.duplicatedLines).toBeGreaterThan(0);
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('Duplication Detection Algorithm', () => {
    test('should detect partial duplication between multiple files', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      const baseCode = `
export class BaseService {
  private items: any[] = [];
  
  public addItem(item: any): void {
    this.items.push(item);
    this.notifyChange();
  }
  
  public removeItem(id: string): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
      this.notifyChange();
    }
  }
  
  private notifyChange(): void {
    console.log('Items changed');
  }
}`;

      const extendedCode = baseCode + `

export class ExtendedService extends BaseService {
  public clearAll(): void {
    this.items = [];
    this.notifyChange();
  }
}`;

      const anotherServiceWithDuplicatedMethods = `
export class AnotherService {
  private data: any[] = [];
  
  public addItem(item: any): void {
    this.data.push(item);
    this.notifyChange();
  }
  
  public removeItem(id: string): void {
    const index = this.data.findIndex(item => item.id === id);
    if (index >= 0) {
      this.data.splice(index, 1);
      this.notifyChange();
    }
  }
  
  private notifyChange(): void {
    console.log('Data changed');
  }
  
  public getCount(): number {
    return this.data.length;
  }
}`;

      await fileAPI.createFile(path.join(srcDir, 'base-service.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'extended-service.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'another-service.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      expect(metrics.duplicatedLines).toBeGreaterThan(0);
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
      expect(metrics.percentage).toBeGreaterThan(0);

      // Should have multiple files in duplicated blocks
      const hasMultiFileBlocks = metrics.duplicatedBlocks.some(block => block.files.length >= 2);
      expect(hasMultiFileBlocks).toBe(true);
    });

    test('should calculate accurate duplication metrics', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create known duplication scenario
      const duplicatedFunction = `
function complexCalculation(x: number, y: number): number {
  const step1 = Math.pow(x, 2);
  const step2 = Math.pow(y, 2);
  const step3 = Math.sqrt(step1 + step2);
  const step4 = step3 * 1.414;
  const step5 = Math.round(step4 * 100) / 100;
  return step5;
}`;

      const uniqueFunction = `
function simpleCalculation(a: number): number {
  return a * 2;
}`;

      const file1Content = duplicatedFunction + uniqueFunction;
      const file2Content = duplicatedFunction + `
function anotherUniqueFunction(b: number): number {
  return b + 1;
}`;
      const file3Content = `
function completelyDifferentFunction(): void {
  console.log('This is different');
}`;

      await fileAPI.createFile(path.join(srcDir, 'file1.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'file2.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'file3.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      expect(metrics.totalLines).toBeGreaterThan(0);
      expect(metrics.duplicatedLines).toBeGreaterThan(0);
      expect(metrics.percentage).toBe((metrics.duplicatedLines / metrics.totalLines) * 100);
      
      // Should have at least one block of duplication between file1 and file2
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
      
      const duplicatedBlock = metrics.duplicatedBlocks[0];
      expect(duplicatedBlock.files.length).toBe(2);
      expect(duplicatedBlock.lines).toBeGreaterThan(0);
      expect(duplicatedBlock.tokens).toBeGreaterThan(0);
    });

    test('should handle edge cases with minimum thresholds', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create code blocks that are just below the minimum threshold
      const shortCode1 = `
class Short {
  method() {
    return 1;
  }
}`;

      const shortCode2 = `
class Short {
  method() {
    return 2;
  }
}`;

      await fileAPI.createFile(path.join(srcDir, 'short1.ts'), { type: FileType.TEMPORARY });
      await fileAPI.createFile(path.join(srcDir, 'short2.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      // Short blocks should not be detected as duplicates
      expect(metrics.duplicatedLines).toBe(0);
      expect(metrics.duplicatedBlocks.length).toBe(0);
      expect(metrics.percentage).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle files with syntax errors gracefully', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create files with syntax errors
      await fileAPI.createFile(path.join(srcDir, 'syntax-error1.ts'), { type: FileType.TEMPORARY }) {
    // Missing closing brace
    return "hello";
  // Missing closing brace for method and class
`);

      await fileAPI.createFile(path.join(srcDir, 'syntax-error2.js'), { type: FileType.TEMPORARY }) {
  const x = ;
  return x;
}`);

      await fileAPI.createFile(path.join(srcDir, 'valid.ts'), { type: FileType.TEMPORARY }): string {
    return "valid";
  }
}`);

      const metrics = await duplicationDetector.detect();

      // Should handle syntax errors and still process valid files
      expect(metrics.totalLines).toBeGreaterThan(0);
      expect(typeof metrics.percentage).toBe('number');
    });

    test('should handle binary files in src directory', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create a binary file (should be ignored)
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]);
      await fileAPI.createFile(path.join(srcDir, 'binary.ts'), { type: FileType.TEMPORARY });

      // Create a valid text file
      await fileAPI.createFile(path.join(srcDir, 'text.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      // Should process text files despite binary files
      expect(metrics.totalLines).toBeGreaterThan(0);
    });

    test('should handle files with extremely long lines', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      const longLine = 'const longString = "' + 'a'.repeat(10000) + '";';
      const longLineContent = `
export class LongLineClass {
  method() {
    ${longLine}
    return longString;
  }
}`;

      await fileAPI.createFile(path.join(srcDir, 'long-line.ts'), { type: FileType.TEMPORARY });

      const metrics = await duplicationDetector.detect();

      expect(metrics.totalLines).toBeGreaterThan(0);
      expect(typeof metrics.percentage).toBe('number');
    });

    test('should handle concurrent file access', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create multiple files for concurrent access
      const filePromises = [];
      for (let i = 0; i < 10; i++) {
        const content = `
export class ConcurrentClass${i} {
  private value = ${i};
  
  getValue(): number {
    return this.value;
  }
  
  setValue(newValue: number): void {
    this.value = newValue;
  }
}`;
        filePromises.push(await fileAPI.createFile(path.join(srcDir, `concurrent${i}.ts`), { type: FileType.TEMPORARY }));
      }

      await Promise.all(filePromises);

      // Run multiple detections concurrently
      const detectionPromises = Array.from({ length: 3 }, () => duplicationDetector.detect());
      const results = await Promise.all(detectionPromises);

      // All results should be identical
      results.forEach(result => {
        expect(result.totalLines).toBe(results[0].totalLines);
        expect(result.duplicatedLines).toBe(results[0].duplicatedLines);
        expect(result.percentage).toBe(results[0].percentage);
      });
    });

    test('should handle permission errors on files', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create a normal file
      await fileAPI.createFile(path.join(srcDir, 'normal.ts'), { type: FileType.TEMPORARY });
      
      // Create a file and remove read permissions
      const restrictedFile = path.join(srcDir, 'restricted.ts');
      await fileAPI.createFile(restrictedFile, 'export const restricted = true;');
      await fs.chmod(restrictedFile, { type: FileType.TEMPORARY });

      try {
        const metrics = await duplicationDetector.detect();
        
        // Should handle permission errors and process other files
        expect(metrics.totalLines).toBeGreaterThan(0);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedFile, 0o644);
      }
    });
  });

  describe('Performance and Memory Usage', () => {
    test('should handle large codebases efficiently', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create a large number of files with substantial content
      const baseClass = `
export class GeneratedClass{ID} {
  private data: Map<string, any> = new Map();
  private listeners: Function[] = [];
  
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    this.data.set('initialized', true);
    this.data.set('timestamp', Date.now());
  }
  
  public addData(key: string, value: any): void {
    this.data.set(key, value);
    this.notifyListeners('dataAdded', { key, value });
  }
  
  public getData(key: string): any {
    return this.data.get(key);
  }
  
  public removeData(key: string): boolean {
    const existed = this.data.has(key);
    this.data.delete(key);
    if (existed) {
      this.notifyListeners('dataRemoved', { key });
    }
    return existed;
  }
  
  public addListener(listener: Function): void {
    this.listeners.push(listener);
  }
  
  public removeListener(listener: Function): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }
  
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}`;

      // Create many files with similar but not identical structure
      const fileCreationPromises = [];
      for (let i = 0; i < 20; i++) {
        const content = baseClass.replace(/{ID}/g, i.toString());
        fileCreationPromises.push(
          await fileAPI.createFile(path.join(srcDir, `generated-${i}.ts`), { type: FileType.TEMPORARY })
        );
      }

      await Promise.all(fileCreationPromises);

      const startTime = Date.now();
      const metrics = await duplicationDetector.detect();
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max

      expect(metrics.totalLines).toBeGreaterThan(500); // Substantial codebase
      expect(metrics.duplicatedLines).toBeGreaterThan(0); // Should detect duplicates
      expect(metrics.duplicatedBlocks.length).toBeGreaterThan(0);
    });

    test('should manage memory usage with large files', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create files with substantial content
      let largeContent = `export class LargeFile {\n`;
      
      // Add many methods to create a large file
      for (let i = 0; i < 1000; i++) {
        largeContent += `
  method${i}(param: any): any {
    const result = this.processParam${i}(param);
    return this.formatResult${i}(result);
  }
  
  private processParam${i}(param: any): any {
    return param ? param.toString() : 'default';
  }
  
  private formatResult${i}(result: any): any {
    return { processed: result, timestamp: Date.now() };
  }
`;
      }
      
      largeContent += `}`;

      await fileAPI.createFile(path.join(srcDir, 'large-file.ts'), { type: FileType.TEMPORARY });

      const initialMemory = process.memoryUsage().heapUsed;
      const metrics = await duplicationDetector.detect();
      const finalMemory = process.memoryUsage().heapUsed;

      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      expect(metrics.totalLines).toBeGreaterThan(1000);
      expect(typeof metrics.percentage).toBe('number');
    });

    test('should handle timeout scenarios gracefully', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fileAPI.createDirectory(srcDir);

      // Create moderate amount of content for timeout testing
      for (let i = 0; i < 5; i++) {
        const content = `
export class TimeoutTest${i} {
  ${Array.from({ length: 100 }, (_, j) => `
  method${j}(): string {
    return "method${j} result";
  }`).join('')}
}`;
        await fileAPI.createFile(path.join(srcDir, `timeout-test-${i}.ts`), { type: FileType.TEMPORARY });
      }

      // Set up timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        async setTimeout(() => reject(new Error('Detection timed out')), 60000); // 1 minute timeout
      });

      const detectionPromise = duplicationDetector.detect();

      // Race between detection and timeout
      const result = await Promise.race([detectionPromise, timeoutPromise]);
      
      // Should complete without timeout
      expect(result).toBeDefined();
      expect(typeof result.percentage).toBe('number');
    });
  });
});