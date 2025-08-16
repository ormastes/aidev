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
export function extractTaskEssentials(task: any): EssentialInfo {
  // Primary: task ID or title
  // Secondary: status or priority
  return {
    primary: task.id || task.title || 'unknown-task',
    secondary: task.status || task.priority,
    type: 'task'
  };
}

/**
 * Extract essential info from a feature
 */
export function extractFeatureEssentials(feature: any): EssentialInfo {
  // Primary: feature ID or name
  // Secondary: status or priority
  if (feature.data) {
    return {
      primary: feature.id || feature.name || 'unknown-feature',
      secondary: feature.data.status || feature.data.priority,
      type: 'feature'
    };
  }
  
  return {
    primary: feature.id || feature.name || 'unknown-feature',
    secondary: feature.status || feature.priority,
    type: 'feature'
  };
}

/**
 * Extract essential info from a name ID entity
 */
export function extractNameIdEssentials(nameId: string, entity: any): EssentialInfo {
  // Primary: name ID
  // Secondary: type or first meaningful value
  let secondary: string | number | undefined;
  
  if (entity) {
    if (typeof entity === 'object') {
      secondary = entity.type || entity.name || entity.id;
      
      // If still no secondary, get first non-metadata value
      if (!secondary) {
        const keys = Object.keys(entity).filter(k => 
          !["metadata", "createdAt", "updatedAt"].includes(k)
        );
        if (keys.length > 0) {
          secondary = entity[keys[0]];
        }
      }
    } else {
      secondary = String(entity).substring(0, 50); // Truncate if too long
    }
  }
  
  return {
    primary: nameId,
    secondary,
    type: 'entity'
  };
}

/**
 * Extract essential info from a file operation
 */
export function extractFileOperationEssentials(
  operation: string,
  filePath: string,
  details?: any
): EssentialInfo {
  // Primary: file name (not full path)
  // Secondary: operation type or size
  const fileName = filePath.split('/').pop() || filePath;
  
  return {
    primary: fileName,
    secondary: operation,
    type: 'file'
  };
}

/**
 * Extract essential info from a rejection
 */
export function extractRejectionEssentials(rejection: any): EssentialInfo {
  // Primary: rejection type or reason (truncated)
  // Secondary: path (file name only) or severity
  const primary = rejection.type || 
                 (rejection.reason ? rejection.reason.substring(0, 50) : 'unknown');
  
  let secondary: string | undefined;
  if (rejection.path) {
    secondary = rejection.path.split('/').pop();
  } else {
    secondary = rejection.severity;
  }
  
  return {
    primary,
    secondary,
    type: "rejection"
  };
}

/**
 * Format essential info for logging
 */
export function formatEssentialInfo(info: EssentialInfo): string {
  if (info.secondary !== undefined && info.secondary !== null) {
    return `${info.primary} [${info.secondary}]`;
  }
  return String(info.primary);
}

/**
 * Generic essential extractor
 */
export function extractEssentials(type: string, data: any): EssentialInfo {
  switch (type) {
    case 'task':
    case 'task_queue':
      return extractTaskEssentials(data);
      
    case 'feature':
      return extractFeatureEssentials(data);
      
    case 'name_id':
    case 'entity':
      if (typeof data === 'object' && data.nameId && data.entity) {
        return extractNameIdEssentials(data.nameId, data.entity);
      }
      return extractNameIdEssentials(data, null);
      
    case 'file':
      if (typeof data === 'object' && data.operation && data.path) {
        return extractFileOperationEssentials(data.operation, data.path, data);
      }
      return { primary: data, type: 'file' };
      
    case "rejection":
      return extractRejectionEssentials(data);
      
    default:
      // Generic extraction
      if (typeof data === 'object') {
        const primary = data.id || data.name || data.title || 
                       data.type || JSON.stringify(data).substring(0, 50);
        const secondary = data.status || data.priority || data.severity;
        return { primary, secondary, type };
      }
      return { primary: String(data).substring(0, 50), type };
  }
}

export default {
  extractTaskEssentials,
  extractFeatureEssentials,
  extractNameIdEssentials,
  extractFileOperationEssentials,
  extractRejectionEssentials,
  extractEssentials,
  formatEssentialInfo
};