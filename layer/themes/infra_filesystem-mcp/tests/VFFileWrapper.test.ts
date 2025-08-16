/**
 * Unit tests for VFFileWrapper
 */

import { VFFileWrapper } from '../children/VFFileWrapper';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { os } from '../../infra_external-log-lib/src';

describe("VFFileWrapper", () => {
  let tempDir: string;
  let wrapper: VFFileWrapper;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-test-'));
    wrapper = new VFFileWrapper(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("parseQueryParams", () => {
    test('should parse simple query parameters', () => {
      const result = (wrapper as any).parseQueryParams('/path/to/file?name=test&type=json');
      
      expect(result.path).toBe('/path/to/file');
      expect(result.params).toEqual({
        name: 'test',
        type: 'json'
      });
    });

    test('should handle multiple values for same key', () => {
      const result = (wrapper as any).parseQueryParams('/file?tag=one&tag=two&tag=three');
      
      expect(result.path).toBe('/file');
      expect(result.params.tag).toEqual(['one', 'two', 'three']);
    });

    test('should handle paths without query parameters', () => {
      const result = (wrapper as any).parseQueryParams('/path/to/file.json');
      
      expect(result.path).toBe('/path/to/file.json');
      expect(result.params).toEqual({});
    });

    test('should handle URL-encoded parameters', () => {
      const result = (wrapper as any).parseQueryParams('/file?name=hello%20world&data=test%3Dvalue');
      
      expect(result.path).toBe('/file');
      expect(result.params).toEqual({
        name: 'hello world',
        data: 'test=value'
      });
    });
  });

  describe('read', () => {
    test('should read JSON file with query parameters', async () => {
      const testData = { name: 'test', values: [1, 2, 3] };
      const filePath = path.join(tempDir, 'test.json');
      await fs.writeFile(filePath, JSON.stringify(testData));

      const result = await wrapper.read('test.json?someParam=value');
      
      expect(result).toEqual(testData);
    });

    test('should return null for non-existent file', async () => {
      const result = await wrapper.read('non-existent.json');
      
      expect(result).toBeNull();
    });

    test('should return empty object with createIfMissing parameter', async () => {
      const result = await wrapper.read('non-existent.json?createIfMissing=true');
      
      expect(result).toEqual({});
    });

    test('should throw error for invalid JSON', async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, 'not valid json');

      await expect(wrapper.read('invalid.json')).rejects.toThrow();
    });
  });

  describe('write', () => {
    test('should write JSON content to file', async () => {
      const testData = { message: 'Hello, World!' };
      
      await wrapper.write('output.json', testData);
      
      const filePath = path.join(tempDir, 'output.json');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(testData);
    });

    test('should create directory if it does not exist', async () => {
      const testData = { nested: true };
      
      await wrapper.write('subdir/nested/file.json', testData);
      
      const filePath = path.join(tempDir, 'subdir', 'nested', 'file.json');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(testData);
    });

    test('should ignore query parameters when writing', async () => {
      const testData = { data: 'test' };
      
      await wrapper.write('file.json?param=value', testData);
      
      const filePath = path.join(tempDir, 'file.json');
      expect(await wrapper.exists('file.json')).toBe(true);
    });
  });

  describe('full_read', () => {
    test('should read file as Buffer', async () => {
      const testContent = 'Binary content test';
      const filePath = path.join(tempDir, 'binary.dat');
      await fs.writeFile(filePath, testContent);

      const result = await wrapper.full_read('binary.dat');
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(testContent);
    });

    test('should handle binary data correctly', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF]);
      const filePath = path.join(tempDir, 'binary.bin');
      await fs.writeFile(filePath, binaryData);

      const result = await wrapper.full_read('binary.bin');
      
      expect(result).toEqual(binaryData);
    });
  });

  describe('full_write', () => {
    test('should write Buffer to file', async () => {
      const buffer = Buffer.from('Test buffer content');
      
      await wrapper.full_write('buffer.txt', buffer);
      
      const filePath = path.join(tempDir, 'buffer.txt');
      const content = await fs.readFile(filePath);
      expect(content).toEqual(buffer);
    });

    test('should handle binary buffer correctly', async () => {
      const binaryBuffer = Buffer.from([0xFF, 0xFE, 0xFD, 0x00]);
      
      await wrapper.full_write('binary.dat', binaryBuffer);
      
      const filePath = path.join(tempDir, 'binary.dat');
      const content = await fs.readFile(filePath);
      expect(content).toEqual(binaryBuffer);
    });
  });

  describe('exists', () => {
    test('should return true for existing file', async () => {
      await fs.writeFile(path.join(tempDir, 'exists.txt'), 'content');
      
      const result = await wrapper.exists('exists.txt');
      
      expect(result).toBe(true);
    });

    test('should return false for non-existent file', async () => {
      const result = await wrapper.exists('does-not-exist.txt');
      
      expect(result).toBe(false);
    });

    test('should ignore query parameters', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');
      
      const result = await wrapper.exists('file.txt?param=value');
      
      expect(result).toBe(true);
    });
  });

  describe('delete', () => {
    test('should delete existing file', async () => {
      const filePath = path.join(tempDir, 'delete-me.txt');
      await fs.writeFile(filePath, 'content');
      
      await wrapper.delete('delete-me.txt');
      
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    test('should throw error when deleting non-existent file', async () => {
      await expect(wrapper.delete('non-existent.txt')).rejects.toThrow();
    });
  });

  describe('list', () => {
    test('should list files in directory', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), "content1");
      await fs.writeFile(path.join(tempDir, 'file2.txt'), "content2");
      await fs.mkdir(path.join(tempDir, 'subdir'));
      
      const result = await wrapper.list('.');
      
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
      expect(result).toContain('subdir');
    });

    test('should return empty array for non-existent directory', async () => {
      const result = await wrapper.list('non-existent-dir');
      
      expect(result).toEqual([]);
    });
  });

  describe("resolvePath", () => {
    test('should resolve relative paths correctly', () => {
      const resolved = (wrapper as any).resolvePath('subdir/file.txt');
      
      expect(resolved).toBe(path.resolve(tempDir, 'subdir/file.txt'));
    });

    test('should handle absolute paths', () => {
      const absolutePath = '/absolute/path/file.txt';
      const resolved = (wrapper as any).resolvePath(absolutePath);
      
      expect(resolved).toBe(path.resolve(absolutePath));
    });
  });
});