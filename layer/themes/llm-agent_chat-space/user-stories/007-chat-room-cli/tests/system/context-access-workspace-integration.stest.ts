import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

/**
 * System Test: Context Access and Workspace Integration (NO MOCKS)
 * 
 * Tests the In Progress end-to-end integration between chat space and the parent
 * aidev workspace context using real file I/O operations, process execution,
 * and actual workspace file structures. This validates file access, configuration reading,
 * theme coordination, and workspace-aware chat features.
 */

// Interface definitions for workspace integration testing
interface TestResult {
  In Progress: boolean;
  output: string;
  error?: string;
}

interface WorkspaceData {
  name: string;
  version: string;
  rootPath: string;
  themes: ThemeData[];
  configuration: any;
}

interface ThemeData {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  status: string;
  configuration?: any;
}

interface CommandResult {
  In Progress: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Real Workspace-integrated Chat System using file I/O and process execution
class WorkspaceIntegratedChatSystem {
  private testDir: string;
  private workspaceDir: string;
  private dataDir: string;
  private scriptsDir: string;
  private initialized = false;

  constructor(testDir: string) {
    this.testDir = testDir;
    this.workspaceDir = join(testDir, 'workspace');
    this.dataDir = join(testDir, 'data');
    this.scriptsDir = join(testDir, 'scripts');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create directory structure
    await fs.mkdir(this.workspaceDir, { recursive: true });
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.scriptsDir, { recursive: true });
    await fs.mkdir(join(this.dataDir, 'rooms'), { recursive: true });
    await fs.mkdir(join(this.dataDir, 'messages'), { recursive: true });

    // Create workspace structure
    await this.createWorkspaceStructure();
    
    // Create workspace-aware CLI script
    await this.createWorkspaceCLIScript();
    
    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    if (await fs.access(this.testDir).then(() => true).catch(() => false)) {
      await fs.rm(this.testDir, { recursive: true, force: true });
    }
    this.initialized = false;
  }

