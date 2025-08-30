/**
 * Unified MCP Server Definition
 * Shared server logic for both stdio and HTTP transports
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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

export function createUnifiedServer() {
  const server = new McpServer({
    name: "filesystem-mcp-unified",
    version: "2.0.0",
  });

  // Tool: Read VF File
  server.registerTool(
    "read_vf_file",
    {
      title: "Read VF File",
      description: "Read a virtual file (.vf.json)",
      inputSchema: {
        path: z.string().describe("Path to the .vf.json file relative to base path"),
      },
    },
    async ({ path: filePath }) => {
      try {
        const fullPath = path.join(VF_BASE_PATH, filePath);
        
        // Security check: ensure path doesn't escape base directory
        if (!fullPath.startsWith(VF_BASE_PATH)) {
          throw new Error("Path traversal attempt detected");
        }
        
        // Ensure file has .vf.json extension
        if (!fullPath.endsWith(VF_EXTENSION)) {
          throw new Error("File must have .vf.json extension");
        }
        
        const content = await fs.readFile(fullPath, 'utf-8');
        const parsedContent = JSON.parse(content);
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(parsedContent, null, 2) 
          }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}` 
          }],
        };
      }
    }
  );

  // Tool: Write VF File
  server.registerTool(
    "write_vf_file",
    {
      title: "Write VF File",
      description: "Write a virtual file (.vf.json)",
      inputSchema: {
        path: z.string().describe("Path to the .vf.json file relative to base path"),
        content: z.object({}).passthrough().describe("Content to write to the file"),
      },
    },
    async ({ path: filePath, content }) => {
      try {
        const fullPath = path.join(VF_BASE_PATH, filePath);
        
        // Security check
        if (!fullPath.startsWith(VF_BASE_PATH)) {
          throw new Error("Path traversal attempt detected");
        }
        
        // Ensure file has .vf.json extension
        if (!fullPath.endsWith(VF_EXTENSION)) {
          throw new Error("File must have .vf.json extension");
        }
        
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        
        // Add metadata if not present
        const fileContent: VFFile = {
          metadata: {
            level: content.metadata?.level || "1",
            path: filePath,
            version: content.metadata?.version || "1.0.0",
            updated_at: new Date().toISOString(),
          },
          ...content,
        };
        
        await fs.writeFile(fullPath, JSON.stringify(fileContent, null, 2));
        
        return {
          content: [{ 
            type: "text", 
            text: `Successfully wrote file: ${filePath}` 
          }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error writing file: ${error instanceof Error ? error.message : String(error)}` 
          }],
        };
      }
    }
  );

  // Tool: List VF Files
  server.registerTool(
    "list_vf_files",
    {
      title: "List VF Files",
      description: "List all .vf.json files in a directory",
      inputSchema: {
        directory: z.string().default(".").describe("Directory path relative to base path"),
        recursive: z.boolean().default(false).describe("Search recursively"),
      },
    },
    async ({ directory, recursive }) => {
      try {
        const fullPath = path.join(VF_BASE_PATH, directory);
        
        // Security check
        if (!fullPath.startsWith(VF_BASE_PATH)) {
          throw new Error("Path traversal attempt detected");
        }
        
        const files: string[] = [];
        
        async function scanDirectory(dir: string): Promise<void> {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && recursive) {
              await scanDirectory(entryPath);
            } else if (entry.isFile() && entry.name.endsWith(VF_EXTENSION)) {
              const relativePath = path.relative(VF_BASE_PATH, entryPath);
              files.push(relativePath);
            }
          }
        }
        
        await scanDirectory(fullPath);
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(files, null, 2) 
          }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error listing files: ${error instanceof Error ? error.message : String(error)}` 
          }],
        };
      }
    }
  );

  // Tool: Delete VF File
  server.registerTool(
    "delete_vf_file",
    {
      title: "Delete VF File",
      description: "Delete a virtual file (.vf.json)",
      inputSchema: {
        path: z.string().describe("Path to the .vf.json file relative to base path"),
      },
    },
    async ({ path: filePath }) => {
      try {
        const fullPath = path.join(VF_BASE_PATH, filePath);
        
        // Security check
        if (!fullPath.startsWith(VF_BASE_PATH)) {
          throw new Error("Path traversal attempt detected");
        }
        
        // Ensure file has .vf.json extension
        if (!fullPath.endsWith(VF_EXTENSION)) {
          throw new Error("File must have .vf.json extension");
        }
        
        await fs.unlink(fullPath);
        
        return {
          content: [{ 
            type: "text", 
            text: `Successfully deleted file: ${filePath}` 
          }],
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error deleting file: ${error instanceof Error ? error.message : String(error)}` 
          }],
        };
      }
    }
  );

  // Bun-specific tool: Run Command
  if (typeof Bun !== "undefined") {
    server.registerTool(
      "run_command",
      {
        title: "Run Command",
        description: "Run a local command with Bun.spawn",
        inputSchema: {
          cmd: z.string().describe("Command to execute"),
          args: z.array(z.string()).default([]).describe("Command arguments"),
          cwd: z.string().optional().describe("Working directory"),
        },
      },
      async ({ cmd, args, cwd }) => {
        try {
          const proc = Bun.spawn({
            cmd: [cmd, ...args],
            stdout: "pipe",
            stderr: "pipe",
            cwd: cwd || VF_BASE_PATH,
          });
          
          const [stdout, stderr] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
          ]);
          
          const exitCode = await proc.exited;
          
          return {
            content: [{ 
              type: "text", 
              text: `Exit code: ${exitCode}\n\nStdout:\n${stdout}\n\nStderr:\n${stderr}` 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error running command: ${error instanceof Error ? error.message : String(error)}` 
            }],
          };
        }
      }
    );
  }

  // Dynamic Resource: System Info
  server.registerResource(
    "system_info",
    new ResourceTemplate("system://{info_type}", { list: undefined }),
    { 
      title: "System Information", 
      description: "Get system information" 
    },
    async (uri, { info_type }) => {
      const info: Record<string, any> = {
        runtime: typeof Bun !== "undefined" ? `Bun ${Bun.version}` : `Node ${process.version}`,
        platform: process.platform,
        arch: process.arch,
        base_path: VF_BASE_PATH,
        timestamp: new Date().toISOString(),
      };
      
      const content = info_type && info_type in info 
        ? `${info_type}: ${info[info_type]}`
        : JSON.stringify(info, null, 2);
      
      return {
        contents: [{ 
          uri: uri.href, 
          text: content 
        }],
      };
    }
  );

  return server;
}