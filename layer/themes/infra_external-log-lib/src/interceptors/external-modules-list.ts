/**
 * List of all external Node.js modules that need interception
 * for proper testing and logging
 */

export const EXTERNAL_MODULES = {
  // File System
  fs: ['fs', 'fs/promises', 'fs-extra'],
  
  // Path operations
  path: ['path', 'path/posix', 'path/win32'],
  
  // Process management
  process: ['child_process', 'process', 'cluster', 'worker_threads'],
  
  // Network
  network: ['http', 'https', 'http2', 'net', 'dgram', 'dns', 'tls'],
  
  // Streams
  stream: ['stream', 'stream/promises', 'stream/web', 'readline'],
  
  // Crypto
  crypto: ['crypto', 'crypto/webcrypto'],
  
  // OS
  os: ['os'],
  
  // URL
  url: ['url', 'querystring'],
  
  // Compression
  compression: ['zlib'],
  
  // Utilities
  util: ['util', 'util/types'],
  
  // Events
  events: ['events'],
  
  // VM
  vm: ['vm', 'vm2'],
  
  // Timers
  timers: ['timers', 'timers/promises'],
  
  // Buffer
  buffer: ['buffer'],
  
  // Console
  console: ['console'],
  
  // Assert
  assert: ['assert'],
  
  // Performance
  perf: ['perf_hooks'],
} as const;

export type ExternalModuleCategory = keyof typeof EXTERNAL_MODULES;
export type ExternalModule = typeof EXTERNAL_MODULES[ExternalModuleCategory][number];