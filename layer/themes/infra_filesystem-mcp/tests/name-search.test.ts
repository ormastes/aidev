import { VFIdNameWrapper } from '../children/VFIdNameWrapper';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { FilesystemMCPServer } from '../mcp-server';

describe('VF Name Search Tests', () => {
  const testDir = path.join(__dirname, 'test-name-search');
  const testFile = path.join(testDir, 'NAME_ID.vf.json');
  let wrapper: VFIdNameWrapper;

  beforeEach(async () => {
    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
    
    // Create test data
    const testData = {
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 3
      },
      types: {
        "feature": [
          {
            id: "feat-001",
            type: "feature",
            namespace: "auth",
            name: "user-login",
            full_path: "auth/user-login",
            tags: ["authentication", "security"]
          },
          {
            id: "feat-002",
            type: "feature",
            namespace: "auth",
            name: "user-logout",
            full_path: "auth/user-logout",
            tags: ["authentication"]
          }
        ],
        "component": [
          {
            id: "comp-001",
            type: "component",
            namespace: "ui",
            name: "user-profile",
            full_path: "ui/user-profile",
            tags: ["ui", "profile"]
          }
        ]
      }
    };
    
    await fs.promises.writeFile(testFile, JSON.stringify(testData, null, 2));
    wrapper = new VFIdNameWrapper(testDir);
  });

  afterEach(async () => {
    // Clean up
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe("getItemsByName", () => {
    it('should find items by exact name match', async () => {
      const results = await wrapper.getItemsByName('user-login', 'NAME_ID.vf.json');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('feat-001');
      expect(results[0].name).toBe('user-login');
    });

    it('should return empty array for non-existent name', async () => {
      const results = await wrapper.getItemsByName('non-existent', 'NAME_ID.vf.json');
      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive', async () => {
      const results = await wrapper.getItemsByName('USER-LOGIN', 'NAME_ID.vf.json');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('user-login');
    });
  });

  describe('MCP Server Name Search', () => {
    let server: any;

    beforeEach(() => {
      // Create a mock server instance
      const MCPServer = require('../mcp-server.js').FilesystemMCPServer;
      server = new MCPServer(testDir);
      server.taskQueueChecked = true; // Skip task queue check
    });

    it('should handle vf_search_by_name method', async () => {
      const result = await server.handleRequest('vf_search_by_name', {
        name: 'user-login'
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('user-login');
    });

    it('should require name parameter', async () => {
      await expect(
        server.handleRequest('vf_search_by_name', {})
      ).rejects.toThrow('Name parameter is required');
    });

    it('should support custom file parameter', async () => {
      const result = await server.handleRequest('vf_search_by_name', {
        name: 'user-profile',
        file: 'NAME_ID.vf.json'
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('user-profile');
    });
  });
});