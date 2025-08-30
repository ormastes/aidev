#!/usr/bin/env bun

/**
 * Dual-Mode MCP Server Entry Point
 * Supports both stdio (for Claude Desktop/Code) and HTTP (for remote agents)
 */

import { createUnifiedServer } from "./unified-server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "crypto";

const mode = (process.argv[2] || "stdio").toLowerCase();

console.error(`Starting filesystem-mcp server in ${mode} mode...`);

if (mode === "stdio") {
  // === STDIO MODE (Claude Desktop/Code spawns this) ===
  console.error("Initializing stdio transport...");
  
  const server = createUnifiedServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error("Server connected via stdio transport");
  
  // Note: The server blocks here on stdio - DO NOT write to stdout
  
} else if (mode === "http") {
  // === HTTP MODE (Streamable HTTP for remote access) ===
  const PORT = parseInt(process.env.PORT || "3457", 10);
  const ALLOW_ORIGINS = (process.env.MCP_ALLOW_ORIGIN || "http://localhost").split(",");
  
  console.error(`Initializing HTTP transport on port ${PORT}...`);
  console.error(`Allowed origins: ${ALLOW_ORIGINS.join(", ")}`);
  
  const app = express();
  app.use(express.json());
  
  // Security middleware: Origin validation and CORS headers
  app.use((req, res, next) => {
    const origin = req.header("Origin");
    
    if (origin && !ALLOW_ORIGINS.includes(origin)) {
      console.error(`Rejected request from forbidden origin: ${origin}`);
      return res.status(403).send("Forbidden origin");
    }
    
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    
    next();
  });
  
  // Session management
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  const server = createUnifiedServer();
  
  // Main MCP endpoint with session support
  app.all("/mcp", async (req, res) => {
    try {
      let transport: StreamableHTTPServerTransport;
      let sessionId: string;
      
      // Check for existing session
      const incomingSessionId = req.header("Mcp-Session-Id");
      
      if (incomingSessionId && sessions.has(incomingSessionId)) {
        // Reuse existing session
        sessionId = incomingSessionId;
        transport = sessions.get(incomingSessionId)!;
        console.error(`Reusing session: ${sessionId}`);
      } else {
        // Create new session
        sessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
          enableDnsRebindingProtection: true,
        });
        
        sessions.set(sessionId, transport);
        await server.connect(transport);
        
        console.error(`Created new session: ${sessionId}`);
        
        // Set session ID in response header
        res.setHeader("Mcp-Session-Id", sessionId);
        
        // Cleanup on connection close
        res.on("close", () => {
          console.error(`Cleaning up session: ${sessionId}`);
          transport.close();
          sessions.delete(sessionId);
        });
      }
      
      // Handle the request
      await transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      mode: "http",
      sessions: sessions.size,
      timestamp: new Date().toISOString(),
      runtime: typeof Bun !== "undefined" ? `Bun ${Bun.version}` : `Node ${process.version}`,
    });
  });
  
  // Session info endpoint (for debugging)
  app.get("/sessions", (req, res) => {
    res.json({
      count: sessions.size,
      ids: Array.from(sessions.keys()),
    });
  });
  
  // Start server
  const httpServer = app.listen(PORT, "127.0.0.1", () => {
    console.error(`MCP HTTP server running at http://127.0.0.1:${PORT}`);
    console.error(`Main endpoint: http://127.0.0.1:${PORT}/mcp`);
    console.error(`Health check: http://127.0.0.1:${PORT}/health`);
  });
  
  // Graceful shutdown
  process.on("SIGINT", () => {
    console.error("\nShutting down server...");
    
    // Close all sessions
    sessions.forEach((transport, id) => {
      console.error(`Closing session: ${id}`);
      transport.close();
    });
    sessions.clear();
    
    // Close HTTP server
    httpServer.close(() => {
      console.error("Server shut down gracefully");
      process.exit(0);
    });
  });
  
} else if (mode === "stateless-http") {
  // === STATELESS HTTP MODE (Simple, no session management) ===
  const PORT = parseInt(process.env.PORT || "3457", 10);
  const ALLOW_ORIGINS = (process.env.MCP_ALLOW_ORIGIN || "http://localhost").split(",");
  
  console.error(`Initializing stateless HTTP transport on port ${PORT}...`);
  
  const app = express();
  app.use(express.json());
  
  // Security middleware
  app.use((req, res, next) => {
    const origin = req.header("Origin");
    
    if (origin && !ALLOW_ORIGINS.includes(origin)) {
      return res.status(403).send("Forbidden origin");
    }
    
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    
    next();
  });
  
  // Stateless endpoint (one request = one response, no SSE)
  app.post("/mcp", async (req, res) => {
    try {
      const server = createUnifiedServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => undefined, // No sessions
        enableDnsRebindingProtection: true,
      });
      
      res.on("close", () => transport.close());
      
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      console.error("Error handling stateless request:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.listen(PORT, "127.0.0.1", () => {
    console.error(`Stateless MCP HTTP server running at http://127.0.0.1:${PORT}/mcp`);
  });
  
} else {
  console.error("Usage: bun run src/main.ts [stdio|http|stateless-http]");
  console.error("");
  console.error("Modes:");
  console.error("  stdio           - Standard I/O mode for Claude Desktop/Code");
  console.error("  http            - HTTP mode with session support (SSE capable)");
  console.error("  stateless-http  - Simple HTTP mode without sessions");
  process.exit(2);
}