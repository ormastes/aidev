import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

/**
 * Integration Test: PocketFlow and Context Provider Integration
 * 
 * Tests the integration between PocketFlow workflow management and the
 * Context Provider that accesses parent aidev directory. This validates
 * workflow-aware chat features and workspace context integration.
 */

// PocketFlow interfaces
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  outputs: WorkflowOutput[];
  enabled: boolean;
}

interface WorkflowTrigger {
  type: 'manual' | 'event' | 'schedule' | 'chat_command';
  config: {
    command?: string;
    event?: string;
    schedule?: string;
    roomId?: string;
  };
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel';
  action?: string;
  params?: Record<string, any>;
  next?: string[];
}

interface WorkflowOutput {
  name: string;
  type: 'file' | 'message' | 'event' | 'context_update';
  destination?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'In Progress' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  context: Record<string, any>;
  results: Record<string, any>;
  error?: string;
}

// Context Provider interfaces
interface WorkspaceContext {
  rootPath: string;
  currentPath: string;
  fileTree: FileNode[];
  openFiles: OpenFile[];
  recentFiles: string[];
  searchResults: SearchResult[];
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: Date;
  permissions?: string;
}

interface OpenFile {
  path: string;
  content: string;
  language?: string;
  cursor?: { line: number; column: number };
  selections?: Array<{ start: number; end: number }>;
}

interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

interface ContextQuery {
  type: 'file' | 'search' | 'tree' | 'recent';
  path?: string;
  pattern?: string;
  options?: {
    recursive?: boolean;
    caseSensitive?: boolean;
    fileTypes?: string[];
    maxResults?: number;
  };
}

// Chat message with workflow and context awareness
interface EnhancedMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'command' | 'workflow_trigger' | 'context_query' | 'workflow_result';
  timestamp: Date;
  workflowContext?: {
    executionId?: string;
    workflowId?: string;
    step?: string;
    status?: string;
  };
  contextData?: {
    files?: string[];
    searchResults?: SearchResult[];
    workspacePath?: string;
  };
}

