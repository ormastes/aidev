import { VFFileWrapper } from '../../children/VFFileWrapper';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

// Extend VFFileWrapper with array filtering for testing
class TestVFFileWrapper extends VFFileWrapper {
  protected applyQueryFilters(data: any, params: Record<string, any>): any {
    // If no params or data is not an array, return as-is
    if (Object.keys(params).length === 0 || !Array.isArray(data)) {
      return data;
    }

    // Filter array based on params
    return data.filter(item => {
      return Object.entries(params).every(([key, value]) => {
        // Handle array values (multiple values for same key)
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return item[key] === value;
      });
    });
  }
}

describe('VFFileWrapper with Filtering', () => {
  const tempDir = path.join(__dirname, 'temp-filter-test');
  let wrapper: TestVFFileWrapper;

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    process.chdir(tempDir);
    wrapper = new TestVFFileWrapper(tempDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Query Parameter Filtering', () => {
    beforeEach(async () => {
      const items = [
        { id: '1', type: 'typeA', status: 'active' },
        { id: '2', type: 'typeA', status: 'inactive' },
        { id: '3', type: 'typeB', status: 'active' },
        { id: '4', type: 'typeB', status: 'inactive' }
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

    it('should return all items when no query params', async () => {
      const result = await wrapper.read('items.json');
      expect(result).toHaveLength(4);
    });

    it('should handle non-array data', async () => {
      await wrapper.write('object.json', { name: 'test', value: 123 });
      const result = await wrapper.read('object.json?name=test');
      expect(result).toEqual({ name: 'test', value: 123 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', async () => {
      await wrapper.write('empty.json', []);
      const result = await wrapper.read('empty.json?type=any');
      expect(result).toEqual([]);
    });

    it('should handle null values in filtering', async () => {
      const items = [
        { id: 1, value: null },
        { id: 2, value: 'test' }
      ];
      await wrapper.write('nulls.json', items);
      
      const result = await wrapper.read('nulls.json?value=test');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('should handle nested object filtering', async () => {
      const items = [
        { id: 1, details: { type: 'A' } },
        { id: 2, details: { type: 'B' } }
      ];
      await wrapper.write('nested.json', items);
      
      // Note: This basic implementation doesn't support nested filtering
      // Just ensuring it doesn't crash
      const result = await wrapper.read('nested.json');
      expect(result).toHaveLength(2);
    });
  });

  describe('parseQueryParams', () => {
    it('should parse single parameter', () => {
      const result = (wrapper as any).parseQueryParams('file.json?key=value');
      expect(result).toEqual({
        path: 'file.json',
        params: { key: 'value' }
      });
    });

    it('should parse multiple parameters', () => {
      const result = (wrapper as any).parseQueryParams('file.json?key1=value1&key2=value2');
      expect(result).toEqual({
        path: 'file.json',
        params: { key1: 'value1', key2: 'value2' }
      });
    });

    it('should handle no query params', () => {
      const result = (wrapper as any).parseQueryParams('file.json');
      expect(result).toEqual({
        path: 'file.json',
        params: {}
      });
    });

    it('should handle URL encoded values', () => {
      const result = (wrapper as any).parseQueryParams('file.json?name=John%20Doe&city=New%20York');
      expect(result).toEqual({
        path: 'file.json',
        params: { name: 'John Doe', city: 'New York' }
      });
    });

    it('should handle multiple values for same key', () => {
      const result = (wrapper as any).parseQueryParams('file.json?tag=one&tag=two&tag=three');
      expect(result.params.tag).toEqual(['one', 'two', 'three']);
    });

    it('should handle empty query string', () => {
      const result = (wrapper as any).parseQueryParams('file.json?');
      expect(result).toEqual({
        path: 'file.json',
        params: {}
      });
    });
  });
});