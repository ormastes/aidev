/**
 * Main entry point for filesystem-mcp
 */

export { FilesystemMCPServer } from './MCPServer';
export { VFFileWrapper } from '../children/VFFileWrapper';
export { VFNameIdWrapper } from '../children/VFNameIdWrapper';
export { VFTaskQueueWrapper } from '../children/VFTaskQueueWrapper';
export { VFProtectedFileWrapper } from '../children/VFProtectedFileWrapper';

// Re-export types
export type { VFFile, VFMetadata, VFSearchOptions } from '../children/types';