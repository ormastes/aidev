/**
 * HTTP Module Wrapper
 * Provides a wrapped version of Node.js http module
 */

import * as http from 'node:http';

// Re-export all http module members
export * from 'node:http';
export { http as default };

// Export the main http object for compatibility
export const request = http.request;
export const get = http.get;
export const createServer = http.createServer;
export const IncomingMessage = http.IncomingMessage;
export const ServerResponse = http.ServerResponse;
export const Agent = http.Agent;