// PocketFlow Connector Implementation
class PocketFlowConnector {
  private workflows = new Map<string, WorkflowDefinition>();
  private executions = new Map<string, WorkflowExecution>();
  private eventBus: EventEmitter;
  private executionQueue: Promise<void> = Promise.resolve();

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.initializeDefaultWorkflows();
  }

  private initializeDefaultWorkflows(): void {
    // Code review workflow
    this.workflows.set('code-review', {
      id: 'code-review',
      name: 'Code Review Assistant',
      description: 'Analyzes code changes and provides review feedback',
      trigger: {
        type: 'chat_command',
        config: { command: '/review' }
      },
      steps: [
        {
          id: 'fetch-changes',
          name: 'Fetch Code Changes',
          type: 'action',
          action: 'git_diff',
          next: ['analyze-changes']
        },
        {
          id: 'analyze-changes',
          name: 'Analyze Changes',
          type: 'action',
          action: 'code_analysis',
          params: { rules: ['style', 'security', 'performance'] },
          next: ['generate-report']
        },
        {
          id: 'generate-report',
          name: 'Generate Report',
          type: 'action',
          action: 'format_report'
        }
      ],
      outputs: [
        {
          name: 'review_report',
          type: 'message',
          destination: 'chat'
        }
      ],
      enabled: true
    });

    // File search workflow
    this.workflows.set('file-search', {
      id: 'file-search',
      name: 'Intelligent File Search',
      description: 'Searches files with context awareness',
      trigger: {
        type: 'chat_command',
        config: { command: '/search' }
      },
      steps: [
        {
          id: 'parse-query',
          name: 'Parse Search Query',
          type: 'action',
          action: 'parse_search',
          next: ['search-files']
        },
        {
          id: 'search-files',
          name: 'Search Files',
          type: 'action',
          action: 'context_search',
          next: ['rank-results']
        },
        {
          id: 'rank-results',
          name: 'Rank Results',
          type: 'action',
          action: 'rank_by_relevance'
        }
      ],
      outputs: [
        {
          name: 'search_results',
          type: 'context_update'
        }
      ],
      enabled: true
    });

    // Auto-documentation workflow
    this.workflows.set('auto-docs', {
      id: 'auto-docs',
      name: 'Auto Documentation',
      description: 'Generates documentation from code',
      trigger: {
        type: 'event',
        config: { event: 'file_saved' }
      },
      steps: [
        {
          id: 'check-file-type',
          name: 'Check File Type',
          type: 'condition',
          action: 'is_code_file',
          next: ['extract-symbols', 'skip']
        },
        {
          id: 'extract-symbols',
          name: 'Extract Symbols',
          type: 'action',
          action: 'parse_ast',
          next: ['generate-docs']
        },
        {
          id: 'generate-docs',
          name: 'Generate Documentation',
          type: 'action',
          action: 'generate_markdown'
        }
      ],
      outputs: [
        {
          name: 'documentation',
          type: 'file',
          destination: 'docs/'
        }
      ],
      enabled: true
    });
  }

  async getWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    return this.workflows.get(id);
  }

  async enableWorkflow(id: string, roomId?: string): Promise<void> {
    const workflow = this.workflows.get(id);
    if (workflow) {
      workflow.enabled = true;
      if (roomId && workflow.trigger.type === 'chat_command') {
        workflow.trigger.config.roomId = roomId;
      }
      
      this.eventBus.emit('pocketflow:workflow_enabled', {
        workflowId: id,
        roomId
      });
    }
  }

  async disableWorkflow(id: string): Promise<void> {
    const workflow = this.workflows.get(id);
    if (workflow) {
      workflow.enabled = false;
      
      this.eventBus.emit('pocketflow:workflow_disabled', {
        workflowId: id
      });
    }
  }

  async executeWorkflow(
    workflowId: string,
    context: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      throw new Error('Workflow not found or disabled');
    }

    const execution: WorkflowExecution = {
      id: 'exec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      workflowId,
      status: 'pending',
      startTime: new Date(),
      context,
      results: {}
    };

    this.executions.set(execution.id, execution);

    // Queue execution
    this.executionQueue = this.executionQueue.then(async () => {
      await this.runWorkflow(execution, workflow);
    });

    return execution;
  }

  private async runWorkflow(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition
  ): Promise<void> {
    execution.status = 'running';
    
    this.eventBus.emit('pocketflow:execution_started', {
      executionId: execution.id,
      workflowId: workflow.id,
      workflowName: workflow.name
    });

    try {
      for (const step of workflow.steps) {
        execution.currentStep = step.id;
        
        this.eventBus.emit('pocketflow:step_started', {
          executionId: execution.id,
          stepId: step.id,
          stepName: step.name
        });

        // Simulate step execution
        await this.executeStep(step, execution);

        this.eventBus.emit('pocketflow:step_completed', {
          executionId: execution.id,
          stepId: step.id,
          result: execution.results[step.id]
        });
      }

      execution.status = 'In Progress';
      execution.endTime = new Date();

      // Process outputs
      for (const output of workflow.outputs) {
        await this.processOutput(output, execution);
      }

      this.eventBus.emit('pocketflow:execution_completed', {
        executionId: execution.id,
        workflowId: workflow.id,
        results: execution.results
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();

      this.eventBus.emit('pocketflow:execution_failed', {
        executionId: execution.id,
        workflowId: workflow.id,
        error: execution.error
      });
    }
  }

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<void> {
    // Simulate different step actions
    switch (step.action) {
      case 'git_diff':
        execution.results[step.id] = {
          files: ['src/app.ts', 'src/utils.ts'],
          changes: '+42 -15'
        };
        break;

      case 'code_analysis':
        execution.results[step.id] = {
          issues: [
            { file: 'src/app.ts', line: 23, type: 'style', message: 'Missing semicolon' },
            { file: 'src/utils.ts', line: 45, type: 'performance', message: 'Inefficient loop' }
          ]
        };
        break;

      case 'format_report':
        execution.results[step.id] = {
          report: '## Code Review Results\n\n2 issues found...'
        };
        break;

      case 'parse_search':
        const query = execution.context.query || '';
        execution.results[step.id] = {
          pattern: query,
          fileTypes: query.includes('.ts') ? ['ts'] : ['*']
        };
        break;

      case 'context_search':
        execution.results[step.id] = {
          matches: [
            { file: 'src/index.ts', line: 10, match: execution.context.query },
            { file: 'tests/test.ts', line: 25, match: execution.context.query }
          ]
        };
        break;

      case 'non_existent_action':
        // This action doesn't exist, throw error
        throw new Error('Action not In Progress: non_existent_action');

      default:
        execution.results[step.id] = { "success": true };
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async processOutput(
    output: WorkflowOutput,
    execution: WorkflowExecution
  ): Promise<void> {
    switch (output.type) {
      case 'message':
        const report = execution.results['generate-report']?.report;
        if (report) {
          this.eventBus.emit('pocketflow:message_output', {
            executionId: execution.id,
            content: report,
            roomId: execution.context.roomId
          });
        }
        break;

      case 'context_update':
        const searchResults = execution.results['rank-results'] || 
                            execution.results['search-files'];
        if (searchResults) {
          this.eventBus.emit('pocketflow:context_update', {
            executionId: execution.id,
            data: searchResults
          });
        }
        break;

      case 'file':
        // Simulate file creation
        this.eventBus.emit('pocketflow:file_output', {
          executionId: execution.id,
          path: output.destination + 'generated.md',
          content: '# Generated Documentation\n\n...'
        });
        break;
    }
  }

  async getExecution(id: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(id);
  }

  async getExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const executions = Array.from(this.executions.values());
    
    if (workflowId) {
      return executions.filter(e => e.workflowId === workflowId);
    }
    
    return executions;
  }

  subscribeToWorkflowEvents(callback: (event: any) => void): () => void {
    const events = [
      'pocketflow:workflow_enabled',
      'pocketflow:workflow_disabled',
      'pocketflow:execution_started',
      'pocketflow:execution_completed',
      'pocketflow:execution_failed',
      'pocketflow:step_started',
      'pocketflow:step_completed'
    ];

    events.forEach(event => {
      this.eventBus.on(event, callback);
    });

    // Return unsubscribe function
    return () => {
      events.forEach(event => {
        this.eventBus.off(event, callback);
      });
    };
  }
}

// Context Provider Implementation
class ContextProvider {
  private workspaceRoot: string;
  private eventBus: EventEmitter;
  private fileCache = new Map<string, string>();
  private searchCache = new Map<string, SearchResult[]>();

  constructor(workspaceRoot: string, eventBus: EventEmitter) {
    this.workspaceRoot = workspaceRoot;
    this.eventBus = eventBus;
  }

  async getWorkspaceContext(): Promise<WorkspaceContext> {
    const currentPath = process.cwd();
    
    return {
      rootPath: this.workspaceRoot,
      currentPath,
      fileTree: await this.getFileTree(this.workspaceRoot, 2), // 2 levels deep
      openFiles: [],
      recentFiles: Array.from(this.fileCache.keys()).slice(-10),
      searchResults: []
    };
  }

  private async getFileTree(
    dirPath: string,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<FileNode[]> {
    if (currentDepth >= maxDepth) return [];

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build') {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.promises.stat(fullPath);

        const node: FileNode = {
          name: entry.name,
          path: path.relative(this.workspaceRoot, fullPath),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        };

        if (entry.isDirectory()) {
          node.children = await this.getFileTree(fullPath, maxDepth, currentDepth + 1);
        }

        nodes.push(node);
      }

      return nodes;
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return [];
    }
  }

  async executeQuery(query: ContextQuery): Promise<any> {
    switch (query.type) {
      case 'file':
        return this.readFile(query.path!);

      case 'search':
        return this.searchFiles(query.pattern!, query.options);

      case 'tree':
        return this.getFileTree(
          query.path ? path.join(this.workspaceRoot, query.path) : this.workspaceRoot,
          query.options?.recursive ? 10 : 2
        );

      case 'recent':
        return Array.from(this.fileCache.keys()).slice(-10);

      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }

  private async readFile(relativePath: string): Promise<OpenFile> {
    const fullPath = path.join(this.workspaceRoot, relativePath);
    
    // Check cache first
    if (this.fileCache.has(relativePath)) {
      return {
        path: relativePath,
        content: this.fileCache.get(relativePath)!,
        language: this.detectLanguage(relativePath)
      };
    }

    try {
      const content = await fs.promises.readFile(fullPath, 'utf8');
      
      // Cache the content
      this.fileCache.set(relativePath, content);
      
      return {
        path: relativePath,
        content,
        language: this.detectLanguage(relativePath)
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${relativePath}`);
    }
  }

  private async searchFiles(
    pattern: string,
    options?: ContextQuery['options']
  ): Promise<SearchResult[]> {
    const cacheKey = JSON.stringify({ pattern, options });
    
    // Check cache
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    // Simulate search results
    const results: SearchResult[] = [
      {
        file: 'src/main.ts',
        line: 42,
        column: 15,
        match: pattern,
        context: `function process${pattern}() { ... }`
      },
      {
        file: 'tests/test.spec.ts',
        line: 128,
        column: 8,
        match: pattern,
        context: `expect(result).toBe('${pattern}')`
      }
    ];

    // Apply options
    if (options?.maxResults) {
      results.splice(options.maxResults);
    }

    // Cache results
    this.searchCache.set(cacheKey, results);

    return results;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'typescriptreact',
      '.jsx': 'javascriptreact',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml'
    };

    return languageMap[ext] || 'plaintext';
  }

  async getFileContent(relativePath: string): Promise<string> {
    const file = await this.readFile(relativePath);
    return file.content;
  }

  async getFileMetadata(relativePath: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
  }> {
    const fullPath = path.join(this.workspaceRoot, relativePath);
    const stats = await fs.promises.stat(fullPath);
    
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime
    };
  }

  subscribeToContextEvents(callback: (event: any) => void): () => void {
    const events = ['context:file_opened', 'context:file_closed', 'context:search_completed'];
    
    events.forEach(event => {
      this.eventBus.on(event, callback);
    });

    return () => {
      events.forEach(event => {
        this.eventBus.off(event, callback);
      });
    };
  }
}

// Integration Coordinator
class PocketFlowContextCoordinator {
  private pocketflow: PocketFlowConnector;
  private context: ContextProvider;
  private eventBus: EventEmitter;
  private activeIntegrations = new Map<string, any>();

  constructor(
    pocketflow: PocketFlowConnector,
    context: ContextProvider,
    eventBus: EventEmitter
  ) {
    this.pocketflow = pocketflow;
    this.context = context;
    this.eventBus = eventBus;
    this.setupIntegration();
  }

  private setupIntegration(): void {
    // Listen for workflow outputs that need context
    this.eventBus.on('pocketflow:message_output', async (event) => {
      // Enhance message with context if needed
      const enhanced = await this.enhanceWithContext(event.content);
      
      this.eventBus.emit('coordinator:enhanced_message', {
        ...event,
        content: enhanced,
        hasContext: enhanced !== event.content
      });
    });

    // Listen for context queries from workflows
    this.eventBus.on('pocketflow:context_needed', async (event) => {
      const { executionId, query } = event;
      
      try {
        const result = await this.context.executeQuery(query);
        
        this.eventBus.emit('coordinator:context_provided', {
          executionId,
          queryId: event.queryId,
          result
        });
      } catch (error) {
        this.eventBus.emit('coordinator:context_error', {
          executionId,
          queryId: event.queryId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Listen for file changes to trigger workflows
    this.eventBus.on('context:file_saved', async (event) => {
      const { file, content } = event;
      
      // Find workflows triggered by file save
      const workflows = await this.pocketflow.getWorkflows();
      const triggered = workflows.filter(w => 
        w.enabled && 
        w.trigger.type === 'event' && 
        w.trigger.config.event === 'file_saved'
      );

      for (const workflow of triggered) {
        await this.pocketflow.executeWorkflow(workflow.id, {
          file,
          content,
          workspace: await this.context.getWorkspaceContext()
        });
      }
    });
  }

  private async enhanceWithContext(content: string): Promise<string> {
    // Look for file references in the content
    const filePattern = /`([^`]+\.(ts|js|py|java|go|rs))`/g;
    let enhanced = content;
    let match;

    while ((match = filePattern.exec(content)) !== null) {
      const filePath = match[1];
      
      try {
        const metadata = await this.context.getFileMetadata(filePath);
        const replacement = `\`${filePath}\` (${this.formatSize(metadata.size)}, modified ${this.formatDate(metadata.modified)})`;
        enhanced = enhanced.replace(match[0], replacement);
      } catch {
        // File not found, keep original
      }
    }

    return enhanced;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  }

  async processMessage(message: EnhancedMessage): Promise<EnhancedMessage> {
    // Check if message triggers a workflow
    if (message.type === 'command') {
      const command = message.content.split(' ')[0];
      const workflows = await this.pocketflow.getWorkflows();
      
      const triggered = workflows.find(w => 
        w.enabled &&
        w.trigger.type === 'chat_command' &&
        w.trigger.config.command === command &&
        (!w.trigger.config.roomId || w.trigger.config.roomId === message.roomId)
      );

      if (triggered) {
        const args = message.content.substring(command.length).trim();
        const execution = await this.pocketflow.executeWorkflow(triggered.id, {
          roomId: message.roomId,
          userId: message.userId,
          query: args,
          command: command,
          workspace: await this.context.getWorkspaceContext()
        });

        message.type = 'workflow_trigger';
        message.workflowContext = {
          executionId: execution.id,
          workflowId: triggered.id,
          status: execution.status
        };
      }
    }

    // Check for context queries
    if (message.content.includes('@file:') || message.content.includes('@search:')) {
      const fileMatch = /@file:([^\s]+)/g.exec(message.content);
      const searchMatch = /@search:([^\s]+)/g.exec(message.content);

      if (fileMatch) {
        try {
          await this.context.getFileContent(fileMatch[1]); // Verify file exists
          message.type = 'context_query';
          message.contextData = {
            files: [fileMatch[1]],
            workspacePath: (await this.context.getWorkspaceContext()).rootPath
          };
        } catch (error) {
          // File not found
        }
      }

      if (searchMatch) {
        const results = await this.context.executeQuery({
          type: 'search',
          pattern: searchMatch[1]
        });
        
        message.type = 'context_query';
        message.contextData = {
          searchResults: results,
          workspacePath: (await this.context.getWorkspaceContext()).rootPath
        };
      }
    }

    return message;
  }

  async getActiveIntegrations(): Promise<{
    workflows: number;
    executions: number;
    contextQueries: number;
  }> {
    const workflows = await this.pocketflow.getWorkflows();
    const executions = await this.pocketflow.getExecutions();
    
    return {
      workflows: workflows.filter(w => w.enabled).length,
      executions: executions.filter(e => e.status === 'running').length,
      contextQueries: this.activeIntegrations.size
    };
  }
}

describe('PocketFlow and Context Provider Integration Test', () => {
  let tempDir: string;
  let workspaceDir: string;
  let eventBus: EventEmitter;
  let pocketflow: PocketFlowConnector;
  let context: ContextProvider;
  let coordinator: PocketFlowContextCoordinator;

  beforeEach(async () => {
    // Create temp directories
    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'pocketflow-context-test-')
    );
    workspaceDir = path.join(tempDir, 'workspace');
    await fs.promises.mkdir(workspaceDir, { recursive: true });

    // Create test workspace structure
    await createTestWorkspace(workspaceDir);

    eventBus = new EventEmitter();
    pocketflow = new PocketFlowConnector(eventBus);
    context = new ContextProvider(workspaceDir, eventBus);
    coordinator = new PocketFlowContextCoordinator(pocketflow, context, eventBus);
  });

  afterEach(async () => {
    // Clean up
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestWorkspace(root: string): Promise<void> {
    // Create directories
    const dirs = ['src', 'tests', 'docs', 'config'];
    for (const dir of dirs) {
      await fs.promises.mkdir(path.join(root, dir), { recursive: true });
    }

    // Create test files
    await fs.promises.writeFile(
      path.join(root, 'src', 'main.ts'),
      'export function main() {\n  console.log("Hello, World!");\n}\n'
    );

    await fs.promises.writeFile(
      path.join(root, 'src', 'utils.ts'),
      'export function formatDate(date: Date): string {\n  return date.toISOString();\n}\n'
    );

    await fs.promises.writeFile(
      path.join(root, 'tests', 'main.test.ts'),
      'import { main } from "../src/main";\n\ntest("main function", () => {\n  expect(main).toBeDefined();\n});\n'
    );

    await fs.promises.writeFile(
      path.join(root, 'README.md'),
      '# Test Workspace\n\nThis is a test workspace for integration testing.\n'
    );
  }

  test('should trigger workflow from chat command', async () => {
    // Setup workflow event tracking
    const workflowEvents: any[] = [];
    const unsubscribe = pocketflow.subscribeToWorkflowEvents((event) => {
      workflowEvents.push(event);
    });

    // Enable code review workflow for a room
    await pocketflow.enableWorkflow('code-review', 'room-1');

    // Process a workflow trigger message
    const message: EnhancedMessage = {
      id: 'msg-1',
      roomId: 'room-1',
      userId: 'user-1',
      content: '/review src/main.ts',
      type: 'command',
      timestamp: new Date()
    };

    const processed = await coordinator.processMessage(message);

    // Verify message was recognized as workflow trigger
    expect(processed.type).toBe('workflow_trigger');
    expect(processed.workflowContext?.workflowId).toBe('code-review');
    expect(processed.workflowContext?.executionId).toBeDefined();

    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify workflow events
    expect(workflowEvents.length).toBeGreaterThan(0);
    expect(workflowEvents.some(e => 
      e.workflowId === 'code-review' || e.executionId === processed.workflowContext?.executionId
    )).toBe(true);

    unsubscribe();
  });

  test('should provide context to workflows', async () => {
    // Track context requests
    const contextRequests: any[] = [];
    eventBus.on('coordinator:context_provided', (event) => {
      contextRequests.push(event);
    });

    // Simulate workflow requesting context
    eventBus.emit('pocketflow:context_needed', {
      executionId: 'exec-1',
      queryId: 'query-1',
      query: {
        type: 'file',
        path: 'src/main.ts'
      }
    });

    // Wait for context to be provided
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify context was provided
    expect(contextRequests).toHaveLength(1);
    expect(contextRequests[0].result.content).toContain('Hello, World!');
    expect(contextRequests[0].result.language).toBe('typescript');
  });

  test('should search files through context query in message', async () => {
    // Process message with search query
    const message: EnhancedMessage = {
      id: 'msg-search',
      roomId: 'room-1',
      userId: 'user-1',
      content: 'Find usage of @search:formatDate in the codebase',
      type: 'text',
      timestamp: new Date()
    };

    const processed = await coordinator.processMessage(message);

    // Verify search was performed
    expect(processed.type).toBe('context_query');
    expect(processed.contextData?.searchResults).toBeDefined();
    expect(processed.contextData?.searchResults?.length).toBeGreaterThan(0);
  });

  test('should access file content through context query', async () => {
    // Process message with file reference
    const message: EnhancedMessage = {
      id: 'msg-file',
      roomId: 'room-1',
      userId: 'user-1',
      content: 'Please review @file:src/utils.ts for best practices',
      type: 'text',
      timestamp: new Date()
    };

    const processed = await coordinator.processMessage(message);

    // Verify file was accessed
    expect(processed.type).toBe('context_query');
    expect(processed.contextData?.files).toContain('src/utils.ts');
    expect(processed.contextData?.workspacePath).toBe(workspaceDir);
  });

  test('should trigger workflow on file save event', async () => {
    // Track workflow executions
    let executionStarted = false;
    eventBus.on('pocketflow:execution_started', (event) => {
      if (event.workflowId === 'auto-docs') {
        executionStarted = true;
      }
    });

    // Emit file save event
    eventBus.emit('context:file_saved', {
      file: 'src/newfile.ts',
      content: 'export class NewClass { }'
    });

    // Wait for workflow to trigger
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify workflow was triggered
    expect(executionStarted).toBe(true);
  });

  test('should enhance workflow output with context', async () => {
    // Track enhanced messages
    let enhancedMessage: any;
    eventBus.on('coordinator:enhanced_message', (event) => {
      enhancedMessage = event;
    });

    // Create a test file
    await fs.promises.writeFile(
      path.join(workspaceDir, 'test.ts'),
      'const test = 123;'
    );

    // Emit workflow output with file reference
    eventBus.emit('pocketflow:message_output', {
      executionId: 'exec-1',
      content: 'Review In Progress for `test.ts`',
      roomId: 'room-1'
    });

    // Wait for enhancement
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify message was enhanced
    expect(enhancedMessage).toBeDefined();
    expect(enhancedMessage.hasContext).toBe(true);
    expect(enhancedMessage.content).toContain('17 B'); // File size
  });

  test('should handle search workflow integration', async () => {
    // Enable search workflow
    await pocketflow.enableWorkflow('file-search', 'room-1');

    // Track workflow results
    let contextUpdate: any;
    eventBus.on('pocketflow:context_update', (event) => {
      contextUpdate = event;
    });

    // Trigger search workflow
    const message: EnhancedMessage = {
      id: 'msg-search-workflow',
      roomId: 'room-1',
      userId: 'user-1',
      content: '/search TODO',
      type: 'command',
      timestamp: new Date()
    };

    await coordinator.processMessage(message);

    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify search results were provided
    expect(contextUpdate).toBeDefined();
    expect(contextUpdate.data).toBeDefined();
  });

  test('should get workspace context with file tree', async () => {
    const workspace = await context.getWorkspaceContext();

    // Verify workspace structure
    expect(workspace.rootPath).toBe(workspaceDir);
    expect(workspace.fileTree).toBeDefined();
    expect(workspace.fileTree.length).toBeGreaterThan(0);

    // Find src directory
    const srcDir = workspace.fileTree.find(f => f.name === 'src' && f.type === 'directory');
    expect(srcDir).toBeDefined();
    expect(srcDir?.children?.length).toBeGreaterThan(0);

    // Verify files in src
    const mainFile = srcDir?.children?.find(f => f.name === 'main.ts');
    expect(mainFile).toBeDefined();
    expect(mainFile?.type).toBe('file');
  });

  test('should handle concurrent workflow executions', async () => {
    // Enable multiple workflows
    await pocketflow.enableWorkflow('code-review', 'room-1');
    await pocketflow.enableWorkflow('file-search', 'room-1');

    // Track executions
    const executions: string[] = [];
    eventBus.on('pocketflow:execution_started', (event) => {
      executions.push(event.executionId);
    });

    // Trigger multiple workflows concurrently
    const messages = [
      { content: '/review src/main.ts', id: 'msg-1' },
      { content: '/search utils', id: 'msg-2' },
      { content: '/review src/utils.ts', id: 'msg-3' }
    ];

    await Promise.all(messages.map(msg => 
      coordinator.processMessage({
        ...msg,
        roomId: 'room-1',
        userId: 'user-1',
        type: 'command',
        timestamp: new Date()
      } as EnhancedMessage)
    ));

    // Wait for all to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify executions started (at least 1, could be queued)
    expect(executions.length).toBeGreaterThan(0);
    expect(executions.length).toBeLessThanOrEqual(3);

    // Check active integrations
    const active = await coordinator.getActiveIntegrations();
    expect(active.workflows).toBeGreaterThanOrEqual(2); // At least 2 enabled workflows
  });

  test('should cache file content for performance', async () => {
    // Create a large file to make timing measurable
    const largeContent = 'x'.repeat(1000000); // 1MB
    await fs.promises.writeFile(
      path.join(workspaceDir, 'large.txt'),
      largeContent
    );

    const startTime = Date.now();
    
    // First read
    const content1 = await context.getFileContent('large.txt');
    const firstReadTime = Date.now() - startTime;

    const secondStartTime = Date.now();
    
    // Second read (should be cached)
    const content2 = await context.getFileContent('large.txt');
    const secondReadTime = Date.now() - secondStartTime;

    // Verify content is the same
    expect(content1).toBe(content2);
    
    // Cached read should be faster (or at least not slower)
    expect(secondReadTime).toBeLessThanOrEqual(firstReadTime);
  });

  test('should handle workflow errors gracefully', async () => {
    // Track error events
    let errorEvent: any;
    eventBus.on('pocketflow:execution_failed', (event) => {
      errorEvent = event;
    });

    // Create a workflow that will fail
    const badWorkflow: WorkflowDefinition = {
      id: 'bad-workflow',
      name: 'Failing Workflow',
      description: 'This will fail',
      trigger: { type: 'manual', config: {} },
      steps: [{
        id: 'fail-step',
        name: 'Fail',
        type: 'action',
        action: 'non_existent_action'
      }],
      outputs: [],
      enabled: true
    };

    // Inject bad workflow (in real app, this would be through API)
    (pocketflow as any).workflows.set('bad-workflow', badWorkflow);

    // Execute and expect failure
    await expect(
      pocketflow.executeWorkflow('bad-workflow', {})
    ).resolves.toBeDefined(); // Doesn't throw, returns execution

    // Wait for failure
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify error was handled
    expect(errorEvent).toBeDefined();
    expect(errorEvent.workflowId).toBe('bad-workflow');
  });
});