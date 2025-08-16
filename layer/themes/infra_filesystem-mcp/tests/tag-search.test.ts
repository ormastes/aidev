/**
 * Test file for tag search functionality in VF wrappers
 */

import { VFNameIdWrapper } from '../children/VFNameIdWrapper';
import { VFIdNameWrapper } from '../children/VFIdNameWrapper';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

describe('Tag Search Functionality', () => {
  const testDir = path.join(__dirname, 'test-data');
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('VFNameIdWrapper Tag Search', () => {
    const wrapper = new VFNameIdWrapper(testDir);
    const testFile = path.join(testDir, 'test-entities.vf.json');

    it('should filter entities by single tag', async () => {
      // Create test entities
      const entities = {
        "UserProfile": [
          {
            id: '1',
            name: "UserProfile",
            data: { type: "component" },
            tags: ['react', 'ui', 'user'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        "AuthService": [
          {
            id: '2',
            name: "AuthService",
            data: { type: 'service' },
            tags: ['auth', "security", 'user'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        "DatabaseConfig": [
          {
            id: '3',
            name: "DatabaseConfig",
            data: { type: 'config' },
            tags: ['config', "database"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
      
      await wrapper.write(testFile, entities);
      
      // Test single tag search
      const userTagged = await wrapper.getEntitiesByTag('user', testFile);
      expect(userTagged).toHaveLength(2);
      expect(userTagged.map(e => e.name)).toContain("UserProfile");
      expect(userTagged.map(e => e.name)).toContain("AuthService");
      
      // Test case-insensitive search
      const uiTagged = await wrapper.read(`${testFile}?tag=UI`);
      expect(uiTagged).toHaveLength(1);
      expect(uiTagged[0].name).toBe("UserProfile");
    });

    it('should filter entities by multiple tags (OR operation)', async () => {
      const entities = {
        "Component1": [
          {
            id: '1',
            name: "Component1",
            data: {},
            tags: ['react', 'ui'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        "Service1": [
          {
            id: '2',
            name: "Service1",
            data: {},
            tags: ['api', 'backend'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        'Config1': [
          {
            id: '3',
            name: 'Config1',
            data: {},
            tags: ['config', 'ui'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
      
      await wrapper.write(testFile, entities);
      
      // Search for entities with either 'ui' or 'api' tags
      const results = await wrapper.getEntitiesByTags(['ui', 'api'], testFile);
      expect(results).toHaveLength(3); // All entities match
    });

    it('should handle entities without tags', async () => {
      const entities = {
        'NoTags': [
          {
            id: '1',
            name: 'NoTags',
            data: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        "WithTags": [
          {
            id: '2',
            name: "WithTags",
            data: {},
            tags: ['test'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
      
      await wrapper.write(testFile, entities);
      
      const results = await wrapper.getEntitiesByTag('test', testFile);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("WithTags");
    });
  });

  describe('VFIdNameWrapper Tag Search', () => {
    const wrapper = new VFIdNameWrapper(testDir);
    const testFile = path.join(testDir, 'ID_NAME.vf.json');

    it('should build and use tag indices for fast search', async () => {
      // Create test items
      const items = [
        {
          id: 'comp-1',
          type: "component",
          namespace: 'src/components',
          name: "UserProfile",
          full_path: 'src/components/UserProfile.tsx',
          tags: ['react', 'ui', 'user']
        },
        {
          id: 'func-1',
          type: "function",
          namespace: 'src/utils',
          name: "validateUser",
          full_path: 'src/utils/validation.ts:validateUser',
          tags: ["validation", 'user', 'utility']
        },
        {
          id: 'class-1',
          type: 'class',
          namespace: 'src/services',
          name: "AuthService",
          full_path: 'src/services/AuthService.ts',
          tags: ['service', 'auth', "security"]
        }
      ];
      
      await wrapper.write(testFile, items);
      
      // Read storage to verify indices were built
      const storage = await wrapper.read(testFile);
      expect((storage as any).indices).toBeDefined();
      expect((storage as any).indices.by_tag).toBeDefined();
      expect((storage as any).indices.by_tag['user']).toContain('comp-1');
      expect((storage as any).indices.by_tag['user']).toContain('func-1');
      
      // Test tag search
      const userItems = await wrapper.getItemsByTag('user', testFile);
      expect(userItems).toHaveLength(2);
      expect(userItems.map(i => i.name)).toContain("UserProfile");
      expect(userItems.map(i => i.name)).toContain("validateUser");
    });

    it('should handle tag updates and maintain indices', async () => {
      const item = {
        id: 'test-1',
        type: "component",
        namespace: 'src/components',
        name: "TestComponent",
        full_path: 'src/components/TestComponent.tsx',
        tags: ['react', 'test']
      };
      
      await wrapper.write(testFile, item);
      
      // Update item with new tags
      await wrapper.updateItem('test-1', { tags: ['react', 'test', 'updated'] }, testFile);
      
      // Verify new tag is searchable
      const updatedItems = await wrapper.getItemsByTag('updated', testFile);
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].id).toBe('test-1');
      
      // Verify indices are updated
      const storage = await wrapper.read(testFile);
      expect((storage as any).indices.by_tag['updated']).toContain('test-1');
    });

    it('should support combined tag and type searches', async () => {
      const items = [
        {
          id: '1',
          type: "component",
          namespace: 'src',
          name: 'Comp1',
          full_path: 'src/Comp1.tsx',
          tags: ['ui', 'react']
        },
        {
          id: '2',
          type: "function",
          namespace: 'src',
          name: 'Func1',
          full_path: 'src/Func1.ts',
          tags: ['ui', 'utility']
        },
        {
          id: '3',
          type: "component",
          namespace: 'src',
          name: 'Comp2',
          full_path: 'src/Comp2.tsx',
          tags: ['api', 'react']
        }
      ];
      
      await wrapper.write(testFile, items);
      
      // Search for components with 'ui' tag
      const results = await wrapper.read(`${testFile}?tag=ui&type=component`);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Comp1');
    });
  });
});