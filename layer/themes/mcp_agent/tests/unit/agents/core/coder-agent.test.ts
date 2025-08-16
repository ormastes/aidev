import { CoderAgent } from '../../../../children/src/agents/core/coder-agent';
import { MCPConnection } from '../../../../children/src/server/mcp-connection';
import { MCPMethod, ToolResult } from '../../../../children/src/domain/protocol';
import { AGENT_ROLES } from '../../../../children/src/domain/agent';

jest.mock('../../../../children/src/server/mcp-connection');

describe('CoderAgent', () => {
  let coderAgent: CoderAgent;
  let mockMCPConnection: jest.Mocked<MCPConnection>;

  beforeEach(() => {
    mockMCPConnection = {
      request: jest.fn(),
      send: jest.fn(),
      close: jest.fn()
    } as any;

    coderAgent = new CoderAgent('test-coder-1');
    coderAgent.setMCPConnection(mockMCPConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct role and capabilities', () => {
      const agent = new CoderAgent();
      expect(agent.getRole().name).toBe('coder');
      expect(agent.getCapabilities()).toHaveLength(6);
      expect(agent.getCapabilities().map(c => c.name)).toContain('interface_first_design');
      expect(agent.getCapabilities().map(c => c.name)).toContain('tdd_implementation');
      expect(agent.getCapabilities().map(c => c.name)).toContain('unit_test_coverage');
      expect(agent.getCapabilities().map(c => c.name)).toContain('xlib_encapsulation');
      expect(agent.getCapabilities().map(c => c.name)).toContain('architecture_compliance');
      expect(agent.getCapabilities().map(c => c.name)).toContain('quality_gate_evaluation');
    });

    it('should use provided id or generate one', () => {
      const customAgent = new CoderAgent('custom-id');
      expect(customAgent.getId()).toBe('custom-id');

      const autoAgent = new CoderAgent();
      expect(autoAgent.getId()).toMatch(/^coder-\d+$/);
    });
  });

  describe('setMCPConnection', () => {
    it('should set MCP connection', () => {
      const newConnection = {} as MCPConnection;
      coderAgent.setMCPConnection(newConnection);
      expect(coderAgent['mcpConnection']).toBe(newConnection);
    });
  });

  describe('implementFeature', () => {
    it('should implement feature through all phases', async () => {
      const featureName = 'UserManagement';
      const requirements = [
        'User should be able to create account',
        'User should be able to update profile',
        'User should be able to delete account'
      ];

      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'success' }]
      } as ToolResult);

      await coderAgent.implementFeature(featureName, requirements);

      // Verify phases were executed
      expect(mockMCPConnection.request).toHaveBeenCalled();
    });

    it('should throw error if MCP connection not set', async () => {
      const agent = new CoderAgent();
      
      await expect(agent.implementFeature('Test', []))
        .rejects.toThrow('MCP connection not set');
    });
  });

  describe('analyzeInterfaceNeeds', () => {
    it('should extract interface structure from requirements', () => {
      const requirements = [
        'User should be able to create account',
        'Product should have name and price',
        'Order should track status and items'
      ];

      const interfaces = coderAgent['analyzeInterfaceNeeds'](requirements);

      expect(interfaces).toHaveLength(3);
      expect(interfaces[0].name).toBe('UserInterface');
      expect(interfaces[0].methods).toContain('create');
      expect(interfaces[1].name).toBe('ProductInterface');
      expect(interfaces[2].name).toBe('OrderInterface');
    });
  });

  describe('extractEntityName', () => {
    it('should extract entity name from requirement', () => {
      expect(coderAgent['extractEntityName']('User should be able to login'))
        .toBe('User');
      expect(coderAgent['extractEntityName']('Product should have price'))
        .toBe('Product');
      expect(coderAgent['extractEntityName']('Invalid requirement'))
        .toBe('Entity');
    });
  });

  describe('extractMethods', () => {
    it('should extract methods from requirement', () => {
      const requirement = 'User should be able to create, update, and delete profiles';
      const methods = coderAgent['extractMethods'](requirement);

      expect(methods).toContain('create');
      expect(methods).toContain('update');
      expect(methods).toContain('delete');
    });

    it('should extract find method', () => {
      const requirement = 'User should be able to find products';
      const methods = coderAgent['extractMethods'](requirement);

      expect(methods).toContain('find');
    });
  });

  describe('extractProperties', () => {
    it('should extract properties from requirement', () => {
      const requirement = 'User should have name, id, and status';
      const properties = coderAgent['extractProperties'](requirement);

      expect(properties).toContain('name: string');
      expect(properties).toContain('id: string');
      expect(properties).toContain('status: string');
    });
  });

  describe('createInterface', () => {
    it('should create interface file with proper structure', async () => {
      const iface = {
        name: 'UserInterface',
        methods: ['create', 'update'],
        properties: ['id: string', 'name: string']
      };

      await coderAgent['createInterface'](iface);

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'write_file',
          arguments: {
            path: 'src/interfaces/userinterface.ts',
            content: expect.stringContaining('export interface UserInterface')
          }
        })
      );
    });
  });

  describe('identifyUnits', () => {
    it('should identify all units needed for feature', async () => {
      const units = await coderAgent['identifyUnits']('User', ['create user']);

      expect(units).toHaveLength(3);
      expect(units.map(u => u.type)).toContain('entity');
      expect(units.map(u => u.type)).toContain('service');
      expect(units.map(u => u.type)).toContain('repository');
      expect(units[0].path).toBe('src/core/entities/user.ts');
      expect(units[1].path).toBe('src/core/services/user-service.ts');
      expect(units[2].path).toBe('src/external_interface/repositories/user-repository.ts');
    });
  });

  describe('writeFailingTest', () => {
    it('should generate entity test', async () => {
      const unit = {
        name: 'UserEntity',
        path: 'src/core/entities/user.ts',
        testPath: 'tests/unit/core/entities/user.test.ts',
        type: 'entity'
      };

      await coderAgent['writeFailingTest'](unit);

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'write_file',
          arguments: {
            path: unit.testPath,
            content: expect.stringContaining("describe('UserEntity'")
          }
        })
      );
    });

    it('should generate service test', async () => {
      const unit = {
        name: 'UserService',
        path: 'src/core/services/user-service.ts',
        testPath: 'tests/unit/core/services/user-service.test.ts',
        type: 'service'
      };

      await coderAgent['writeFailingTest'](unit);

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'write_file',
          arguments: {
            path: unit.testPath,
            content: expect.stringContaining("describe('UserService'")
          }
        })
      );
    });

    it('should generate repository test', async () => {
      const unit = {
        name: 'UserRepository',
        path: 'src/external_interface/repositories/user-repository.ts',
        testPath: 'tests/unit/external_interface/repositories/user-repository.test.ts',
        type: 'repository'
      };

      await coderAgent['writeFailingTest'](unit);

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'write_file',
          arguments: {
            path: unit.testPath,
            content: expect.stringContaining("describe('UserRepository'")
          }
        })
      );
    });
  });

  describe('getRelativeImportPath', () => {
    it('should calculate correct relative import paths', () => {
      expect(coderAgent['getRelativeImportPath'](
        'tests/unit/core/service.test.ts',
        'src/core/service.ts'
      )).toBe('../../../children/src/core/service');

      expect(coderAgent['getRelativeImportPath'](
        'tests/unit/service.test.ts',
        'src/service.ts'
      )).toBe('../../children/src/service');

      expect(coderAgent['getRelativeImportPath'](
        'src/test.ts',
        'src/module.ts'
      )).toBe('./module');
    });
  });

  describe('runUnitTest', () => {
    it('should run unit test successfully', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'Test passing' }]
      } as ToolResult);

      await coderAgent['runUnitTest']('tests/unit/test.test.ts');

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'run_test',
          arguments: {
            path: 'tests/unit/test.test.ts',
            type: 'unit'
          }
        })
      );
    });

    it('should throw error if test fails', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'Test failed' }]
      } as ToolResult);

      await expect(coderAgent['runUnitTest']('tests/unit/test.test.ts'))
        .rejects.toThrow('Test failed: tests/unit/test.test.ts');
    });
  });

  describe('checkImportCompliance', () => {
    it('should detect forbidden imports', async () => {
      mockMCPConnection.request
        .mockResolvedValueOnce({
          content: [{ text: '["src/file.ts"]' }]
        } as ToolResult)
        .mockResolvedValueOnce({
          content: [{ text: 'import { fs } from '../../../../../infra_external-log-lib/dist';' }]
        } as ToolResult);

      await expect(coderAgent['checkImportCompliance']('Feature'))
        .rejects.toThrow('Direct external import found');
    });

    it('should pass when no forbidden imports', async () => {
      mockMCPConnection.request
        .mockResolvedValueOnce({
          content: [{ text: '["src/file.ts"]' }]
        } as ToolResult)
        .mockResolvedValueOnce({
          content: [{ text: 'import { FileSystem } from "../xlib_fs"' }]
        } as ToolResult);

      await expect(coderAgent['checkImportCompliance']('Feature'))
        .resolves.not.toThrow();
    });
  });

  describe('checkXlibCompliance', () => {
    it('should verify xlib directories contain only index.ts', async () => {
      mockMCPConnection.request
        .mockResolvedValueOnce({
          content: [{ text: '["src/xlib_fs", "src/xlib_http"]' }]
        } as ToolResult)
        .mockResolvedValueOnce({
          content: [{ text: '["index.ts"]' }]
        } as ToolResult)
        .mockResolvedValueOnce({
          content: [{ text: '["index.ts"]' }]
        } as ToolResult);

      await expect(coderAgent['checkXlibCompliance']('Feature'))
        .resolves.not.toThrow();
    });

    it('should throw error if xlib has additional files', async () => {
      mockMCPConnection.request
        .mockResolvedValueOnce({
          content: [{ text: '["src/xlib_fs"]' }]
        } as ToolResult)
        .mockResolvedValueOnce({
          content: [{ text: '["index.ts", "utils.ts"]' }]
        } as ToolResult);

      await expect(coderAgent['checkXlibCompliance']('Feature'))
        .rejects.toThrow('xlib directory src/xlib_fs must contain only index.ts');
    });
  });

  describe('verifyCoverage', () => {
    it('should verify 100% coverage', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'Coverage: 100%' }]
      } as ToolResult);

      await expect(coderAgent['verifyCoverage']('Feature'))
        .resolves.not.toThrow();

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'check_coverage',
          arguments: {
            feature: 'Feature',
            threshold: 100
          }
        })
      );
    });

    it('should throw error if coverage is below 100%', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'Coverage: 85%' }]
      } as ToolResult);

      await expect(coderAgent['verifyCoverage']('Feature'))
        .rejects.toThrow('Coverage is 85%, but Improving is required');
    });
  });

  describe('analyzeCodeQuality', () => {
    it('should detect real problems', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'const data: any = {}; console.log(data); // TODO: fix this' }]
      } as ToolResult);

      const result = await coderAgent.analyzeCodeQuality('src/file.ts');

      expect(result.hasRealProblem).toBe(true);
      expect(result.recommendation).toContain('Using any type');
      expect(result.recommendation).toContain('Debug statements left');
      expect(result.recommendation).toContain('Uncompleted TODOs');
    });

    it('should suggest quality improvements', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: 'a'.repeat(301) }]
      } as ToolResult);

      const result = await coderAgent.analyzeCodeQuality('src/file.ts');

      expect(result.improvesQuality).toBe(true);
      expect(result.recommendation).toContain('File too long');
    });

    it('should approve good code', async () => {
      mockMCPConnection.request.mockResolvedValue({
        content: [{ text: `
          /**
           * Well documented module
           */
          interface UserInterface {
            id: string;
          }
          
          describe('test', () => {
            it('works', () => {});
          });
        `}]
      } as ToolResult);

      const result = await coderAgent.analyzeCodeQuality('src/file.ts');

      expect(result.hasRealProblem).toBe(false);
      expect(result.improvesQuality).toBe(false);
      expect(result.recommendation).toBe('Code looks good, no changes needed');
    });
  });

  describe('createXlibWrapper', () => {
    it('should create xlib wrapper for external library', async () => {
      await coderAgent.createXlibWrapper('axios', ['get', 'post', 'put']);

      expect(mockMCPConnection.request).toHaveBeenCalledWith(
        MCPMethod.CALL_TOOL,
        expect.objectContaining({
          name: 'write_file',
          arguments: {
            path: 'src/xlib_axios/index.ts',
            content: expect.stringContaining('AxiosWrapper')
          }
        })
      );

      const callArgs = mockMCPConnection.request.mock.calls[0][1].arguments;
      expect(callArgs.content).toContain('static get(...args: any[]): any');
      expect(callArgs.content).toContain('static post(...args: any[]): any');
      expect(callArgs.content).toContain('static put(...args: any[]): any');
    });
  });

  describe('isAllowedAnalysisPath', () => {
    it('should allow direct children', () => {
      expect(coderAgent.isAllowedAnalysisPath(
        'src/core/service.ts',
        'src/core/utils.ts'
      )).toBe(true);
    });

    it('should allow siblings', () => {
      expect(coderAgent.isAllowedAnalysisPath(
        'src/core/services/user.ts',
        'src/core/services/auth.ts'
      )).toBe(true);
    });

    it('should allow parent\'s direct children', () => {
      expect(coderAgent.isAllowedAnalysisPath(
        'src/core/services/user.ts',
        'src/core/entities/user.ts'
      )).toBe(true);
    });

    it('should allow xlib wrappers', () => {
      expect(coderAgent.isAllowedAnalysisPath(
        'src/core/service.ts',
        'src/xlib_fs/index.ts'
      )).toBe(true);
    });

    it('should deny deeply nested paths', () => {
      expect(coderAgent.isAllowedAnalysisPath(
        'src/core/service.ts',
        'src/features/user/components/form.ts'
      )).toBe(false);
    });

    it('should deny unrelated paths', () => {
      expect(coderAgent.isAllowedAnalysisPath(
        'src/core/service.ts',
        'tests/integration/test.ts'
      )).toBe(false);
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(coderAgent['capitalize']('axios')).toBe('Axios');
      expect(coderAgent['capitalize']('HTTP')).toBe('HTTP');
      expect(coderAgent['capitalize']('a')).toBe('A');
    });
  });
});