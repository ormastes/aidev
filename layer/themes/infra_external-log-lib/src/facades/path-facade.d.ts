/**
 * Path Facade
 * Provides wrapped path module with logging and validation
 */
import * as pathOriginal from 'path';
interface CallRecord {
    method: string;
    args: any[];
    result: any;
    timestamp: Date;
}
export declare const path: pathOriginal.PlatformPath;
export declare const getPathCallHistory: () => CallRecord[];
export declare const clearPathCallHistory: () => void;
export default path;
//# sourceMappingURL=path-facade.d.ts.map