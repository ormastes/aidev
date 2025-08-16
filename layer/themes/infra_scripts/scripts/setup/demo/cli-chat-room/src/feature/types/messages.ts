/**
 * Message types and interfaces for the chat room
 */

export enum MessageType {
  // User messages
  USER_MESSAGE = 'user_message',
  AGENT_MESSAGE = 'agent_message',
  SYSTEM_MESSAGE = 'system_message',
  
  // Room events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  
  // Room management
  ROOM_INFO = 'room_info',
  USER_LIST = 'user_list',
  
  // Agent specific
  AGENT_READY = 'agent_ready',
  AGENT_ERROR = 'agent_error',
  
  // Errors
  ERROR = 'error'
}

export interface WSMessage<T = any> {
  type: MessageType;
  content?: string;
  sender?: string;
  roomId?: string;
  userId?: string;
  username?: string;
  isAgent?: boolean;
  timestamp?: string;
  metadata?: T;
  error?: string;
}

export interface JoinRoomMessage extends WSMessage {
  type: MessageType.JOIN_ROOM;
  roomId: string;
  userId: string;
  username: string;
  isAgent: boolean;
}

export interface UserMessage extends WSMessage {
  type: MessageType.USER_MESSAGE;
  content: string;
  sender: string;
}

export interface AgentMessage extends WSMessage {
  type: MessageType.AGENT_MESSAGE;
  content: string;
  sender: string;
  metadata?: {
    agent: string;
    capability?: string;
    [key: string]: any;
  };
}

export interface SystemMessage extends WSMessage {
  type: MessageType.SYSTEM_MESSAGE;
  content: string;
}

export interface ErrorMessage extends WSMessage {
  type: MessageType.ERROR;
  error: string;
}