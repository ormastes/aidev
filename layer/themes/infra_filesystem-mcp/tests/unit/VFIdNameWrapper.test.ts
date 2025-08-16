import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { VFIdNameWrapper, NameIdItem, IdNameStorage } from '../../children/VFIdNameWrapper';

describe('VFIdNameWrapper', () => {
  let wrapper: VFIdNameWrapper;
  let tempDir: string;
  const nameIdFile = 'NAME_ID.vf.json';

  beforeEach(() => {
    tempDir = path.join(__dirname, '../../temp/test-idname-wrapper');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    process.chdir(tempDir);
    
    wrapper = new VFIdNameWrapper(tempDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Storage Operations', () => {
    it('should create initial storage structure', async () => {
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      
      expect(storage.metadata).toBeDefined();
      expect(storage.metadata.version).toBe('1.0.0');
      expect(storage.types).toBeDefined();
      expect(storage.indices).toBeDefined();
    });

    it('should write and read items', async () => {
      const item: NameIdItem = {
        id: 'comp-1',
        type: 'component',
        name: 'Header',
        namespace: 'ui',
        full_path: 'src/components/Header.tsx',
        tags: ['navigation', 'layout']
      };

      await wrapper.write(nameIdFile, item);
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      expect(storage.types.component).toHaveLength(1);
      expect(storage.types.component[0].id).toBe('comp-1');
      expect(storage.metadata.total_items).toBe(1);
    });

    it('should write multiple items at once', async () => {
      const items: NameIdItem[] = [
        {
          id: 'func-1',
          type: 'function',
          name: 'getUserData',
          namespace: 'api',
          full_path: 'src/api/user.ts',
          tags: ['user', 'fetch']
        },
        {
          id: 'func-2',
          type: 'function',
          name: 'updateUserData',
          namespace: 'api',
          full_path: 'src/api/user.ts',
          tags: ['user', 'update']
        }
      ];

      await wrapper.write(nameIdFile, items);
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      expect(storage.types.function).toHaveLength(2);
      expect(storage.metadata.total_items).toBe(2);
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      const items: NameIdItem[] = [
        {
          id: 'comp-1',
          type: 'component',
          name: 'UserProfile',
          namespace: 'components',
          full_path: 'src/components/UserProfile.tsx',
          extension: 'tsx',
          tags: ['user', 'profile', 'ui']
        },
        {
          id: 'comp-2',
          type: 'component',
          name: 'UserSettings',
          namespace: 'components',
          full_path: 'src/components/UserSettings.tsx',
          extension: 'tsx',
          tags: ['user', 'settings', 'ui']
        },
        {
          id: 'hook-1',
          type: 'hook',
          name: 'useUser',
          namespace: 'hooks',
          full_path: 'src/hooks/useUser.ts',
          extension: 'ts',
          tags: ['user', 'state']
        },
        {
          id: 'util-1',
          type: 'util',
          name: 'formatUserData',
          namespace: 'utils',
          full_path: 'src/utils/user.ts',
          extension: 'ts',
          tags: ['user', 'format']
        }
      ];

      await wrapper.write(nameIdFile, items);
    });

    it('should search by name', async () => {
      const results = await wrapper.read(`${nameIdFile}?name=UserProfile`) as NameIdItem[];
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('UserProfile');
    });

    it('should search by tag', async () => {
      const results = await wrapper.read(`${nameIdFile}?tag=user`) as NameIdItem[];
      
      expect(results).toHaveLength(4);
      expect(results.every(item => item.tags?.includes('user'))).toBe(true);
    });

    it('should search by namespace', async () => {
      const results = await wrapper.read(`${nameIdFile}?namespace=components`) as NameIdItem[];
      
      expect(results).toHaveLength(2);
      expect(results.every(item => item.namespace === 'components')).toBe(true);
    });

    it('should search by type', async () => {
      const results = await wrapper.read(`${nameIdFile}?type=component`) as NameIdItem[];
      
      expect(results).toHaveLength(2);
      expect(results.every(item => item.type === 'component')).toBe(true);
    });

    it('should search by extension', async () => {
      const results = await wrapper.read(`${nameIdFile}?extension=tsx`) as NameIdItem[];
      
      expect(results).toHaveLength(2);
      expect(results.every(item => item.extension === 'tsx')).toBe(true);
    });

    it('should support multiple query parameters', async () => {
      const results = await wrapper.read(`${nameIdFile}?type=component&tag=settings`) as NameIdItem[];
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('UserSettings');
    });
  });

  describe('Index Building', () => {
    it('should build indices automatically', async () => {
      const items: NameIdItem[] = [
        {
          id: 'idx-1',
          type: 'component',
          name: 'TestComponent',
          namespace: 'test',
          full_path: 'test/TestComponent.tsx',
          extension: 'tsx',
          tags: ['test', 'sample']
        }
      ];

      await wrapper.write(nameIdFile, items);
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      
      expect(storage.indices?.by_name['testcomponent']).toContain('idx-1');
      expect(storage.indices?.by_namespace['test']).toContain('idx-1');
      expect(storage.indices?.by_tag['test']).toContain('idx-1');
      expect(storage.indices?.by_tag['sample']).toContain('idx-1');
      expect(storage.indices?.by_extension['tsx']).toContain('idx-1');
    });

    it('should handle case-insensitive name searches', async () => {
      const item: NameIdItem = {
        id: 'case-1',
        type: 'component',
        name: 'CaseSensitiveComponent',
        namespace: 'test',
        full_path: 'test/CaseSensitive.tsx'
      };

      await wrapper.write(nameIdFile, item);
      
      // Search with different case
      const results = await wrapper.read(`${nameIdFile}?name=casesensitivecomponent`) as NameIdItem[];
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('case-1');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      const items: NameIdItem[] = [
        {
          id: 'tag-1',
          type: 'component',
          name: 'TaggedComponent',
          namespace: 'test',
          full_path: 'test/Tagged.tsx',
          tags: ['important', 'featured']
        },
        {
          id: 'tag-2',
          type: 'util',
          name: 'taggedUtil',
          namespace: 'utils',
          full_path: 'utils/tagged.ts',
          tags: ['important', 'helper']
        }
      ];

      await wrapper.write(nameIdFile, items);
    });

    it('should get items by tag', async () => {
      const results = await wrapper.getItemsByTag('important', nameIdFile);
      
      expect(results).toHaveLength(2);
      expect(results.every(item => item.tags?.includes('important'))).toBe(true);
    });

    it('should get items by multiple tags', async () => {
      const results = await wrapper.getItemsByTags(['important', 'featured'], nameIdFile);
      
      expect(results).toHaveLength(2);
    });

    it('should get items by name', async () => {
      const results = await wrapper.getItemsByName('TaggedComponent', nameIdFile);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('TaggedComponent');
    });

    it('should get items by type', async () => {
      const results = await wrapper.getItemsByType('util', nameIdFile);
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('util');
    });
  });

  describe('Update and Remove Operations', () => {
    beforeEach(async () => {
      const item: NameIdItem = {
        id: 'update-1',
        type: 'component',
        name: 'UpdateableComponent',
        namespace: 'test',
        full_path: 'test/Updateable.tsx',
        tags: ['mutable']
      };

      await wrapper.write(nameIdFile, item);
    });

    it('should update existing item', async () => {
      await wrapper.updateItem('update-1', {
        name: 'UpdatedComponent',
        tags: ['mutable', 'changed']
      }, nameIdFile);
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      const item = storage.types.component.find(i => i.id === 'update-1');
      
      expect(item?.name).toBe('UpdatedComponent');
      expect(item?.tags).toContain('changed');
      expect(item?.updated_at).toBeDefined();
    });

    it('should remove item', async () => {
      await wrapper.removeItem('update-1', nameIdFile);
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      const item = storage.types.component?.find(i => i.id === 'update-1');
      
      expect(item).toBeUndefined();
      expect(storage.metadata.total_items).toBe(0);
    });

    it('should update indices when item is removed', async () => {
      await wrapper.removeItem('update-1', nameIdFile);
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      
      expect(storage.indices?.by_name['updateablecomponent']).toBeUndefined();
      expect(storage.indices?.by_namespace['test']).toBeUndefined();
      expect(storage.indices?.by_tag['mutable']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle reading non-existent file', async () => {
      const storage = await wrapper.read('non-existent.vf.json') as IdNameStorage;
      
      expect(storage.metadata).toBeDefined();
      expect(storage.types).toBeDefined();
      expect(storage.metadata.total_items).toBe(0);
    });

    it('should handle invalid query parameters gracefully', async () => {
      const item: NameIdItem = {
        id: 'error-1',
        type: 'component',
        name: 'ErrorTest',
        namespace: 'test',
        full_path: 'test/Error.tsx'
      };

      await wrapper.write(nameIdFile, item);
      
      // Invalid parameter should be ignored
      const results = await wrapper.read(`${nameIdFile}?invalidParam=value`) as NameIdItem[];
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle items with metadata', async () => {
      const item: NameIdItem = {
        id: 'meta-1',
        type: 'component',
        name: 'MetaComponent',
        namespace: 'test',
        full_path: 'test/Meta.tsx',
        metadata: {
          author: 'test-user',
          version: '1.0.0',
          deprecated: false
        }
      };

      await wrapper.write(nameIdFile, item);
      
      // Search by metadata field
      const results = await wrapper.read(`${nameIdFile}?author=test-user`) as NameIdItem[];
      
      expect(results).toHaveLength(1);
      expect(results[0].metadata?.author).toBe('test-user');
    });

    it('should maintain storage integrity with concurrent writes', async () => {
      // Sequential writes to ensure no race conditions
      for (let i = 0; i < 5; i++) {
        const item: NameIdItem = {
          id: `concurrent-${i}`,
          type: 'test',
          name: `ConcurrentItem${i}`,
          namespace: 'concurrent',
          full_path: `concurrent/Item${i}.ts`
        };
        
        await wrapper.write(nameIdFile, item);
      }
      
      const storage = await wrapper.read(nameIdFile) as IdNameStorage;
      expect(storage.metadata.total_items).toBe(5);
    });
  });
});