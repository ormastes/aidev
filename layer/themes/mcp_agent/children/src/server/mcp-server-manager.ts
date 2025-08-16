/**
 * MCP Server Manager
 * Manages multiple MCP server connections
 */

import { MCPConnection } from './mcp-connection';
import { MCPConnectionConfig, Tool, Resource, Prompt } from '../domain/protocol';

export interface MCPServerInfo {
  id: string;
  name: string;
  config: MCPConnectionConfig;
  autoConnect?: boolean;
}

export interface ServerStatus {
  id: string;
  name: string;
  connected: boolean;
  capabilities?: {
    tools?: string[];
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
  error?: string;
}

export class MCPServerManager {
  private servers: Map<string, {
    info: MCPServerInfo;
    connection?: MCPConnection;
    status: ServerStatus;
  }> = new Map();

  constructor(serverConfigs?: MCPServerInfo[]) {
    if (serverConfigs) {
      serverConfigs.forEach(config => this.addServer(config));
    }
  }

  addServer(info: MCPServerInfo): void {
    if (this.servers.has(info.id)) {
      throw new Error(`Server with id ${info.id} already exists`);
    }

    this.servers.set(info.id, {
      info,
      status: {
        id: info.id,
        name: info.name,
        connected: false
      }
    });

    if (info.autoConnect) {
      this.connectServer(info.id).catch(error => {
        console.error(`Failed to auto-connect server ${info.id}:`, error);
      });
    }
  }

  async connectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (server.connection?.isReady()) {
      return; // Already connected
    }

    try {
      const connection = new MCPConnection(server.info.config);
      
      connection.on('ready', (capabilities) => {
        server.status.connected = true;
        server.status.capabilities = {
          tools: capabilities.tools ? Object.keys(capabilities.tools) : undefined,
          resources: !!capabilities.resources,
          prompts: !!capabilities.prompts,
          logging: !!capabilities.logging
        };
        server.status.error = undefined;
      });

      connection.on('error', (error) => {
        server.status.error = error.message;
      });

      connection.on('close', () => {
        server.status.connected = false;
      });

      await connection.connect();
      server.connection = connection;
    } catch (error: any) {
      server.status.connected = false;
      server.status.error = error.message;
      throw error;
    }
  }

  async disconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server?.connection) {
      return;
    }

    await server.connection.disconnect();
    server.connection = undefined;
    server.status.connected = false;
  }

  removeServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server?.connection) {
      server.connection.disconnect();
    }
    this.servers.delete(serverId);
  }

  getServer(serverId: string): MCPConnection | undefined {
    return this.servers.get(serverId)?.connection;
  }

  getServerInfo(serverId: string): MCPServerInfo | undefined {
    return this.servers.get(serverId)?.info;
  }

  getServerStatus(serverId: string): ServerStatus | undefined {
    return this.servers.get(serverId)?.status;
  }

  getAllServers(): MCPServerInfo[] {
    return Array.from(this.servers.values()).map(s => s.info);
  }

  getAllStatuses(): ServerStatus[] {
    return Array.from(this.servers.values()).map(s => s.status);
  }

  getConnectedServers(): string[] {
    return Array.from(this.servers.entries())
      .filter(([_, server]) => server.status.connected)
      .map(([id]) => id);
  }

  // Tool management across all servers
  async getAllTools(): Promise<Map<string, { serverId: string; tool: Tool }>> {
    const allTools = new Map<string, { serverId: string; tool: Tool }>();

    for (const [serverId, server] of this.servers) {
      if (server.connection?.isReady()) {
        try {
          const result = await server.connection.request<{ tools: Tool[] }>('tools/list');
          
          if (result.tools) {
            for (const tool of result.tools) {
              // Prefix tool name with server id to avoid conflicts
              const qualifiedName = `${serverId}:${tool.name}`;
              allTools.set(qualifiedName, { serverId, tool });
            }
          }
        } catch (error) {
          console.error(`Failed to get tools from server ${serverId}:`, error);
        }
      }
    }

    return allTools;
  }

  // Call a tool on a specific server
  async callTool(serverId: string, toolName: string, args?: any): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server?.connection?.isReady()) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    return server.connection.request('tools/call', {
      name: toolName,
      arguments: args
    });
  }

  // Resource management
  async getAllResources(): Promise<Map<string, { serverId: string; resource: Resource }>> {
    const allResources = new Map<string, { serverId: string; resource: Resource }>();

    for (const [serverId, server] of this.servers) {
      if (server.connection?.isReady()) {
        try {
          const result = await server.connection.request<{ resources: Resource[] }>('resources/list');
          
          if (result.resources) {
            for (const resource of result.resources) {
              // Use full URI as key
              allResources.set(resource.uri, { serverId, resource });
            }
          }
        } catch (error) {
          console.error(`Failed to get resources from server ${serverId}:`, error);
        }
      }
    }

    return allResources;
  }

  async readResource(serverId: string, uri: string): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server?.connection?.isReady()) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    return server.connection.request('resources/read', { uri });
  }

  // Prompt management
  async getAllPrompts(): Promise<Map<string, { serverId: string; prompt: Prompt }>> {
    const allPrompts = new Map<string, { serverId: string; prompt: Prompt }>();

    for (const [serverId, server] of this.servers) {
      if (server.connection?.isReady()) {
        try {
          const result = await server.connection.request<{ prompts: Prompt[] }>('prompts/list');
          
          if (result.prompts) {
            for (const prompt of result.prompts) {
              // Prefix prompt name with server id
              const qualifiedName = `${serverId}:${prompt.name}`;
              allPrompts.set(qualifiedName, { serverId, prompt });
            }
          }
        } catch (error) {
          console.error(`Failed to get prompts from server ${serverId}:`, error);
        }
      }
    }

    return allPrompts;
  }

  async getPrompt(serverId: string, promptName: string, args?: any): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server?.connection?.isReady()) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    return server.connection.request('prompts/get', {
      name: promptName,
      arguments: args
    });
  }

  // Cleanup
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.servers.keys()).map(serverId => 
      this.disconnectServer(serverId).catch(err => 
        console.error(`Failed to disconnect ${serverId}:`, err)
      )
    );
    
    await Promise.all(promises);
  }
}