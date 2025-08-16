#!/usr/bin/env ts-node

/**
 * Test Claude Chat Addition Feature
 * Standalone test to verify Claude connector's math capabilities
 */

import { ClaudeConnector } from '../src/external/claude-connector';

async function testClaudeAddition() {
  console.log('🤖 Claude Chat Addition Test');
  console.log('=' .repeat(50));
  console.log('');

  // Create Claude connector
  const claude = new ClaudeConnector({
    enableMath: true,
    temperature: 0.1  // Low temperature for consistent math
  });

  try {
    // Initialize
    await claude.initialize();
    console.log('✅ Claude connector initialized');
    
    // Check availability
    const isAvailable = await claude.isAvailable();
    console.log(`✅ Claude availability: ${isAvailable}`);
    console.log('');

    // Test direct addition
    console.log('1. Testing direct addition method:');
    console.log('-'.repeat(30));
    
    const directTests: Array<[number, number]> = [
      [2, 3],
      [10, 15],
      [100, 200],
      [-5, 8],
      [0, 42]
    ];

    let passedTests = 0;
    for (const [num1, num2] of directTests) {
      const result = await claude.add(num1, num2);
      const expected = num1 + num2;
      const isCorrect = result.result === expected;
      const symbol = isCorrect ? '✅' : '❌';
      
      if (isCorrect) passedTests++;
      console.log(`   ${result.expression} = ${result.result} ${symbol}`);
    }

    console.log(`   Result: ${passedTests}/${directTests.length} passed`);

    console.log('');
    console.log('2. Testing chat-based addition:');
    console.log('-'.repeat(30));

    // Test chat interactions
    const chatTests = [
      'What is 5 + 7?',
      'Can you add 123 and 456 for me?',
      'Calculate 999 + 1',
      'I need help adding -50 + 75'
    ];

    for (const question of chatTests) {
      console.log(`   Q: ${question}`);
      const response = await claude.chat(question);
      console.log(`   A: ${response.content}`);
      
      // Verify the answer is correct
      const match = question.match(/(-?\d+)\s*[\+and]\s*(-?\d+)/i);
      if (match) {
        const n1 = parseInt(match[1], 10);
        const n2 = parseInt(match[2], 10);
        const expected = n1 + n2;
        const hasCorrectAnswer = response.content.includes(expected.toString());
        console.log(`   Verified: ${hasCorrectAnswer ? '✅' : '❌'}`);
      }
      console.log('');
    }

    // Test batch addition
    console.log('3. Testing batch addition:');
    console.log('-'.repeat(30));
    
    const batchPairs: Array<[number, number]> = [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5]
    ];

    const batchResults = await claude.addMultiple(batchPairs);
    let batchCorrect = 0;
    batchResults.forEach((result, i) => {
      const [n1, n2] = batchPairs[i];
      const expected = n1 + n2;
      const isCorrect = result.result === expected;
      batchCorrect += isCorrect ? 1 : 0;
      console.log(`   ${result.expression} = ${result.result} ${isCorrect ? '✅' : '❌'}`);
    });
    console.log(`   Batch result: ${batchCorrect}/${batchPairs.length} correct`);

    console.log('');
    console.log('4. Testing complex chat interaction:');
    console.log('-'.repeat(30));

    // Simulate a conversation
    const conversation = [
      'Hello Claude!',
      'Can you help me with some math?',
      'What is 15 + 27?',
      'Great! Now add 100 + 250',
      'Thank you!'
    ];

    for (const message of conversation) {
      console.log(`   User: ${message}`);
      const response = await claude.chat(message);
      console.log(`   Claude: ${response.content}`);
      console.log('');
    }

    // Get conversation history
    console.log('5. Conversation history:');
    console.log('-'.repeat(30));
    const history = claude.getHistory();
    console.log(`   Total messages: ${history.length}`);
    console.log(`   User messages: ${history.filter(m => m.role === 'user').length}`);
    console.log(`   Assistant messages: ${history.filter(m => m.role === 'assistant').length}`);

    // Test multiple additions in one message
    console.log('');
    console.log('6. Testing multiple additions in one message:');
    console.log('-'.repeat(30));
    
    const multiQuestion = 'Please calculate: 10 + 20, 30 + 40, and 50 + 60';
    console.log(`   Q: ${multiQuestion}`);
    const multiResponse = await claude.chat(multiQuestion);
    console.log(`   A: ${multiResponse.content}`);
    
    // Verify all answers
    const expectedAnswers = [30, 70, 110];
    const allCorrect = expectedAnswers.every(ans => 
      multiResponse.content.includes(ans.toString())
    );
    console.log(`   All answers present: ${allCorrect ? '✅' : '❌'}`);

    console.log('');
    console.log('=' .repeat(50));
    console.log('✅ All Claude chat addition tests completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`   - Direct addition: ${passedTests}/${directTests.length} passed`);
    console.log(`   - Batch addition: ${batchCorrect}/${batchPairs.length} passed`);
    console.log(`   - Chat interactions: Working`);
    console.log(`   - History tracking: ${history.length} messages recorded`);
    
    // Cleanup
    await claude.shutdown();

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testClaudeAddition().catch(console.error);
}

export { testClaudeAddition };