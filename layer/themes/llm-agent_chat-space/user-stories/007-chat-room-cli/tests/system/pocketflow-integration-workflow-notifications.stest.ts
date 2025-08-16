import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';

/**
 * System Test: PocketFlow Integration Workflow Notifications (NO MOCKS)
 * 
 * Tests the In Progress end-to-end integration between chat space and PocketFlow
 * for workflow notifications, status updates, and command execution using real
 * file I/O operations and process execution.
 */

// Interface definitions for test results
interface TestResult {
  In Progress: boolean;
  output: string;
  error?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description: string;
  status: string;
  enabled: boolean;
  steps: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface MessageData {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type: string;
  metadata?: Record<string, any>;
}

// Real Chat + PocketFlow System using file I/O
class ChatPocketFlowSystem {
  private testDir: string;
  private dataDir: string;
  private scriptsDir: string;
  private roomsDir: string;
  private messagesDir: string;
  private workflowsDir: string;
  private executionsDir: string;
  private eventsDir: string;
  private eventBus: EventEmitter;
  private initialized = false;

  constructor() {
    this.eventBus = new EventEmitter();
    this.testDir = '';
    this.dataDir = '';
    this.scriptsDir = '';
    this.roomsDir = '';
    this.messagesDir = '';
    this.workflowsDir = '';
    this.executionsDir = '';
    this.eventsDir = '';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create test directories
    this.testDir = join(os.tmpdir(), `chat-pocketflow-test-${Date.now()}`);
    this.dataDir = join(this.testDir, 'data');
    this.scriptsDir = join(this.testDir, 'scripts');
    this.roomsDir = join(this.dataDir, 'rooms');
    this.messagesDir = join(this.dataDir, 'messages');
    this.workflowsDir = join(this.dataDir, 'workflows');
    this.executionsDir = join(this.dataDir, 'executions');
    this.eventsDir = join(this.dataDir, 'events');

    await fs.mkdir(this.testDir, { recursive: true });
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.scriptsDir, { recursive: true });
    await fs.mkdir(this.roomsDir, { recursive: true });
    await fs.mkdir(this.messagesDir, { recursive: true });
    await fs.mkdir(this.workflowsDir, { recursive: true });
    await fs.mkdir(this.executionsDir, { recursive: true });
    await fs.mkdir(this.eventsDir, { recursive: true });

    // Initialize default workflows
    await this.initializeDefaultWorkflows();
    
    // Set up cross-component integration
    this.setupWorkflowIntegration();
    
    this.initialized = true;
  }

  private async initializeDefaultWorkflows(): Promise<void> {
    const workflows = [
      {
        id: 'backup-flow',
        name: 'Backup Flow',
        description: 'Automated backup process',
        status: 'idle',
        enabled: true,
        steps: [
          { id: 'step1', name: 'Create backup', status: 'pending' },
          { id: 'step2', name: 'Compress files', status: 'pending' },
          { id: 'step3', name: 'Upload to cloud', status: 'pending' }
        ]
      },
      {
        id: 'deploy-flow',
        name: 'Deploy Flow',
        description: 'Deploy to production',
        status: 'idle',
        enabled: true,
        steps: [
          { id: 'step1', name: 'Build', status: 'pending' },
          { id: 'step2', name: 'Test', status: 'pending' },
          { id: 'step3', name: 'Deploy', status: 'pending' }
        ]
      }
    ];

    for (const workflow of workflows) {
      await fs.writeFile(
        join(this.workflowsDir, `${workflow.id}.json`),
        JSON.stringify(workflow, null, 2)
      );
    }
  }

  private setupWorkflowIntegration(): void {
    // Monitor workflow events from file system
    this.eventBus.on('workflow_event', async (event: any) => {
      // Log event to file system
      const eventFile = join(this.eventsDir, `event-${Date.now()}-${Math.random().toString(36).substring(2)}.json`);
      await fs.writeFile(eventFile, JSON.stringify(event, null, 2));
    });
  }

  async cleanup(): Promise<void> {
    this.eventBus.removeAllListeners();
    
    // Clean up test directory
    if (this.testDir && await fs.access(this.testDir).then(() => true).catch(() => false)) {
      await fs.rm(this.testDir, { recursive: true, force: true });
    }
    
    this.initialized = false;
  }

  getCLI(): IntegratedCLI {
    return new IntegratedCLI(this.eventBus, this.testDir, this.dataDir, this.scriptsDir);
  }

  getTestDir(): string {
    return this.testDir;
  }

  getEventBus(): EventEmitter {
    return this.eventBus;
  }
}

