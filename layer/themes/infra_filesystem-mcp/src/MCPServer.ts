/**
 * MCP Server for filesystem operations
 * Provides secure access to .vf.json files via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'node:path';

// Configuration
const VF_BASE_PATH = process.env.VF_BASE_PATH || process.cwd();
const VF_EXTENSION = '.vf.json';

interface VFMetadata {
  level: string;
  path: string;
  version: string;
  created_at?: string;
  updated_at?: string;
}

interface VFFile {
  metadata: VFMetadata;
  content?: any;
  [key: string]: any;
}

export class FilesystemMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'filesystem-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_vf_file',
          description: 'Read a virtual file (.vf.json)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the .vf.json file relative to base path',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'write_vf_file',
          description: 'Write a virtual file (.vf.json)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the .vf.json file relative to base path',
              },
              content: {
                type: 'object',
                description: 'Content to write to the file',
              },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'list_vf_files',
          description: 'List all .vf.json files in a directory',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Directory path relative to base path',
              },
              recursive: {
                type: 'boolean',
                description: 'Search recursively',
                default: false,
              },
            },
            required: ["directory"],
          },
        },
        {
          name: 'delete_vf_file',
          description: 'Delete a virtual file (.vf.json)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the .vf.json file to delete',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'validate_vf_file',
          description: 'Validate a .vf.json file structure',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the .vf.json file to validate',
              },
            },
            required: ['path'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'read_vf_file':
          return await this.readVfFile(args as { path: string });
        case 'write_vf_file':
          return await this.writeVfFile(args as { path: string; content: any });
        case 'list_vf_files':
          return await this.listVfFiles(args as { directory: string; recursive?: boolean });
        case 'delete_vf_file':
          return await this.deleteVfFile(args as { path: string });
        case 'validate_vf_file':
          return await this.validateVfFile(args as { path: string });
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async readVfFile(args: { path: string }): Promise<any> {
    try {
      const filePath = args.path;
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      // Security: Ensure resolved path is within base path
      if (!fullPath.startsWith(VF_BASE_PATH)) {
        throw new Error('Path traversal detected');
      }
      
      // Ensure it's a .vf.json file
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      const content = await fileAPI.readFile(fullPath, 'utf-8');
      const parsed = JSON.parse(content);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: filePath,
              data: parsed,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        ],
      };
    }
  }

  private async writeVfFile(args: { path: string; content: any }): Promise<any> {
    try {
      const filePath = args.path;
      const content = args.content as VFFile;
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      // Security: Ensure resolved path is within base path
      if (!fullPath.startsWith(VF_BASE_PATH)) {
        throw new Error('Path traversal detected');
      }
      
      // Ensure it's a .vf.json file
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      // Ensure content has required metadata
      if (!content.metadata) {
        content.metadata = {
          level: 'user',
          path: filePath,
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        content.metadata.updated_at = new Date().toISOString();
      }

      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      await await fileAPI.createDirectory(dir);

      // Write file
      await fileAPI.writeFile(fullPath, JSON.stringify(content, null, 2));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: filePath,
              message: 'File written successfully',
            }),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        ],
      };
    }
  }

  private async listVfFiles(args: { directory: string; recursive?: boolean }): Promise<any> {
    try {
      const directory = args.directory;
      const recursive = args.recursive || false;
      const fullPath = path.join(VF_BASE_PATH, directory);
      
      // Security check
      if (!fullPath.startsWith(VF_BASE_PATH)) {
        throw new Error('Path traversal detected');
      }
      
      const files: string[] = [];

      const scanDir = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && recursive) {
            await scanDir(entryPath);
          } else if (entry.isFile() && entry.name.endsWith(VF_EXTENSION)) {
            const relativePath = path.relative(VF_BASE_PATH, entryPath);
            files.push(relativePath);
          }
        }
      };

      await scanDir(fullPath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              directory,
              files,
              count: files.length,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        ],
      };
    }
  }

  private async deleteVfFile(args: { path: string }): Promise<any> {
    try {
      const filePath = args.path;
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      // Security check
      if (!fullPath.startsWith(VF_BASE_PATH)) {
        throw new Error('Path traversal detected');
      }
      
      // Ensure it's a .vf.json file
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      await fileAPI.unlink(fullPath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: filePath,
              message: 'File deleted successfully',
            }),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        ],
      };
    }
  }

  private async validateVfFile(args: { path: string }): Promise<any> {
    try {
      const filePath = args.path;
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      // Security check
      if (!fullPath.startsWith(VF_BASE_PATH)) {
        throw new Error('Path traversal detected');
      }
      
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      const content = await fileAPI.readFile(fullPath, 'utf-8');
      const parsed = JSON.parse(content) as VFFile;

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      if (!parsed.metadata) {
        errors.push('Missing required field: metadata');
      } else {
        if (!parsed.metadata.level) {
          errors.push('Missing required field: metadata.level');
        }
        if (!parsed.metadata.path) {
          errors.push('Missing required field: metadata.path');
        }
        if (!parsed.metadata.version) {
          errors.push('Missing required field: metadata.version');
        }
      }

      // Check for common issues
      if (parsed.metadata && !parsed.metadata.created_at) {
        warnings.push('Missing recommended field: metadata.created_at');
      }
      if (parsed.metadata && !parsed.metadata.updated_at) {
        warnings.push('Missing recommended field: metadata.updated_at');
      }

      const isValid = errors.length === 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              path: filePath,
              valid: isValid,
              errors,
              warnings,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        ],
      };
    }
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP server running...');
  }
}

// Start the server if this is the main module
if (require.main === module) {
  const server = new FilesystemMCPServer();
  server.run().catch(console.error);
}