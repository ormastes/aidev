#!/usr/bin/env ts-node
/**
 * Hello Add Demo - Simple addition with Ollama/DeepSeek R1
 * Demonstrates mock-free LLM interaction for basic math
 */

import { OllamaCoordinator } from './src/ollama-coordinator';
import { checkOllamaAvailability } from './pipe/utils';

interface AdditionTest {
  num1: number;
  num2: number;
  expected: number;
}

async function runHelloAddDemo() {
  console.log('🧮 Hello Add Demo - Simple Math with Local LLM');
  console.log('=' .repeat(50));

  // Check if Ollama is available
  console.log('\n1. Checking Ollama availability...');
  const availability = await checkOllamaAvailability();
  
  if (!availability.available) {
    console.log('❌ Ollama is not available');
    console.log('   Please start Ollama with: ollama serve');
    console.log('   And install DeepSeek R1 with: ollama pull deepseek-r1:latest');
    return;
  }

  console.log('✅ Ollama is available');
  
  // Check for DeepSeek R1 or fallback model
  const models = availability.models || [];
  const hasDeepSeek = models.some(m => m.toLowerCase().includes("deepseek"));
  const modelToUse = hasDeepSeek 
    ? models.find(m => m.toLowerCase().includes("deepseek"))!
    : (models[0] || 'llama2');

  console.log(`   Using model: ${modelToUse}`);

  // Initialize coordinator
  console.log('\n2. Initializing coordinator...');
  const coordinator = new OllamaCoordinator({
    defaultModel: modelToUse,
    enableLogging: false,
    autoInstallModels: false
  });

  try {
    await coordinator.initialize();
    console.log('✅ Coordinator initialized');

    // Create a chat session for math questions
    console.log(`\n3. Creating chat session with ${modelToUse}...`);
    const session = coordinator.createChatSession({
      model: modelToUse,
      temperature: 0.1,  // Low temperature for deterministic math
      systemPrompt: `You are a helpful math assistant. When asked to calculate additions, 
                     respond with ONLY the numeric answer, nothing else. 
                     For example: If asked "What is 2 + 3?", respond with just "5"`
    });

    // Test cases
    const tests: AdditionTest[] = [
      { num1: 2, num2: 3, expected: 5 },
      { num1: 10, num2: 15, expected: 25 },
      { num1: 100, num2: 200, expected: 300 },
      { num1: -5, num2: 8, expected: 3 },
      { num1: 0, num2: 42, expected: 42 }
    ];

    console.log('\n4. Running addition tests...\n');
    let passedTests = 0;

    for (const test of tests) {
      const question = `What is ${test.num1} + ${test.num2}?`;
      console.log(`   Q: ${question}`);
      
      try {
        // Ask the question
        const response = await session.sendMessage(question);
        
        // Extract number from response
        const answer = extractNumber(response.content);
        const answerNum = parseInt(answer, 10);
        
        // Check if correct
        const isCorrect = answerNum === test.expected;
        const symbol = isCorrect ? '✅' : '❌';
        
        console.log(`   A: ${answer} ${symbol}`);
        
        if (!isCorrect) {
          console.log(`      Expected: ${test.expected}`);
        } else {
          passedTests++;
        }
        
        console.log('');
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    // Summary
    console.log('=' .repeat(50));
    console.log(`Results: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
      console.log('🎉 All tests passed! The LLM can do basic addition.');
    } else {
      console.log('⚠️  Some tests failed. This is normal for language models.');
      console.log('   They may need better prompting or a math-specific model.');
    }

    // Demonstrate streaming for a word problem
    console.log('\n5. Bonus: Word problem with streaming...\n');
    const wordProblem = `If you have 15 apples and someone gives you 27 more apples, 
                        how many apples do you have in total? Please show your work.`;
    
    console.log(`   Q: ${wordProblem}\n`);
    console.log('   A: ', { end: '' });
    
    await session.streamMessage(wordProblem, (chunk) => {
      process.stdout.write(chunk.content);
    });
    console.log('\n');

    // Get metrics
    console.log('6. Session metrics:');
    const metrics = coordinator.getMetrics();
    console.log(`   Total requests: ${metrics.totalRequests}`);
    console.log(`   Active sessions: ${metrics.activeSessions}`);
    console.log(`   Cache hits: ${metrics.cacheHits}`);
    console.log(`   Cache misses: ${metrics.cacheMisses}`);
    if (metrics.cacheHits + metrics.cacheMisses > 0) {
      const hitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(1);
      console.log(`   Cache hit rate: ${hitRate}%`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup
    await coordinator.shutdown();
    console.log('\n✅ Demo completed');
  }
}

function extractNumber(text: string): string {
  // Try to extract just the number from the response
  const trimmed = text.trim();
  
  // If it's just a number, return it
  if (/^-?\d+$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try to find a number in the text
  const match = text.match(/-?\d+/);
  if (match) {
    return match[0];
  }
  
  // Fallback to the full text
  return trimmed;
}

// Run the demo
runHelloAddDemo().catch(console.error);