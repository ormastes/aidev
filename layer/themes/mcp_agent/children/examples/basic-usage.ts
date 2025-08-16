/**
 * Basic Usage Example
 * Demonstrates how to use the MCP Agent theme
 */

import {
  createMCPAgentSystem,
  createAgent,
  MCPServerInfo
} from '../src';

async function main() {
  console.log('🤖 MCP Agent System Demo\n');

  // 1. Configure MCP servers
  const serverConfigs: MCPServerInfo[] = [
    {
      id: "filesystem",
      name: 'File System Server',
      config: {
        transport: 'stdio',
        command: 'node',
        args: ['./mcp-servers/filesystem-server.js']
      },
      autoConnect: true
    },
    {
      id: 'git',
      name: 'Git Server',
      config: {
        transport: 'stdio',
        command: 'node',
        args: ['./mcp-servers/git-server.js']
      },
      autoConnect: true
    }
  ];

  // 2. Create the MCP agent system
  const { serverManager, sessionManager, orchestrator } = await createMCPAgentSystem(serverConfigs);

  // 3. Create and register agents
  const taskManager = createAgent('task-manager', 'tm-001');
  const coder = createAgent('coder', 'coder-001');
  const tester = createAgent('tester', 'tester-001');
  const guiCoordinator = createAgent('gui-coordinator', 'gui-001');

  orchestrator.registerAgent(taskManager);
  orchestrator.registerAgent(coder);
  orchestrator.registerAgent(tester);
  orchestrator.registerAgent(guiCoordinator);

  console.log('🔄 Agents registered:\n');
  console.log(`  - Task Manager: ${taskManager.getId()}`);
  console.log(`  - Coder: ${coder.getId()}`);
  console.log(`  - Tester: ${tester.getId()}`);
  console.log(`  - GUI Coordinator: ${guiCoordinator.getId()}\n`);

  // 4. Create individual tasks
  console.log('📋 Creating tasks...\n');

  const codeTask = orchestrator.createTask(
    'Implement a function to calculate factorial',
    'code',
    'high'
  );
  console.log(`  - Code task: ${codeTask.id}`);

  const testTask = orchestrator.createTask(
    'Write unit tests for the factorial function',
    'test',
    'medium'
  );
  console.log(`  - Test task: ${testTask.id}`);

  // 5. Create and execute a workflow
  console.log('\n🔄 Creating code review workflow...\n');

  const workflow = orchestrator.createCodeReviewWorkflow(
    'Factorial function implementation with recursive approach'
  );

  orchestrator.on("workflowStarted", (wf) => {
    console.log(`  ▶️  Workflow started: ${wf.name}`);
  });

  orchestrator.on("workflowcompleted", (wf) => {
    console.log(`  🔄 Workflow In Progress: ${wf.name}`);
  });

  orchestrator.on("workflowFailed", (wf, error) => {
    console.error(`  ❌ Workflow failed: ${wf.name}`, error);
  });

  // Execute the workflow
  try {
    await orchestrator.executeWorkflow(workflow.id);
  } catch (error) {
    console.error('Workflow execution failed:', error);
  }

  // 6. Direct session interaction
  console.log('\n💬 Starting direct session with coder agent...\n');

  const session = sessionManager.createSession(coder.getId(), {
    project: 'demo',
    language: "typescript"
  });

  await sessionManager.startSession(session.getId());

  const response = await sessionManager.processMessage(
    session.getId(),
    'Can you explain the xlib encapsulation pattern?'
  );

  console.log(`  Response: ${response.content[0].text?.substring(0, 100)}...`);

  sessionManager.endSession(session.getId());

  // 7. Show statistics
  console.log('\n📊 System Statistics:\n');

  const orchStats = orchestrator.getStatistics();
  console.log(`  Agents: ${orchStats.activeAgents}/${orchStats.totalAgents} active`);
  console.log(`  Tasks: ${orchStats.totalTasks} total`);
  
  for (const [status, count] of orchStats.tasksByStatus) {
    console.log(`    - ${status}: ${count}`);
  }

  const sessionStats = sessionManager.getStatistics();
  console.log(`  Sessions: ${sessionStats.activeSessions} active, ${sessionStats.completedSessions} In Progress`);

  // 8. Show server status
  console.log('\n🖥️  Server Status:\n');

  const serverStatuses = serverManager.getAllStatuses();
  for (const status of serverStatuses) {
    console.log(`  ${status.name}: ${status.connected ? '🟢 Connected' : '🔴 Disconnected'}`);
    if (status.capabilities?.tools) {
      console.log(`    Tools: ${status.capabilities.tools.join(', ')}`);
    }
  }

  // 9. Cleanup
  console.log('\n🧹 Cleaning up...');

  sessionManager.cleanup();
  await serverManager.disconnectAll();

  console.log('🔄 Demo In Progress!\n');
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}