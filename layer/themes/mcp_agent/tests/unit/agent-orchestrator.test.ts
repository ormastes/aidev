import { AgentOrchestrator, Task, Workflow, WorkflowStep, WorkflowContext } from '../../children/src/orchestrator/agent-orchestrator';
import { Agent } from '../../children/src/domain/agent';
import { SessionManager } from '../../children/src/session/session-manager';
import { MCPServerManager } from '../../children/src/server/mcp-server-manager';

// Mock dependencies
jest.mock('../../children/src/session/session-manager');
jest.mock('../../children/src/server/mcp-server-manager');
jest.mock('../../children/src/domain/agent');

const MockedSessionManager = SessionManager as jest.MockedClass<typeof SessionManager>;
const MockedMCPServerManager = MCPServerManager as jest.MockedClass<typeof MCPServerManager>;

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockSessionManager: jest.Mocked<SessionManager>;
  let mockMCPManager: jest.Mocked<MCPServerManager>;

  beforeEach(() => {
    mockSessionManager = new MockedSessionManager() as jest.Mocked<SessionManager>;
    mockMCPManager = new MockedMCPServerManager() as jest.Mocked<MCPServerManager>;
    
    orchestrator = new AgentOrchestrator(mockSessionManager, mockMCPManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create AgentOrchestrator instance', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should initialize with session and MCP managers', () => {
      expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
    });
  });

  describe('task management', () => {
    it('should create a new task', () => {
      const taskDescription = 'Implement user authentication';
      const taskType = 'code';
      const priority = 'high';

      const task = orchestrator.createTask(taskDescription, taskType, priority);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.description).toBe(taskDescription);
      expect(task.type).toBe(taskType);
      expect(task.priority).toBe(priority);
      expect(task.status).toBe('pending');
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should assign task to appropriate agent', async () => {
      const task: Task = {
        id: 'test-task-1',
        description: 'Write unit tests',
        type: 'test',
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };

      const result = await orchestrator.assignTask(task);

      expect(result).toBe(true);
      expect(task.status).toBe('assigned');
      expect(task.assignedAgent).toBeDefined();
    });

    it('should handle task execution', async () => {
      const task: Task = {
        id: 'test-task-2',
        description: 'Review code changes',
        type: 'review',
        priority: 'high',
        status: 'assigned',
        assignedAgent: 'agent-1',
        createdAt: new Date()
      };

      await orchestrator.executeTask(task);

      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeInstanceOf(Date);
    });

    it('should get all tasks', () => {
      // Create some test tasks
      orchestrator.createTask('Task 1', 'code', 'high');
      orchestrator.createTask('Task 2', 'test', 'medium');

      const tasks = orchestrator.getAllTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].description).toBe('Task 1');
      expect(tasks[1].description).toBe('Task 2');
    });

    it('should get tasks by status', () => {
      const task1 = orchestrator.createTask('Pending Task', 'code', 'high');
      const task2 = orchestrator.createTask('Another Task', 'test', 'medium');
      
      // Manually change status for testing
      task2.status = 'in_progress';

      const pendingTasks = orchestrator.getTasksByStatus('pending');
      const inProgressTasks = orchestrator.getTasksByStatus('in_progress');

      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].description).toBe('Pending Task');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].description).toBe('Another Task');
    });
  });

  describe('workflow management', () => {
    let testWorkflow: Workflow;

    beforeEach(() => {
      const steps: WorkflowStep[] = [
        {
          name: 'design',
          agentRole: 'designer',
          task: 'Create system design',
          dependsOn: []
        },
        {
          name: 'implement',
          agentRole: 'coder',
          task: 'Implement the design',
          dependsOn: ['design']
        },
        {
          name: 'test',
          agentRole: 'tester',
          task: 'Write and run tests',
          dependsOn: ['implement']
        }
      ];

      testWorkflow = {
        id: 'test-workflow-1',
        name: 'Feature Development',
        steps,
        context: { feature: 'user-auth' },
        status: 'pending'
      };
    });

    it('should create a new workflow', () => {
      const workflow = orchestrator.createWorkflow('Test Workflow', testWorkflow.steps);

      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.steps).toHaveLength(3);
      expect(workflow.status).toBe('pending');
    });

    it('should execute workflow steps in order', async () => {
      await orchestrator.executeWorkflow(testWorkflow);

      expect(testWorkflow.status).toBe('completed');
    });

    it('should handle workflow step dependencies', () => {
      const canExecuteDesign = orchestrator.canExecuteStep(testWorkflow.steps[0], testWorkflow.context);
      const canExecuteImplement = orchestrator.canExecuteStep(testWorkflow.steps[1], testWorkflow.context);

      expect(canExecuteDesign).toBe(true); // No dependencies
      expect(canExecuteImplement).toBe(false); // Depends on design
    });

    it('should execute step with condition', () => {
      const conditionalStep: WorkflowStep = {
        name: 'conditional',
        agentRole: 'general',
        task: 'Run if condition is true',
        condition: (context) => context.shouldRun === true
      };

      const contextTrue = { shouldRun: true };
      const contextFalse = { shouldRun: false };

      expect(orchestrator.canExecuteStep(conditionalStep, contextTrue)).toBe(true);
      expect(orchestrator.canExecuteStep(conditionalStep, contextFalse)).toBe(false);
    });
  });

  describe('agent management', () => {
    it('should register an agent', () => {
      const mockAgent = {
        getId: () => 'test-agent-1',
        getRole: () => ({ name: 'coder' }),
        getCapabilities: () => []
      } as any;

      orchestrator.registerAgent(mockAgent);

      const agents = orchestrator.getAvailableAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].getId()).toBe('test-agent-1');
    });

    it('should find agent by role', () => {
      const mockAgent1 = {
        getId: () => 'coder-agent',
        getRole: () => ({ name: 'coder' }),
        getCapabilities: () => []
      } as any;

      const mockAgent2 = {
        getId: () => 'tester-agent',
        getRole: () => ({ name: 'tester' }),
        getCapabilities: () => []
      } as any;

      orchestrator.registerAgent(mockAgent1);
      orchestrator.registerAgent(mockAgent2);

      const coderAgent = orchestrator.findAgentByRole('coder');
      const testerAgent = orchestrator.findAgentByRole('tester');

      expect(coderAgent?.getId()).toBe('coder-agent');
      expect(testerAgent?.getId()).toBe('tester-agent');
    });

    it('should handle agent unavailability', () => {
      const unavailableAgent = orchestrator.findAgentByRole('nonexistent');
      expect(unavailableAgent).toBeUndefined();
    });
  });

  describe('event handling', () => {
    it('should emit task created event', (done) => {
      orchestrator.on('taskCreated', (task: Task) => {
        expect(task.description).toBe('Test task');
        done();
      });

      orchestrator.createTask('Test task', 'code', 'high');
    });

    it('should emit task assigned event', (done) => {
      const task = orchestrator.createTask('Assign test', 'test', 'medium');

      orchestrator.on('taskAssigned', (assignedTask: Task, agentId: string) => {
        expect(assignedTask.id).toBe(task.id);
        expect(agentId).toBeDefined();
        done();
      });

      orchestrator.assignTask(task);
    });

    it('should emit workflow events', (done) => {
      orchestrator.on('workflowCompleted', (workflow: Workflow) => {
        expect(workflow.status).toBe('completed');
        done();
      });

      orchestrator.executeWorkflow(testWorkflow);
    });
  });

  describe('error handling', () => {
    it('should handle task execution failure', async () => {
      const failingTask: Task = {
        id: 'failing-task',
        description: 'This will fail',
        type: 'code',
        priority: 'high',
        status: 'assigned',
        assignedAgent: 'failing-agent',
        createdAt: new Date()
      };

      // Mock the agent to throw an error
      const mockFailingAgent = {
        getId: () => 'failing-agent',
        executeTask: jest.fn().mockRejectedValue(new Error('Execution failed'))
      };

      orchestrator.registerAgent(mockFailingAgent as any);

      await orchestrator.executeTask(failingTask);

      expect(failingTask.status).toBe('failed');
      expect(failingTask.error).toBe('Execution failed');
    });

    it('should handle workflow execution failure', async () => {
      const failingWorkflow: Workflow = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        steps: [
          {
            name: 'failing-step',
            agentRole: 'nonexistent',
            task: 'This will fail'
          }
        ],
        context: {},
        status: 'pending'
      };

      await orchestrator.executeWorkflow(failingWorkflow);

      expect(failingWorkflow.status).toBe('failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty workflow', async () => {
      const emptyWorkflow: Workflow = {
        id: 'empty-workflow',
        name: 'Empty Workflow',
        steps: [],
        context: {},
        status: 'pending'
      };

      await orchestrator.executeWorkflow(emptyWorkflow);

      expect(emptyWorkflow.status).toBe('completed');
    });

    it('should handle task with invalid type', () => {
      const task = orchestrator.createTask('Invalid task', 'invalid' as any, 'high');

      expect(task).toBeDefined();
      expect(task.type).toBe('invalid');
    });

    it('should handle circular workflow dependencies', () => {
      const circularSteps: WorkflowStep[] = [
        {
          name: 'step1',
          agentRole: 'agent1',
          task: 'Task 1',
          dependsOn: ['step2']
        },
        {
          name: 'step2',
          agentRole: 'agent2',
          task: 'Task 2',
          dependsOn: ['step1']
        }
      ];

      const circularWorkflow = orchestrator.createWorkflow('Circular Workflow', circularSteps);

      expect(circularWorkflow).toBeDefined();
      // The orchestrator should handle or detect circular dependencies
    });
  });
});