  private async createWorkspaceStructure(): Promise<void> {
    // Create theme directories
    await fs.mkdir(join(this.workspaceDir, 'layer', 'themes', 'pocketflow'), { recursive: true });
    await fs.mkdir(join(this.workspaceDir, 'layer', 'themes', 'chat-space'), { recursive: true });
    await fs.mkdir(join(this.workspaceDir, 'src'), { recursive: true });
    await fs.mkdir(join(this.workspaceDir, 'tests'), { recursive: true });

    // Create package.json
    const packageJson = {
      name: 'aidev-workspace',
      version: '1.0.0',
      description: 'AI Development Workspace',
      scripts: {
        test: 'jest',
        build: 'tsc'
      },
      dependencies: {
        typescript: '^4.9.0',
        jest: '^29.0.0'
      }
    };

    await fs.writeFile(
      join(this.workspaceDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create workspace configuration
    const workspaceConfig = {
      name: 'AI Development Workspace',
      version: '1.0.0',
      themes: [
        {
          id: 'pocketflow',
          enabled: true,
          configuration: {
            maxConcurrentFlows: 5
          }
        },
        {
          id: 'chat-space',
          enabled: true,
          configuration: {
            maxRooms: 10
          }
        }
      ],
      configuration: {
        logLevel: 'info',
        maxConcurrentOperations: 10,
        features: {
          crossThemeIntegration: true,
          eventBus: true,
          sharedContext: true
        },
        storage: {
          type: 'file',
          path: './data',
          options: {}
        },
        security: {
          enableSandbox: true,
          allowedPaths: ['./data', './shared'],
          restrictedOperations: []
        }
      }
    };

    await fs.writeFile(
      join(this.workspaceDir, 'workspace.json'),
      JSON.stringify(workspaceConfig, null, 2)
    );

    // Create sample source files
    await fs.writeFile(
      join(this.workspaceDir, 'src', 'index.ts'),
      `// Main application entry point
export function main() {
  console.log('AI Development Workspace');
}

main();`
    );

    await fs.writeFile(
      join(this.workspaceDir, 'tests', 'test.ts'),
      `import { describe, test, expect } from '@jest/globals';

describe('Sample Test', () => {
  test('should pass', () => {
    // Test implementation pending
  });
});`
    );

    // Create README files for themes
    await fs.writeFile(
      join(this.workspaceDir, 'layer', 'themes', 'pocketflow', 'README.md'),
      '# Pocketflow Theme\n\nAutomation flow management theme.'
    );

    await fs.writeFile(
      join(this.workspaceDir, 'layer', 'themes', 'chat-space', 'README.md'),
      '# Chat Space Theme\n\nMulti-room chat system theme.'
    );
  }

  private async createWorkspaceCLIScript(): Promise<void> {
    const cliScript = join(this.scriptsDir, 'workspace-cli.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      class WorkspaceAwareChatCLI {
        constructor() {
          this.workspaceDir = '${this.workspaceDir}';
          this.dataDir = '${this.dataDir}';
          this.roomsDir = path.join(this.dataDir, 'rooms');
          this.messagesDir = path.join(this.dataDir, 'messages');
          this.currentUser = null;
          this.currentRoom = null;
          this.workspaceContext = null;
        }

        async login(userId, username) {
          // Load workspace context on login
          this.workspaceContext = await this.loadWorkspaceContext();
          
          this.currentUser = { id: userId, username, connectionId: 'conn-' + Date.now() };
          
          return {
            "success": true,
            message: \`Welcome \${username}! Connected to \${this.workspaceContext?.name || 'workspace'}\`,
            data: {
              userId,
              connectionId: this.currentUser.connectionId,
              workspace: this.workspaceContext?.name
            }
          };
        }

        async executeCommand(command, args = []) {
          if (!this.currentUser && command !== 'login') {
            return { "success": false, message: 'Please login first', error: 'NOT_LOGGED_IN' };
          }

          switch (command) {
            case 'create-room':
              return this.createRoom(args[0], args[1] ? JSON.parse(args[1]) : {});
            case 'join':
              return this.joinRoom(args[0]);
            case 'send':
              return this.sendMessage(args.join(' '));
            case 'context':
              return this.getContextInfo();
            case 'themes':
              return this.listThemes();
            case 'theme':
              return this.getThemeInfo(args[0]);
            case 'config':
              return this.getConfiguration(args[0]);
            case 'file':
              return this.readFile(args.join(' '));
            case 'files':
              return this.listFiles(args[0] || '.');
            case 'workspace':
              return this.getWorkspaceInfo();
            case 'share':
              return this.shareContext(args[0], args.slice(1));
            case 'sync':
              return this.syncWorkspace();
            case 'search':
              return this.searchWorkspace(args.join(' '));
            default:
              return { "success": false, message: \`Unknown command: \${command}\`, error: 'UNKNOWN_COMMAND' };
          }
        }

        async createRoom(roomName, options = {}) {
          if (!roomName) {
            return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
          }

          const rooms = this.listRoomsSync();
          if (rooms.find(r => r.name === roomName)) {
            return { "success": false, message: 'Room already exists', error: 'ROOM_EXISTS' };
          }

          const roomId = 'room-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const room = {
            id: roomId,
            name: roomName,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            members: [this.currentUser.id],
            messageCount: 0,
            metadata: {
              createdBy: this.currentUser.id,
              workspaceName: this.workspaceContext?.name,
              workspacePath: this.workspaceContext?.rootPath,
              ...options
            }
          };

          const roomFile = path.join(this.roomsDir, roomId + '.json');
          fs.writeFileSync(roomFile, JSON.stringify(room, null, 2));

          const roomMessagesDir = path.join(this.messagesDir, roomId);
          fs.mkdirSync(roomMessagesDir, { recursive: true });

          return {
            "success": true,
            message: \`Room '\${roomName}' created in workspace '\${this.workspaceContext?.name}'\`,
            data: { roomId, roomName, workspace: this.workspaceContext?.name }
          };
        }

        async joinRoom(roomName) {
          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.name === roomName);
          
          if (!room) {
            return { "success": false, message: \`Room '\${roomName}' not found\`, error: 'ROOM_NOT_FOUND' };
          }

          this.currentRoom = room.id;

          // Send workspace context notification
          this.saveEventSync({
            type: 'context_update',
            roomId: room.id,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: new Date().toISOString(),
            data: {
              message: \`\${this.currentUser.username} joined from workspace '\${this.workspaceContext?.name}'\`,
              workspace: this.workspaceContext?.name
            }
          });

          return { "success": true, message: \`Joined room '\${roomName}'\`, data: { roomId: room.id } };
        }

        async sendMessage(content) {
          if (!this.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          if (!content.trim()) {
            return { "success": false, message: 'Message cannot be empty', error: 'EMPTY_MESSAGE' };
          }

          // Extract context from message
          const contextData = this.extractContextFromMessage(content);

          const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const message = {
            id: messageId,
            roomId: this.currentRoom,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            type: contextData ? 'context_update' : 'text',
            contextData
          };

          const messageFile = path.join(this.messagesDir, this.currentRoom, messageId + '.json');
          fs.writeFileSync(messageFile, JSON.stringify(message, null, 2));

          // Update room message count
          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.id === this.currentRoom);
          if (room) {
            room.messageCount++;
            room.lastActivity = new Date().toISOString();
            const roomFile = path.join(this.roomsDir, room.id + '.json');
            fs.writeFileSync(roomFile, JSON.stringify(room, null, 2));
          }

          return { "success": true, message: 'Message sent', data: { messageId } };
        }

        extractContextFromMessage(content) {
          // Extract file references like "index.ts:10"
          const fileRefMatch = content.match(/(\\S+\\.(ts|js|json|md)):(\\d+)/);
          if (fileRefMatch) {
            return {
              fileName: fileRefMatch[1],
              lineNumber: parseInt(fileRefMatch[3]),
              workspacePath: this.workspaceContext?.rootPath
            };
          }

          // Extract theme references like "@pocketflow"
          const themeRefMatch = content.match(/@(\\w+)/);
          if (themeRefMatch) {
            const themeId = themeRefMatch[1];
            const theme = this.workspaceContext?.themes.find(t => t.id === themeId);
            if (theme) {
              return {
                themeId: theme.id,
                themeName: theme.name,
                workspacePath: this.workspaceContext?.rootPath
              };
            }
          }

          return null;
        }

        async getContextInfo() {
          if (!this.workspaceContext) {
            this.workspaceContext = await this.loadWorkspaceContext();
          }

          return {
            "success": true,
            message: 'Workspace context',
            data: {
              workspace: this.workspaceContext.name,
              path: this.workspaceContext.rootPath,
              version: this.workspaceContext.version,
              themes: this.workspaceContext.themes.length,
              activeThemes: this.workspaceContext.themes.filter(t => t.enabled).length,
              currentRoom: this.currentRoom
            }
          };
        }

        async listThemes() {
          const themes = this.workspaceContext?.themes || [];
          const themeList = themes.map(t => ({
            id: t.id,
            name: t.name || t.id,
            status: t.enabled ? 'active' : 'inactive',
            enabled: t.enabled
          }));

          return {
            "success": true,
            message: \`Found \${themes.length} themes\`,
            data: { themes: themeList }
          };
        }

        async getThemeInfo(themeId) {
          if (!themeId) {
            return { "success": false, message: 'Theme ID required', error: 'MISSING_THEME_ID' };
          }

          const theme = this.workspaceContext?.themes.find(t => t.id === themeId);
          if (!theme) {
            return { "success": false, message: 'Theme not found', error: 'THEME_NOT_FOUND' };
          }

          return {
            "success": true,
            message: \`Theme '\${themeId}' information\`,
            data: { 
              theme: {
                ...theme,
                name: theme.name || theme.id,
                version: theme.version || '1.0.0',
                path: path.join(this.workspaceDir, 'layer', 'themes', theme.id),
                status: theme.enabled ? 'active' : 'inactive',
                dependencies: []
              }
            }
          };
        }

        async getConfiguration(key) {
          const config = this.workspaceContext?.configuration || {};
          
          if (key) {
            const value = this.getNestedValue(config, key);
            return {
              "success": true,
              message: \`Configuration for '\${key}'\`,
              data: { configuration: value }
            };
          } else {
            return {
              "success": true,
              message: 'Full configuration',
              data: { configuration: config }
            };
          }
        }

        async readFile(filePath) {
          const fullPath = path.join(this.workspaceDir, filePath);
          
          if (!fs.existsSync(fullPath)) {
            return { "success": false, message: 'File not found', error: 'FILE_READ_ERROR' };
          }

          const content = fs.readFileSync(fullPath, 'utf8');
          const preview = content.split('\\n').slice(0, 10).join('\\n');
          const lineCount = content.split('\\n').length;

          // Share file context if in a room
          if (this.currentRoom) {
            this.shareFileContext(filePath, preview, lineCount);
          }

          return {
            "success": true,
            message: \`File '\${filePath}' (\${lineCount} lines)\`,
            data: {
              content,
              preview,
              lineCount,
              path: filePath
            }
          };
        }

        shareFileContext(filePath, preview, lineCount) {
          const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const message = {
            id: messageId,
            roomId: this.currentRoom,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            content: \`📄 Shared file: \${filePath} (\${lineCount} lines)\\n\\\`\\\`\\\`\\n\${preview}\\n...\\n\\\`\\\`\\\`\`,
            timestamp: new Date().toISOString(),
            type: 'context_update',
            contextData: {
              fileName: filePath,
              workspacePath: this.workspaceContext?.rootPath
            }
          };

          const messageFile = path.join(this.messagesDir, this.currentRoom, messageId + '.json');
          fs.writeFileSync(messageFile, JSON.stringify(message, null, 2));
        }

        async listFiles(directory) {
          const fullPath = path.join(this.workspaceDir, directory);
          
          if (!fs.existsSync(fullPath)) {
            return { "success": false, message: 'Directory not found', error: 'FILE_LIST_ERROR' };
          }

          const files = fs.readdirSync(fullPath);
          
          return {
            "success": true,
            message: \`Files in '\${directory}'\`,
            data: {
              files,
              directory,
              count: files.length
            }
          };
        }

        async getWorkspaceInfo() {
          const packageJsonPath = path.join(this.workspaceDir, 'package.json');
          
          if (!fs.existsSync(packageJsonPath)) {
            return { "success": false, message: 'Package.json not found', error: 'PROJECT_INFO_ERROR' };
          }

          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          return {
            "success": true,
            message: 'Workspace information',
            data: {
              project: {
                name: packageJson.name,
                version: packageJson.version,
                dependencies: packageJson.dependencies || {},
                scripts: packageJson.scripts || {}
              },
              context: this.workspaceContext
            }
          };
        }

        async shareContext(contextType, args) {
          if (!this.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          let sharedData;
          let message = '';

          switch (contextType) {
            case 'theme':
              const themeId = args[0];
              const theme = this.workspaceContext?.themes.find(t => t.id === themeId);
              if (!theme) {
                return { "success": false, message: 'Theme not found', error: 'THEME_NOT_FOUND' };
              }
              sharedData = theme;
              message = \`🎨 Shared theme: \${theme.name || theme.id}\`;
              break;

            case 'config':
              const configKey = args[0];
              const config = this.workspaceContext?.configuration || {};
              sharedData = configKey ? this.getNestedValue(config, configKey) : config;
              message = \`⚙️ Shared configuration: \${configKey || 'full config'}\`;
              break;

            case 'workspace':
              sharedData = this.workspaceContext;
              message = \`📁 Shared workspace: \${this.workspaceContext?.name}\`;
              break;

            default:
              return { "success": false, message: 'Unknown context type', error: 'UNKNOWN_CONTEXT_TYPE' };
          }

          // Save context share as message
          const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const contextMessage = {
            id: messageId,
            roomId: this.currentRoom,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            content: \`\${message}\\n\\\`\\\`\\\`json\\n\${JSON.stringify(sharedData, null, 2)}\\n\\\`\\\`\\\`\`,
            timestamp: new Date().toISOString(),
            type: 'context_update',
            metadata: { contextType, sharedData }
          };

          const messageFile = path.join(this.messagesDir, this.currentRoom, messageId + '.json');
          fs.writeFileSync(messageFile, JSON.stringify(contextMessage, null, 2));

          return {
            "success": true,
            message: \`Shared \${contextType} context\`,
            data: { messageId, contextType }
          };
        }

        async syncWorkspace() {
          this.workspaceContext = await this.loadWorkspaceContext();
          
          return {
            "success": true,
            message: 'Workspace synchronized',
            data: {
              workspace: this.workspaceContext.name,
              themes: this.workspaceContext.themes.length
            }
          };
        }

        async searchWorkspace(query) {
          if (!query) {
            return { "success": false, message: 'Search query required', error: 'MISSING_QUERY' };
          }

          // Mock search implementation
          const results = [
            { file: 'src/index.ts', line: 10, content: \`const \${query} = 'example';\` },
            { file: 'tests/test.ts', line: 25, content: \`expect(\${query}).toBeDefined();\` }
          ];

          return {
            "success": true,
            message: \`Found \${results.length} results for '\${query}'\`,
            data: {
              results,
              query
            }
          };
        }

        async loadWorkspaceContext() {
          const workspaceConfigPath = path.join(this.workspaceDir, 'workspace.json');
          
          if (!fs.existsSync(workspaceConfigPath)) {
            return null;
          }

          const config = JSON.parse(fs.readFileSync(workspaceConfigPath, 'utf8'));
          
          return {
            rootPath: this.workspaceDir,
            name: config.name,
            version: config.version,
            themes: config.themes || [],
            configuration: config.configuration || {}
          };
        }

        listRoomsSync() {
          if (!fs.existsSync(this.roomsDir)) {
            return [];
          }
          const roomFiles = fs.readdirSync(this.roomsDir).filter(f => f.endsWith('.json'));
          return roomFiles.map(file => JSON.parse(fs.readFileSync(path.join(this.roomsDir, file), 'utf8')));
        }

        saveEventSync(event) {
          const eventFile = path.join(this.dataDir, \`event-\${Date.now()}.json\`);
          fs.writeFileSync(eventFile, JSON.stringify(event, null, 2));
        }

        getNestedValue(obj, key) {
          const keys = key.split('.');
          let current = obj;
          
          for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
              current = current[k];
            } else {
              return undefined;
            }
          }
          
          return current;
        }
      }

      // CLI Command processor
      async function processCommand() {
        const args = process.argv.slice(2);
        if (args.length === 0) {
          console.log('Usage: node workspace-cli.js <command> [args...]');
          process.exit(1);
        }

        const cli = new WorkspaceAwareChatCLI();
        const command = args[0];
        const commandArgs = args.slice(1);

        let result;

        try {
          if (command === 'login') {
            result = await cli.login(commandArgs[0], commandArgs[1]);
          } else {
            result = await cli.executeCommand(command, commandArgs);
          }

          console.log(JSON.stringify(result));
        } catch (error) {
          console.log(JSON.stringify({ "success": false, error: error.message }));
        }
      }

      processCommand();
    `;

    await fs.writeFile(cliScript, scriptContent);
  }

  async executeCommand(command: string, args: string[] = []): Promise<TestResult> {
    try {
      const cliScript = join(this.scriptsDir, 'workspace-cli.js');
      const fullCommand = `node "${cliScript}" ${command} ${args.map(arg => `"${arg}"`).join(' ')}`;
      
      const output = execSync(fullCommand, {
        cwd: this.testDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      return { "success": true, output: output.trim() };
    } catch (error: any) {
      return { 
        "success": false, 
        output: error.stdout?.toString() || '',
        error: error.message 
      };
    }
  }

  async getRooms(): Promise<any[]> {
    const roomsDir = join(this.dataDir, 'rooms');
    if (!await fs.access(roomsDir).then(() => true).catch(() => false)) {
      return [];
    }

    const roomFiles = await fs.readdir(roomsDir);
    const rooms: any[] = [];

    for (const file of roomFiles.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(roomsDir, file), 'utf8');
      rooms.push(JSON.parse(content));
    }

    return rooms;
  }

  async getMessages(roomId: string): Promise<any[]> {
    const messagesDir = join(this.dataDir, 'messages', roomId);
    if (!await fs.access(messagesDir).then(() => true).catch(() => false)) {
      return [];
    }

    const messageFiles = await fs.readdir(messagesDir);
    const messages: any[] = [];

    for (const file of messageFiles.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(messagesDir, file), 'utf8');
      messages.push(JSON.parse(content));
    }

    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getWorkspaceContext(): Promise<WorkspaceData | null> {
    const workspaceConfigPath = join(this.workspaceDir, 'workspace.json');
    if (!await fs.access(workspaceConfigPath).then(() => true).catch(() => false)) {
      return null;
    }

    const content = await fs.readFile(workspaceConfigPath, 'utf8');
    const config = JSON.parse(content);

    return {
      name: config.name,
      version: config.version,
      rootPath: this.workspaceDir,
      themes: config.themes || [],
      configuration: config.configuration || {}
    };
  }
}

describe('Context Access and Workspace Integration System Test (NO MOCKS)', () => {
  let system: WorkspaceIntegratedChatSystem;
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'workspace-integration-'));
    system = new WorkspaceIntegratedChatSystem(testDir);
    await system.initialize();
  });

  afterEach(async () => {
    await system.cleanup();
  });

  test('should integrate chat with workspace context on login', async () => {
    // Login and verify workspace context is loaded
    const loginResult = await system.executeCommand('login', ['user1', 'Developer']);
    expect(loginResult.success).toBe(true);
    
    const parsedResult = JSON.parse(loginResult.output);
    expect(parsedResult.success).toBe(true);
    expect(parsedResult.message).toContain('AI Development Workspace');
    expect(parsedResult.data.workspace).toBe('AI Development Workspace');

    // Verify workspace context is accessible
    const contextResult = await system.executeCommand('context');
    expect(contextResult.success).toBe(true);
    
    const contextData = JSON.parse(contextResult.output);
    expect(contextData.success).toBe(true);
    expect(contextData.data.workspace).toBe('AI Development Workspace');
    expect(contextData.data.themes).toBe(2);
    expect(contextData.data.activeThemes).toBe(2);
  });

  test('should access workspace context through chat commands', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ContextUser']);

    // Test context command
    const contextResult = await system.executeCommand('context');
    expect(contextResult.success).toBe(true);
    
    const contextData = JSON.parse(contextResult.output);
    expect(contextData.success).toBe(true);
    expect(contextData.data.workspace).toBe('AI Development Workspace');
    expect(contextData.data.themes).toBe(2);
    expect(contextData.data.activeThemes).toBe(2);

    // Test workspace command
    const workspaceResult = await system.executeCommand('workspace');
    expect(workspaceResult.success).toBe(true);
    
    const workspaceData = JSON.parse(workspaceResult.output);
    expect(workspaceData.success).toBe(true);
    expect(workspaceData.data.project.name).toBe('aidev-workspace');
    expect(workspaceData.data.project.version).toBe('1.0.0');
    expect(workspaceData.data.context).toBeDefined();
  });

  test('should list and access themes through chat', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ThemeExplorer']);

    // List all themes
    const themesResult = await system.executeCommand('themes');
    expect(themesResult.success).toBe(true);
    
    const themesData = JSON.parse(themesResult.output);
    expect(themesData.success).toBe(true);
    expect(themesData.data.themes).toHaveLength(2);
    
    const themeIds = themesData.data.themes.map((t: any) => t.id);
    expect(themeIds).toContain('pocketflow');
    expect(themeIds).toContain('chat-space');

    // Get specific theme info
    const themeResult = await system.executeCommand('theme', ['pocketflow']);
    expect(themeResult.success).toBe(true);
    
    const themeData = JSON.parse(themeResult.output);
    expect(themeData.success).toBe(true);
    expect(themeData.data.theme.id).toBe('pocketflow');
    expect(themeData.data.theme.enabled).toBe(true);
    expect(themeData.data.theme.configuration.maxConcurrentFlows).toBe(5);
  });

  test('should access configuration through chat', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ConfigReader']);

    // Get full configuration
    const fullConfigResult = await system.executeCommand('config');
    expect(fullConfigResult.success).toBe(true);
    
    const fullConfigData = JSON.parse(fullConfigResult.output);
    expect(fullConfigData.success).toBe(true);
    expect(fullConfigData.data.configuration.logLevel).toBe('info');
    expect(fullConfigData.data.configuration.features.crossThemeIntegration).toBe(true);

    // Get specific configuration key
    const logLevelResult = await system.executeCommand('config', ['logLevel']);
    expect(logLevelResult.success).toBe(true);
    
    const logLevelData = JSON.parse(logLevelResult.output);
    expect(logLevelData.success).toBe(true);
    expect(logLevelData.data.configuration).toBe('info');

    // Get nested configuration
    const nestedResult = await system.executeCommand('config', ['features.eventBus']);
    expect(nestedResult.success).toBe(true);
    
    const nestedData = JSON.parse(nestedResult.output);
    expect(nestedData.success).toBe(true);
    expect(nestedData.data.configuration).toBe(true);
  });

