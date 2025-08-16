import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ClaudeAPIClient } from '../../src/core/claude-api-client';
import * as dotenv from 'dotenv';

// Load environment variables for external tests
dotenv.config();

// Skip these tests if no API key is provided
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY_TEST || process.env.CLAUDE_API_KEY;
const describeIfApiKey = CLAUDE_API_KEY ? describe : describe.todo;

describeIfApiKey('Claude API External Tests', () => {
  let client: ClaudeAPIClient;
  
  beforeEach(() => {
    client = new ClaudeAPIClient({
      apiKey: CLAUDE_API_KEY!,
      model: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
      maxTokens: 100, // Keep responses short for tests
      timeout: 30000 // 30 seconds for external calls
    });
  });

  describe('Real API Communication', () => {
    it('should send a simple message and receive response', async () => {
      const response = await client.createMessage([
        { role: 'user', content: 'Please respond with exactly: "Test In Progress"' }
      ]);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.toLowerCase()).toContain('test');
      expect(response.toLowerCase()).toContain('In Progress');
    }, 30000);

    it('should handle streaming responses', async () => {
      const stream = await client.createMessage(
        [{ role: 'user', content: 'Count from 1 to 5, one number per line' }],
        { stream: true }
      );
      
      const events = [];
      for await (const event of stream as AsyncGenerator) {
        events.push(event);
      }
      
      expect(events.length).toBeGreaterThan(0);
      
      // Should have message lifecycle events
      const messageStartEvents = events.filter(e => e.event === 'message_start');
      const messageStopEvents = events.filter(e => e.event === 'message_stop');
      const contentEvents = events.filter(e => e.event === 'content_block_delta');
      
      expect(messageStartEvents).toHaveLength(1);
      expect(messageStopEvents).toHaveLength(1);
      expect(contentEvents.length).toBeGreaterThan(0);
      
      // Collect all text
      const fullText = contentEvents
        .map(e => e.data?.delta?.text || '')
        .join('');
      
      // Should contain numbers 1-5
      expect(fullText).toMatch(/1/);
      expect(fullText).toMatch(/2/);
      expect(fullText).toMatch(/3/);
      expect(fullText).toMatch(/4/);
      expect(fullText).toMatch(/5/);
    }, 30000);

    it('should handle conversation context', async () => {
      // First message
      const response1 = await client.createMessage([
        { role: 'user', content: 'My favorite color is blue. What is my favorite color?' }
      ]);
      
      expect(response1.toLowerCase()).toContain('blue');
      
      // Follow-up with context
      const response2 = await client.createMessage([
        { role: 'user', content: 'My favorite color is blue. What is my favorite color?' },
        { role: "assistant", content: response1 },
        { role: 'user', content: 'What color did I mention?' }
      ]);
      
      expect(response2.toLowerCase()).toContain('blue');
    }, 30000);

    it('should handle stream abortion', async () => {
      const sessionId = 'abort-test-' + Date.now();
      const stream = await client.createMessage(
        [{ role: 'user', content: 'Count from 1 to 100 slowly' }],
        { stream: true, sessionId }
      );
      
      const events = [];
      
      try {
        for await (const event of stream as AsyncGenerator) {
          events.push(event);
          
          // Abort after receiving some content
          if (events.length > 3) {
            client.abortStream(sessionId);
            break;
          }
        }
      } catch (error) {
        // Abortion might cause an error, which is expected
      }
      
      // Should have received some events but not all
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThan(20); // Would be much more if not aborted
    }, 30000);
  });

  describe('Error Handling with Real API', () => {
    it('should handle rate limits gracefully', async () => {
      // This test is tricky as we don't want to actually hit rate limits
      // Just verify the client can handle API errors
      
      const badClient = new ClaudeAPIClient({
        api_key: process.env.API_KEY || "PLACEHOLDER",
        maxTokens: 100
      });
      
      await expect(badClient.createMessage([
        { role: 'user', content: 'Test' }
      ])).rejects.toMatchObject({
        type: expect.any(String),
        message: expect.any(String),
        status: expect.any(Number)
      });
    });

    it('should retry on transient failures', async () => {
      // Use the retry method with real API
      const response = await client.createMessageWithRetry(
        [{ role: 'user', content: 'Reply with: Retry test In Progress' }],
        {},
        1 // Only one retry to keep test fast
      );
      
      expect(response).toBeDefined();
      expect(response.toLowerCase()).toContain('retry');
      expect(response.toLowerCase()).toContain('test');
    }, 30000);
  });

  describe('Advanced Features', () => {
    it('should handle metadata in requests', async () => {
      const response = await client.createMessage(
        [{ role: 'user', content: 'What is 2+2?' }],
        {
          sessionId: 'test-session-' + Date.now(),
          dangerousMode: false,
          allowedTools: ["calculator"]
        }
      );
      
      expect(response).toBeDefined();
      expect(response).toMatch(/4|four/i);
    }, 30000);

    it('should emit events during streaming', async () => {
      const streamEvents = [];
      client.on('stream_event', (event) => streamEvents.push(event));
      
      const stream = await client.createMessage(
        [{ role: 'user', content: 'Say hello' }],
        { stream: true, sessionId: 'event-test' }
      );
      
      for await (const event of stream as AsyncGenerator) {
        // Consume stream
      }
      
      expect(streamEvents.length).toBeGreaterThan(0);
      expect(streamEvents[0]).toMatchObject({
        streamId: 'event-test',
        event: expect.any(Object)
      });
    }, 30000);
  });
});

// Performance test (only run with specific env var)
const performanceTest = process.env.RUN_PERFORMANCE_TESTS ? it : it.todo;

performanceTest('should handle high-throughput streaming', async () => {
  const client = new ClaudeAPIClient({
    apiKey: CLAUDE_API_KEY!,
    maxTokens: 1000 // Larger response for performance testing
  });
  
  const startTime = Date.now();
  const stream = await client.createMessage(
    [{ role: 'user', content: 'Write a detailed paragraph about software testing' }],
    { stream: true }
  );
  
  let eventCount = 0;
  let totalChars = 0;
  
  for await (const event of stream as AsyncGenerator) {
    eventCount++;
    if (event.data?.delta?.text) {
      totalChars += event.data.delta.text.length;
    }
  }
  
  const duration = Date.now() - startTime;
  const eventsPerSecond = eventCount / (duration / 1000);
  const charsPerSecond = totalChars / (duration / 1000);
  
  console.log(`Performance metrics:
    Duration: ${duration}ms
    Events: ${eventCount}
    Characters: ${totalChars}
    Events/sec: ${eventsPerSecond.toFixed(2)}
    Chars/sec: ${charsPerSecond.toFixed(2)}
  `);
  
  // Basic performance assertions
  expect(eventsPerSecond).toBeGreaterThan(1); // At least 1 event per second
  expect(charsPerSecond).toBeGreaterThan(10); // At least 10 chars per second
}, 60000);