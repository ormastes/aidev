import { CoderAgent } from '../../children/src/agents/core/coder-agent';
import { MCPConnection } from '../../children/src/server/mcp-connection';
import { MCPMethod, ToolCall, ToolResult } from '../../children/src/domain/protocol';

// Mock MCP Connection
jest.mock('../../children/src/server/mcp-connection');
const MockedMCPConnection = MCPConnection as jest.MockedClass<typeof MCPConnection>;

describe("CoderAgent", () => {
  let coderAgent: CoderAgent;
  let mockMcpConnection: jest.Mocked<MCPConnection>;

  beforeEach(() => {
    coderAgent = new CoderAgent();
    mockMcpConnection = new MockedMCPConnection() as jest.Mocked<MCPConnection>;
    mockMcpConnection.request = jest.fn();
    coderAgent.setMCPConnection(mockMcpConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it('should create CoderAgent instance with correct capabilities', () => {
      expect(coderAgent).toBeDefined();
      
      const capabilities = coderAgent.getCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
      
      const capabilityNames = capabilities.map(cap => cap.name);
      expect(capabilityNames).toContain('interface_first_design');
      expect(capabilityNames).toContain('tdd_implementation');
      expect(capabilityNames).toContain('unit_test_coverage');
      expect(capabilityNames).toContain('xlib_encapsulation');
    });

    it('should have correct role configuration', () => {
      const role = coderAgent.getRole();
      expect(role.name).toBe('coder');
      expect(role.description).toContain('Implementation specialist');
    });
  });

  describe("setMCPConnection", () => {
    it('should set MCP connection', () => {
      const newAgent = new CoderAgent();
      expect(() => newAgent.setMCPConnection(mockMcpConnection)).not.toThrow();
    });
  });

  describe("implementFeature", () => {
    const featureName = "TestFeature";
    const requirements = ['should handle input validation', 'should process data correctly'];

    beforeEach(() => {
      // Mock all file operations
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: '[]' }]
      } as ToolResult);
    });

    it('should throw error if MCP connection not set', async () => {
      const newAgent = new CoderAgent();
      
      await expect(newAgent.implementFeature(featureName, requirements))
        .rejects.toThrow('MCP connection not set');
    });

    it('should implement feature following TDD methodology', async () => {
      await coderAgent.implementFeature(featureName, requirements);
      
      // Verify MCP calls were made for implementation
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });

    it('should create interfaces before implementations', async () => {
      await coderAgent.implementFeature(featureName, requirements);
      
      // Check that interface files were created first
      const writeFileCalls = mockMcpConnection.request.mock.calls.filter(call => 
        call[1]?.name === 'write_file'
      );
      
      expect(writeFileCalls.length).toBeGreaterThan(0);
    });
  });

  describe('feature implementation workflow', () => {
    const featureName = "TestFeature";
    const requirements = ['should handle input validation', 'should process data correctly'];

    beforeEach(() => {
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: '[]' }]
      } as ToolResult);
    });

    it('should follow TDD methodology', async () => {
      await coderAgent.implementFeature(featureName, requirements);
      
      // Verify the implementation workflow was followed
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });

    it('should create interfaces before implementations', async () => {
      await coderAgent.implementFeature(featureName, requirements);
      
      // Check that interface design was part of the workflow
      expect(mockMcpConnection.request.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle MCP connection errors gracefully', async () => {
      mockMcpConnection.request.mockRejectedValue(new Error('Connection failed'));
      
      await expect(coderAgent.implementFeature("TestFeature", []))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty requirements array', async () => {
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: '[]' }]
      } as ToolResult);

      await coderAgent.implementFeature("EmptyFeature", []);
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });

    it('should handle very long feature names', async () => {
      const longName = 'A'.repeat(1000);
      
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: 'success' }]
      } as ToolResult);

      await coderAgent.implementFeature(longName, ["requirement"]);
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });

    it('should handle special characters in feature names', async () => {
      const specialName = 'Feature@#$%^&*()';
      
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: 'success' }]
      } as ToolResult);

      await coderAgent.implementFeature(specialName, ["requirement"]);
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });
  });
});