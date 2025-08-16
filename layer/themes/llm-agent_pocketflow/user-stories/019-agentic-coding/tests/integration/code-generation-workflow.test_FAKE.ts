import { workflow } from '../../../018-type-safety/src/builder';
import { nodes } from '../../../018-type-safety/src/nodes';
import { 
  CodeGenAgent, 
  TestGenAgent,
  createAgenticNode,
  CodeGenRequest,
  TestGenRequest,
  GeneratedCode,
  GeneratedTest
} from '../../src';

describe('Code Generation Workflow Integration', () => {
  let codeGenAgent: CodeGenAgent;
  let testGenAgent: TestGenAgent;

  beforeEach(() => {
    codeGenAgent = new CodeGenAgent({
      defaultLanguage: 'typescript',
      defaultStyle: 'functional'
    });
    
    testGenAgent = new TestGenAgent({
      defaultFramework: 'jest',
      defaultCoverage: 90
    });
  });

  describe('Simple code generation workflow', () => {
    it('should generate code from requirements', async () => {
      const flow = workflow()
        .addNode('input', nodes.input<CodeGenRequest>('input'))
        .addNode('generate', createAgenticNode('generate', codeGenAgent))
        .addNode('output', nodes.output<GeneratedCode>('output'))
        .connect('input', 'generate')
        .connect('generate', 'output')
        .build();
      
      const result = await flow.execute({
        description: 'Create a function that validates email addresses',
        language: 'typescript'
      });
      
      expect(result.success).toBe(true);
      
      const output = result.outputs.get('output') as GeneratedCode;
      expect(output).toBeDefined();
      expect(output?.code).toContain('validateEmail');
      expect(output?.code).toContain('function');
      expect(output?.language).toBe('typescript');
    });
  });

  describe('Code and test generation workflow', () => {
    it('should generate code and tests sequentially', async () => {
      const flow = workflow()
        .addNode('requirements', nodes.input<string>('requirements'))
        .addNode('parseReq', nodes.transform<string, CodeGenRequest>(
          'parseReq',
          (desc) => ({
            description: desc,
            language: 'typescript',
            style: 'functional'
          })
        ))
        .addNode('generateCode', createAgenticNode('generateCode', codeGenAgent))
        .addNode('prepareTestReq', nodes.transform<GeneratedCode, TestGenRequest>(
          'prepareTestReq',
          (code) => ({
            code: code.code,
            framework: 'jest',
            testType: 'unit',
            coverage: 90
          })
        ))
        .addNode('generateTests', createAgenticNode('generateTests', testGenAgent))
        .addNode('bundle', nodes.transform<GeneratedTest, any>(
          'bundle',
          (tests) => ({
            implementation: tests,
            tests,
            timestamp: new Date().toISOString()
          })
        ))
        .addNode('output', nodes.output('output'))
        .connect('requirements', 'parseReq')
        .connect('parseReq', 'generateCode')
        .connect('generateCode', 'prepareTestReq')
        .connect('prepareTestReq', 'generateTests')
        .connect('generateTests', 'bundle')
        .connect('bundle', 'output')
        .build();
      
      const result = await flow.execute(
        'Create a function to sort an array of objects by a key'
      );
      
      expect(result.success).toBe(true);
      
      const output = result.outputs.get('output');
      expect(output).toBeDefined();
      expect(output.implementation).toBeDefined();
      expect(output.tests).toBeDefined();
      expect(output.tests.testCode).toContain('describe');
      expect(output.tests.testCode).toContain('sortArrayByKey');
    });
  });

  describe('Workflow with validation', () => {
    it('should validate generated code before creating tests', async () => {
      const flow = workflow()
        .addNode('input', nodes.input<CodeGenRequest>('input'))
        .addNode('generate', createAgenticNode('generate', codeGenAgent))
        .addNode('validate', nodes.validation<GeneratedCode>(
          'validate',
          (code: GeneratedCode) => {
            if (!code.code || code.code.length < 10) {
              return { 
                "success": false, 
                errors: ['Generated code is too short'] 
              };
            }
            if (!code.code.includes('export')) {
              return { 
                "success": false, 
                errors: ['Code must export at least one function'] 
              };
            }
            return { "success": true };
          }
        ))
        .addNode('output', nodes.output<GeneratedCode>('output'))
        .connect('input', 'generate')
        .connect('generate', 'validate')
        .connect('validate', 'output')
        .build();
      
      const result = await flow.execute({
        description: 'Create a function to fetch data from an API',
        language: 'typescript'
      });
      
      expect(result.success).toBe(true);
      
      const output = result.outputs.get('output') as GeneratedCode;
      expect(output?.code).toContain('export');
      expect(output?.code.length).toBeGreaterThan(10);
    });
  });

  describe('Complex workflow with filtering', () => {
    it('should filter generated functions by complexity', async () => {
      const flow = workflow()
        .addNode('input', nodes.input<string[]>('input'))
        .addNode('mapToRequests', nodes.map<string, CodeGenRequest>(
          'mapToRequests',
          (desc) => ({
            description: desc,
            language: 'typescript'
          })
        ))
        .addNode('generateMany', nodes.map<CodeGenRequest, GeneratedCode>(
          'generateMany',
          async (req) => {
            const result = await codeGenAgent.execute(req, {
              memory: undefined as any,
              tools: new Map(),
              metadata: {}
            });
            return result.data;
          }
        ))
        .addNode('filterComplex', nodes.filter<GeneratedCode>(
          'filterComplex',
          (code) => (code.metadata?.functionCount || 0) >= 1
        ))
        .addNode('output', nodes.output<GeneratedCode[]>('output'))
        .connect('input', 'mapToRequests')
        .connect('mapToRequests', 'generateMany')
        .connect('generateMany', 'filterComplex')
        .connect('filterComplex', 'output')
        .build();
      
      const result = await flow.execute([
        'Create a function to validate email',
        'Create a function to sort arrays',
        'Create a function to fetch data'
      ]);
      
      expect(result.success).toBe(true);
      
      const output = result.outputs.get('output');
      expect(output).toBeDefined();
      expect(output?.length).toBeGreaterThan(0);
      output?.forEach(code => {
        expect((code as GeneratedCode).metadata?.functionCount).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Error handling in workflows', () => {
    it('should handle agent failures gracefully', async () => {
      // Create a broken agent that always fails
      const brokenAgent = new CodeGenAgent();
      brokenAgent.execute = async () => ({
        "success": false,
        error: new Error('Agent failed'),
        metadata: { agent: 'broken', timestamp: Date.now() }
      });
      
      const flow = workflow()
        .addNode('input', nodes.input<CodeGenRequest>('input'))
        .addNode('generate', createAgenticNode('generate', brokenAgent))
        .addNode('output', nodes.output<GeneratedCode>('output'))
        .connect('input', 'generate')
        .connect('generate', 'output')
        .build();
      
      const result = await flow.execute({
        description: 'Test',
        language: 'typescript'
      });
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});