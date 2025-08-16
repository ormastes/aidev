import { EventEmitter } from '../../../../../infra_external-log-lib/src';

// Interface definitions based on sequence diagrams
export interface CLICommand {
  name: string;
  args: string[];
  options: Record<string, any>;
  rawInput: string;
}

export interface CLIResponse {
  success: boolean;
  message: string;
  data?: any;
  displayType?: 'text' | 'list' | 'table' | 'json';
}

export interface CLIState {
  authenticated: boolean;
  currentUser?: string;
  currentRoom?: string;
  commandHistory: string[];
  settings: {
    showTimestamps: boolean;
    colorOutput: boolean;
    autoComplete: boolean;
  };
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | 'workflow';
}

export class CLIInterface {
  private state: CLIState;
  private eventBus: EventEmitter;
  private commandHandlers: Map<string, (cmd: CLICommand) => Promise<CLIResponse>>;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.state = {
      authenticated: false,
      commandHistory: [],
      settings: {
        showTimestamps: true,
        colorOutput: true,
        autoComplete: true
      }
    };
    this.commandHandlers = new Map();
    this.initializeCommandHandlers();
  }

  private initializeCommandHandlers(): void {
    this.commandHandlers.set('/register', this.handleRegister.bind(this));
    this.commandHandlers.set('/login', this.handleLogin.bind(this));
    this.commandHandlers.set('/create', this.handleCreateRoom.bind(this));
    this.commandHandlers.set('/join', this.handleJoinRoom.bind(this));
    this.commandHandlers.set('/leave', this.handleLeaveRoom.bind(this));
    this.commandHandlers.set('/list', this.handleListRooms.bind(this));
    this.commandHandlers.set('/users', this.handleListUsers.bind(this));
    this.commandHandlers.set('/history', this.handleHistory.bind(this));
    this.commandHandlers.set('/settings', this.handleSettings.bind(this));
    this.commandHandlers.set('/help', this.handleHelp.bind(this));
    this.commandHandlers.set('/quit', this.handleQuit.bind(this));
    
    // Workflow commands
    this.commandHandlers.set('/review', this.handleReview.bind(this));
    this.commandHandlers.set('/search', this.handleSearch.bind(this));
    this.commandHandlers.set('/flow', this.handleFlow.bind(this));
    
    // Context commands
    this.commandHandlers.set('/context', this.handleContext.bind(this));
    this.commandHandlers.set('/workspace', this.handleWorkspace.bind(this));
  }

  // Core command processing
  parseCommand(input: string): CLICommand {
    const trimmed = input.trim();
    
    if (!trimmed.startsWith('/')) {
      throw new Error('Commands must start with /');
    }

    // Split while preserving quoted strings
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        current += char;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
    }

    const name = tokens[0];
    const args: string[] = [];
    const options: Record<string, any> = {};

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.startsWith('--')) {
        // Long option: --key=value or --flag
        const optionPart = token.substring(2);
        const equalIndex = optionPart.indexOf('=');
        
        if (equalIndex === -1) {
          options[optionPart] = true; // Flag
        } else {
          const key = optionPart.substring(0, equalIndex);
          const value = optionPart.substring(equalIndex + 1);
          options[key] = value;
        }
      } else if (token.startsWith('-') && token.length === 2) {
        // Short option: -f
        options[token.substring(1)] = true;
      } else {
        // Regular argument
        args.push(token);
      }
    }

    return {
      name,
      args,
      options,
      rawInput: input
    };
  }

  async processCommand(input: string): Promise<CLIResponse> {
    try {
      const command = this.parseCommand(input);
      
      // Add to history
      this.state.commandHistory.push(input);
      
      // Find and execute handler
      const handler = this.commandHandlers.get(command.name);
      if (!handler) {
        return {
          success: false,
          message: `Unknown command: ${command.name}. Type /help for available commands.`
        };
      }

      return await handler(command);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  processTextMessage(input: string): { isCommand: boolean; message?: string } {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return { isCommand: false };
    }
    
    if (trimmed.startsWith('/')) {
      return { isCommand: true };
    }
    
    if (!this.state.currentRoom) {
      return { 
        isCommand: false, 
        message: 'No room selected. Use /join <room> to join a room first.' 
      };
    }
    
    // Emit message event
    this.eventBus.emit('cli:send_message', {
      roomId: this.state.currentRoom,
      content: trimmed,
      userId: this.state.currentUser
    });
    
    return { isCommand: false };
  }

  // Message display and formatting
  formatMessage(message: Message): string {
    const timestamp = this.state.settings.showTimestamps 
      ? `[${message.timestamp.toLocaleTimeString()}] `
      : '';
    
    const roomPrefix = message.roomId ? `[${message.roomId}] ` : '';
    const typePrefix = this.getTypePrefix(message.type);
    const username = message.username || message.userId;
    
    return `${timestamp}${roomPrefix}${typePrefix}${username}: ${message.content}`;
  }

  private getTypePrefix(type: Message['type']): string {
    switch (type) {
      case 'system': return '🔧 ';
      case 'workflow': return '🔄 ';
      case 'command': return '⚡ ';
      default: return '';
    }
  }

  formatResponse(response: CLIResponse): string[] {
    const lines: string[] = [];
    
    const prefix = response.success ? '🔄' : '✗';
    lines.push(`${prefix} ${response.message}`);
    
    if (response.data) {
      switch (response.displayType) {
        case 'list':
          lines.push(...this.formatList(response.data));
          break;
        case 'table':
          lines.push(...this.formatTable(response.data));
          break;
        case 'json':
          lines.push(JSON.stringify(response.data, null, 2));
          break;
        default:
          if (typeof response.data === 'string') {
            lines.push(response.data);
          }
      }
    }
    
    return lines;
  }

  private formatList(items: any[]): string[] {
    return items.map((item, index) => {
      if (typeof item === 'object' && item.name) {
        return `  ${index + 1}. ${item.name}${item.description ? ` - ${item.description}` : ''}`;
      }
      return `  ${index + 1}. ${String(item)}`;
    });
  }

  private formatTable(data: Record<string, any>): string[] {
    const lines: string[] = [];
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
    
    for (const [key, value] of Object.entries(data)) {
      const paddedKey = key.padEnd(maxKeyLength);
      lines.push(`  ${paddedKey}: ${String(value)}`);
    }
    
    return lines;
  }

  // Auto-completion
  getCompletions(input: string): string[] {
    if (!input.startsWith('/')) {
      return [];
    }

    const commands = Array.from(this.commandHandlers.keys());
    const partial = input.toLowerCase();
    
    return commands.filter(cmd => cmd.toLowerCase().startsWith(partial));
  }

  // State management
  getState(): CLIState {
    return { ...this.state };
  }

  setState(updates: Partial<CLIState>): void {
    this.state = { ...this.state, ...updates };
  }

  // Command handlers
  private async handleRegister(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /register <username>'
      };
    }

    const username = cmd.args[0];
    
    // Emit event to platform
    this.eventBus.emit('cli:register_user', { username });
    
    return {
      success: true,
      message: `Registration request sent for ${username}`
    };
  }

  private async handleLogin(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /login <username>'
      };
    }

    const username = cmd.args[0];
    this.state.authenticated = true;
    this.state.currentUser = username;
    
    this.eventBus.emit('cli:user_logged_in', { username });
    
    return {
      success: true,
      message: `Logged in as ${username}`
    };
  }

  private async handleCreateRoom(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.authenticated) {
      return {
        success: false,
        message: 'Please login first'
      };
    }

    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /create <room-name> [--description="Room description"]'
      };
    }

    const roomName = cmd.args.join(' ');
    const description = cmd.options.description;
    
    this.eventBus.emit('cli:create_room', {
      name: roomName,
      description,
      userId: this.state.currentUser
    });
    
    return {
      success: true,
      message: `Room creation request sent for "${roomName}"`
    };
  }

  private async handleJoinRoom(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.authenticated) {
      return {
        success: false,
        message: 'Please login first'
      };
    }

    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /join <room-name-or-id>'
      };
    }

    const roomIdentifier = cmd.args[0];
    this.state.currentRoom = roomIdentifier;
    
    this.eventBus.emit('cli:join_room', {
      roomId: roomIdentifier,
      userId: this.state.currentUser
    });
    
    return {
      success: true,
      message: `Joining room "${roomIdentifier}"`
    };
  }

  private async handleLeaveRoom(_cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.currentRoom) {
      return {
        success: false,
        message: 'Not currently in any room'
      };
    }

    const roomId = this.state.currentRoom;
    this.state.currentRoom = undefined;
    
    this.eventBus.emit('cli:leave_room', {
      roomId,
      userId: this.state.currentUser
    });
    
    return {
      success: true,
      message: `Left room "${roomId}"`
    };
  }

  private async handleListRooms(cmd: CLICommand): Promise<CLIResponse> {
    const showAll = cmd.options.all || cmd.options.a;
    
    this.eventBus.emit('cli:list_rooms', {
      userId: this.state.currentUser,
      showAll
    });
    
    return {
      success: true,
      message: showAll ? 'Listing all rooms' : 'Listing your rooms',
      data: [], // Would be populated by event response
      displayType: 'list'
    };
  }

  private async handleListUsers(_cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.currentRoom) {
      return {
        success: false,
        message: 'Not in any room'
      };
    }

    this.eventBus.emit('cli:list_users', {
      roomId: this.state.currentRoom
    });
    
    return {
      success: true,
      message: 'Listing room users',
      data: [],
      displayType: 'list'
    };
  }

  private async handleHistory(cmd: CLICommand): Promise<CLIResponse> {
    if (!this.state.currentRoom) {
      return {
        success: false,
        message: 'Not in any room'
      };
    }

    const limit = parseInt(cmd.options.limit as string) || 50;
    
    this.eventBus.emit('cli:get_history', {
      roomId: this.state.currentRoom,
      limit
    });
    
    return {
      success: true,
      message: `Loading last ${limit} messages`
    };
  }

  private async handleSettings(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        success: true,
        message: 'Current settings:',
        data: this.state.settings,
        displayType: 'table'
      };
    }

    const [setting, value] = cmd.args;
    
    if (!(setting in this.state.settings)) {
      return {
        success: false,
        message: `Unknown setting: ${setting}`
      };
    }

    // Parse value
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    (this.state.settings as any)[setting] = parsedValue;
    
    return {
      success: true,
      message: `Setting ${setting} updated to ${parsedValue}`
    };
  }

  private async handleHelp(_cmd: CLICommand): Promise<CLIResponse> {
    const helpText = `
Available commands:
  /register <username>        - Register a new user
  /login <username>          - Login with username
  /create <name>             - Create a new room
  /join <room>               - Join a room
  /leave                     - Leave current room
  /list [--all]              - List rooms
  /users                     - List users in current room
  /history [--limit=N]       - Show message history
  /settings [key] [value]    - View/update settings
  
Workflow commands:
  /review <file>             - Start code review
  /search <pattern>          - Search workspace
  /flow <action> [args]      - Manage workflows
  
Context commands:
  /context                   - Show workspace context
  /workspace                 - Show workspace info
  
General:
  /help                      - Show this help
  /quit                      - Exit the application
    `;

    return {
      success: true,
      message: 'Chat Space CLI Help',
      data: helpText
    };
  }

  private async handleQuit(_cmd: CLICommand): Promise<CLIResponse> {
    this.eventBus.emit('cli:quit');
    
    return {
      success: true,
      message: 'Goodbye!'
    };
  }

  private async handleReview(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /review <file-path>'
      };
    }

    const filePath = cmd.args[0];
    
    this.eventBus.emit('cli:workflow_command', {
      workflow: 'code-review',
      args: { file: filePath },
      userId: this.state.currentUser,
      roomId: this.state.currentRoom
    });
    
    return {
      success: true,
      message: `Starting code review for ${filePath}`
    };
  }

  private async handleSearch(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /search <pattern>'
      };
    }

    const pattern = cmd.args.join(' ');
    
    this.eventBus.emit('cli:workflow_command', {
      workflow: 'file-search',
      args: { pattern },
      userId: this.state.currentUser,
      roomId: this.state.currentRoom
    });
    
    return {
      success: true,
      message: `Searching for "${pattern}"`
    };
  }

  private async handleFlow(cmd: CLICommand): Promise<CLIResponse> {
    if (cmd.args.length === 0) {
      return {
        success: false,
        message: 'Usage: /flow <action> [args]'
      };
    }

    const action = cmd.args[0];
    const args = cmd.args.slice(1);
    
    this.eventBus.emit('cli:flow_command', {
      action,
      args,
      userId: this.state.currentUser
    });
    
    return {
      success: true,
      message: `Flow command: ${action}`
    };
  }

  private async handleContext(_cmd: CLICommand): Promise<CLIResponse> {
    this.eventBus.emit('cli:get_context', {
      userId: this.state.currentUser
    });
    
    return {
      success: true,
      message: 'Loading workspace context...'
    };
  }

  private async handleWorkspace(_cmd: CLICommand): Promise<CLIResponse> {
    this.eventBus.emit('cli:get_workspace_info', {
      userId: this.state.currentUser
    });
    
    return {
      success: true,
      message: 'Loading workspace information...'
    };
  }
}