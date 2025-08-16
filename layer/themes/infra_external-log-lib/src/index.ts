/**
 * External Module Interception Library
 * Provides testable, secure wrappers for Node.js built-in modules
 * Uses Export Facade Pattern for ESM compatibility
 */

// Import original modules
import * as originalUrl from 'url';
import * as originalUtil from 'util';
import * as originalEvents from 'events';
import * as originalZlib from 'zlib';
import * as originalDns from 'dns';
import * as originalReadline from 'readline';
import * as originalVm from 'vm';
import * as originalCluster from 'cluster';
import * as originalBuffer from 'buffer';
import * as originalHttp from 'http';
import * as originalHttps from 'https';
import * as originalOs from 'os';
import * as originalCrypto from 'crypto';
import * as originalNet from 'net';
import * as originalStream from 'stream';

// Import facades
import { 
  fs, 
  fsPromises,
  getFsCallHistory,
  clearFsCallHistory,
  addBlockedPath,
  removeBlockedPath
} from './facades/fs-facade';

import { 
  path,
  getPathCallHistory,
  clearPathCallHistory
} from './facades/path-facade';

import { 
  childProcess,
  getChildProcessCallHistory,
  clearChildProcessCallHistory,
  addBlockedCommand,
  removeBlockedCommand
} from './facades/child-process-facade';

// Re-export facades
export { 
  fs, 
  fsPromises,
  path,
  childProcess,
  getFsCallHistory,
  clearFsCallHistory,
  addBlockedPath as addFsBlockedPath,
  removeBlockedPath as removeFsBlockedPath,
  getPathCallHistory,
  clearPathCallHistory,
  getChildProcessCallHistory,
  clearChildProcessCallHistory,
  addBlockedCommand,
  removeBlockedCommand
};

// Configuration
export { globalConfig, updateConfig } from './config';

// Export originals for cases where unwrapped access is needed
export const original = {
  fs: require('fs'),
  path: require('path'),
  childProcess: require('child_process'),
  http: originalHttp,
  https: originalHttps,
  os: originalOs,
  crypto: originalCrypto,
  net: originalNet,
  stream: originalStream,
  url: originalUrl,
  util: originalUtil,
  events: originalEvents,
  zlib: originalZlib,
  dns: originalDns,
  readline: originalReadline,
  vm: originalVm,
  cluster: originalCluster,
  buffer: originalBuffer
};

// Simple proxies for modules we haven't fully implemented yet
export const http = originalHttp;
export const https = originalHttps;
export const os = originalOs;
export const crypto = originalCrypto;
export const net = originalNet;
export const stream = originalStream;

// Direct exports for modules that don't need interception
export const url = originalUrl;
export const util = originalUtil;
export const events = originalEvents;
export const EventEmitter = originalEvents.EventEmitter;
export const zlib = originalZlib;
export const dns = originalDns;
export const readline = originalReadline;
export const vm = originalVm;
export const cluster = originalCluster;
export const Buffer = originalBuffer.Buffer;

// Utility function to get all call histories
export function getAllCallHistories() {
  return {
    fs: getFsCallHistory(),
    path: getPathCallHistory(),
    childProcess: getChildProcessCallHistory()
  };
}

// Utility function to clear all call histories
export function clearAllCallHistories() {
  clearFsCallHistory();
  clearPathCallHistory();
  clearChildProcessCallHistory();
}

// Export types for TypeScript
export type { Stats, Dirent, ReadStream, WriteStream } from 'fs';
export type { ChildProcess, SpawnOptions, ExecOptions } from 'child_process';
export type { IncomingMessage, ServerResponse, Server as HttpServer } from 'http';
export type { Server as HttpsServer } from 'https';
export type { Socket } from 'net';
export type { Readable, Writable, Transform, Duplex } from 'stream';
export type { InterceptionConfig } from './config';

// For backward compatibility, also export individual modules
export { fs as default } from './facades/fs-facade';

