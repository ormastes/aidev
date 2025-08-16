/**
 * Child Process Facade
 * Provides wrapped child_process module with security and logging
 */
import * as childProcessOriginal from 'child_process';
interface CallRecord {
    method: string;
    command: string;
    args?: any[];
    timestamp: Date;
    pid?: number;
    error?: any;
}
export declare const childProcess: typeof childProcessOriginal;
export declare const getChildProcessCallHistory: () => CallRecord[];
export declare const clearChildProcessCallHistory: () => void;
export declare const addBlockedCommand: (cmd: string) => void;
export declare const removeBlockedCommand: (cmd: string) => void;
export default childProcess;
//# sourceMappingURL=child-process-facade.d.ts.map