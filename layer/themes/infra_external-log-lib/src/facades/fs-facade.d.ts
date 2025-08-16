/**
 * File System Facade
 * Provides wrapped fs module with logging and security features
 */
import * as fsOriginal from 'fs';
import * as fsPromisesOriginal from 'fs/promises';
interface CallRecord {
    method: string;
    args: any[];
    timestamp: Date;
    result?: any;
    error?: any;
    duration: number;
}
export declare const fs: typeof fsOriginal;
export declare const fsPromises: typeof fsPromisesOriginal;
export declare const getFsCallHistory: () => CallRecord[];
export declare const clearFsCallHistory: () => void;
export declare const addBlockedPath: (path: string) => void;
export declare const removeBlockedPath: (path: string) => void;
export default fs;
//# sourceMappingURL=fs-facade.d.ts.map