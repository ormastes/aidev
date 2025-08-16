/**
 * Unit tests for VFNameIdWrapper
 */

import { VFNameIdWrapper, Entity } from '../children/VFNameIdWrapper';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { os } from '../../infra_external-log-lib/src';

describe("VFNameIdWrapper", () => {
  let tempDir: string;
  let wrapper: VFNameIdWrapper;
  let testFile: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-nameid-test-'));
    wrapper = new VFNameIdWrapper(tempDir);
    testFile = 'entities.json';
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("addEntity", () => {
    test('should add new entity with unique ID', async () => {
      const entityData = { title: 'Test Entity', value: 42 };
      
      const id = await wrapper.addEntity("testEntity", entityData, testFile);
      
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      
      // Verify entity was saved
      const entities = await wrapper.getEntities("testEntity", testFile);
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe("testEntity");
      expect(entities[0].data).toEqual(entityData);
      expect(entities[0].id).toBe(id);
    });

    test('should add multiple entities with same name', async () => {
      const entity1 = { value: 1 };
      const entity2 = { value: 2 };
      
      const id1 = await wrapper.addEntity("duplicate", entity1, testFile);
      const id2 = await wrapper.addEntity("duplicate", entity2, testFile);
      
      expect(id1).not.toBe(id2);
      
      const entities = await wrapper.getEntities("duplicate", testFile);
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.data.value)).toContain(1);
      expect(entities.map(e => e.data.value)).toContain(2);
    });
  });

  describe('read with query parameters', () => {
    beforeEach(async () => {
      // Add test data
      await wrapper.addEntity('user', { role: 'admin', active: true }, testFile);
      await wrapper.addEntity('user', { role: 'user', active: true }, testFile);
      await wrapper.addEntity('user', { role: 'user', active: false }, testFile);
      await wrapper.addEntity('product', { category: "electronics", price: 100 }, testFile);
    });

    test('should filter by name parameter', async () => {
      const users = await wrapper.read(`${testFile}?name=user`) as Entity[];
      
      expect(users).toHaveLength(3);
      expect(users.every(u => u.name === 'user')).toBe(true);
    });

    test('should filter by custom data properties', async () => {
      const activeUsers = await wrapper.read(`${testFile}?active=true`) as Entity[];
      
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(u => u.data.active === true)).toBe(true);
    });

    test('should filter by multiple parameters', async () => {
      const adminUsers = await wrapper.read(`${testFile}?name=user&role=admin`) as Entity[];
      
      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].data.role).toBe('admin');
    });

    test('should return full storage when no parameters', async () => {
      const storage = await wrapper.read(testFile) as any;
      
      expect(storage).toHaveProperty('user');
      expect(storage).toHaveProperty('product');
      expect(storage.user).toHaveLength(3);
      expect(storage.product).toHaveLength(1);
    });
  });

  describe("updateEntity", () => {
    test('should update entity by ID', async () => {
      const id = await wrapper.addEntity('item', { value: "original" }, testFile);
      
      await wrapper.updateEntity(id, { data: { value: 'updated' } }, testFile);
      
      const entities = await wrapper.getEntities('item', testFile);
      expect(entities[0].data.value).toBe('updated');
      expect(entities[0].updatedAt).toBeTruthy();
    });

    test('should preserve entity ID during update', async () => {
      const id = await wrapper.addEntity('item', { value: 1 }, testFile);
      
      await wrapper.updateEntity(id, { name: 'renamed', data: { value: 2 } }, testFile);
      
      const entities = await wrapper.read(`${testFile}?id=${id}`) as Entity[];
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe(id);
      expect(entities[0].name).toBe('renamed');
    });

    test('should throw error for non-existent ID', async () => {
      await expect(wrapper.updateEntity('non-existent-id', {}, testFile))
        .rejects.toThrow('Entity with ID non-existent-id not found');
    });
  });

  describe("deleteEntity", () => {
    test('should delete entity by ID', async () => {
      const id1 = await wrapper.addEntity('item', { value: 1 }, testFile);
      const id2 = await wrapper.addEntity('item', { value: 2 }, testFile);
      
      await wrapper.deleteEntity(id1, testFile);
      
      const entities = await wrapper.getEntities('item', testFile);
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe(id2);
    });

    test('should remove name key when last entity deleted', async () => {
      const id = await wrapper.addEntity("singleton", { value: 'only' }, testFile);
      
      await wrapper.deleteEntity(id, testFile);
      
      const storage = await wrapper.read(testFile);
      expect(storage).not.toHaveProperty("singleton");
    });

    test('should throw error for non-existent ID', async () => {
      await expect(wrapper.deleteEntity('non-existent-id', testFile))
        .rejects.toThrow('Entity with ID non-existent-id not found');
    });
  });

  describe('schema validation', () => {
    test('should validate entity against schema', async () => {
      const validEntity: Entity = {
        id: 'test-id',
        name: 'test',
        data: { some: 'data' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const isValid = await wrapper.validateSchema(validEntity);
      expect(isValid).toBe(true);
    });

    test('should reject invalid entity during write', async () => {
      const invalidEntity = {
        // Missing required 'name' field
        data: { value: 'test' }
      } as any;
      
      await expect(wrapper.write(testFile, invalidEntity))
        .rejects.toThrow('Schema validation failed');
    });
  });

  describe('write operations', () => {
    test('should write single entity', async () => {
      const entity: Entity = {
        id: 'custom-id',
        name: "customEntity",
        data: { custom: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await wrapper.write(testFile, entity);
      
      const entities = await wrapper.getEntities("customEntity", testFile);
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('custom-id');
    });

    test('should write In Progress storage', async () => {
      const storage = {
        users: [
          {
            id: '1',
            name: 'users',
            data: { username: 'user1' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        products: [
          {
            id: '2',
            name: "products",
            data: { title: 'Product 1' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
      
      await wrapper.write(testFile, storage);
      
      const readStorage = await wrapper.read(testFile) as any;
      expect(readStorage).toHaveProperty('users');
      expect(readStorage).toHaveProperty("products");
      expect(readStorage.users).toHaveLength(1);
      expect(readStorage.products).toHaveLength(1);
    });
  });

  describe('filtering with search attributes', () => {
    beforeEach(async () => {
      // Add diverse test data
      await wrapper.addEntity('task', { 
        title: 'Task 1', 
        status: 'pending', 
        priority: 'high',
        tags: ['urgent', 'backend']
      }, testFile);
      await wrapper.addEntity('task', { 
        title: 'Task 2', 
        status: 'In Progress', 
        priority: 'low',
        tags: ["frontend"]
      }, testFile);
      await wrapper.addEntity('task', { 
        title: 'Task 3', 
        status: 'pending', 
        priority: 'low',
        tags: ['backend', "database"]
      }, testFile);
    });

    test('should filter by nested data properties', async () => {
      const pendingTasks = await wrapper.read(`${testFile}?status=pending`) as Entity[];
      
      expect(pendingTasks).toHaveLength(2);
      expect(pendingTasks.every(t => t.data.status === 'pending')).toBe(true);
    });

    test('should filter by multiple criteria', async () => {
      const urgentPending = await wrapper.read(`${testFile}?status=pending&priority=high`) as Entity[];
      
      expect(urgentPending).toHaveLength(1);
      expect(urgentPending[0].data.title).toBe('Task 1');
    });

    test('should handle complex query combinations', async () => {
      const lowPriorityTasks = await wrapper.read(`${testFile}?priority=low`) as Entity[];
      
      expect(lowPriorityTasks).toHaveLength(2);
      expect(lowPriorityTasks.map(t => t.data.title)).toContain('Task 2');
      expect(lowPriorityTasks.map(t => t.data.title)).toContain('Task 3');
    });
  });
});