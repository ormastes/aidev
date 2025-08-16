/**
 * Audited File System
 *
 * Provides wrapped versions of Node.js fs module functions
 * with automatic auditing and validation through external-log-lib
 */
import * as fs from 'fs';
import { FileAccessAuditor } from '../file-access-auditor';
/**
 * Audited fs module - drop-in replacement for Node.js fs
 * All operations are automatically audited and validated
 */
export declare class AuditedFS {
    private auditor;
    constructor(auditor?: FileAccessAuditor);
    /**
     * Read file with auditing
     */
    readFile(filePath: string, options?: any): Promise<Buffer | string>;
    /**
     * Read file synchronously with auditing
     */
    readFileSync(filePath: string, options?: any): Buffer | string;
    /**
     * Write file with auditing and validation
     */
    writeFile(filePath: string, data: any, options?: any): Promise<void>;
    /**
     * Write file synchronously with auditing
     */
    writeFileSync(filePath: string, data: any, options?: any): void;
    /**
     * Append to file with auditing
     */
    appendFile(filePath: string, data: any, options?: any): Promise<void>;
    /**
     * Delete file with auditing
     */
    unlink(filePath: string): Promise<void>;
    /**
     * Create directory with auditing
     */
    mkdir(dirPath: string, options?: any): Promise<void>;
    /**
     * Remove directory with auditing
     */
    rmdir(dirPath: string, options?: any): Promise<void>;
    /**
     * Rename file/directory with auditing
     */
    rename(oldPath: string, newPath: string): Promise<void>;
    /**
     * Check file/directory existence with auditing
     */
    exists(filePath: string): Promise<boolean>;
    /**
     * Get file stats with auditing
     */
    stat(filePath: string): Promise<fs.Stats>;
    /**
     * Change file permissions with auditing
     */
    chmod(filePath: string, mode: number | string): Promise<void>;
    /**
     * Watch file/directory with auditing
     */
    watch(filePath: string, options?: any, listener?: any): fs.FSWatcher;
    /**
     * Create a read stream with auditing
     */
    createReadStream(filePath: string, options?: any): fs.ReadStream;
    /**
     * Create a write stream with auditing
     */
    createWriteStream(filePath: string, options?: any): fs.WriteStream;
}
export declare const auditedFS: AuditedFS;
export default auditedFS;
//# sourceMappingURL=index.d.ts.map