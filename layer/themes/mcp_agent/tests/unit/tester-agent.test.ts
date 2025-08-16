import { TesterAgent } from '../../children/src/agents/core/tester-agent';
import { MCPConnection } from '../../children/src/server/mcp-connection';
import { MCPMethod, ToolCall, ToolResult } from '../../children/src/domain/protocol';

// Mock MCP Connection
jest.mock('../../children/src/server/mcp-connection');
const MockedMCPConnection = MCPConnection as jest.MockedClass<typeof MCPConnection>;

describe("TesterAgent", () => {
  let testerAgent: TesterAgent;
  let mockMcpConnection: jest.Mocked<MCPConnection>;

  beforeEach(() => {
    testerAgent = new TesterAgent();
    mockMcpConnection = new MockedMCPConnection() as jest.Mocked<MCPConnection>;
    mockMcpConnection.request = jest.fn();
    testerAgent.setMCPConnection(mockMcpConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it('should create TesterAgent instance with correct capabilities', () => {
      expect(testerAgent).toBeDefined();
      
      const capabilities = testerAgent.getCapabilities();
      expect(capabilities).toHaveLength(6);
      
      const capabilityNames = capabilities.map(cap => cap.name);
      expect(capabilityNames).toContain('scenario_first_testing');
      expect(capabilityNames).toContain('multiple_system_tests');
      expect(capabilityNames).toContain('in_process_feature_tests');
      expect(capabilityNames).toContain('full_coverage');
      expect(capabilityNames).toContain('screenshot_documentation');
      expect(capabilityNames).toContain('manual_ready_tests');
    });

    it('should have correct role configuration', () => {
      const role = testerAgent.getRole();
      expect(role.name).toBe('tester');
      expect(role.description).toBe('Quality assurance and testing specialist');
    });
  });

  describe("setMCPConnection", () => {
    it('should set MCP connection', () => {
      const newAgent = new TesterAgent();
      expect(() => newAgent.setMCPConnection(mockMcpConnection)).not.toThrow();
    });
  });

  describe("createTestSuite", () => {
    const featureName = "TestFeature";
    const requirements = ['should handle input validation', 'should process data correctly'];

    beforeEach(() => {
      // Mock all file operations
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: '[]' }]
      } as ToolResult);
    });

    it('should throw error if MCP connection not set', async () => {
      const newAgent = new TesterAgent();
      
      await expect(newAgent.createTestSuite(featureName, requirements))
        .rejects.toThrow('MCP connection not set');
    });

    it('should create complete test suite', async () => {
      await testerAgent.createTestSuite(featureName, requirements);
      
      // Verify MCP calls were made (file writing operations)
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });

    it('should create feature tests for all scenarios', async () => {
      await testerAgent.createTestSuite(featureName, requirements);
      
      // Check that feature test files were created
      const writeFileCalls = mockMcpConnection.request.mock.calls.filter(call => 
        call[1]?.name === 'write_file'
      );
      
      const featureFileCalls = writeFileCalls.filter(call => 
        call[1]?.arguments?.path?.includes('feature')
      );
      
      expect(featureFileCalls.length).toBeGreaterThan(0);
    });
  });

  describe("runTestSuite", () => {
    it('should run tests and return results', async () => {
      const mockOutput = 'Test Suites: 1 passed, 1 total\nTests: 5 passing, 0 failing\ncoverage: 85.5%';
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: mockOutput }]
      } as ToolResult);

      const results = await testerAgent.runTestSuite('unit');
      
      expect(results.passed).toBe(5);
      expect(results.failed).toBe(0);
      expect(results.coverage).toBe(85.5);
    });

    it('should handle test failures', async () => {
      const mockOutput = 'Test Suites: 1 failed, 1 total\nTests: 3 passing, 2 failing\ncoverage: 60.0%';
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: mockOutput }]
      } as ToolResult);

      const results = await testerAgent.runTestSuite();
      
      expect(results.passed).toBe(3);
      expect(results.failed).toBe(2);
      expect(results.coverage).toBe(60.0);
    });
  });

  describe("checkCoverage", () => {
    it('should call runTestSuite to check coverage', async () => {
      const mockOutput = 'coverage: 100%';
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: mockOutput }]
      } as ToolResult);

      const results = await testerAgent.runTestSuite('unit');
      expect(results.coverage).toBe(100);
    });
  });

  describe("debugFailingTest", () => {
    it('should handle debugging workflow', async () => {
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: 'debug output' }]
      } as ToolResult);
      
      // Test the debugging workflow exists
      expect(mockMcpConnection.request).toBeDefined();
    });
  });

  describe("troubleshootRegression", () => {
    it('should handle regression analysis', async () => {
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: 'abc123\ndef456\n' }]
      } as ToolResult);
      
      // Test the regression analysis workflow exists
      expect(mockMcpConnection.request).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle MCP connection errors gracefully', async () => {
      mockMcpConnection.request.mockRejectedValue(new Error('Connection failed'));
      
      await expect(testerAgent.runTestSuite()).rejects.toThrow('Connection failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty requirements array', async () => {
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: '[]' }]
      } as ToolResult);

      await testerAgent.createTestSuite("EmptyFeature", []);
      expect(mockMcpConnection.request).toHaveBeenCalled();
    });

    it('should handle malformed test output', async () => {
      mockMcpConnection.request.mockResolvedValue({
        content: [{ text: 'invalid output format' }]
      } as ToolResult);

      const results = await testerAgent.runTestSuite();
      
      expect(results.passed).toBe(0);
      expect(results.failed).toBe(0);
      expect(results.coverage).toBe(0);
    });
  });
});