import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { VFFileWrapper } from '../../children/VFFileWrapper';

describe('VFFileWrapper Comprehensive Tests', () => {
  let wrapper: VFFileWrapper;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../../temp/test-file-wrapper-comprehensive');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    process.chdir(tempDir);
    
    wrapper = new VFFileWrapper(tempDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('File Operations', () => {
    it('should write and read JSON files', async () => {
      const data = { test: 'data', nested: { value: 123 } };
      await wrapper.write('test.json', data);
      
      const read = await wrapper.read('test.json');
      expect(read).toEqual(data);
    });

    it('should handle arrays', async () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      await wrapper.write('array.json', data);
      
      const read = await wrapper.read('array.json');
      expect(Array.isArray(read)).toBe(true);
      expect(read).toHaveLength(3);
    });

    it('should create nested directories', async () => {
      const data = { nested: true };
      await wrapper.write('deep/nested/path/file.json', data);
      
      expect(fs.existsSync('deep/nested/path/file.json')).toBe(true);
      const read = await wrapper.read('deep/nested/path/file.json');
      expect(read).toEqual(data);
    });

    it('should overwrite existing files', async () => {
      await wrapper.write('overwrite.json', { version: 1 });
      await wrapper.write('overwrite.json', { version: 2 });
      
      const read = await wrapper.read('overwrite.json');
      expect(read).toEqual({ version: 2 });
    });
  });

  describe('Path Resolution', () => {
    it('should handle absolute paths', async () => {
      const absolutePath = path.join(tempDir, 'absolute.json');
      await wrapper.write(absolutePath, { absolute: true });
      
      const read = await wrapper.read(absolutePath);
      expect(read).toEqual({ absolute: true });
    });

    it('should resolve relative paths from base directory', async () => {
      await wrapper.write('./relative.json', { relative: true });
      
      expect(fs.existsSync(path.join(tempDir, 'relative.json'))).toBe(true);
    });

    it('should handle paths with ..', async () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      
      const subWrapper = new VFFileWrapper(subDir);
      await subWrapper.write('../parent.json', { parent: true });
      
      expect(fs.existsSync(path.join(tempDir, 'parent.json'))).toBe(true);
    });
  });

  describe('Query Parameters', () => {
    beforeEach(async () => {
      // Set up test data
      const items = [
        { id: '1', name: 'Item One', type: 'typeA', status: 'active' },
        { id: '2', name: 'Item Two', type: 'typeB', status: 'active' },
        { id: '3', name: 'Item Three', type: 'typeA', status: 'inactive' }
      ];
      await wrapper.write('items.json', items);
    });

    it('should filter by single parameter', async () => {
      const result = await wrapper.read('items.json?type=typeA');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('typeA');
      expect(result[1].type).toBe('typeA');
    });

    it('should filter by multiple parameters', async () => {
      const result = await wrapper.read('items.json?type=typeA&status=active');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array when no matches', async () => {
      const result = await wrapper.read('items.json?type=typeC');
      expect(result).toEqual([]);
    });

    it('should handle URL encoded parameters', async () => {
      const items = [{ name: 'Test Item', description: 'Has spaces & special chars!' }];
      await wrapper.write('special.json', items);
      
      const result = await wrapper.read('special.json?description=Has%20spaces%20%26%20special%20chars!');
      expect(result).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent files', async () => {
      await expect(wrapper.read('non-existent.json')).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      fs.writeFileSync('invalid.json', 'not valid json');
      await expect(wrapper.read('invalid.json')).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      fs.writeFileSync('empty.json', '');
      await expect(wrapper.read('empty.json')).rejects.toThrow();
    });

    it('should create parent directories on write', async () => {
      await wrapper.write('new/deep/path/file.json', { created: true });
      expect(fs.existsSync('new/deep/path')).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should preserve Date objects', async () => {
      const data = {
        created: new Date('2023-01-01'),
        updated: new Date('2023-01-02')
      };
      await wrapper.write('dates.json', data);
      
      const read = await wrapper.read('dates.json');
      // Dates are serialized as strings in JSON
      expect(typeof read.created).toBe('string');
      expect(read.created).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle null and undefined', async () => {
      const data = {
        nullValue: null,
        // undefined is not serialized in JSON
        definedValue: 'test'
      };
      await wrapper.write('nulls.json', data);
      
      const read = await wrapper.read('nulls.json');
      expect(read.nullValue).toBeNull();
      expect(read.undefinedValue).toBeUndefined();
    });
  });

  describe('Special Cases', () => {
    it('should handle files with .vf.json extension', async () => {
      const data = { vf: true };
      await wrapper.write('test.vf.json', data);
      
      const read = await wrapper.read('test.vf.json');
      expect(read).toEqual(data);
    });

    it('should handle large files', async () => {
      const largeArray = Array(1000).fill(null).map((_, i) => ({
        id: i,
        data: 'x'.repeat(100)
      }));
      
      await wrapper.write('large.json', largeArray);
      const read = await wrapper.read('large.json');
      expect(read).toHaveLength(1000);
    });

    it('should handle concurrent writes', async () => {
      const writes: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        writes.push(wrapper.write(`concurrent-${i}.json`, { index: i }));
      }
      
      await Promise.all(writes);
      
      for (let i = 0; i < 10; i++) {
        const read = await wrapper.read(`concurrent-${i}.json`);
        expect(read).toEqual({ index: i });
      }
    });
  });

  describe('Query on Non-Array Data', () => {
    it('should return full object when querying non-array', async () => {
      const obj = { id: '1', name: 'Object', type: 'single' };
      await wrapper.write('object.json', obj);
      
      const result = await wrapper.read('object.json?type=single');
      expect(result).toEqual(obj);
    });

    it('should return object even with non-matching query', async () => {
      const obj = { id: '1', name: 'Object', type: 'single' };
      await wrapper.write('object.json', obj);
      
      const result = await wrapper.read('object.json?type=other');
      expect(result).toEqual(obj);
    });
  });

  describe('Protected Methods', () => {
    it('should correctly resolve paths', () => {
      const resolved = (wrapper as any).resolvePath('test/file.json');
      expect(resolved).toBe(path.join(tempDir, 'test/file.json'));
    });

    it('should parse file paths with queries', () => {
      const { filePath, query } = (wrapper as any).parseFilePath('test.json?foo=bar&baz=qux');
      expect(filePath).toBe('test.json');
      expect(query).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should parse file paths without queries', () => {
      const { filePath, query } = (wrapper as any).parseFilePath('test.json');
      expect(filePath).toBe('test.json');
      expect(query).toEqual({});
    });
  });
});