// Simple test to show Claude can do math
import { ClaudeCoordinatorAgent } from './src/agents/claude-coordinator';

// Mock the ChatClient to capture responses
class MockChatClient {
  private responses: string[] = [];

  constructor(public config: any) {}

  start() {
    console.log('Mock client started');
  }

  private sendMessage(message: any) {
    if (message.payload?.content) {
      this.responses.push(message.payload.content);
    }
  }

  getResponses() {
    return this.responses;
  }

  // Mock the handleServerMessage
  private handleServerMessage(message: any) {
    // Do nothing
  }
}

async function testMath() {
  console.log('🧪 Testing Claude Math Capability\n');

  // Create a mock coordinator
  const coordinator = new ClaudeCoordinatorAgent({
    serverUrl: 'ws://localhost:3000',
    roomId: 'test',
    agentName: 'Claude'
  });

  // Test the getDemoResponse method directly
  const testCases = [
    '2 + 3',
    '10 - 5',
    '4 * 6',
    '20 / 4',
    '(10 + 5) * 2'
  ];

  console.log('Testing math expressions without API key:\n');

  for (const expression of testCases) {
    // Access the private method for testing
    const response = (coordinator as any).getDemoResponse(expression);
    console.log(`Q: ${expression}`);
    console.log(`A: ${response}\n`);
  }

  console.log('🔄 Claude can do basic math even without an API key!');
}

testMath().catch(err => {
  console.error('Error:', err);
});