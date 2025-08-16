/**
 * Basic usage example of LLM Agent Epic
 */

import {
  // Infrastructure
  getEventBus,
  getAuthService,
  getSessionManager,
  getPermissionManager,
  EventTypes,
  
  // Base classes
  BaseAgent,
  BaseCoordinator,
  
  // Interfaces
  AgentRequest,
  AgentResponse,
  AgentCapabilities
} from '../src';

// Example: Create a simple agent
class SimpleAgent extends BaseAgent {
  protected async onInitialize(config: any): Promise<void> {
    console.log(`Initializing ${this.name} with config:`, config);
  }

  protected async onShutdown(): Promise<void> {
    console.log(`Shutting down ${this.name}`);
  }

  protected async onProcess(request: AgentRequest): Promise<AgentResponse> {
    // Simple echo agent
    const lastMessage = request.messages[request.messages.length - 1];
    return {
      id: 'response-' + Date.now(),
      role: 'assistant',
      content: `Echo: ${lastMessage.content}`,
      metadata: {
        processedBy: this.name,
        timestamp: new Date()
      }
    };
  }

  getCapabilities(): AgentCapabilities {
    return {
      chat: true,
      streaming: false,
      tools: false,
      memory: false,
      multimodal: false,
      languages: ['en'],
      maxContextLength: 4096
    };
  }
}

// Example: Create a coordinator
class SimpleCoordinator extends BaseCoordinator {
  protected async onInitialize(config: any): Promise<void> {
    console.log('Coordinator initialized');
  }

  protected async onShutdown(): Promise<void> {
    console.log('Coordinator shutting down');
  }

  protected async onProcess(request: AgentRequest): Promise<AgentResponse> {
    // Route to appropriate agent
    const agent = await this.routeRequest(request);
    return agent.process(request);
  }

  getCapabilities(): AgentCapabilities {
    return {
      chat: true,
      streaming: false,
      tools: true,
      memory: true,
      multimodal: false,
      languages: ['en'],
      maxContextLength: 8192
    };
  }
}

// Main example
async function main() {
  console.log('LLM Agent Epic - Basic Usage Example\n');

  // 1. Initialize infrastructure
  const eventBus = getEventBus();
  const authService = getAuthService();
  const sessionManager = getSessionManager();
  const permissionManager = getPermissionManager();

  // 2. Set up authentication
  console.log('1. Authenticating...');
  const authResult = await authService.authenticate({
    username: 'developer',
    password: 'dev123',
    type: 'password'
  });
  console.log(`   Authenticated as: ${authResult.user.username}`);
  console.log(`   Token: ${authResult.token.substring(0, 10)}...`);

  // 3. Create and initialize agents
  console.log('\n2. Creating agents...');
  const echoAgent = new SimpleAgent('echo-001', 'Echo Agent');
  const coordinator = new SimpleCoordinator('coord-001', 'Simple Coordinator');

  await echoAgent.initialize({ model: 'echo-1.0' });
  await coordinator.initialize({});

  coordinator.registerAgent(echoAgent);
  console.log('   Agents created and registered');

  // 4. Set up event listeners
  console.log('\n3. Setting up event listeners...');
  await eventBus.createTopic('agent-events');
  
  eventBus.subscribe('agent-events', (event) => {
    console.log(`   Event: ${event.type} from ${event.source}`);
  });

  // 5. Create a session
  console.log('\n4. Creating session...');
  const session = await sessionManager.createSession(coordinator.id, {
    persistent: true,
    initialContext: { mode: 'demo' }
  });
  console.log(`   Session created: ${session.id}`);

  // 6. Process a request
  console.log('\n5. Processing request...');
  const request: AgentRequest = {
    id: 'req-001',
    sessionId: session.id,
    messages: [
      {
        role: 'user',
        content: 'Hello, agent!'
      }
    ]
  };

  // Check permissions
  const hasPermission = await permissionManager.checkPermission(
    {
      type: 'execute',
      resource: 'agent',
      action: 'process'
    },
    {
      user: authResult.user,
      agent: coordinator.id,
      session: session.id
    }
  );
  console.log(`   Permission check: ${hasPermission ? 'allowed' : 'denied'}`);

  // Process the request
  const response = await coordinator.process(request);
  console.log(`   Response: ${response.content}`);

  // 7. Demonstrate workflow orchestration
  console.log('\n6. Running workflow...');
  const workflow = {
    id: 'wf-001',
    name: 'Echo Workflow',
    description: 'Simple echo workflow',
    steps: [
      {
        id: 'step1',
        taskType: 'echo',
        config: { message: 'Step 1' }
      },
      {
        id: 'step2',
        taskType: 'echo',
        config: { message: 'Step 2' },
        dependencies: ['step1']
      }
    ]
  };

  const workflowResult = await coordinator.orchestrate(workflow);
  console.log(`   Workflow status: ${workflowResult.status}`);
  console.log(`   Steps completed: ${workflowResult.results.length}`);

  // 8. Check statistics
  console.log('\n7. Statistics:');
  const permStats = permissionManager.getStatistics();
  console.log(`   Total operations: ${permStats.totalOperations}`);
  console.log(`   Allowed: ${permStats.allowedOperations}`);
  console.log(`   Denied: ${permStats.deniedOperations}`);

  const sessionCount = sessionManager.getActiveSessionCount();
  console.log(`   Active sessions: ${sessionCount}`);

  // 9. Cleanup
  console.log('\n8. Cleaning up...');
  await sessionManager.deleteSession(session.id);
  await echoAgent.shutdown();
  await coordinator.shutdown();
  await authService.logout(authResult.token);
  
  console.log('\nExample completed successfully!');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { SimpleAgent, SimpleCoordinator };