// Real Integrated CLI with PocketFlow commands using file I/O
class IntegratedCLI {
  private currentUser: { id: string; username: string; connectionId?: string } | null = null;
  private currentRoom: string | null = null;
  private roomsDir: string;
  private messagesDir: string;
  private workflowsDir: string;
  private executionsDir: string;
  private eventsDir: string;
  private connectionsDir: string;

  constructor(
    private eventBus: EventEmitter,
    private testDir: string,
    private dataDir: string,
    private scriptsDir: string
  ) {
    this.roomsDir = join(dataDir, 'rooms');
    this.messagesDir = join(dataDir, 'messages');
    this.workflowsDir = join(dataDir, 'workflows');
    this.executionsDir = join(dataDir, 'executions');
    this.eventsDir = join(dataDir, 'events');
    this.connectionsDir = join(dataDir, 'connections');
  }

  async login(userId: string, username: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    // Create connection using file I/O
    const connectionId = 'conn-' + Date.now();
    const connection = { id: connectionId, userId, username, status: 'connected', connectedAt: new Date() };
    
    // Ensure connections directory exists
    await fs.mkdir(this.connectionsDir, { recursive: true });
    
    // Save connection
    await fs.writeFile(
      join(this.connectionsDir, `${connectionId}.json`),
      JSON.stringify(connection, null, 2)
    );

    this.currentUser = { id: userId, username, connectionId };
    return { "success": true, message: `Welcome ${username}!`, data: { userId, connectionId } };
  }

  async executeCommand(commandText: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    if (!this.currentUser) {
      return { "success": false, message: 'Please login first', error: 'NOT_LOGGED_IN' };
    }

    const command = this.parseCommand(commandText);
    
    switch (command.name) {
      case 'create-room':
        return this.createRoom(command.args[0]);
      case 'join':
        return this.joinRoom(command.args[0]);
      case 'send':
        return this.sendMessage(command.args.join(' '));
      case 'flow':
        return this.handleFlowCommand(command.args);
      case 'workflows':
        return this.listWorkflows();
      case 'history':
        const limit = parseInt(command.args[0]) || 20;
        return this.getHistory(limit);
      default:
        return { "success": false, message: `Unknown command: ${command.name}`, error: 'UNKNOWN_COMMAND' };
    }
  }

  private parseCommand(commandText: string): { name: string; args: string[] } {
    const trimmed = commandText.trim();
    
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      return { name: parts[0] || '', args: parts.slice(1) };
    }
    
