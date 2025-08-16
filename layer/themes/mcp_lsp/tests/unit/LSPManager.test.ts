import { LSPManager } from '../../children/LSPManager';
import { LSPClient } from '../../children/LSPClient';
import * as fs from 'fs/promises';

jest.mock('../../children/LSPClient');
jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe("LSPManager", () => {
  let manager: LSPManager;
  let mockClients: Map<string, jest.Mocked<LSPClient>>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    manager = new LSPManager();
    mockClients = new Map();
    
    // Mock LSPClient constructor
    (LSPClient as jest.MockedClass<typeof LSPClient>).mockImplementation(() => {
      const mockClient = {
        initialize: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
        openWorkspace: jest.fn().mockResolvedValue(undefined),
        closeWorkspace: jest.fn().mockResolvedValue(undefined),
        openDocument: jest.fn().mockResolvedValue(undefined),
        updateDocument: jest.fn().mockResolvedValue(undefined),
        closeDocument: jest.fn().mockResolvedValue(undefined),
        normalizeUri: jest.fn((path) => `file://${path}`),
        sendRequest: jest.fn().mockResolvedValue(null)
      } as any;
      
      // Store for later assertions
      const id = `client-${mockClients.size}`;
      mockClients.set(id, mockClient);
      
      return mockClient;
    });
  });
  
  describe("createInstance", () => {
    it('should create a new LSP instance', async () => {
      const instanceId = await manager.createInstance({
        name: 'test-project',
        rootPath: '/test/project'
      });
      
      expect(instanceId).toBe('test-project');
      expect(LSPClient).toHaveBeenCalledTimes(1);
      
      const instances = manager.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0]).toMatchObject({
        id: 'test-project',
        name: 'test-project',
        rootPath: '/test/project',
        isDefault: true,
        isActive: true
      });
    });
    
    it('should generate unique ID if name conflicts', async () => {
      await manager.createInstance({
        name: 'project',
        rootPath: '/test/project1'
      });
      
      const id2 = await manager.createInstance({
        name: 'project',
        rootPath: '/test/project2'
      });
      
      expect(id2).toBe('project-1');
    });
    
    it('should use provided ID if specified', async () => {
      const instanceId = await manager.createInstance({
        id: 'custom-id',
        name: 'test',
        rootPath: '/test'
      });
      
      expect(instanceId).toBe('custom-id');
    });
    
    it('should throw error if ID already exists', async () => {
      await manager.createInstance({
        id: 'test-id',
        name: 'test',
        rootPath: '/test'
      });
      
      await expect(manager.createInstance({
        id: 'test-id',
        name: 'test2',
        rootPath: '/test2'
      })).rejects.toThrow("LSP instance with id 'test-id' already exists");
    });
    
    it('should initialize instance in background', async () => {
      const instanceId = await manager.createInstance({
        name: 'test',
        rootPath: '/test'
      });
      
      // Wait for background initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const client = Array.from(mockClients.values())[0];
      expect(client.openWorkspace).toHaveBeenCalledWith('/test');
      expect(client.initialize).toHaveBeenCalled();
    });
  });
  
  describe("getInstance", () => {
    beforeEach(async () => {
      await manager.createInstance({
        id: "instance1",
        name: 'Project 1',
        rootPath: '/project1'
      });
      await manager.createInstance({
        id: "instance2",
        name: 'Project 2',
        rootPath: '/project2'
      });
    });
    
    it('should get instance by ID', () => {
      const instance = manager.getInstance("instance1");
      expect(instance).not.toBeNull();
      expect(instance?.id).toBe("instance1");
    });
    
    it('should get active instance if no ID provided', () => {
      manager.setActiveInstance("instance2");
      const instance = manager.getInstance();
      expect(instance?.id).toBe("instance2");
    });
    
    it('should return null if instance not found', () => {
      const instance = manager.getInstance('non-existent');
      expect(instance).toBeNull();
    });
  });
  
  describe("setActiveInstance", () => {
    beforeEach(async () => {
      await manager.createInstance({
        id: "instance1",
        name: 'Project 1',
        rootPath: '/project1'
      });
      await manager.createInstance({
        id: "instance2",
        name: 'Project 2',
        rootPath: '/project2'
      });
    });
    
    it('should set active instance', () => {
      manager.setActiveInstance("instance2");
      
      const instances = manager.listInstances();
      expect(instances.find(i => i.id === "instance1")?.isActive).toBe(false);
      expect(instances.find(i => i.id === "instance2")?.isActive).toBe(true);
    });
    
    it('should update last used time', () => {
      const beforeTime = new Date();
      manager.setActiveInstance("instance2");
      
      const instance = manager.getInstance("instance2");
      expect(instance?.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
    
    it('should throw error if instance not found', () => {
      expect(() => manager.setActiveInstance('non-existent'))
        .toThrow("LSP instance 'non-existent' not found");
    });
  });
  
  describe("removeInstance", () => {
    beforeEach(async () => {
      await manager.createInstance({
        id: "instance1",
        name: 'Project 1',
        rootPath: '/project1'
      });
      await manager.createInstance({
        id: "instance2",
        name: 'Project 2',
        rootPath: '/project2'
      });
    });
    
    it('should remove instance and shutdown client', async () => {
      await manager.removeInstance("instance1");
      
      const instances = manager.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe("instance2");
      
      const removedClient = Array.from(mockClients.values())[0];
      expect(removedClient.shutdown).toHaveBeenCalled();
    });
    
    it('should update default instance if removed', async () => {
      // instance1 is default
      await manager.removeInstance("instance1");
      
      const instances = manager.listInstances();
      expect(instances[0].isDefault).toBe(true);
    });
    
    it('should throw error if instance not found', async () => {
      await expect(manager.removeInstance('non-existent'))
        .rejects.toThrow("LSP instance 'non-existent' not found");
    });
  });
  
  describe("getInstanceByPath", () => {
    beforeEach(async () => {
      await manager.createInstance({
        name: 'Project 1',
        rootPath: '/test/project1'
      });
      await manager.createInstance({
        name: 'Project 2',
        rootPath: '/test/project2'
      });
    });
    
    it('should find instance by workspace path', () => {
      const instance = manager.getInstanceByPath('/test/project1');
      expect(instance).not.toBeNull();
      expect(instance?.name).toBe('Project 1');
    });
    
    it('should normalize paths before comparison', () => {
      const instance = manager.getInstanceByPath('/test/project1/../project1');
      expect(instance).not.toBeNull();
      expect(instance?.name).toBe('Project 1');
    });
    
    it('should return null if not found', () => {
      const instance = manager.getInstanceByPath('/test/project3');
      expect(instance).toBeNull();
    });
  });
  
  describe("ensureInstanceForWorkspace", () => {
    it('should return existing instance if found', async () => {
      const id1 = await manager.createInstance({
        name: 'Test',
        rootPath: '/test/workspace'
      });
      
      const id2 = await manager.ensureInstanceForWorkspace('/test/workspace');
      expect(id2).toBe(id1);
      expect(manager.listInstances()).toHaveLength(1);
    });
    
    it('should create new instance if not found', async () => {
      const id = await manager.ensureInstanceForWorkspace('/new/workspace', 'New Project');
      
      expect(id).toBe('new-project');
      const instance = manager.getInstance(id);
      expect(instance?.rootPath).toBe('/new/workspace');
    });
  });
  
  describe("findWorkspaceRoot", () => {
    it('should find workspace root by package.json', async () => {
      mockFs.access.mockImplementation(async (path) => {
        if (path.includes('package.json')) {
          return Promise.resolve();
        }
        throw new Error('Not found');
      });
      
      const id = await manager.getOrCreateInstanceForFile('/project/src/lib/file.ts');
      const instance = manager.getInstance(id);
      
      expect(instance?.rootPath).toMatch(/\/project$/);
    });
    
    it('should find workspace root by tsconfig.json', async () => {
      mockFs.access.mockImplementation(async (path) => {
        if (path.includes('tsconfig.json')) {
          return Promise.resolve();
        }
        throw new Error('Not found');
      });
      
      const id = await manager.getOrCreateInstanceForFile('/typescript/src/file.ts');
      const instance = manager.getInstance(id);
      
      expect(instance?.rootPath).toMatch(/\/typescript$/);
    });
    
    it('should default to file directory if no project files found', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      
      const id = await manager.getOrCreateInstanceForFile('/standalone/file.ts');
      const instance = manager.getInstance(id);
      
      expect(instance?.rootPath).toBe('/standalone');
    });
  });
  
  describe("shutdownAll", () => {
    it('should shutdown all instances', async () => {
      await manager.createInstance({
        name: 'Project 1',
        rootPath: '/project1'
      });
      await manager.createInstance({
        name: 'Project 2',
        rootPath: '/project2'
      });
      
      await manager.shutdownAll();
      
      expect(manager.listInstances()).toHaveLength(0);
      
      // All clients should be shutdown
      for (const client of mockClients.values()) {
        expect(client.shutdown).toHaveBeenCalled();
      }
    });
  });
  
  describe('events', () => {
    it('should emit instanceCreated event', async () => {
      const listener = jest.fn();
      manager.on("instanceCreated", listener);
      
      await manager.createInstance({
        name: 'Test',
        rootPath: '/test'
      });
      
      expect(listener).toHaveBeenCalledWith({
        id: 'test',
        name: 'Test',
        rootPath: '/test'
      });
    });
    
    it('should emit activeInstanceChanged event', async () => {
      await manager.createInstance({ id: 'test1', name: 'Test 1', rootPath: '/test1' });
      await manager.createInstance({ id: 'test2', name: 'Test 2', rootPath: '/test2' });
      
      const listener = jest.fn();
      manager.on("activeInstanceChanged", listener);
      
      manager.setActiveInstance('test2');
      
      expect(listener).toHaveBeenCalledWith({
        id: 'test2',
        name: 'Test 2'
      });
    });
    
    it('should emit instanceRemoved event', async () => {
      await manager.createInstance({ id: 'test', name: 'Test', rootPath: '/test' });
      
      const listener = jest.fn();
      manager.on("instanceRemoved", listener);
      
      await manager.removeInstance('test');
      
      expect(listener).toHaveBeenCalledWith({
        id: 'test',
        name: 'Test'
      });
    });
  });
});