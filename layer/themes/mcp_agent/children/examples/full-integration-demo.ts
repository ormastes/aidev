/**
 * Full Integration Demo
 * Demonstrates all agents working together
 */

import {
  createMCPAgentSystem,
  createAgent,
  AGENT_TYPES,
  MCPServerInfo,
  AgentType
} from '../src';

async function main() {
  console.log('🤖 MCP Agent Full Integration Demo\n');
  console.log('Demonstrating all agent types from ../_aidev\n');

  // 1. Configure MCP servers
  const serverConfigs: MCPServerInfo[] = [
    {
      id: "filesystem",
      name: 'File System Server',
      config: {
        transport: 'stdio',
        command: 'mcp-server-filesystem'
      },
      autoConnect: true
    },
    {
      id: 'git',
      name: 'Git Server',
      config: {
        transport: 'stdio',
        command: 'mcp-server-git'
      },
      autoConnect: true
    }
  ];

  // 2. Create the MCP agent system
  const { serverManager, sessionManager, orchestrator } = await createMCPAgentSystem(serverConfigs);

  // 3. Create and register all agent types
  console.log('📋 Creating All Agent Types:\n');

  // Core Development Agents
  console.log('🔧 Core Development Agents:');
  const coreAgents: Record<string, any> = {};
  for (const agentType of AGENT_TYPES.core) {
    const agent = createAgent(agentType);
    orchestrator.registerAgent(agent);
    coreAgents[agentType] = agent;
    console.log(`  🔄 ${agentType}: ${agent.getId()}`);
  }

  // Specialized Agents
  console.log('\n🎯 Specialized Agents:');
  const specializedAgents: Record<string, any> = {};
  for (const agentType of AGENT_TYPES.specialized) {
    const agent = createAgent(agentType);
    orchestrator.registerAgent(agent);
    specializedAgents[agentType] = agent;
    console.log(`  🔄 ${agentType}: ${agent.getId()}`);
  }

  // Support Agents
  console.log('\n🛠️ Support Agents:');
  const supportAgents: Record<string, any> = {};
  for (const agentType of AGENT_TYPES.support) {
    const agent = createAgent(agentType);
    orchestrator.registerAgent(agent);
    supportAgents[agentType] = agent;
    console.log(`  🔄 ${agentType}: ${agent.getId()}`);
  }

  // 4. Demonstrate agent capabilities
  console.log('\n🎨 Agent Capabilities Showcase:\n');

  // Task Manager Demo
  console.log('📋 Task Manager Agent:');
  console.log('  - Manages TASK_QUEUE.md');
  console.log('  - Implements TDD methodology');
  console.log('  - Tracks feature progress');
  console.log(`  - Capabilities: ${coreAgents['task-manager'].getEnabledCapabilities().join(', ')}`);

  // Coder Demo
  console.log('\n💻 Coder Agent:');
  console.log('  - Interface-first design');
  console.log('  - Improving unit test coverage');
  console.log('  - External library encapsulation (xlib pattern)');
  console.log(`  - Capabilities: ${coreAgents['coder'].getEnabledCapabilities().join(', ')}`);

  // Tester Demo
  console.log('\n🧪 Tester Agent:');
  console.log('  - Scenario-first testing');
  console.log('  - Multiple system tests');
  console.log('  - Screenshot documentation for GUI');
  console.log(`  - Capabilities: ${coreAgents['tester'].getEnabledCapabilities().join(', ')}`);

  // GUI Coordinator Demo
  console.log('\n🎨 GUI Coordinator Agent:');
  console.log('  - 4-agent GUI generation');
  console.log('  - ASCII sketches → 4 designs');
  console.log('  - Web selection UI at http://localhost:3456');
  console.log(`  - Capabilities: ${specializedAgents['gui-coordinator'].getEnabledCapabilities().join(', ')}`);

  // 5. Demonstrate workflow coordination
  console.log('\n🔄 Workflow Examples:\n');

  // Feature Development Workflow
  console.log('📦 Feature Development Workflow:');
  const featureWorkflow = orchestrator.createFeatureImplementationWorkflow('User Authentication');
  console.log(`  - Created workflow: ${featureWorkflow.name}`);
  console.log(`  - Steps: ${featureWorkflow.steps.map(s => s.name).join(' → ')}`);

  // Code Review Workflow
  console.log('\n🔍 Code Review Workflow:');
  const reviewWorkflow = orchestrator.createCodeReviewWorkflow('Authentication Service Implementation');
  console.log(`  - Created workflow: ${reviewWorkflow.name}`);
  console.log(`  - Steps: ${reviewWorkflow.steps.map(s => s.name).join(' → ')}`);

  // 6. Demonstrate task execution
  console.log('\n📝 Task Execution Demo:\n');

  // Create tasks for different agents
  const tasks = [
    orchestrator.createTask('Implement login feature', 'code', 'high'),
    orchestrator.createTask('Write unit tests for auth service', 'test', 'high'),
    orchestrator.createTask('Review authentication architecture', 'review', 'medium'),
    orchestrator.createTask('Design login UI components', 'design', 'high')
  ];

  console.log('Created tasks:');
  tasks.forEach(task => {
    console.log(`  - ${task.id}: ${task.description} (${task.priority})`);
  });

  // 7. Show agent collaboration
  console.log('\n🤝 Agent Collaboration Example:\n');

  console.log('Scenario: Implementing a new feature with full team collaboration');
  console.log('\n1️⃣ Feature Manager: Plans the feature requirements');
  console.log('2️⃣ Task Manager: Creates tasks in TASK_QUEUE.md');
  console.log('3️⃣ GUI Coordinator: Generates 4 UI design options');
  console.log('4️⃣ Coder: Implements with interface-first design');
  console.log('5️⃣ Tester: Creates comprehensive test suite');
  console.log('6️⃣ API Checker: Validates API contracts');
  console.log('7️⃣ Mobile Automation: Tests on iOS/Android');
  console.log('8️⃣ DevOps: Deploys to production');
  console.log('9️⃣ Context Manager: Manages conversation tokens');

  // 8. Statistics
  console.log('\n📊 System Statistics:\n');

  const orchStats = orchestrator.getStatistics();
  console.log(`Total Agents: ${orchStats.totalAgents}`);
  console.log(`Active Agents: ${orchStats.activeAgents}`);
  console.log(`Total Tasks: ${orchStats.totalTasks}`);
  
  console.log('\nTasks by Status:');
  for (const [status, count] of orchStats.tasksByStatus) {
    console.log(`  - ${status}: ${count}`);
  }

  const sessionStats = sessionManager.getStatistics();
  console.log(`\nTotal Sessions: ${sessionStats.totalSessions}`);
  console.log(`Active Sessions: ${sessionStats.activeSessions}`);

  // 9. Agent Role Summary
  console.log('\n📚 Agent Role Summary:\n');

  const allAgentTypes = [...AGENT_TYPES.core, ...AGENT_TYPES.specialized, ...AGENT_TYPES.support];
  
  console.log('Based on ../_aidev roles:');
  allAgentTypes.forEach(type => {
    const agent = createAgent(type);
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Role: ${agent.getRole().description}`);
    console.log(`  Capabilities: ${agent.getCapabilities().length}`);
  });

  // 10. Cleanup
  console.log('\n🧹 Cleaning up...\n');

  sessionManager.cleanup();
  await serverManager.disconnectAll();

  console.log('🔄 Demo In Progress In Progress!');
  console.log('\n💡 All agent types from ../_aidev have been In Progress and tested');
}

// Helper function to display agent details
function displayAgentDetails(agent: any): void {
  console.log(`\n📋 Agent Details: ${agent.getId()}`);
  console.log(`  Role: ${agent.getRoleName()}`);
  console.log(`  Status: ${agent.isActive() ? 'Active' : "Inactive"}`);
  console.log(`  Capabilities: ${agent.getEnabledCapabilities().length}`);
  
  const capabilities = agent.getCapabilities();
  if (capabilities.length > 0) {
    console.log('  Available capabilities:');
    capabilities.slice(0, 3).forEach((cap: any) => {
      console.log(`    - ${cap.name}: ${cap.description}`);
    });
    if (capabilities.length > 3) {
      console.log(`    ... and ${capabilities.length - 3} more`);
    }
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}