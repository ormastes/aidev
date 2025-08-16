/**
 * Basic Sequential Workflow Example
 * 
 * This example demonstrates a simple linear workflow where each step
 * depends on the output of the previous step.
 */

import { PocketFlow, nodes } from '@pocketflow/core';
import { BaseAgent } from '@pocketflow/agents';

// Custom agents for this example
class ValidationAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const { data } = input;
    
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    if (!data.age || data.age < 0) {
      throw new Error('Invalid age');
    }
    
    return {
      data: {
        ...data,
        validated: true,
        validatedAt: new Date().toISOString()
      }
    };
  }
}

class NormalizationAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const { data } = input;
    
    return {
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
        name: data.name ? data.name.trim() : '',
        normalized: true
      }
    };
  }
}

class EnrichmentAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const { data } = input;
    
    // Simulate enrichment with additional data
    const enrichedData = {
      ...data,
      userType: data.age >= 18 ? 'adult' : 'minor',
      domain: data.email.split('@')[1],
      enriched: true,
      enrichedAt: new Date().toISOString()
    };
    
    return { data: enrichedData };
  }
}

// Create the sequential workflow
export function createSequentialWorkflow(): PocketFlow {
  return new PocketFlow()
    // Input stage
    .addNode('input', nodes.input("userData"))
    
    // Processing stages
    .addNode("validate", new ValidationAgent())
    .addNode("normalize", new NormalizationAgent())
    .addNode('enrich', new EnrichmentAgent())
    
    // Output stage
    .addNode('output', nodes.output("processedUser"))
    
    // Connect nodes in sequence
    .connect('input', "validate")
    .connect("validate", "normalize")
    .connect("normalize", 'enrich')
    .connect('enrich', 'output');
}

// Example usage
export async function runSequentialWorkflowExample() {
  const workflow = createSequentialWorkflow();
  
  const userData = {
    name: '  John Doe  ',
    email: 'JOHN.DOE@EXAMPLE.COM',
    age: 25
  };
  
  console.log('Input:', userData);
  
  try {
    const result = await workflow.execute(userData);
    console.log('Result:', result.data);
    
    /*
    Expected output:
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 25,
      validated: true,
      validatedAt: '2023-01-01T12:00:00.000Z',
      normalized: true,
      userType: 'adult',
      domain: 'example.com',
      enriched: true,
      enrichedAt: '2023-01-01T12:00:00.000Z'
    }
    */
  } catch (error) {
    console.error('Workflow failed:', error.message);
  }
}

// Error handling example
export async function runSequentialWorkflowWithError() {
  const workflow = createSequentialWorkflow();
  
  const invalidData = {
    name: 'Invalid User',
    email: 'invalid-email', // This will cause validation to fail
    age: -5
  };
  
  console.log('Input:', invalidData);
  
  try {
    const result = await workflow.execute(invalidData);
    console.log('Result:', result.data);
  } catch (error) {
    console.error('Workflow failed at validation:', error.message);
    // Output: "Invalid email format"
  }
}

// Performance measurement example
export async function measureSequentialWorkflowPerformance() {
  const workflow = createSequentialWorkflow();
  
  const testData = Array.from({ length: 100 }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50)
  }));
  
  console.log(`Processing ${testData.length} users...`);
  
  const startTime = Date.now();
  const results = [];
  
  for (const userData of testData) {
    const result = await workflow.execute(userData);
    results.push(result.data);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`Processed ${results.length} users in ${duration}ms`);
  console.log(`Average time per user: ${duration / results.length}ms`);
}

// If running directly
if (require.main === module) {
  (async () => {
    console.log('=== Sequential Workflow Example ===');
    await runSequentialWorkflowExample();
    
    console.log('\n=== Error Handling Example ===');
    await runSequentialWorkflowWithError();
    
    console.log('\n=== Performance Example ===');
    await measureSequentialWorkflowPerformance();
  })();
}