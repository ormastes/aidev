/**
 * Shared types for CLI chat room
 */

export interface User {
  id: string;
  username: string;
  isAgent?: boolean;
  joinedAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  metadata?: any;
}

export enum MessageType {
  USER_MESSAGE = 'user_message',
  SYSTEM_MESSAGE = 'system_message',
  AGENT_MESSAGE = 'agent_message',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  COMMAND = 'command',
  AGENT_ACTION = 'agent_action'
}

export interface Room {
  id: string;
  name: string;
  users: User[];
  messages: Message[];
  createdAt: Date;
  coordinator?: User;
}

export interface ChatCommand {
  command: string;
  args: string[];
  userId: string;
}

export interface AgentAction {
  type: 'moderate' | 'summarize' | 'translate' | 'analyze' | 'coordinate';
  payload: any;
  targetUserId?: string;
  result?: any;
}

// WebSocket events
export enum WSEventType {
  // Client -> Server
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  SEND_MESSAGE = 'send_message',
  SEND_COMMAND = 'send_command',
  
  // Server -> Client
  ROOM_STATE = 'room_state',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  NEW_MESSAGE = 'new_message',
  ERROR = 'error',
  
  // Agent specific
  AGENT_REQUEST = 'agent_request',
  AGENT_RESPONSE = 'agent_response'
}

export interface WSMessage<T = any> {
  type: WSEventType;
  payload: T;
  timestamp: Date;
}