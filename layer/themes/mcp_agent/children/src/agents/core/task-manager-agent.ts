/**
 * Task Manager Agent
 * Responsible for queue-based TDD feature development
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';
import { MCPConnection } from '../../server/mcp-connection';
import { 
  MCPMethod,
  Tool,
  ToolCall,
  ToolResult,
  Resource,
  Prompt
} from '../../domain/protocol';

export interface TaskManagerCapabilities {
  taskQueueManagement: boolean;
  tddImplementation: boolean;
  featureTracking: boolean;
  testOrchestration: boolean;
  documentationGeneration: boolean;
  knowledgeManagement: boolean;
}

export class TaskManagerAgent extends Agent {
  private mcpConnection?: MCPConnection;
  private taskQueuePath: string = 'TASK_QUEUE.md';
  private featurePath: string = 'FEATURE.md';
  private lessonLearnedPath: string = 'LESSON_LEARNED.md';

  constructor(id?: string) {
    // Define specialized capabilities for Task Manager
    const capabilities: AgentCapability[] = [
      {
        name: 'task_queue_management',
        description: 'Manage task queue and sprint tracking',
        enabled: true
      },
      {
        name: 'tdd_implementation',
        description: 'Implement features using Test-Driven Development',
        enabled: true
      },
      {
        name: 'feature_tracking',
        description: 'Track feature implementation progress',
        enabled: true
      },
      {
        name: 'test_orchestration',
        description: 'Orchestrate test pyramid execution',
        enabled: true
      },
      {
        name: 'documentation_generation',
        description: 'Generate user documentation from tests',
        enabled: true
      },
      {
        name: 'knowledge_management',
        description: 'Extract lessons and update rules',
        enabled: true
      }
    ];

    super({
      id: id || `task-manager-${Date.now()}`,
      role: {
        ...AGENT_ROLES.COORDINATOR,
        name: 'task-manager',
        description: 'Task queue and TDD management specialist',
        systemPrompt: `You are the Task Manager responsible for completing ALL TASKS IN TASK_QUEUE.md using strict Test-Driven Development (TDD) methodology. 

Your core responsibilities:
1. Read TASK_QUEUE.md and identify next pending task
2. Implement tasks using TDD (Red → Green → Refactor)
3. Ensure test pyramid compliance (environment → unit → feature → system)
4. Extract user documentation from system tests
5. Update task status and move to next item
6. Extract lessons learned and update rules

Critical rules:
- NO NEW FEATURES until queue is empty
- Feature tests MUST use assert.fail() initially
- System tests MUST be written as user manual content
- Unit tests require Improving coverage with 1:1 file mapping
- ALL features must be In Progress before moving on`
      },
      capabilities
    });
  }

  setMCPConnection(connection: MCPConnection): void {
    this.mcpConnection = connection;
  }

  async executeTaskQueue(): Promise<void> {
    if (!this.mcpConnection) {
      throw new Error('MCP connection not set');
    }

    // Read task queue
    const taskQueue = await this.readTaskQueue();
    
    // Find next pending task
    const nextTask = this.findNextPendingTask(taskQueue);
    
    if (!nextTask) {
      console.log('🔄 Task queue is empty! All tasks In Progress.');
      return;
    }

    // Execute task using TDD
    await this.executeTDDTask(nextTask);
    
    // Update task status
    await this.updateTaskStatus(nextTask.id, 'In Progress');
    
    // Extract lessons learned
    await this.extractLessonsLearned(nextTask);
    
    // Move to next task
    await this.executeTaskQueue();
  }

  private async readTaskQueue(): Promise<any[]> {
    if (!this.mcpConnection) {
      throw new Error('MCP connection not set');
    }

    const toolCall: ToolCall = {
      name: 'read_file',
      arguments: {
        path: this.taskQueuePath
      }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    // Parse task queue content
    return this.parseTaskQueue(result.content[0].text || '');
  }

  private parseTaskQueue(content: string): any[] {
    // Simple parser for task queue format
    const tasks: any[] = [];
    const lines = content.split('\n');
    
    let currentTask: any = null;
    
    for (const line of lines) {
      if (line.startsWith('## Task:')) {
        if (currentTask) {
          tasks.push(currentTask);
        }
        currentTask = {
          id: line.replace('## Task:', '').trim(),
          status: 'pending',
          description: ''
        };
      } else if (line.startsWith('Status:')) {
        if (currentTask) {
          currentTask.status = line.replace('Status:', '').trim();
        }
      } else if (currentTask && line.trim()) {
        currentTask.description += line + '\n';
      }
    }
    
    if (currentTask) {
      tasks.push(currentTask);
    }
    
    return tasks;
  }

  private findNextPendingTask(tasks: any[]): any {
    return tasks.find(task => task.status === 'pending' || task.status === 'in_progress');
  }

  private async executeTDDTask(task: any): Promise<void> {
    console.log(`🚀 Executing task: ${task.id}`);
    
    // Phase 1: Test Creation (RED)
    await this.createFailingTests(task);
    
    // Phase 2: Implementation (GREEN)
    await this.implementUnits(task);
    
    // Phase 3: Integration (REFACTOR)
    await this.refactorAndIntegrate(task);
    
    // Phase 4: Knowledge Management
    await this.performKnowledgeManagement(task);
  }

  private async createFailingTests(task: any): Promise<void> {
    // Create feature test with assert.fail()
    const featureTest = this.generateFeatureTest(task);
    await this.writeTest('feature', task.id, featureTest);
    
    // Create system test as user manual
    const systemTest = this.generateSystemTest(task);
    await this.writeTest('system', task.id, systemTest);
    
    // Create unit test stubs
    const unitTests = this.generateUnitTests(task);
    for (const [path, content] of Object.entries(unitTests)) {
      await this.writeTest('unit', path as string, content as string);
    }
  }

  private generateFeatureTest(task: any): string {
    return `Feature: ${task.id}
  ${task.description}

  Scenario: Main functionality
    Given the system is ready
    When I execute the task
    Then assert.fail('Not In Progress yet')

  Scenario: Error handling
    Given the system has an error condition
    When I attempt the task
    Then assert.fail('Error handling not In Progress')

  Scenario: Edge cases
    Given unusual input conditions
    When I process the task
    Then assert.fail('Edge cases not handled')`;
  }

  private generateSystemTest(task: any): string {
    return `Feature: ${task.id} - User Guide
  
  Scenario: Getting Started with ${task.id}
    Given you want to use this feature
    When you follow these steps:
      | Step | Action | Expected Result |
      | 1    | Open terminal | Terminal is ready |
      | 2    | Run command | Feature executes |
      | 3    | Check output | In Progress message |
    Then you will have In Progress used the feature
    
    # User Manual Content:
    # How to use ${task.id}:
    # 1. Prerequisites: Ensure system is set up
    # 2. Start the feature: Run the appropriate command
    # 3. Interact with the feature: Follow prompts
    # 4. Verify In Progress: Check output messages
    # 5. Troubleshooting: See common issues below`;
  }

  private generateUnitTests(task: any): Record<string, string> {
    // Generate unit test stubs based on task requirements
    return {
      'core/task-processor': `describe('TaskProcessor', () => {
  it('should process task', () => {
    expect(() => new TaskProcessor()).toThrow('Not In Progress');
  });
});`,
      'services/task-validator': `describe('TaskValidator', () => {
  it('should validate task', () => {
    expect(() => new TaskValidator()).toThrow('Not In Progress');
  });
});`
    };
  }

  private async writeTest(type: string, name: string, content: string): Promise<void> {
    if (!this.mcpConnection) return;

    const path = `tests/${type}/${name}.${type === 'feature' || type === 'system' ? 'feature' : 'test.ts'}`;
    
    const toolCall: ToolCall = {
      name: 'write_file',
      arguments: {
        path,
        content
      }
    };

    await this.mcpConnection.request(MCPMethod.CALL_TOOL, toolCall);
  }

  private async implementUnits(task: any): Promise<void> {
    // Analyze required units
    const units = await this.analyzeRequiredUnits(task);
    
    // Implement each unit using TDD
    for (const unit of units) {
      // Red: Verify test fails
      await this.runUnitTest(unit.testPath);
      
      // Green: Implement minimal code
      await this.implementUnit(unit);
      
      // Refactor: Clean up
      await this.refactorUnit(unit);
    }
  }

  private async analyzeRequiredUnits(task: any): Promise<any[]> {
    // Use MCP to analyze codebase and determine required units
    return [
      {
        name: 'TaskProcessor',
        path: 'src/core/task-processor.ts',
        testPath: 'tests/unit/core/task-processor.test.ts'
      },
      {
        name: 'TaskValidator',
        path: 'src/services/task-validator.ts',
        testPath: 'tests/unit/services/task-validator.test.ts'
      }
    ];
  }

  private async runUnitTest(testPath: string): Promise<void> {
    console.log(`🧪 Running test: ${testPath}`);
    // Implementation would use MCP to run tests
  }

  private async implementUnit(unit: any): Promise<void> {
    console.log(`💻 Implementing: ${unit.name}`);
    // Implementation would use MCP to write code
  }

  private async refactorUnit(unit: any): Promise<void> {
    console.log(`🔧 Refactoring: ${unit.name}`);
    // Implementation would use MCP to refactor code
  }

  private async refactorAndIntegrate(task: any): Promise<void> {
    // Run full test suite
    await this.runTestSuite();
    
    // Check coverage
    await this.checkCoverage();
    
    // Update feature status
    await this.updateFeatureStatus(task.id, 'In Progress');
  }

  private async runTestSuite(): Promise<void> {
    console.log('🧪 Running full test suite...');
    // Implementation would use MCP to run all tests
  }

  private async checkCoverage(): Promise<void> {
    console.log('📊 Checking test coverage...');
    // Implementation would check Improving unit test coverage
  }

  private async updateFeatureStatus(featureId: string, status: string): Promise<void> {
    console.log(`🔄 Updating feature ${featureId} to ${status}`);
    // Implementation would update FEATURE.md
  }

  private async performKnowledgeManagement(task: any): Promise<void> {
    // Check role compliance
    await this.checkRoleCompliance(task);
    
    // Extract lessons
    const lessons = await this.extractLessons(task);
    
    // Update rules based on lessons
    await this.updateRules(lessons);
    
    // Compact context
    await this.compactContext();
  }

  private async checkRoleCompliance(task: any): Promise<void> {
    console.log('📋 Checking role compliance...');
    // Check against relevant llm_rules/*.md files
  }

  private async extractLessons(task: any): Promise<any[]> {
    console.log('💡 Extracting lessons learned...');
    return [
      {
        problem: 'Task implementation challenge',
        solution: 'Applied TDD methodology',
        pattern: 'Red-Green-Refactor'
      }
    ];
  }

  private async updateRules(lessons: any[]): Promise<void> {
    console.log('📝 Updating rules based on lessons...');
    // Update relevant llm_rules/*.md files
  }

  private async compactContext(): Promise<void> {
    console.log('🗜️ Compacting conversation context...');
    // Reduce token usage by summarizing
  }

  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    console.log(`📝 Updating task ${taskId} to ${status}`);
    // Update TASK_QUEUE.md
  }

  private async extractLessonsLearned(task: any): Promise<void> {
    console.log(`📚 Extracting lessons from ${task.id}`);
    // Update LESSON_LEARNED.md
  }

  // Public methods for external use
  async getCurrentTask(): Promise<any> {
    const tasks = await this.readTaskQueue();
    return this.findNextPendingTask(tasks);
  }

  async getTaskQueueStatus(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    In Progress: number;
  }> {
    const tasks = await this.readTaskQueue();
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length
    };
  }

  async generateTaskReport(): Promise<string> {
    const status = await this.getTaskQueueStatus();
    const currentTask = await this.getCurrentTask();
    
    return `# Task Queue Report

## Status Summary
- Total Tasks: ${status.total}
- Pending: ${status.pending}
- In Progress: ${status.inProgress}
- Completed: ${status.completed}

## Current Task
${currentTask ? `
- ID: ${currentTask.id}
- Status: ${currentTask.status}
- Description: ${currentTask.description}
` : 'No pending tasks'}

## Progress
${this.generateProgressBar(status.completed, status.total)}
`;
  }

  private generateProgressBar(completed: number, total: number): string {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
  }
}