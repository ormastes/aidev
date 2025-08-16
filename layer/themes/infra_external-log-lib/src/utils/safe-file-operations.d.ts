/**
 * Safe File Operations
 *
 * Wrapper functions that check for file structure violations
 * before performing file system operations.
 */
import * as fs from 'fs';
/**
 * Safe write file operation
 * Checks for violations before writing
 */
export declare function safeWriteFile(filePath: string, data: string | Buffer, options?: fs.WriteFileOptions): Promise<void>;
/**
 * Safe write file sync operation
 */
export declare function safeWriteFileSync(filePath: string, data: string | Buffer, options?: fs.WriteFileOptions): void;
/**
 * Safe create directory operation
 */
export declare function safeMkdir(dirPath: string, options?: fs.MakeDirectoryOptions): Promise<void>;
/**
 * Safe create directory sync operation
 */
export declare function safeMkdirSync(dirPath: string, options?: fs.MakeDirectoryOptions): void;
/**
 * Safe append file operation
 */
export declare function safeAppendFile(filePath: string, data: string | Buffer, options?: fs.WriteFileOptions): Promise<void>;
/**
 * Safe copy file operation
 */
export declare function safeCopyFile(src: string, dest: string, flags?: number): Promise<void>;
/**
 * Safe rename operation
 */
export declare function safeRename(oldPath: string, newPath: string): Promise<void>;
/**
 * Check if a path would violate structure rules
 */
export declare function wouldViolate(operation: 'create' | 'write' | 'mkdir', targetPath: string): Promise<boolean>;
/**
 * Enable strict mode for the current session
 */
export declare function enableStrictMode(): void;
/**
 * Disable strict mode for the current session
 */
export declare function disableStrictMode(): void;
/**
 * Get current strict mode status
 */
export declare function isStrictModeEnabled(): boolean;
export declare const SafeFileOps: {
    safeWriteFile: typeof safeWriteFile;
    safeWriteFileSync: typeof safeWriteFileSync;
    safeMkdir: typeof safeMkdir;
    safeMkdirSync: typeof safeMkdirSync;
    safeAppendFile: typeof safeAppendFile;
    safeCopyFile: typeof safeCopyFile;
    safeRename: typeof safeRename;
    wouldViolate: typeof wouldViolate;
    enableStrictMode: typeof enableStrictMode;
    disableStrictMode: typeof disableStrictMode;
    isStrictModeEnabled: typeof isStrictModeEnabled;
};
export default SafeFileOps;
//# sourceMappingURL=safe-file-operations.d.ts.map