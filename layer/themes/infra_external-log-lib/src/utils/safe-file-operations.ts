/**
 * Safe File Operations
 * 
 * Wrapper functions that check for file structure violations
 * before performing file system operations.
 */

import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';
import { FileViolationPreventer } from '../validators/FileViolationPreventer';
import { getStrictModeConfig } from '../config/strict-mode.config';
import { getFileAPI, FileType } from '../../pipe';

const fileAPI = getFileAPI();


// Singleton instance of the preventer
let preventerInstance: FileViolationPreventer | null = null;

/**
 * Get or create the FileViolationPreventer instance
 */
async function getPreventer(): FileViolationPreventer {
  if (!preventerInstance) {
    const config = getStrictModeConfig();
    preventerInstance = new FileViolationPreventer(process.cwd(), config);
    // Initialize asynchronously but don't block
    preventerInstance.initialize().catch(err => {
      console.warn('Failed to initialize FileViolationPreventer:', err);
    });
  }
  return preventerInstance;
}

/**
 * Safe write file operation
 * Checks for violations before writing
 */
export async function safeWriteFile(
  filePath: string,
  data: string | Buffer,
  options?: fs.WriteFileOptions
): Promise<void> {
  const preventer = getPreventer();
  
  try {
    await preventer.validateFileOperation('write', filePath);
    await fileAPI.createFile(filePath, data, { type: FileType.TEMPORARY });
  } catch (error) {
    if (error.name === "FileViolationError") {
      console.error(`❌ File write blocked: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

/**
 * Safe write file sync operation
 */
export function safeWriteFileSync(
  filePath: string,
  data: string | Buffer,
  options?: fs.WriteFileOptions
): void {
  const preventer = getPreventer();
  
  // Use sync validation
  preventer.validateFileOperation('write', filePath)
    .then(async () => {
      await fileAPI.createFile(filePath, data, { type: FileType.TEMPORARY });
    })
    .catch(error => {
      if (error.name === "FileViolationError") {
        console.error(`❌ File write blocked: ${error.message}`);
        throw error;
      }
      throw error;
    });
}

/**
 * Safe create directory operation
 */
export async function safeMkdir(
  dirPath: string,
  options?: fs.MakeDirectoryOptions
): Promise<void> {
  const preventer = getPreventer();
  
  try {
    await preventer.validateFileOperation('mkdir', dirPath);
    await fileAPI.createDirectory(dirPath);
  } catch (error) {
    if (error.name === "FileViolationError") {
      console.error(`❌ Directory creation blocked: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

/**
 * Safe create directory sync operation
 */
export function safeMkdirSync(
  dirPath: string,
  options?: fs.MakeDirectoryOptions
): void {
  const preventer = getPreventer();
  
  preventer.validateFileOperation('mkdir', dirPath)
    .then(async () => {
      await fileAPI.createDirectory(dirPath);
    })
    .catch(error => {
      if (error.name === "FileViolationError") {
        console.error(`❌ Directory creation blocked: ${error.message}`);
        throw error;
      }
      throw error;
    });
}

/**
 * Safe append file operation
 */
export async function safeAppendFile(
  filePath: string,
  data: string | Buffer,
  options?: fs.WriteFileOptions
): Promise<void> {
  const preventer = getPreventer();
  
  try {
    await preventer.validateFileOperation('write', filePath);
    await fileAPI.writeFile(filePath, data, { append: true });
  } catch (error) {
    if (error.name === "FileViolationError") {
      console.error(`❌ File append blocked: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

/**
 * Safe copy file operation
 */
export async function safeCopyFile(
  src: string,
  dest: string,
  flags?: number
): Promise<void> {
  const preventer = getPreventer();
  
  try {
    await preventer.validateFileOperation('create', dest);
    fs.copyFileSync(src, dest, flags);
  } catch (error) {
    if (error.name === "FileViolationError") {
      console.error(`❌ File copy blocked: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

/**
 * Safe rename operation
 */
export async function safeRename(
  oldPath: string,
  newPath: string
): Promise<void> {
  const preventer = getPreventer();
  
  try {
    await preventer.validateFileOperation('create', newPath);
    fs.renameSync(oldPath, newPath);
  } catch (error) {
    if (error.name === "FileViolationError") {
      console.error(`❌ File rename blocked: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

/**
 * Check if a path would violate structure rules
 */
export async function wouldViolate(
  operation: 'create' | 'write' | 'mkdir',
  targetPath: string
): Promise<boolean> {
  const preventer = getPreventer();
  
  try {
    await preventer.validateFileOperation(operation, targetPath);
    return false; // No violation
  } catch (error) {
    if (error.name === "FileViolationError") {
      return true; // Would violate
    }
    throw error;
  }
}

/**
 * Enable strict mode for the current session
 */
export function enableStrictMode(): void {
  const preventer = getPreventer();
  preventer.enableStrictMode();
  console.log('✅ Strict file checking enabled for external-log-lib');
}

/**
 * Disable strict mode for the current session
 */
export function disableStrictMode(): void {
  const preventer = getPreventer();
  preventer.disableStrictMode();
  console.log('ℹ️ Strict file checking disabled for external-log-lib');
}

/**
 * Get current strict mode status
 */
export function isStrictModeEnabled(): boolean {
  const preventer = getPreventer();
  return preventer.getStrictModeConfig().enabled;
}

// Export all functions as a namespace
export const SafeFileOps = {
  safeWriteFile,
  safeWriteFileSync,
  safeMkdir,
  safeMkdirSync,
  safeAppendFile,
  safeCopyFile,
  safeRename,
  wouldViolate,
  enableStrictMode,
  disableStrictMode,
  isStrictModeEnabled
};

export default SafeFileOps;