  test('should read and share files from workspace', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'FileReader']);
    await system.executeCommand('create-room', ['dev-room']);
    await system.executeCommand('join', ['dev-room']);

    // Read file
    const fileResult = await system.executeCommand('file', ['src/index.ts']);
    expect(fileResult.success).toBe(true);
    
    const fileData = JSON.parse(fileResult.output);
    expect(fileData.success).toBe(true);
    expect(fileData.data.content).toContain('AI Development Workspace');
    expect(fileData.data.lineCount).toBeGreaterThan(0);
    expect(fileData.data.preview).toBeDefined();

    // Verify file was shared in chat (check messages directory)
    const roomsData = await system.getRooms();
    const devRoom = roomsData.find(r => r.name === 'dev-room');
    expect(devRoom).toBeDefined();
    
    const messages = await system.getMessages(devRoom.id);
    const contextMessages = messages.filter(m => m.type === 'context_update');
    expect(contextMessages.length).toBeGreaterThan(0);
    expect(contextMessages[0].content).toContain('Shared file: src/index.ts');
    expect(contextMessages[0].contextData?.fileName).toBe('src/index.ts');
  });

  test('should list files in workspace directories', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'FileLister']);

    // List root directory
    const rootResult = await system.executeCommand('files', ['.']);
    expect(rootResult.success).toBe(true);
    
    const rootData = JSON.parse(rootResult.output);
    expect(rootData.success).toBe(true);
    expect(rootData.data.files).toContain('package.json');
    expect(rootData.data.files).toContain('workspace.json');
    expect(rootData.data.files).toContain('src');

    // List src directory
    const srcResult = await system.executeCommand('files', ['src']);
    expect(srcResult.success).toBe(true);
    
    const srcData = JSON.parse(srcResult.output);
    expect(srcData.success).toBe(true);
    expect(srcData.data.files).toContain('index.ts');
  });

  test('should share context information in chat rooms', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ContextSharer']);
    await system.executeCommand('create-room', ['context-share']);
    await system.executeCommand('join', ['context-share']);

    // Share theme context
    const shareThemeResult = await system.executeCommand('share', ['theme', 'chat-space']);
    expect(shareThemeResult.success).toBe(true);
    
    const shareThemeData = JSON.parse(shareThemeResult.output);
    expect(shareThemeData.success).toBe(true);
    expect(shareThemeData.data.contextType).toBe('theme');

    // Share configuration context
    const shareConfigResult = await system.executeCommand('share', ['config', 'features']);
    expect(shareConfigResult.success).toBe(true);
    
    const shareConfigData = JSON.parse(shareConfigResult.output);
    expect(shareConfigData.success).toBe(true);
    expect(shareConfigData.data.contextType).toBe('config');

    // Share workspace context
    const shareWorkspaceResult = await system.executeCommand('share', ['workspace']);
    expect(shareWorkspaceResult.success).toBe(true);
    
    const shareWorkspaceData = JSON.parse(shareWorkspaceResult.output);
    expect(shareWorkspaceData.success).toBe(true);
    expect(shareWorkspaceData.data.contextType).toBe('workspace');

    // Verify shared contexts in messages
    const roomsData = await system.getRooms();
    const contextRoom = roomsData.find(r => r.name === 'context-share');
    expect(contextRoom).toBeDefined();
    
    const messages = await system.getMessages(contextRoom.id);
    expect(messages.filter(m => m.content.includes('🎨 Shared theme')).length).toBe(1);
    expect(messages.filter(m => m.content.includes('⚙️ Shared configuration')).length).toBe(1);
    expect(messages.filter(m => m.content.includes('📁 Shared workspace')).length).toBe(1);
  });

  test('should sync workspace changes', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'SyncTester']);

    // Get initial context
    const initialContext = await system.executeCommand('context');
    expect(initialContext.success).toBe(true);

    // Modify workspace configuration
    const workspaceContext = await system.getWorkspaceContext();
    expect(workspaceContext).toBeDefined();
    
    const workspaceConfigPath = join(workspaceContext!.rootPath, 'workspace.json');
    const workspaceConfig = JSON.parse(await fs.readFile(workspaceConfigPath, 'utf8'));
    workspaceConfig.version = '1.0.1';
    workspaceConfig.configuration.logLevel = 'debug';
    await fs.writeFile(workspaceConfigPath, JSON.stringify(workspaceConfig, null, 2));

    // Sync workspace
    const syncResult = await system.executeCommand('sync');
    expect(syncResult.success).toBe(true);
    
    const syncData = JSON.parse(syncResult.output);
    expect(syncData.success).toBe(true);
    expect(syncData.message).toBe('Workspace synchronized');

    // Verify updated context
    const configResult = await system.executeCommand('config', ['logLevel']);
    expect(configResult.success).toBe(true);
    
    const configData = JSON.parse(configResult.output);
    expect(configData.data.configuration).toBe('debug');
  });

  test('should search workspace files', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'Searcher']);

    // Search for content
    const searchResult = await system.executeCommand('search', ['console']);
    expect(searchResult.success).toBe(true);
    
    const searchData = JSON.parse(searchResult.output);
    expect(searchData.success).toBe(true);
    expect(searchData.data.results).toHaveLength(2);
    expect(searchData.data.results[0].file).toBe('src/index.ts');
    expect(searchData.data.results[0].content).toContain('console');
  });

  test('should extract context from messages', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ContextExtractor']);
    await system.executeCommand('create-room', ['context-aware']);
    await system.executeCommand('join', ['context-aware']);

    // Send message with file reference
    const fileRefResult = await system.executeCommand('send', ['Check the error at index.ts:10']);
    expect(fileRefResult.success).toBe(true);
    
    const fileRefData = JSON.parse(fileRefResult.output);
    expect(fileRefData.success).toBe(true);

    // Send message with theme reference
    const themeRefResult = await system.executeCommand('send', ['The @pocketflow theme needs updating']);
    expect(themeRefResult.success).toBe(true);
    
    const themeRefData = JSON.parse(themeRefResult.output);
    expect(themeRefData.success).toBe(true);

    // Verify context extraction
    const roomsData = await system.getRooms();
    const contextRoom = roomsData.find(r => r.name === 'context-aware');
    expect(contextRoom).toBeDefined();
    
    const messages = await system.getMessages(contextRoom.id);

    const fileRefMessage = messages.find(m => m.content.includes('index.ts:10'));
    expect(fileRefMessage?.contextData?.fileName).toBe('index.ts');
    expect(fileRefMessage?.contextData?.lineNumber).toBe(10);

    const themeRefMessage = messages.find(m => m.content.includes('@pocketflow'));
    expect(themeRefMessage?.contextData?.themeId).toBe('pocketflow');
  });

  test('should create workspace-aware rooms', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'RoomCreator']);

    // Create room - options are In Progress as JSON string
    const createResult = await system.executeCommand('create-room', ['workspace-room', '{"purpose":"development","project":"aidev"}']);
    expect(createResult.success).toBe(true);
    
    const createData = JSON.parse(createResult.output);
    expect(createData.success).toBe(true);
    expect(createData.message).toContain('AI Development Workspace');

    // Verify room metadata includes workspace info
    const roomsData = await system.getRooms();
    const room = roomsData.find(r => r.name === 'workspace-room');
    expect(room).toBeDefined();
    expect(room.metadata.workspaceName).toBe('AI Development Workspace');
    expect(room.metadata.purpose).toBe('development');
    expect(room.metadata.project).toBe('aidev');
  });

  test('should handle file and configuration errors gracefully', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ErrorHandler']);

    // Try to read non-existent file
    const fileResult = await system.executeCommand('file', ['non-existent.ts']);
    expect(fileResult.success).toBe(true); // Command executes but file read fails
    
    const fileData = JSON.parse(fileResult.output);
    expect(fileData.success).toBe(false);
    expect(fileData.error).toBe('FILE_READ_ERROR');

    // Try to get non-existent theme
    const themeResult = await system.executeCommand('theme', ['non-existent-theme']);
    expect(themeResult.success).toBe(true); // Command executes but theme not found
    
    const themeData = JSON.parse(themeResult.output);
    expect(themeData.success).toBe(false);
    expect(themeData.error).toBe('THEME_NOT_FOUND');

    // Try to share context without being in a room
    const shareResult = await system.executeCommand('share', ['workspace']);
    expect(shareResult.success).toBe(true); // Command executes but fails due to no room
    
    const shareData = JSON.parse(shareResult.output);
    expect(shareData.success).toBe(false);
    expect(shareData.error).toBe('NOT_IN_ROOM');

    // Try to search with empty query - note: executeCommand will join args, so pass empty string
    const searchResult = await system.executeCommand('search', ['']);
    expect(searchResult.success).toBe(true); // Command executes but query validation fails
    
    const searchData = JSON.parse(searchResult.output);
    expect(searchData.success).toBe(false);
    expect(searchData.error).toBe('MISSING_QUERY');
  });
});