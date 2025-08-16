/**
 * Example: Code generation workflow using agentic coding features
 */

import { workflow } from '../../018-type-safety/src/builder';
import { nodes } from '../../018-type-safety/src/nodes';
import { 
  CodeGenAgent, 
  TestGenAgent,
  createAgenticNode,
  AgentChain,
  ParallelAgents,
  CodeGenRequest,
  TestGenRequest,
  GeneratedCode,
  GeneratedTest
} from '../src';

/**
 * Example 1: Simple code generation workflow
 */
async function simpleCodeGeneration() {
  console.log('=== Simple Code Generation ===\n');
  
  // Create agents
  const codeGen = new CodeGenAgent({
    defaultLanguage: 'typescript',
    defaultStyle: 'functional'
  });
  
  const testGen = new TestGenAgent({
    defaultFramework: 'jest',
    defaultCoverage: 90
  });
  
  // Build workflow
  const codeFlow = workflow()
    .addNode('input', nodes.input<CodeGenRequest>('input'))
    .addNode('generate', createAgenticNode('generate', codeGen))
    .addNode('createTests', createAgenticNode<GeneratedCode, GeneratedTest>(
      'createTests',
      testGen,
      {
        // Transform generated code to test request
        preProcess: async (code: GeneratedCode) => ({
          code: code.code,
          framework: 'jest',
          testType: 'unit',
          coverage: 90
        } as TestGenRequest)
      }
    ))
    .addNode('output', nodes.output<{ code: GeneratedCode; tests: GeneratedTest }>('output'))
    .connect('input', 'generate')
    .connect('generate', 'createTests')
    .connect('createTests', 'output', (tests) => ({
      code: tests as any, // Would need proper type handling
      tests
    }))
    .build();
  
  // Execute workflow
  const result = await codeFlow.execute({
    description: 'Create a function that validates email addresses',
    language: 'typescript',
    style: 'functional'
  });
  
  if (result.success) {
    console.log('Generated code and tests In Progress!');
    console.log('Output available at:', result.outputs.get('output'));
  }
}

/**
 * Example 2: Parallel code generation with multiple styles
 */
async function parallelCodeGeneration() {
  console.log('\n=== Parallel Code Generation ===\n');
  
  // Create agents with different styles
  const functionalAgent = new CodeGenAgent({ defaultStyle: 'functional' });
  const ooAgent = new CodeGenAgent({ defaultStyle: 'object-oriented' });
  const proceduralAgent = new CodeGenAgent({ defaultStyle: 'procedural' });
  
  // Create parallel execution node
  const parallelGen = new ParallelAgents<CodeGenRequest, GeneratedCode>(
    'parallel-gen',
    [functionalAgent, ooAgent, proceduralAgent]
  );
  
  // Build workflow
  const parallelFlow = workflow()
    .addNode('input', nodes.input<CodeGenRequest>('input'))
    .addNode('parallel', parallelGen)
    .addNode('output', nodes.output<GeneratedCode[]>('output'))
    .connect('input', 'parallel')
    .connect('parallel', 'output')
    .build();
  
  // Execute
  const result = await parallelFlow.execute({
    description: 'Create a function to sort an array of objects by a key',
    language: 'typescript'
  });
  
  if (result.success) {
    const outputs = result.outputs.get('output');
    console.log(`Generated ${outputs?.length} different implementations`);
  }
}

/**
 * Example 3: Agent chain for iterative refinement
 */
async function iterativeRefinement() {
  console.log('\n=== Iterative Code Refinement ===\n');
  
  // Create chain of agents that progressively improve code
  const initialGen = new CodeGenAgent();
  const optimizer = new CodeGenAgent(); // Would be a specialized optimizer
  const documenter = new CodeGenAgent(); // Would be a documentation agent
  
  const refinementChain = new AgentChain<CodeGenRequest, GeneratedCode>(
    'refinement',
    [initialGen, optimizer, documenter],
    [
      // Transform between agents
      (code: GeneratedCode) => ({
        description: `Optimize this code: ${code.code}`,
        language: code.language
      }),
      (code: GeneratedCode) => ({
        description: `Add comprehensive documentation: ${code.code}`,
        language: code.language
      })
    ]
  );
  
  // Build workflow
  const refinementFlow = workflow()
    .addNode('input', nodes.input<CodeGenRequest>('input'))
    .addNode('refine', refinementChain)
    .addNode('output', nodes.output<GeneratedCode>('output'))
    .connect('input', 'refine')
    .connect('refine', 'output')
    .build();
  
  // Execute
  const result = await refinementFlow.execute({
    description: 'Create a function to fetch data from an API with retry logic',
    language: 'typescript'
  });
  
  if (result.success) {
    console.log('Code refined through multiple agents');
  }
}

/**
 * Example 4: Complex workflow with validation and testing
 */
async function complexWorkflow() {
  console.log('\n=== Complex Code Generation Workflow ===\n');
  
  const codeGen = new CodeGenAgent();
  const testGen = new TestGenAgent();
  
  // Build complex workflow
  const complexFlow = workflow()
    .addNode('requirements', nodes.input<string>('requirements'))
    .addNode('parseReq', nodes.transform<string, CodeGenRequest>(
      'parseReq',
      (req) => ({
        description: req,
        language: 'typescript',
        style: 'functional',
        context: {
          constraints: ['Use proper error handling', 'Include type definitions']
        }
      })
    ))
    .addNode('generate', createAgenticNode('generate', codeGen))
    .addNode('validate', nodes.validation<GeneratedCode>(
      'validate',
      (code) => {
        if (!code.code || code.code.length < 10) {
          return { "success": false, errors: ['Generated code too short'] };
        }
        return { "success": true };
      }
    ))
    .addNode('generateTests', createAgenticNode<GeneratedCode, GeneratedTest>(
      'generateTests',
      testGen,
      {
        preProcess: async (code) => ({
          code: code.code,
          framework: 'jest',
          testType: 'unit',
          mockStrategy: 'auto'
        })
      }
    ))
    .addNode('bundle', nodes.transform(
      'bundle',
      (data: { code: GeneratedCode; tests: GeneratedTest }) => ({
        implementation: data.code,
        tests: data.tests,
        metadata: {
          timestamp: new Date().toISOString(),
          coverage: data.tests.coverage
        }
      })
    ))
    .addNode('output', nodes.output('output'))
    .connect('requirements', 'parseReq')
    .connect('parseReq', 'generate')
    .connect('generate', 'validate')
    .connect('validate', 'generateTests')
    .connect('generateTests', 'bundle', (tests) => ({
      code: tests as any, // Would need proper handling
      tests
    }))
    .connect('bundle', 'output')
    .build();
  
  // Execute
  const result = await complexFlow.execute(
    'Create a robust email validation function with proper error handling'
  );
  
  if (result.success) {
    console.log('Complex workflow In Progress In Progress');
    const output = result.outputs.get('output');
    console.log('Generated bundle:', output);
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await simpleCodeGeneration();
    await parallelCodeGeneration();
    await iterativeRefinement();
    await complexWorkflow();
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}