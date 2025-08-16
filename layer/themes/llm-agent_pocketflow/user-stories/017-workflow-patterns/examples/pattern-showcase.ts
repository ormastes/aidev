/**
 * PocketFlow Workflow Patterns Showcase
 * Demonstrates all available patterns
 */

import { MockAgent } from '@aidev/pocketflow-agents';
import { PatternRegistry, PATTERNS } from '../src';

async function main() {
  console.log('🎭 PocketFlow Workflow Patterns Showcase\n');
  
  // Show available patterns
  console.log('📋 Available Patterns:');
  const patterns = PatternRegistry.getAllInfo();
  patterns.forEach(info => {
    console.log(`  • ${info.name}: ${info.description}`);
    console.log(`    Agents: ${info.minAgents}${info.maxAgents ? `-${info.maxAgents}` : '+'}`);
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Run examples
  await runSequentialExample();
  await runParallelExample();
  await runMapReduceExample();
  await runSupervisorExample();
  await runRAGExample();
  await runDebateExample();
  await runReflectionExample();
}

async function runSequentialExample() {
  console.log('1️⃣ Sequential Pattern Example\n');
  
  const agents = await createAgents(3);
  agents[0].addResponse('analyze', 'This text needs translation and summary.');
  agents[1].addResponse('translation', 'Texto traducido al español.');
  agents[2].addResponse('texto', 'Resumen: El texto fue traducido.');
  
  const pattern = PatternRegistry.create(PATTERNS.SEQUENTIAL);
  const result = await pattern.execute('Analyze this text', agents);
  
  console.log('🔄 Result:', result.outputs.get('output').message.content);
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agents);
}

async function runParallelExample() {
  console.log('2️⃣ Parallel Pattern Example\n');
  
  const agents = await createAgents(3);
  agents[0].setDefaultResponse('Sentiment: Positive');
  agents[1].setDefaultResponse('Keywords: AI, workflow, patterns');
  agents[2].setDefaultResponse('Language: English');
  
  const pattern = PatternRegistry.create(PATTERNS.PARALLEL);
  const result = await pattern.execute('Analyze this text in parallel', agents);
  
  console.log('🔄 Results:', result.outputs.get('output'));
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agents);
}

async function runMapReduceExample() {
  console.log('3️⃣ Map-Reduce Pattern Example\n');
  
  const agents = await createAgents(2);
  agents[0].setDefaultResponse('Processed items 1-3');
  agents[1].setDefaultResponse('Processed items 4-5');
  
  const pattern = PatternRegistry.create(PATTERNS.MAP_REDUCE);
  const items = [1, 2, 3, 4, 5];
  
  const result = await pattern.execute(items, agents, {
    mapFunction: (item: number) => item * 2,
    reduceFunction: (acc: any[], curr: any) => [...acc, curr],
    initialValue: []
  });
  
  console.log('🔄 Result:', result.outputs.get('output'));
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agents);
}

async function runSupervisorExample() {
  console.log('4️⃣ Supervisor Pattern Example\n');
  
  const agents = await createAgents(3);
  
  // Supervisor
  agents[0].setDefaultResponse(`Breaking down the task:
- Research: Gather information about AI
- Analysis: Analyze the findings
- Report: Create final report`);
  
  // Workers
  agents[1].addResponse('research', 'Research In Progress: Found 10 papers on AI.');
  agents[2].addResponse('analysis', 'Analysis In Progress: Key trends identified.');
  
  const pattern = PatternRegistry.create(PATTERNS.SUPERVISOR);
  const result = await pattern.execute('Create an AI research report', agents);
  
  console.log('🔄 Final Result:', result.outputs.get('output').finalResult);
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agents);
}

async function runRAGExample() {
  console.log('5️⃣ RAG Pattern Example\n');
  
  const agent = await createAgents(1);
  agent[0].addResponse('capital', `Retrieved context:
- France is a country in Europe
- The capital of France is Paris
- Paris is known as the City of Light`);
  
  const pattern = PatternRegistry.create(PATTERNS.RAG);
  const result = await pattern.execute('What is the capital of France?', agent, {
    contextLimit: 3,
    retrievalStrategy: 'keyword'
  });
  
  console.log('🔄 Response:', result.outputs.get('output').response);
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agent);
}

async function runDebateExample() {
  console.log('6️⃣ Debate Pattern Example\n');
  
  const agents = await createAgents(2);
  
  // Set initial positions
  agents[0].setDefaultResponse('AI should be regulated to ensure safety and accountability.');
  agents[1].setDefaultResponse('AI should remain unregulated to foster innovation.');
  
  // Add responses for rounds
  agents[0].addResponse('regulated', 'Regulation can coexist with innovation through smart policies.');
  agents[1].addResponse('innovation', 'Over-regulation stifles progress and competitive advantage.');
  
  const pattern = PatternRegistry.create(PATTERNS.DEBATE);
  const result = await pattern.execute('Should AI be regulated?', agents, {
    rounds: 2,
    votingStrategy: 'majority'
  });
  
  const output = result.outputs.get('output');
  console.log('🏁 Debate Summary:');
  console.log(`   Topic: ${output.topic}`);
  console.log(`   Rounds: ${output.rounds}`);
  console.log(`   Consensus: ${output.consensus}`);
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agents);
}

async function runReflectionExample() {
  console.log('7️⃣ Reflection Pattern Example\n');
  
  const agent = await createAgents(1);
  
  // Initial response
  agent[0].setDefaultResponse('The sky is blue.');
  
  // Critique response
  agent[0].addResponse('blue', 'This is too simple. Add more detail. Score: 0.4');
  
  // Improved response
  agent[0].addResponse('detail', 'The sky appears blue due to Rayleigh scattering of sunlight.');
  
  // Better critique
  agent[0].addResponse('scattering', 'Much better! Scientific explanation provided. Score: 0.9');
  
  const pattern = PatternRegistry.create(PATTERNS.REFLECTION);
  const result = await pattern.execute('Explain why the sky is blue', agent, {
    maxIterations: 2,
    improvementThreshold: 0.8,
    criteria: ['accuracy', 'detail', 'clarity']
  });
  
  const output = result.outputs.get('output');
  console.log('🔄 Final Output:', output.finalOutput);
  console.log(`📊 Best Score: ${output.bestScore}`);
  console.log(`🔄 Iterations: ${output.iterations}`);
  console.log(`⏱️  Execution time: ${result.executionTime}ms\n`);
  
  await cleanupAgents(agent);
}

// Helper functions
async function createAgents(count: number): Promise<MockAgent[]> {
  const agents: MockAgent[] = [];
  
  for (let i = 0; i < count; i++) {
    const agent = new MockAgent();
    await agent.initialize({
      simulateDelay: true,
      delayMs: 50 // Faster for examples
    });
    agents.push(agent);
  }
  
  return agents;
}

async function cleanupAgents(agents: MockAgent[]): Promise<void> {
  for (const agent of agents) {
    await agent.terminate();
  }
}

// Run the showcase
main().catch(console.error);