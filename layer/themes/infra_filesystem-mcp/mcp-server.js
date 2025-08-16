#!/usr/bin/env node

/**
 * Legacy JavaScript MCP Server Entry Point
 * This file is kept for backwards compatibility
 * The main implementation is now in TypeScript (src/MCPServer.ts)
 */

console.error('Note: This JavaScript entry point is deprecated. Please use the TypeScript version.');
console.error('Run: bun dist/mcp-main.js (after building with: bun run build:mcp)');

// Import and run the compiled TypeScript version
require('./dist/mcp-main.js');

// Configuration
const VF_BASE_PATH = process.env.VF_BASE_PATH || process.cwd();
const VF_EXTENSION = '.vf.json';

class FilesystemMCPServer {
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

  async setupHandlers() {
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
            required: ['directory'],
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
          return this.readVfFile(args);
        case 'write_vf_file':
          return this.writeVfFile(args);
        case 'list_vf_files':
          return this.listVfFiles(args);
        case 'delete_vf_file':
          return this.deleteVfFile(args);
        case 'validate_vf_file':
          return this.validateVfFile(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async readVfFile({ path: filePath }) {
    try {
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      // Ensure it's a .vf.json file
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      const content = await fs.readFile(fullPath, 'utf-8');
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
    } catch (error) {
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

  async writeVfFile({ path: filePath, content }) {
    try {
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
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
      await fileAPI.createDirectory(dir);

      // Write file
      await fileAPI.createFile(fullPath, JSON.stringify(content, null, 2), { type: FileType.TEMPORARY });

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
    } catch (error) {
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

  async listVfFiles({ directory, recursive = false }) {
    try {
      const fullPath = path.join(VF_BASE_PATH, directory);
      const files = [];

      async function scanDir(dir) {
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
      }

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
    } catch (error) {
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

  async deleteVfFile({ path: filePath }) {
    try {
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      // Ensure it's a .vf.json file
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      await fs.unlink(fullPath);

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
    } catch (error) {
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

  async validateVfFile({ path: filePath }) {
    try {
      const fullPath = path.join(VF_BASE_PATH, filePath);
      
      if (!filePath.endsWith(VF_EXTENSION)) {
        throw new Error(`File must have ${VF_EXTENSION} extension`);
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = JSON.parse(content);

      const errors = [];
      const warnings = [];

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
    } catch (error) {
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP server running...');
  }
}

// Start the server
const server = new FilesystemMCPServer();
server.run().catch(console.error);