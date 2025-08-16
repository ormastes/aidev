/**
 * Essential Info Extractor
 *
 * Extracts only the most important 1-2 pieces of information from items
 * for brief logging. Full details available when detail mode is enabled.
 */
export interface EssentialInfo {
    primary: string | number;
    secondary?: string | number;
    type?: string;
}
/**
 * Extract essential info from a task queue item
 */
export declare function extractTaskEssentials(task: any): EssentialInfo;
/**
 * Extract essential info from a feature
 */
export declare function extractFeatureEssentials(feature: any): EssentialInfo;
/**
 * Extract essential info from a name ID entity
 */
export declare function extractNameIdEssentials(nameId: string, entity: any): EssentialInfo;
/**
 * Extract essential info from a file operation
 */
export declare function extractFileOperationEssentials(operation: string, filePath: string, details?: any): EssentialInfo;
/**
 * Extract essential info from a rejection
 */
export declare function extractRejectionEssentials(rejection: any): EssentialInfo;
/**
 * Format essential info for logging
 */
export declare function formatEssentialInfo(info: EssentialInfo): string;
/**
 * Generic essential extractor
 */
export declare function extractEssentials(type: string, data: any): EssentialInfo;
declare const _default: {
    extractTaskEssentials: typeof extractTaskEssentials;
    extractFeatureEssentials: typeof extractFeatureEssentials;
    extractNameIdEssentials: typeof extractNameIdEssentials;
    extractFileOperationEssentials: typeof extractFileOperationEssentials;
    extractRejectionEssentials: typeof extractRejectionEssentials;
    extractEssentials: typeof extractEssentials;
    formatEssentialInfo: typeof formatEssentialInfo;
};
export default _default;
//# sourceMappingURL=essential-info-extractor.d.ts.map