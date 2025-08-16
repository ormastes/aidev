import { MFTODConverter } from '../../src/application/converter';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn()
  }
}));

describe('MFTODConverter Integration Tests', () => {
  let converter: MFTODConverter;
  const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;

  beforeEach(() => {
    converter = new MFTODConverter();
    jest.clearAllMocks();
  });

  describe("convertFile", () => {
    const testCode = `
      describe("Calculator", () => {
        it('should add two numbers', () => {
          const result = add(2, 3);
          expect(result).toBe(5);
        });

        it('should subtract two numbers', () => {
          const result = subtract(5, 3);
          expect(result).toBe(2);
        });
      });
    `;

    it('should convert a test file to markdown format', async () => {
      mockFs.readFile.mockResolvedValue(testCode);

      const result = await converter.convertFile('test.spec.ts');

      expect(mockFs.readFile).toHaveBeenCalledWith('test.spec.ts', 'utf-8');
      expect(result).toContain("Calculator");
      expect(result).toContain('add two numbers');
      expect(result).toContain('subtract two numbers');
    });

    it('should support different output formats', async () => {
      mockFs.readFile.mockResolvedValue(testCode);

      const markdownResult = await converter.convertFile('test.spec.ts', { format: "markdown" });
      const htmlResult = await converter.convertFile('test.spec.ts', { format: 'html' });
      const jsonResult = await converter.convertFile('test.spec.ts', { format: 'json' });

      expect(markdownResult).toContain('# Test Documentation');
      expect(htmlResult).toContain('<html');
      expect(JSON.parse(jsonResult)).toHaveProperty('title');
    });

    it('should handle professional formatting', async () => {
      mockFs.readFile.mockResolvedValue(testCode);

      const result = await converter.convertFile('test.spec.ts', { 
        format: "professional",
        includeCodeSnippets: false
      });

      expect(result).toContain('Professional Test Manual');
      expect(result).toContain('Executive Summary');
    });

    it('should save output when path is specified', async () => {
      mockFs.readFile.mockResolvedValue(testCode);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const outputPath = path.join('output', 'test-manual.md');
      await converter.convertFile('test.spec.ts', { outputPath });

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(outputPath, expect.any(String), 'utf-8');
    });
  });

  describe("convertDirectory", () => {
    it('should process multiple test files', async () => {
      const files = ['test1.test.ts', 'test2.spec.ts'];
      const dirEntries = files.map(name => ({ name, isFile: () => true, isDirectory: () => false }));
      
      mockFs.readdir.mockResolvedValue(dirEntries as any);
      mockFs.readFile.mockResolvedValue('it("test", () => {});');

      const results = await converter.convertDirectory('/test/dir');

      expect(results.size).toBe(2);
      expect(Array.from(results.keys()).every(r => r.endsWith('.test.ts') || r.endsWith('.spec.ts'))).toBe(true);
    });
  });
});