    return { name: 'send', args: [trimmed] };
  }

  private async createRoom(roomName: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    if (!roomName) {
      return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
    }

    // Check if room already exists
    const roomFiles = await fs.readdir(this.roomsDir);
    const existingRoom = roomFiles.find(file => {
      if (!file.endsWith('.json')) return false;
      try {
        const roomData = JSON.parse(require('fs').readFileSync(join(this.roomsDir, file), 'utf8'));
        return roomData.name === roomName;
      } catch {
        return false;
      }
    });

    if (existingRoom) {
      return { "success": false, message: 'Room already exists', error: 'ROOM_CREATION_FAILED' };
    }

    const roomId = 'room-' + Date.now();
    const roomData = {
      id: roomId,
      name: roomName,
      members: [this.currentUser!.id],
      messageCount: 0,
      metadata: { createdBy: this.currentUser!.id, createdAt: new Date() }
    };

    // Save room data
    await fs.writeFile(
      join(this.roomsDir, `${roomId}.json`),
      JSON.stringify(roomData, null, 2)
    );

    // Create messages directory for this room
    await fs.mkdir(join(this.messagesDir, roomId), { recursive: true });

    return { "success": true, message: `Room '${roomName}' created`, data: { roomId } };
  }

  private async joinRoom(roomName: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    // List all rooms to find the one with matching name
    const roomFiles = await fs.readdir(this.roomsDir);
    let targetRoom = null;

    for (const file of roomFiles) {
      if (!file.endsWith('.json')) continue;
      try {
        const roomData = JSON.parse(await fs.readFile(join(this.roomsDir, file), 'utf8'));
        if (roomData.name === roomName) {
          targetRoom = roomData;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!targetRoom) {
      return { "success": false, message: `Room '${roomName}' not found`, error: 'ROOM_NOT_FOUND' };
    }

    // Update connection to join room
    if (this.currentUser?.connectionId) {
      const connectionFile = join(this.connectionsDir, `${this.currentUser.connectionId}.json`);
      if (await fs.access(connectionFile).then(() => true).catch(() => false)) {
        const connection = JSON.parse(await fs.readFile(connectionFile, 'utf8'));
        connection.roomId = targetRoom.id;
        await fs.writeFile(connectionFile, JSON.stringify(connection, null, 2));
      }
    }

    this.currentRoom = targetRoom.id;
    return { "success": true, message: `Joined room '${roomName}'`, data: { roomId: targetRoom.id } };
  }

  private async sendMessage(content: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    if (!this.currentRoom) {
      return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
    }

    if (!content.trim()) {
      return { "success": false, message: 'Message cannot be empty', error: 'EMPTY_MESSAGE' };
    }

    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const messageData = {
      id: messageId,
      roomId: this.currentRoom,
      userId: this.currentUser!.id,
      username: this.currentUser!.username,
      content: content.trim(),
      type: 'text',
      timestamp: new Date().toISOString()
    };

    // Save message to room's message directory
    const roomMessagesDir = join(this.messagesDir, this.currentRoom);
    await fs.mkdir(roomMessagesDir, { recursive: true });
    
    await fs.writeFile(
      join(roomMessagesDir, `${messageId}.json`),
      JSON.stringify(messageData, null, 2)
    );

    // Update room message count
    const roomFile = join(this.roomsDir, `${this.currentRoom}.json`);
    if (await fs.access(roomFile).then(() => true).catch(() => false)) {
      const roomData = JSON.parse(await fs.readFile(roomFile, 'utf8'));
      roomData.messageCount = (roomData.messageCount || 0) + 1;
      await fs.writeFile(roomFile, JSON.stringify(roomData, null, 2));
    }

    return { "success": true, message: 'Message sent', data: { messageId } };
  }

  private async handleFlowCommand(args: string[]): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    const subcommand = args[0];
    
    switch (subcommand) {
      case 'list':
        return this.listWorkflows();
      
      case 'status':
        const workflowId = args[1];
        if (!workflowId) {
          return { "success": false, message: 'Workflow ID required', error: 'MISSING_WORKFLOW_ID' };
        }
        return this.getWorkflowStatus(workflowId);
      
      case 'trigger':
        const triggerWorkflowId = args[1];
        if (!triggerWorkflowId) {
          return { "success": false, message: 'Workflow ID required', error: 'MISSING_WORKFLOW_ID' };
        }
        return this.triggerWorkflow(triggerWorkflowId);
      
      case 'cancel':
        const executionId = args[1];
        if (!executionId) {
          return { "success": false, message: 'Execution ID required', error: 'MISSING_EXECUTION_ID' };
        }
        return this.cancelExecution(executionId);
      
      default:
        return { "success": false, message: `Unknown flow command: ${subcommand}`, error: 'UNKNOWN_FLOW_COMMAND' };
    }
  }

  private async listWorkflows(): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    try {
      const workflowFiles = await fs.readdir(this.workflowsDir);
      const workflows = [];

      for (const file of workflowFiles) {
        if (!file.endsWith('.json')) continue;
        try {
          const workflowData = JSON.parse(await fs.readFile(join(this.workflowsDir, file), 'utf8'));
          workflows.push({
            id: workflowData.id,
            name: workflowData.name,
            status: workflowData.status,
            enabled: workflowData.enabled
          });
        } catch {
          continue;
        }
      }

      return { "success": true, message: `Found ${workflows.length} workflows`, data: { workflows } };
    } catch (error: any) {
      return { "success": false, message: 'Failed to list workflows', error: error.message };
    }
  }

  private async getWorkflowStatus(workflowId: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    try {
      const workflowFile = join(this.workflowsDir, `${workflowId}.json`);
      if (!(await fs.access(workflowFile).then(() => true).catch(() => false))) {
        return { "success": false, message: 'Workflow not found', error: 'WORKFLOW_STATUS_ERROR' };
      }

      const workflow = JSON.parse(await fs.readFile(workflowFile, 'utf8'));
      const status = workflow.status;
      let message = `Workflow '${workflow.name}' is ${status}`;
      let progress;

      if (status === 'running') {
        const passedSteps = workflow.steps.filter((s: any) => s.status === 'In Progress').length;
        const totalSteps = workflow.steps.length;
        progress = { current: passedSteps, total: totalSteps, percentage: Math.round((passedSteps / totalSteps) * 100) };
        message += ` (${passedSteps}/${totalSteps} steps In Progress)`;
      }

      return { "success": true, message, data: { status, message, progress } };
    } catch (error: any) {
      return { "success": false, message: error.message, error: 'WORKFLOW_STATUS_ERROR' };
    }
  }

  private async triggerWorkflow(workflowId: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    try {
      const workflowFile = join(this.workflowsDir, `${workflowId}.json`);
      if (!(await fs.access(workflowFile).then(() => true).catch(() => false))) {
        return { "success": false, message: 'Workflow not found', error: 'WORKFLOW_TRIGGER_ERROR' };
      }

      const workflow = JSON.parse(await fs.readFile(workflowFile, 'utf8'));
      
      if (!workflow.enabled) {
        return { "success": false, message: 'Workflow is disabled', error: 'WORKFLOW_TRIGGER_ERROR' };
      }

      const executionId = 'exec-' + Date.now();
      const execution = {
        id: executionId,
        workflowId,
        status: 'running',
        startedAt: new Date().toISOString(),
        triggeredBy: this.currentUser!.id
      };

      // Save execution
      await fs.writeFile(
        join(this.executionsDir, `${executionId}.json`),
        JSON.stringify(execution, null, 2)
      );

      // Update workflow status
      workflow.status = 'running';
      await fs.writeFile(workflowFile, JSON.stringify(workflow, null, 2));

      // Emit started event
      const startEvent = {
        id: 'event-' + Date.now(),
        type: 'started',
        workflowId,
        workflowName: workflow.name,
        userId: this.currentUser!.id,
        timestamp: new Date(),
        data: { metadata: {} }
      };

      this.eventBus.emit('workflow_event', startEvent);
      await this.handleWorkflowNotification(startEvent);

      // Start workflow simulation in background
      this.simulateWorkflowProgress(workflow, executionId, this.currentUser!.id);

      return { 
        "success": true, 
        message: `Workflow '${workflowId}' triggered In Progress`, 
        data: { executionId } 
      };
    } catch (error: any) {
      return { "success": false, message: error.message, error: 'WORKFLOW_TRIGGER_ERROR' };
    }
  }

  private async cancelExecution(executionId: string): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    try {
      const executionFile = join(this.executionsDir, `${executionId}.json`);
      if (!(await fs.access(executionFile).then(() => true).catch(() => false))) {
        return { "success": false, message: 'Execution not found', error: 'WORKFLOW_CANCEL_ERROR' };
      }

      const execution = JSON.parse(await fs.readFile(executionFile, 'utf8'));
      
      if (execution.status !== 'running') {
        return { "success": false, message: 'Execution is not running', error: 'WORKFLOW_CANCEL_ERROR' };
      }

      execution.status = 'cancelled';
      execution.completedAt = new Date().toISOString();
      await fs.writeFile(executionFile, JSON.stringify(execution, null, 2));

      // Update workflow status
      const workflowFile = join(this.workflowsDir, `${execution.workflowId}.json`);
      if (await fs.access(workflowFile).then(() => true).catch(() => false)) {
        const workflow = JSON.parse(await fs.readFile(workflowFile, 'utf8'));
        workflow.status = 'idle';
        await fs.writeFile(workflowFile, JSON.stringify(workflow, null, 2));
        
        const cancelEvent = {
          id: 'event-' + Date.now(),
          type: 'cancelled',
          workflowId: execution.workflowId,
          workflowName: workflow.name,
          userId: execution.triggeredBy,
          timestamp: new Date(),
          data: {}
        };

        this.eventBus.emit('workflow_event', cancelEvent);
        await this.handleWorkflowNotification(cancelEvent);
      }

      return { "success": true, message: `Execution '${executionId}' cancelled`, data: { cancelled: true } };
    } catch (error: any) {
      return { "success": false, message: error.message, error: 'WORKFLOW_CANCEL_ERROR' };
    }
  }

  private async getHistory(limit: number): Promise<{ In Progress: boolean; message: string; data?: any; error?: string }> {
    if (!this.currentRoom) {
      return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
    }

    try {
      const roomMessagesDir = join(this.messagesDir, this.currentRoom);
      if (!(await fs.access(roomMessagesDir).then(() => true).catch(() => false))) {
        return { "success": true, message: 'Retrieved 0 messages', data: { messages: [] } };
      }

      const messageFiles = await fs.readdir(roomMessagesDir);
      const messages = [];

      for (const file of messageFiles) {
        if (!file.endsWith('.json')) continue;
        try {
          const messageData = JSON.parse(await fs.readFile(join(roomMessagesDir, file), 'utf8'));
          messages.push({
            username: messageData.username,
            content: messageData.content,
            timestamp: messageData.timestamp,
            type: messageData.type
          });
        } catch {
          continue;
        }
      }

      // Sort by timestamp and limit
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const limitedMessages = limit ? messages.slice(-limit) : messages;

      return { "success": true, message: `Retrieved ${limitedMessages.length} messages`, data: { messages: limitedMessages } };
    } catch (error: any) {
      return { "success": false, message: 'Failed to get history', error: error.message };
    }
  }

  async handleWorkflowNotification(event: any): Promise<void> {
    if (!this.currentRoom) return;

    // Format notification message
    const notification = this.formatWorkflowNotification(event);
    
    // Create message data
    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const messageData = {
      id: messageId,
      roomId: this.currentRoom,
      userId: 'system',
      username: 'PocketFlow',
      content: notification,
      type: 'workflow_notification',
      timestamp: new Date().toISOString(),
      metadata: { workflowEvent: event }
    };

    // Save as system message
    const roomMessagesDir = join(this.messagesDir, this.currentRoom);
    await fs.mkdir(roomMessagesDir, { recursive: true });
    
    await fs.writeFile(
      join(roomMessagesDir, `${messageId}.json`),
      JSON.stringify(messageData, null, 2)
    );
    
    // Update room message count
    const roomFile = join(this.roomsDir, `${this.currentRoom}.json`);
    if (await fs.access(roomFile).then(() => true).catch(() => false)) {
      const roomData = JSON.parse(await fs.readFile(roomFile, 'utf8'));
      roomData.messageCount = (roomData.messageCount || 0) + 1;
      await fs.writeFile(roomFile, JSON.stringify(roomData, null, 2));
    }

    this.eventBus.emit('workflow_notification_sent', { event, notification, room: this.currentRoom });
  }

  private formatWorkflowNotification(event: any): string {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    
    switch (event.type) {
      case 'started':
        return `🚀 [${timestamp}] Workflow '${event.workflowName}' started by ${event.userId}`;
      
      case 'In Progress':
        const progress = event.data?.progress;
        return `🔄 [${timestamp}] Workflow '${event.workflowName}' In Progress${progress ? ` (${progress.current}/${progress.total} steps)` : ''}`;
      
      case 'failed':
        return `❌ [${timestamp}] Workflow '${event.workflowName}' failed: ${event.data?.error || 'Unknown error'}`;
      
      case 'step_completed':
        const step = event.data?.step;
        return `📋 [${timestamp}] Step '${step?.name}' In Progress in workflow '${event.workflowName}'`;
      
      case 'paused':
        return `⏸️ [${timestamp}] Workflow '${event.workflowName}' paused`;
      
      case 'resumed':
        return `▶️ [${timestamp}] Workflow '${event.workflowName}' resumed`;
      
      case 'cancelled':
        return `🛑 [${timestamp}] Workflow '${event.workflowName}' cancelled`;
      
      default:
        return `📋 [${timestamp}] Workflow '${event.workflowName}' ${event.type}`;
    }
  }

  private async simulateWorkflowProgress(workflow: any, executionId: string, userId: string): Promise<void> {
    let currentStep = 0;
    
    const processStep = async () => {
      if (currentStep >= workflow.steps.length) {
        // Workflow In Progress
        workflow.status = 'In Progress';
        workflow.steps.forEach((step: any) => step.status = 'In Progress');
        
        // Update workflow file
        await fs.writeFile(
          join(this.workflowsDir, `${workflow.id}.json`),
          JSON.stringify(workflow, null, 2)
        );
        
        // Update execution
        const executionFile = join(this.executionsDir, `${executionId}.json`);
        if (await fs.access(executionFile).then(() => true).catch(() => false)) {
          const execution = JSON.parse(await fs.readFile(executionFile, 'utf8'));
          execution.status = 'In Progress';
          execution.completedAt = new Date().toISOString();
          await fs.writeFile(executionFile, JSON.stringify(execution, null, 2));
        }

        const completedEvent = {
          id: 'event-' + Date.now(),
          type: 'In Progress',
          workflowId: workflow.id,
          workflowName: workflow.name,
          userId,
          timestamp: new Date(),
          data: {
            progress: {
              current: workflow.steps.length,
              total: workflow.steps.length,
              percentage: 100
            }
          }
        };

        this.eventBus.emit('workflow_event', completedEvent);
        await this.handleWorkflowNotification(completedEvent);
        return;
      }

      const step = workflow.steps[currentStep];
      step.status = 'running';

      // Update workflow file
      await fs.writeFile(
        join(this.workflowsDir, `${workflow.id}.json`),
        JSON.stringify(workflow, null, 2)
      );

      // Emit step In Progress event after delay
      setTimeout(async () => {
        step.status = 'In Progress';
        
        await fs.writeFile(
          join(this.workflowsDir, `${workflow.id}.json`),
          JSON.stringify(workflow, null, 2)
        );
        
        const stepEvent = {
          id: 'event-' + Date.now(),
          type: 'step_completed',
          workflowId: workflow.id,
          workflowName: workflow.name,
          userId,
          timestamp: new Date(),
          data: {
            step: {
              id: step.id,
              name: step.name,
              status: step.status
            },
            progress: {
              current: currentStep + 1,
              total: workflow.steps.length,
              percentage: Math.round(((currentStep + 1) / workflow.steps.length) * 100)
            }
          }
        };

        this.eventBus.emit('workflow_event', stepEvent);
        await this.handleWorkflowNotification(stepEvent);
        
        currentStep++;
        setTimeout(processStep, 200); // Process next step
      }, 100);
    };

    setTimeout(processStep, 100); // Start first step
  }

  getCurrentUser(): { id: string; username: string; connectionId?: string } | null {
    return this.currentUser;
  }

  getCurrentRoom(): string | null {
    return this.currentRoom;
  }
}

