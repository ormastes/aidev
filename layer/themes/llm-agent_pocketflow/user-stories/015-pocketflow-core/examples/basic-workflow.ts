/**
 * Basic PocketFlow workflow example
 * Demonstrates the minimalist approach to LLM workflows
 */

import { PocketFlow } from '../src/core';
import { 
  InputNode, 
  TransformNode, 
  FilterNode, 
  OutputNode 
} from '../src/nodes';

async function main() {
  console.log('🚀 PocketFlow Example - Basic Workflow\n');

  // Create a new workflow
  const flow = new PocketFlow();

  // Define nodes
  flow.addNode(new InputNode("userInput"));
  
  flow.addNode(new TransformNode("preparePrompt", (text: string) => ({
    prompt: `Please analyze the following text: "${text}"`,
    maxTokens: 100,
    temperature: 0.7
  })));

  flow.addNode(new TransformNode('mockLLM', async (request: any) => {
    // This would be replaced with actual LLM call
    console.log('📤 LLM Request:', request);
    
    // Simulate LLM response
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      response: `Analysis of "${request.prompt}": This appears to be a test message.`,
      usage: { tokens: 42 }
    };
  }));

  flow.addNode(new TransformNode("extractResponse", (llmOutput: any) => ({
    text: llmOutput.response,
    metadata: {
      tokens: llmOutput.usage.tokens,
      timestamp: new Date().toISOString()
    }
  })));

  flow.addNode(new FilterNode("validateResponse", (output: any) => 
    output.text && output.text.length > 0
  ));

  flow.addNode(new OutputNode('result'));

  // Connect nodes with edges
  flow.addEdge({ from: "userInput", to: "preparePrompt" });
  flow.addEdge({ from: "preparePrompt", to: 'mockLLM' });
  flow.addEdge({ from: 'mockLLM', to: "extractResponse" });
  flow.addEdge({ from: "extractResponse", to: "validateResponse" });
  flow.addEdge({ from: "validateResponse", to: 'result' });

  // Execute workflow
  console.log('🔄 Executing workflow...\n');
  const result = await flow.execute('Hello, PocketFlow!');

  // Display results
  console.log('🔄 Workflow completed!\n');
  console.log('📊 Results:');
  console.log('- completed:', result.success);
  console.log('- Execution time:', result.executionTime + 'ms');
  console.log('- Errors:', result.errors.length);
  
  console.log('\n📦 Output:');
  const finalOutput = result.outputs.get('result');
  console.log(JSON.stringify(finalOutput, null, 2));

  // Example 2: Parallel Processing
  console.log('\n\n🚀 Example 2 - Parallel Processing\n');
  
  const parallelFlow = new PocketFlow();
  
  // Input splits to multiple branches
  parallelFlow.addNode(new InputNode('input'));
  
  // Three parallel analysis branches
  parallelFlow.addNode(new TransformNode("sentiment", (text: string) => ({
    type: "sentiment",
    result: text.includes('!') ? "positive" : 'neutral'
  })));
  
  parallelFlow.addNode(new TransformNode("wordCount", (text: string) => ({
    type: "wordCount",
    result: text.split(' ').length
  })));
  
  parallelFlow.addNode(new TransformNode("language", (text: string) => ({
    type: "language",
    result: 'en'
  })));
  
  // Merge results
  parallelFlow.addNode(new TransformNode('merge', (inputs: any[]) => {
    const merged: any = {};
    inputs.forEach(input => {
      merged[input.type] = input.result;
    });
    return merged;
  }));
  
  parallelFlow.addNode(new OutputNode("analysis"));
  
  // Connect parallel branches
  parallelFlow.addEdge({ from: 'input', to: "sentiment" });
  parallelFlow.addEdge({ from: 'input', to: "wordCount" });
  parallelFlow.addEdge({ from: 'input', to: "language" });
  
  parallelFlow.addEdge({ from: "sentiment", to: 'merge' });
  parallelFlow.addEdge({ from: "wordCount", to: 'merge' });
  parallelFlow.addEdge({ from: "language", to: 'merge' });
  
  parallelFlow.addEdge({ from: 'merge', to: "analysis" });
  
  const parallelResult = await parallelFlow.execute('Hello PocketFlow! This is amazing!');
  
  console.log('🔄 Parallel workflow completed!');
  console.log('\n📦 Analysis:');
  console.log(JSON.stringify(parallelResult.outputs.get("analysis"), null, 2));
}

// Run the example
main().catch(console.error);