import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

// Import real implementations
import { CLIInterface } from '../../src/external/cli-interface';
import { FileStorage } from '../../src/external/file-storage';
import { MessageBroker } from '../../src/external/message-broker';
import { ContextProvider } from '../../src/external/context-provider';
import { ChatRoomPlatform } from '../../src/application/chat-room-platform';
import { PocketFlowConnector } from '../../src/external/pocketflow-connector';

/**
 * Mockless System Test: PocketFlow Integration Workflow Notifications
 * 
 * Tests the real integration between Chat Space and PocketFlow for workflow notifications
 * using actual component implementations without any mocks.
 */

// Test data directory
const TEST_DATA_DIR = path.join(process.cwd(), 'test-pocketflow-data');
const TEST_AIDEV_DIR = path.join(process.cwd(), '../_aidev');

// Helper to clean up test data
async function cleanupTestData(): Promise<void> {
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
}

// Helper to ensure test aidev directory structure
async function ensureTestAidevDir(): Promise<void> {
  const dirs = [
    TEST_AIDEV_DIR,
    path.join(TEST_AIDEV_DIR, 'layer', 'themes'),
    path.join(TEST_AIDEV_DIR, 'layer', 'themes', 'chat-space'),
    path.join(TEST_AIDEV_DIR, 'layer', 'themes', 'pocketflow')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  // Create sample files for workflows to process
  const srcDir = path.join(process.cwd(), 'test-src');
  try {
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(path.join(srcDir, 'app.ts'), `
// Sample TypeScript file for testing
interface User {
  id: string;
  name: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}

export { User, greetUser };
`);
    await fs.writeFile(path.join(srcDir, 'utils.ts'), `
// Utility functions
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseJSON(json: string): any {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
`);
  } catch {
    // Files already exist
  }
}

describe('Mockless PocketFlow Integration System Test', () => {
  let eventBus: EventEmitter;
  let cli: CLIInterface;
  let storage: FileStorage;
  let broker: MessageBroker;
  let contextProvider: ContextProvider;
  let platform: ChatRoomPlatform;
  let pocketFlow: PocketFlowConnector;
  
  // Track workflow events
  let workflowEvents: Array<{ type: string; data: any; timestamp: Date }>;
  let messageEvents: Array<{ type: string; message: any; timestamp: Date }>;

  beforeEach(async () => {
    // Clean up and set up test environment
    await cleanupTestData();
    await ensureTestAidevDir();
    
    // Initialize event bus
    eventBus = new EventEmitter();
    eventBus.setMaxListeners(100);
    
    // Initialize real components
    storage = new FileStorage(TEST_DATA_DIR);
    await storage.initialize();
    
    broker = new MessageBroker(eventBus);
    contextProvider = new ContextProvider(process.cwd());
    pocketFlow = new PocketFlowConnector(eventBus);
    
    // Initialize platform
    platform = new ChatRoomPlatform(
      eventBus,
      storage,
      broker,
      pocketFlow,
      contextProvider
    );
    
    await platform.initialize();
    
    // Initialize CLI
    cli = new CLIInterface(eventBus);
    
    // Set up event tracking
    workflowEvents = [];
    messageEvents = [];
    
    // Track PocketFlow events
    pocketFlow.subscribeToEvents([
      'execution_started',
      'step_started',
      'step_completed',
      'execution_completed',
      'execution_failed',
      'workflow_enabled',
      'workflow_disabled',
      'message_output',
      'context_update',
      'file_output'
    ], (event) => {
      workflowEvents.push({ type: event.type || 'unknown', data: event, timestamp: new Date() });
    });
    
    // Track message events
    eventBus.on('platform:message_sent', (data) => {
      if (data.message.type === 'workflow') {
        messageEvents.push({ type: 'workflow_message', message: data.message, timestamp: new Date() });
      }
    });
    
    eventBus.on('message:broadcasted', (data) => {
      messageEvents.push({ type: 'broadcasted', message: data.message, timestamp: new Date() });
    });
  });

  afterEach(async () => {
    // Clean up
    await broker.shutdown();
    contextProvider.clearCache();
    await cleanupTestData();
    
    // Clean up test source files
    try {
      await fs.rm(path.join(process.cwd(), 'test-src'), { recursive: true, force: true });
    } catch {
      // Ignore
    }
    
    eventBus.removeAllListeners();
  });

  test('should execute code review workflow and deliver results to chat room', async () => {
    // Setup: Login and create room
    await cli.processCommand('/register developer');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login developer');
    await cli.processCommand('/create code-review-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join code-review-room');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Execute code review workflow
    const reviewResult = await cli.processCommand('/review test-src/app.ts');
    expect(reviewResult.success).toBe(true);
    expect(reviewResult.message).toBe('Starting code review for test-src/app.ts');
    
    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify workflow execution events
    const startEvents = workflowEvents.filter(e => e.data.workflowName === 'Code Review Assistant');
    expect(startEvents.length).toBeGreaterThan(0);
    
    const completionEvents = workflowEvents.filter(e => e.data.workflowId === 'code-review' && e.data.results);
    expect(completionEvents.length).toBeGreaterThan(0);
    
    // Verify workflow message was sent to room
    const workflowMessages = messageEvents.filter(e => e.type === 'workflow_message');
    expect(workflowMessages.length).toBeGreaterThan(0);
    expect(workflowMessages[0].message.content).toContain('code-review In Progress');
    
    // Verify message was saved to storage
    const rooms = await storage.getAllRooms();
    const room = rooms.find(r => r.name === 'code-review-room');
    expect(room).toBeDefined();
    
    const messages = await storage.loadMessages(room!.id);
    const workflowMessage = messages.find(m => m.type === 'workflow');
    expect(workflowMessage).toBeDefined();
    expect(workflowMessage!.userId).toBe('workflow');
  });

  test('should execute file search workflow with context integration', async () => {
    // Setup: Login and create room
    await cli.processCommand('/register searcher');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login searcher');
    await cli.processCommand('/create search-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join search-room');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Execute search workflow
    const searchResult = await cli.processCommand('/search interface');
    expect(searchResult.success).toBe(true);
    expect(searchResult.message).toBe('Searching for "interface"');
    
    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify workflow executed
    const searchEvents = workflowEvents.filter(e => e.data.workflowId === 'file-search');
    expect(searchEvents.length).toBeGreaterThan(0);
    
    // Verify context update event
    const contextUpdateEvents = workflowEvents.filter(e => e.data.updates && e.data.updates.searchResults);
    expect(contextUpdateEvents.length).toBeGreaterThan(0);
    
    // Verify search results structure
    const results = contextUpdateEvents[0].data.updates.searchResults;
    expect(results).toBeDefined();
    expect(results.success).toBe(true);
  });

  test('should handle workflow errors gracefully', async () => {
    // Setup: Login and create room
    await cli.processCommand('/register tester');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login tester');
    await cli.processCommand('/create error-test-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join error-test-room');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create a workflow that will fail
    const testWorkflow = {
      id: 'error-test',
      name: 'Error Test Workflow',
      description: 'Workflow that triggers an error',
      trigger: { type: 'chat_command' as const, config: { command: '/error-test' } },
      steps: [{
        id: 'failing-step',
        name: 'Failing Step',
        type: 'action' as const,
        action: 'non_existent_action'
      }],
      outputs: [{
        name: 'error_output',
        type: 'message' as const
      }],
      enabled: true
    };
    
    // Add the test workflow
    (pocketFlow as any).workflows.set('error-test', testWorkflow);
    
    // Track platform errors
    const platformErrors: any[] = [];
    eventBus.on('platform:error', (data) => platformErrors.push(data));
    
    // Execute the failing workflow through platform
    eventBus.emit('cli:workflow_command', {
      workflow: 'error-test',
      args: {},
      userId: 'tester',
      roomId: (await storage.getAllRooms())[0].id
    });
    
    // Wait for workflow to fail
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify workflow failed
    const failureEvents = workflowEvents.filter(e => e.data.error);
    expect(failureEvents.length).toBeGreaterThan(0);
    expect(failureEvents[0].data.error).toContain('Action not In Progress');
    
    // Verify platform handled the error
    expect(platformErrors.length).toBeGreaterThan(0);
    expect(platformErrors[0].error).toBe('workflow_failed');
  });

  test('should manage workflow state and provide status updates', async () => {
    // Get available workflows
    const workflows = await pocketFlow.getWorkflows();
    expect(workflows.length).toBeGreaterThan(0);
    
    // Check specific workflow
    const codeReviewWorkflow = await pocketFlow.getWorkflow('code-review');
    expect(codeReviewWorkflow).toBeDefined();
    expect(codeReviewWorkflow!.name).toBe('Code Review Assistant');
    expect(codeReviewWorkflow!.enabled).toBe(true);
    
    // Disable workflow
    await pocketFlow.disableWorkflow('code-review');
    
    // Verify workflow disabled event
    const disableEvents = workflowEvents.filter(e => e.data.workflowId === 'code-review' && e.type === 'unknown');
    expect(disableEvents.length).toBeGreaterThan(0);
    
    // Check workflow status
    const status = await pocketFlow.getFlowStatus('code-review');
    expect(status.workflow.enabled).toBe(false);
    
    // Re-enable workflow for a specific room
    await pocketFlow.enableWorkflow('code-review', 'test-room-id');
    
    // Verify workflow enabled event
    const enableEvents = workflowEvents.filter(e => e.data.workflowId === 'code-review' && e.data.roomId === 'test-room-id');
    expect(enableEvents.length).toBeGreaterThan(0);
  });

  test('should handle concurrent workflow executions', async () => {
    // Setup: Login and create room
    await cli.processCommand('/register concurrent-user');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login concurrent-user');
    await cli.processCommand('/create concurrent-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join concurrent-room');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Execute multiple workflows concurrently
    const workflowPromises = [
      cli.processCommand('/review test-src/app.ts'),
      cli.processCommand('/search User'),
      cli.processCommand('/review test-src/utils.ts')
    ];
    
    const results = await Promise.all(workflowPromises);
    
    // All should start In Progress
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // Wait for all workflows to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify all workflows executed
    const executionStarts = workflowEvents.filter(e => e.data.workflowId);
    expect(executionStarts.length).toBeGreaterThanOrEqual(3);
    
    // Verify execution order maintained
    const executionIds = new Set(executionStarts.map(e => e.data.executionId));
    expect(executionIds.size).toBeGreaterThanOrEqual(3); // Each execution has unique ID
    
    // Check workflow messages in room
    const rooms = await storage.getAllRooms();
    const room = rooms.find(r => r.name === 'concurrent-room');
    const messages = await storage.loadMessages(room!.id);
    const workflowMessages = messages.filter(m => m.type === 'workflow');
    expect(workflowMessages.length).toBeGreaterThanOrEqual(3);
  });

  test('should integrate workflow outputs with chat room messages', async () => {
    // Setup: Login and create room
    await cli.processCommand('/register integration-user');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login integration-user');
    await cli.processCommand('/create integration-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join integration-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get room for verification
    const rooms = await storage.getAllRooms();
    const room = rooms.find(r => r.name === 'integration-room');
    expect(room).toBeDefined();
    
    // Send regular message
    cli.processTextMessage('Starting code review process...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Execute workflow
    await cli.processCommand('/review test-src/app.ts');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send follow-up message
    cli.processTextMessage('Review In Progress, checking results.');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify message order and types
    const allMessages = await storage.loadMessages(room!.id);
    expect(allMessages.length).toBeGreaterThanOrEqual(3);
    
    // Check message sequence
    expect(allMessages[0].content).toBe('Starting code review process...');
    expect(allMessages[0].type).toBe('text');
    
    const workflowMsg = allMessages.find(m => m.type === 'workflow');
    expect(workflowMsg).toBeDefined();
    expect(workflowMsg!.username).toBe('Workflow');
    
    const lastTextMsg = allMessages[allMessages.length - 1];
    expect(lastTextMsg.content).toBe('Review In Progress, checking results.');
    
    // Verify timestamps are in order
    for (let i = 1; i < allMessages.length; i++) {
      expect(allMessages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
        allMessages[i - 1].timestamp.getTime()
      );
    }
  });

  test('should provide real-time workflow progress updates', async () => {
    // Setup: Login and create room
    await cli.processCommand('/register progress-user');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login progress-user');
    await cli.processCommand('/create progress-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join progress-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Track step events
    const stepEvents: any[] = [];
    workflowEvents.forEach(event => {
      if (event.data.stepId) {
        stepEvents.push(event);
      }
    });
    
    // Execute workflow
    await cli.processCommand('/review test-src/app.ts');
    
    // Monitor progress in real-time
    let executionId: string | undefined;
    const checkProgress = async () => {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Find execution ID from events
        const startEvent = workflowEvents.find(e => e.data.workflowId === 'code-review' && e.data.executionId);
        if (startEvent) {
          executionId = startEvent.data.executionId;
          
          // Get execution status
          const execution = await pocketFlow.getExecution(executionId);
          if (execution) {
            if (execution.status === 'In Progress' || execution.status === 'failed') {
              break;
            }
          }
        }
      }
    };
    
    await checkProgress();
    
    // Verify we got step progression events
    const reviewStepEvents = workflowEvents.filter(e => 
      e.data.executionId === executionId && e.data.stepName
    );
    expect(reviewStepEvents.length).toBeGreaterThan(0);
    
    // Verify steps executed in order
    const stepNames = reviewStepEvents.map(e => e.data.stepName);
    expect(stepNames).toContain('Fetch Code Changes');
    expect(stepNames).toContain('Analyze Changes');
    expect(stepNames).toContain('Generate Report');
  });

  test('should handle room-specific workflow configurations', async () => {
    // Create two different rooms
    await cli.processCommand('/register multi-room-user');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/login multi-room-user');
    
    // Room 1
    await cli.processCommand('/create room-one');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join room-one');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const rooms1 = await storage.getAllRooms();
    const room1 = rooms1.find(r => r.name === 'room-one');
    
    // Enable workflow for room 1
    await pocketFlow.enableWorkflow('code-review', room1!.id);
    
    // Room 2
    await cli.processCommand('/create room-two');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join room-two');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const rooms2 = await storage.getAllRooms();
    const room2 = rooms2.find(r => r.name === 'room-two');
    
    // Execute workflow in room 2
    await cli.processCommand('/review test-src/app.ts');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify workflow executed in correct room context
    const room2Messages = await storage.loadMessages(room2!.id);
    const workflowMessages = room2Messages.filter(m => m.type === 'workflow');
    expect(workflowMessages.length).toBeGreaterThan(0);
    
    // Verify room 1 has no workflow messages
    const room1Messages = await storage.loadMessages(room1!.id);
    expect(room1Messages.filter(m => m.type === 'workflow').length).toBe(0);
  });
});