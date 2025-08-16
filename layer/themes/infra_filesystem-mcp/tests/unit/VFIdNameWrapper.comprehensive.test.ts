/**
 * Comprehensive Unit tests for VFIdNameWrapper (Mock Free Test Oriented Development)
 * 
 * Testing ID_NAME.vf.json handling with index management - additional coverage
 */

import { VFIdNameWrapper, NameIdItem, IdNameStorage } from '../../children/VFIdNameWrapper';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('VFIdNameWrapper - Comprehensive Tests', () => {
  let testDir: string;
  let wrapper: VFIdNameWrapper;
  let testFilePath: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), 'vf-id-name-wrapper-comp-test-' + Date.now());
    await fs.promises.mkdir(testDir, { recursive: true });
    wrapper = new VFIdNameWrapper(testDir);
    testFilePath = path.join(testDir, 'ID_NAME.vf.json');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create wrapper with default base path', () => {
      const defaultWrapper = new VFIdNameWrapper();
      expect(defaultWrapper).toBeDefined();
    });

    it('should create wrapper with custom base path', () => {
      const customWrapper = new VFIdNameWrapper('/custom/path');
      expect(customWrapper).toBeDefined();
    });
  });

  describe('index management', () => {
    it('should create indices for all fields', async () => {
      const items: NameIdItem[] = [
        {
          id: 'item-1',
          type: 'file',
          namespace: 'namespace1',
          name: 'Item1',
          full_path: '/path/item1',
          extension: '.ts',
          tags: ['tag1', 'tag2']
        },
        {
          id: 'item-2',
          type: 'class',
          namespace: 'namespace2',
          name: 'Item2',
          full_path: '/path/item2',
          extension: '.js',
          tags: ['tag2', 'tag3']
        }
      ];

      await wrapper.write(testFilePath, items);
      const storage = await wrapper.read(testFilePath) as IdNameStorage;

      // Check indices structure
      expect(storage.indices).toBeDefined();
      expect(storage.indices!.by_name).toBeDefined();
      expect(storage.indices!.by_namespace).toBeDefined();
      expect(storage.indices!.by_tag).toBeDefined();
      expect(storage.indices!.by_extension).toBeDefined();

      // Check name indices (lowercase)
      expect(storage.indices!.by_name['item1']).toContain('item-1');
      expect(storage.indices!.by_name['item2']).toContain('item-2');

      // Check namespace indices
      expect(storage.indices!.by_namespace['namespace1']).toContain('item-1');
      expect(storage.indices!.by_namespace['namespace2']).toContain('item-2');

      // Check tag indices (lowercase)
      expect(storage.indices!.by_tag['tag1']).toContain('item-1');
      expect(storage.indices!.by_tag['tag2']).toContain('item-1');
      expect(storage.indices!.by_tag['tag2']).toContain('item-2');
      expect(storage.indices!.by_tag['tag3']).toContain('item-2');

      // Check extension indices
      expect(storage.indices!.by_extension['.ts']).toContain('item-1');
      expect(storage.indices!.by_extension['.js']).toContain('item-2');
    });

    it('should handle items without tags or extensions', async () => {
      const item: NameIdItem = {
        id: 'minimal-item',
        type: 'function',
        namespace: 'utils',
        name: 'MinimalFunction',
        full_path: '/utils/minimal'
        // No tags or extension
      };

      await wrapper.write(testFilePath, item);
      const storage = await wrapper.read(testFilePath) as IdNameStorage;

      expect(storage.indices!.by_name['minimalfunction']).toContain('minimal-item');
      expect(storage.indices!.by_namespace['utils']).toContain('minimal-item');
      expect(Object.keys(storage.indices!.by_tag)).toHaveLength(0);
      expect(Object.keys(storage.indices!.by_extension)).toHaveLength(0);
    });

    it('should update indices when items are removed', async () => {
      const items: NameIdItem[] = [
        {
          id: 'item-1',
          type: 'file',
          namespace: 'test',
          name: 'File1',
          full_path: '/test/file1',
          tags: ['important']
        },
        {
          id: 'item-2',
          type: 'file',
          namespace: 'test',
          name: 'File2',
          full_path: '/test/file2',
          tags: ['important']
        }
      ];

      await wrapper.write(testFilePath, items);
      await wrapper.removeItem('item-1', testFilePath);

      const storage = await wrapper.read(testFilePath) as IdNameStorage;
      
      // Check that item-1 is removed from indices
      expect(storage.indices!.by_name['file1']).toBeUndefined();
      expect(storage.indices!.by_namespace['test']).toContain('item-2');
      expect(storage.indices!.by_namespace['test']).not.toContain('item-1');
      expect(storage.indices!.by_tag['important']).toContain('item-2');
      expect(storage.indices!.by_tag['important']).not.toContain('item-1');
    });
  });

  describe('search functionality', () => {
    beforeEach(async () => {
      const testData: IdNameStorage = {
        metadata: {
          version: '1.0.0',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          total_items: 6
        },
        types: {
          file: [
            {
              id: 'file-1',
              type: 'file',
              namespace: 'src',
              name: 'App.tsx',
              full_path: '/src/App.tsx',
              extension: '.tsx',
              tags: ['component', 'react'],
              metadata: { author: 'john' }
            },
            {
              id: 'file-2',
              type: 'file',
              namespace: 'src',
              name: 'utils.ts',
              full_path: '/src/utils.ts',
              extension: '.ts',
              tags: ['utility'],
              metadata: { author: 'jane' }
            }
          ],
          class: [
            {
              id: 'class-1',
              type: 'class',
              namespace: 'models',
              name: 'User',
              full_path: '/models/User.ts',
              extension: '.ts',
              tags: ['model', 'entity']
            },
            {
              id: 'class-2',
              type: 'class',
              namespace: 'models',
              name: 'Product',
              full_path: '/models/Product.ts',
              extension: '.ts',
              tags: ['model', 'entity']
            }
          ],
          test: [
            {
              id: 'test-1',
              type: 'test',
              namespace: 'tests',
              name: 'App.test.tsx',
              full_path: '/tests/App.test.tsx',
              extension: '.tsx',
              tags: ['test', 'react']
            },
            {
              id: 'test-2',
              type: 'test',
              namespace: 'tests',
              name: 'utils.test.ts',
              full_path: '/tests/utils.test.ts',
              extension: '.ts',
              tags: ['test', 'utility']
            }
          ]
        }
      };

      await fs.promises.writeFile(testFilePath, JSON.stringify(testData, null, 2));
    });

    it('should combine multiple search criteria', async () => {
      // Search for typescript files with 'model' tag
      const result = await wrapper.read(`${testFilePath}?extension=.ts&tag=model`) as NameIdItem[];
      expect(result).toHaveLength(2);
      expect(result.every(item => item.extension === '.ts' && item.tags?.includes('model'))).toBe(true);
    });

    it('should search by custom metadata fields', async () => {
      const result = await wrapper.read(`${testFilePath}?author=john`) as NameIdItem[];
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('file-1');
    });

    it('should handle complex query with multiple filters', async () => {
      const result = await wrapper.read(`${testFilePath}?type=file&namespace=src&extension=.ts`) as NameIdItem[];
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('utils.ts');
    });

    it('should return empty array when no matches found', async () => {
      const result = await wrapper.read(`${testFilePath}?name=NonExistent`) as NameIdItem[];
      expect(result).toHaveLength(0);
    });

    it('should handle tags parameter (alias for tag)', async () => {
      const result = await wrapper.read(`${testFilePath}?tags=react`) as NameIdItem[];
      expect(result).toHaveLength(2);
      expect(result.every(item => item.tags?.includes('react'))).toBe(true);
    });
  });

  describe('type management', () => {
    it('should handle all predefined types', async () => {
      const types = [
        'file', 'directory', 'function', 'class', 'method', 'variable',
        'constant', 'interface', 'type', 'module', 'namespace', 'component',
        'concept', 'service', 'entity', 'schema', 'config', 'test', 'script', 'other'
      ];

      const items: NameIdItem[] = types.map((type, index) => ({
        id: `${type}-1`,
        type,
        namespace: 'test',
        name: `Test${type}`,
        full_path: `/test/${type}`
      }));

      await wrapper.write(testFilePath, items);
      const storage = await wrapper.read(testFilePath) as IdNameStorage;

      // Check all types are created
      types.forEach(type => {
        expect(storage.types[type]).toBeDefined();
        expect(storage.types[type]).toHaveLength(1);
      });

      expect(storage.metadata.total_items).toBe(types.length);
    });

    it('should create new type arrays on demand', async () => {
      const item: NameIdItem = {
        id: 'custom-1',
        type: 'custom-type',
        namespace: 'test',
        name: 'CustomItem',
        full_path: '/test/custom'
      };

      await wrapper.write(testFilePath, item);
      const storage = await wrapper.read(testFilePath) as IdNameStorage;

      expect(storage.types['custom-type']).toBeDefined();
      expect(storage.types['custom-type']).toHaveLength(1);
    });
  });

  describe('update operations', () => {
    it('should preserve ID when updating', async () => {
      const item: NameIdItem = {
        id: 'preserve-1',
        type: 'file',
        namespace: 'test',
        name: 'Original',
        full_path: '/test/original'
      };

      await wrapper.write(testFilePath, item);
      await wrapper.updateItem('preserve-1', {
        id: 'changed-id', // This should be ignored
        name: 'Updated'
      }, testFilePath);

      const storage = await wrapper.read(testFilePath) as IdNameStorage;
      const updated = storage.types.file[0];
      expect(updated.id).toBe('preserve-1'); // ID preserved
      expect(updated.name).toBe('Updated');
    });

    it('should update timestamps', async () => {
      const item: NameIdItem = {
        id: 'time-1',
        type: 'file',
        namespace: 'test',
        name: 'TimeTest',
        full_path: '/test/time',
        created_at: '2023-01-01T00:00:00.000Z'
      };

      await wrapper.write(testFilePath, item);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await wrapper.updateItem('time-1', {
        name: 'UpdatedTime'
      }, testFilePath);

      const storage = await wrapper.read(testFilePath) as IdNameStorage;
      const updated = storage.types.file[0];
      expect(updated.created_at).toBe('2023-01-01T00:00:00.000Z'); // Original preserved
      expect(updated.updated_at).not.toBe('2023-01-01T00:00:00.000Z'); // Updated
    });

    it('should handle partial updates with undefined values', async () => {
      const item: NameIdItem = {
        id: 'partial-1',
        type: 'file',
        namespace: 'test',
        name: 'Partial',
        full_path: '/test/partial',
        description: 'Original description',
        tags: ['original']
      };

      await wrapper.write(testFilePath, item);
      await wrapper.updateItem('partial-1', {
        description: 'New description',
        tags: undefined // Should keep original
      }, testFilePath);

      const storage = await wrapper.read(testFilePath) as IdNameStorage;
      const updated = storage.types.file[0];
      expect(updated.description).toBe('New description');
      expect(updated.tags).toEqual(['original']); // Original preserved
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Create a read-only directory
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.promises.mkdir(readOnlyDir);
      
      if (process.platform !== 'win32') {
        await fs.promises.chmod(readOnlyDir, 0o444);
        
        const readOnlyWrapper = new VFIdNameWrapper(readOnlyDir);
        const readOnlyPath = path.join(readOnlyDir, 'ID_NAME.vf.json');
        
        try {
          await readOnlyWrapper.write(readOnlyPath, {
            id: 'test-1',
            type: 'file',
            namespace: 'test',
            name: 'Test',
            full_path: '/test'
          });
          
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Restore permissions for cleanup
        await fs.promises.chmod(readOnlyDir, 0o755);
      }
    });

    it('should validate storage structure', async () => {
      // Write invalid JSON
      await fs.promises.writeFile(testFilePath, '{ invalid json');
      
      try {
        await wrapper.read(testFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('performance considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset: NameIdItem[] = [];
      const itemCount = 1000;
      
      // Create a large dataset
      for (let i = 0; i < itemCount; i++) {
        largeDataset.push({
          id: `item-${i}`,
          type: i % 2 === 0 ? 'file' : 'class',
          namespace: `namespace-${i % 10}`,
          name: `Item${i}`,
          full_path: `/path/item${i}`,
          extension: i % 3 === 0 ? '.ts' : '.js',
          tags: [`tag${i % 5}`, `category${i % 3}`]
        });
      }

      const startWrite = Date.now();
      await wrapper.write(testFilePath, largeDataset);
      const writeTime = Date.now() - startWrite;

      const startRead = Date.now();
      const storage = await wrapper.read(testFilePath) as IdNameStorage;
      const readTime = Date.now() - startRead;

      expect(storage.metadata.total_items).toBe(itemCount);
      expect(writeTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(readTime).toBeLessThan(1000); // Should read within 1 second

      // Test indexed search performance
      const startSearch = Date.now();
      const searchResult = await wrapper.read(`${testFilePath}?tag=tag1`) as NameIdItem[];
      const searchTime = Date.now() - startSearch;

      expect(searchResult.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100); // Indexed search should be fast
    });
  });

  describe('backward compatibility', () => {
    it('should handle storage without indices', async () => {
      const oldFormatStorage = {
        metadata: {
          version: '0.9.0',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          total_items: 1
        },
        types: {
          file: [{
            id: 'old-1',
            type: 'file',
            namespace: 'legacy',
            name: 'OldFile',
            full_path: '/legacy/old'
          }]
        }
        // No indices field
      };

      await fs.promises.writeFile(testFilePath, JSON.stringify(oldFormatStorage, null, 2));
      
      const storage = await wrapper.read(testFilePath) as IdNameStorage;
      
      // Should have built indices automatically
      expect(storage.indices).toBeDefined();
      expect(storage.indices!.by_name['oldfile']).toContain('old-1');
    });
  });
});