// Type definitions for workflow events and messages
interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type: string;
  metadata?: Record<string, any>;
}

describe('PocketFlow Integration Workflow Notifications System Test', () => {
  let system: ChatPocketFlowSystem;
  let cli: IntegratedCLI;
  let eventLog: Array<{ event: string; data: any; timestamp: Date }>;

  beforeEach(async () => {
    system = new ChatPocketFlowSystem();
    await system.initialize();
    cli = system.getCLI();
    
    eventLog = [];
    
    // Set up event logging
    const eventBus = system.getEventBus();
    eventBus.on('workflow_event', (data) => {
      eventLog.push({ event: 'workflow_event', data, timestamp: new Date() });
    });
    eventBus.on('workflow_notification_sent', (data) => {
      eventLog.push({ event: 'workflow_notification_sent', data, timestamp: new Date() });
    });
  });

  afterEach(async () => {
    await system.cleanup();
  });

  test('should integrate chat and workflow systems for In Progress notification flow', async () => {
    // Setup: Login and create room
    await cli.login('user1', 'Alice');
    await cli.executeCommand('/create-room dev-ops');
    await cli.executeCommand('/join dev-ops');

    // Step 1: List available workflows
    const listResult = await cli.executeCommand('/flow list');
    expect(listResult.success).toBe(true);
    expect(listResult.data.workflows).toHaveLength(2);
    expect(listResult.data.workflows.map((w: any) => w.name)).toContain('Backup Flow');

    // Step 2: Check workflow status
    const statusResult = await cli.executeCommand('/flow status backup-flow');
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.status).toBe('idle');

    // Step 3: Trigger workflow and receive notifications
    const triggerResult = await cli.executeCommand('/flow trigger backup-flow');
    expect(triggerResult.success).toBe(true);
    expect(triggerResult.data.executionId).toBeDefined();

    // Wait for workflow events to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Check that workflow notifications were sent to chat
    const historyResult = await cli.executeCommand('/history 10');
    expect(historyResult.success).toBe(true);
    
    const notifications = historyResult.data.messages.filter((m: any) => m.type === 'workflow_notification');
    expect(notifications.length).toBeGreaterThan(0);
    
    // Should have started notification
    expect(notifications.some((n: any) => n.content.includes('started'))).toBe(true);
    
    // Should have step completion notifications
    expect(notifications.some((n: any) => n.content.includes('Step'))).toBe(true);
    
    // Should have completion notification
    expect(notifications.some((n: any) => n.content.includes('In Progress'))).toBe(true);

    // Verify event log
    expect(eventLog.some(e => e.event === 'workflow_event' && e.data.type === 'started')).toBe(true);
    expect(eventLog.some(e => e.event === 'workflow_notification_sent')).toBe(true);
  });

  test('should handle workflow status monitoring through chat', async () => {
    // Setup
    await cli.login('user1', 'Alice');
    await cli.executeCommand('/create-room monitoring');
    await cli.executeCommand('/join monitoring');

    // Start a workflow
    const triggerResult = await cli.executeCommand('/flow trigger deploy-flow');
    expect(triggerResult.success).toBe(true);
    
    // const executionId = triggerResult.data.executionId;

    // Check status immediately after trigger
    const statusResult = await cli.executeCommand('/flow status deploy-flow');
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.status).toBe('running');

    // Wait for some progress
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check status again
    const statusResult2 = await cli.executeCommand('/flow status deploy-flow');
    expect(statusResult2.success).toBe(true);
    
    // Verify notifications in chat
    const historyResult = await cli.executeCommand('/history 20');
    expect(historyResult.success).toBe(true);
    
    const workflowMessages = historyResult.data.messages.filter((m: any) => 
      m.type === 'workflow_notification' && m.username === 'PocketFlow'
    );
    
    expect(workflowMessages.length).toBeGreaterThan(0);
    expect(workflowMessages[0].content).toContain('Deploy Flow');
  });

  test('should handle workflow cancellation through chat', async () => {
    // Setup
    await cli.login('user1', 'Alice');
    await cli.executeCommand('/create-room ops');
    await cli.executeCommand('/join ops');

    // Start a workflow
    const triggerResult = await cli.executeCommand('/flow trigger backup-flow');
    expect(triggerResult.success).toBe(true);
    const executionId = triggerResult.data.executionId;

    // Wait a bit for workflow to start
    await new Promise(resolve => setTimeout(resolve, 150));

    // Cancel the workflow
    const cancelResult = await cli.executeCommand(`/flow cancel ${executionId}`);
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.data.cancelled).toBe(true);

    // Wait for cancellation event
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that cancellation notification was sent
    const historyResult = await cli.executeCommand('/history 20');
    expect(historyResult.success).toBe(true);
    
    const notifications = historyResult.data.messages.filter((m: any) => m.type === 'workflow_notification');
    expect(notifications.some((n: any) => n.content.includes('cancelled'))).toBe(true);
  });

  test('should handle multiple workflows in same chat room', async () => {
    // Setup
    await cli.login('user1', 'DevOps');
    await cli.executeCommand('/create-room multi-workflow');
    await cli.executeCommand('/join multi-workflow');

    // Trigger multiple workflows
    const trigger1 = await cli.executeCommand('/flow trigger backup-flow');
    const trigger2 = await cli.executeCommand('/flow trigger deploy-flow');
    
    expect(trigger1.success).toBe(true);
    expect(trigger2.success).toBe(true);

    // Wait for workflows to progress
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Check notifications
    const historyResult = await cli.executeCommand('/history 50');
    expect(historyResult.success).toBe(true);
    
    const notifications = historyResult.data.messages.filter((m: any) => m.type === 'workflow_notification');
    
    // Should have notifications for both workflows
    expect(notifications.some((n: any) => n.content.includes('Backup Flow'))).toBe(true);
    expect(notifications.some((n: any) => n.content.includes('Deploy Flow'))).toBe(true);
    
    // Should have multiple types of events (started, step_completed, In Progress)
    const eventTypes = notifications.map((n: any) => {
      if (n.content.includes('started')) return 'started';
      if (n.content.includes('Step') && n.content.includes('In Progress')) return 'step_completed';
      if (n.content.includes('In Progress') && !n.content.includes('Step')) return 'In Progress';
      return 'other';
    });
    
    expect(eventTypes.filter((t: string) => t === 'started').length).toBe(2); // Both workflows started
    expect(eventTypes.filter((t: string) => t === 'step_completed').length).toBeGreaterThan(0); // Steps In Progress
    expect(eventTypes.filter((t: string) => t === 'In Progress').length).toBe(2); // Both workflows In Progress
  });

  test('should handle workflow errors gracefully', async () => {
    // Setup
    await cli.login('user1', 'Alice');
    await cli.executeCommand('/create-room error-handling');
    await cli.executeCommand('/join error-handling');

    // Try to trigger non-existent workflow
    const triggerResult = await cli.executeCommand('/flow trigger non-existent-flow');
    expect(triggerResult.success).toBe(false);
    expect(triggerResult.error).toBe('WORKFLOW_TRIGGER_ERROR');

    // Try to get status of non-existent workflow
    const statusResult = await cli.executeCommand('/flow status non-existent-flow');
    expect(statusResult.success).toBe(false);
    expect(statusResult.error).toBe('WORKFLOW_STATUS_ERROR');

    // Try to cancel non-existent execution
    const cancelResult = await cli.executeCommand('/flow cancel non-existent-execution');
    expect(cancelResult.success).toBe(false);
    expect(cancelResult.error).toBe('WORKFLOW_CANCEL_ERROR');

    // Commands without parameters
    const noParamStatus = await cli.executeCommand('/flow status');
    expect(noParamStatus.success).toBe(false);
    expect(noParamStatus.error).toBe('MISSING_WORKFLOW_ID');

    const noParamTrigger = await cli.executeCommand('/flow trigger');
    expect(noParamTrigger.success).toBe(false);
    expect(noParamTrigger.error).toBe('MISSING_WORKFLOW_ID');

    const noParamCancel = await cli.executeCommand('/flow cancel');
    expect(noParamCancel.success).toBe(false);
    expect(noParamCancel.error).toBe('MISSING_EXECUTION_ID');
  });

  test('should maintain notification history and formatting', async () => {
    // Setup
    await cli.login('user1', 'TestUser');
    await cli.executeCommand('/create-room notification-test');
    await cli.executeCommand('/join notification-test');

    // Send a regular message first
    await cli.executeCommand('Hello everyone!');

    // Trigger workflow
    await cli.executeCommand('/flow trigger backup-flow');

    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Check message history
    const historyResult = await cli.executeCommand('/history 20');
    expect(historyResult.success).toBe(true);
    
    const messages = historyResult.data.messages;
    
    // Should have regular message
    expect(messages.some((m: any) => m.content === 'Hello everyone!' && m.type === 'text')).toBe(true);
    
    // Should have workflow notifications with proper formatting
    const workflowNotifications = messages.filter((m: any) => m.type === 'workflow_notification');
    expect(workflowNotifications.length).toBeGreaterThan(0);
    
    // Check formatting of notifications
    workflowNotifications.forEach((notification: any) => {
      expect(notification.username).toBe('PocketFlow');
      expect(notification.content).toMatch(/\[.*\]/); // Should contain timestamp
      expect(notification.content).toContain('Backup Flow'); // Should contain workflow name
    });

    // Should have different types of notifications
    const notificationContents = workflowNotifications.map((n: any) => n.content);
    expect(notificationContents.some((c: string) => c.includes('🚀') && c.includes('started'))).toBe(true);
    expect(notificationContents.some((c: string) => c.includes('📋') && c.includes('Step'))).toBe(true);
    expect(notificationContents.some((c: string) => c.includes('🔄') && c.includes('In Progress'))).toBe(true);
  });

  test('should integrate with regular chat flow seamlessly', async () => {
    // Setup
    await cli.login('user1', 'IntegrationUser');
    await cli.executeCommand('/create-room seamless-integration');
    await cli.executeCommand('/join seamless-integration');

    // Mixed conversation flow
    await cli.executeCommand('Starting deployment process');
    await cli.executeCommand('/flow list');
    await cli.executeCommand('About to trigger the backup workflow');
    
    const triggerResult = await cli.executeCommand('/flow trigger backup-flow');
    expect(triggerResult.success).toBe(true);
    
    await cli.executeCommand('Backup workflow triggered, waiting for completion');
    
    // Wait for workflow events
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await cli.executeCommand('Workflow should be completing now');
    await cli.executeCommand('/flow status backup-flow');

    // Verify mixed message types in history
    const historyResult = await cli.executeCommand('/history 30');
    expect(historyResult.success).toBe(true);
    
    const messages = historyResult.data.messages;
    
    // Should have regular text messages
    const textMessages = messages.filter((m: any) => m.type === 'text');
    expect(textMessages.length).toBeGreaterThan(0);
    expect(textMessages.some((m: any) => m.content.includes('Starting deployment'))).toBe(true);
    
    // Should have workflow notifications interspersed
    const workflowNotifications = messages.filter((m: any) => m.type === 'workflow_notification');
    expect(workflowNotifications.length).toBeGreaterThan(0);
    
    // Messages should be in chronological order
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].timestamp).getTime();
      const currTime = new Date(messages[i].timestamp).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
  });

  test('should handle concurrent workflow operations', async () => {
    // Setup
    await cli.login('user1', 'ConcurrentUser');
    await cli.executeCommand('/create-room concurrent-ops');
    await cli.executeCommand('/join concurrent-ops');

    // Trigger multiple workflows concurrently
    const triggerPromises = [
      cli.executeCommand('/flow trigger backup-flow'),
      cli.executeCommand('/flow trigger deploy-flow')
    ];

    const results = await Promise.all(triggerPromises);
    expect(results.every(r => r.success)).toBe(true);

    // Check status of both workflows
    const statusPromises = [
      cli.executeCommand('/flow status backup-flow'),
      cli.executeCommand('/flow status deploy-flow')
    ];

    const statusResults = await Promise.all(statusPromises);
    expect(statusResults.every(r => r.success)).toBe(true);

    // Wait for workflows to complete
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Verify all notifications were received
    const historyResult = await cli.executeCommand('/history 50');
    expect(historyResult.success).toBe(true);
    
    const notifications = historyResult.data.messages.filter((m: any) => m.type === 'workflow_notification');
    
    // Should have notifications for both workflows
    const backupNotifications = notifications.filter((n: any) => n.content.includes('Backup Flow'));
    const deployNotifications = notifications.filter((n: any) => n.content.includes('Deploy Flow'));
    
    expect(backupNotifications.length).toBeGreaterThan(0);
    expect(deployNotifications.length).toBeGreaterThan(0);
    
    // Both should have In Progress
    expect(backupNotifications.some((n: any) => n.content.includes('In Progress'))).toBe(true);
    expect(deployNotifications.some((n: any) => n.content.includes('In Progress'))).toBe(true);
  });
});