/**
 * Filesystem MCP Theme - Public API Gateway
 * 
 * This module exports the public interface for the filesystem_mcp theme,
 * providing virtual filesystem operations with specialized wrappers.
 */

export { VFFileWrapper, QueryParams, ParsedPath } from '../children/VFFileWrapper';
export { VFNameIdWrapper, Entity, NameIdStorage, SearchParams } from '../children/VFNameIdWrapper';
export { VFIdNameWrapper, NameIdItem, IdNameStorage } from '../children/VFIdNameWrapper';
export { VFTaskQueueWrapper, Task, QueueState, QueueStatus, TaskExecutor, RunnableConfig } from '../children/VFTaskQueueWrapper';
export { VFScenarioEntityManager, ScenarioEntity, ScenarioEntityType, ScenarioPushConfig } from '../children/VFScenarioEntityManager';
export { DefaultTaskExecutor } from '../children/DefaultTaskExecutor';
export { CommentTaskExecutor } from '../children/CommentTaskExecutor';
export { VFFileStructureWrapper, StructureNode, Template, FileStructure } from '../children/VFFileStructureWrapper';
export { VFValidatedFileWrapper } from '../children/VFValidatedFileWrapper';
export { StoryReportValidator, ValidationCriteria, ValidationResult, FileValidationDetails } from '../children/StoryReportValidator';
export { RunnableCommentProcessor, RunnableCommentResult } from '../children/RunnableCommentProcessor';
export { VFDistributedFeatureWrapper, DistributedFeature, DistributedFeatureFile, DistributedFeatureMetadata } from '../children/VFDistributedFeatureWrapper';
export { VFSearchWrapper, SearchCriteria, SearchResult, SearchResponse } from '../children/VFSearchWrapper';
export { 
  FeatureStatusManager, 
  StatusChangeValidation, 
  CoverageReport, 
  DuplicationReport, 
  UserStoryReport,
  FeatureUpdateRequest,
  StatusTransitionRule 
} from '../children/FeatureStatusManager';
export { 
  VFProtectedFileWrapper, 
  ProtectionConfig, 
  AuditEntry 
} from '../children/VFProtectedFileWrapper';
export { 
  ProtectedMCPServer, 
  ProtectedMCPConfig 
} from '../src/ProtectedMCPServer';

// Re-export wrapper classes for convenience
import { VFFileWrapper } from '../children/VFFileWrapper';
import { VFNameIdWrapper } from '../children/VFNameIdWrapper';
import { VFIdNameWrapper } from '../children/VFIdNameWrapper';
import { VFTaskQueueWrapper } from '../children/VFTaskQueueWrapper';
import { VFScenarioEntityManager } from '../children/VFScenarioEntityManager';
import { DefaultTaskExecutor } from '../children/DefaultTaskExecutor';
import { CommentTaskExecutor } from '../children/CommentTaskExecutor';
import { VFFileStructureWrapper } from '../children/VFFileStructureWrapper';
import { VFValidatedFileWrapper } from '../children/VFValidatedFileWrapper';
import { StoryReportValidator } from '../children/StoryReportValidator';
import { RunnableCommentProcessor } from '../children/RunnableCommentProcessor';
import { VFDistributedFeatureWrapper } from '../children/VFDistributedFeatureWrapper';
import { VFSearchWrapper } from '../children/VFSearchWrapper';
import { FeatureStatusManager } from '../children/FeatureStatusManager';
import { VFProtectedFileWrapper } from '../children/VFProtectedFileWrapper';
import { ProtectedMCPServer } from '../src/ProtectedMCPServer';

/**
 * Factory functions for creating wrapper instances
 */
export const createFileWrapper = (basePath?: string): VFFileWrapper => {
  return new VFFileWrapper(basePath || '');
};

export const createNameIdWrapper = (basePath?: string, schemaPath?: string): VFNameIdWrapper => {
  return new VFNameIdWrapper(basePath || '', schemaPath);
};

export const createIdNameWrapper = (basePath?: string): VFIdNameWrapper => {
  return new VFIdNameWrapper(basePath || '');
};

export const createTaskQueueWrapper = (basePath?: string, taskExecutor?: any): VFTaskQueueWrapper => {
  return new VFTaskQueueWrapper(basePath || '', taskExecutor);
};

export const createDefaultTaskExecutor = (workingDirectory?: string): DefaultTaskExecutor => {
  return DefaultTaskExecutor.createDefault(workingDirectory);
};

export const createScenarioEntityManager = (): VFScenarioEntityManager => {
  return new VFScenarioEntityManager();
};

export const createFileStructureWrapper = (basePath?: string): VFFileStructureWrapper => {
  return new VFFileStructureWrapper(basePath || '');
};

export const createValidatedFileWrapper = (basePath?: string, structureFile?: string): VFValidatedFileWrapper => {
  return new VFValidatedFileWrapper(basePath || '', structureFile);
};

export const createStoryReportValidator = (): StoryReportValidator => {
  return new StoryReportValidator();
};

export const createRunnableCommentProcessor = (): RunnableCommentProcessor => {
  return new RunnableCommentProcessor();
};

export const createDistributedFeatureWrapper = (basePath?: string, schemaPath?: string): VFDistributedFeatureWrapper => {
  return new VFDistributedFeatureWrapper(basePath || '', schemaPath);
};

export const createSearchWrapper = (basePath?: string): VFSearchWrapper => {
  return new VFSearchWrapper(basePath || '');
};

export const createFeatureStatusManager = (basePath?: string, enableProtection?: boolean): FeatureStatusManager => {
  return new FeatureStatusManager(basePath || '', enableProtection);
};

export const createProtectedFileWrapper = (basePath?: string, config?: any): VFProtectedFileWrapper => {
  return new VFProtectedFileWrapper(basePath || '', config);
};

export const createProtectedMCPServer = (config: any): ProtectedMCPServer => {
  return new ProtectedMCPServer(config);
};


/**
 * Convenience functions for creating runnable comments
 */
export const RunnableComments = {
  /**
   * Create a runnable comment for story report validation
   * @param reportPath Path to the story report JSON file
   * @param systemTestClassCoverage Minimum required system test class coverage (default: 95)
   * @param branchCoverage Minimum required branch coverage (default: 95)
   * @param duplication Maximum allowed duplication percentage (default: 10)
   * @param fraudCheckMinScore Minimum required fraud check score (default: 90)
   */
  storyReportValidation: (
    reportPath: string,
    systemTestClassCoverage = 95,
    branchCoverage = 95,
    duplication = 10,
    fraudCheckMinScore = 90
  ) => {
    return `<!-- runnable:validate-story-report:${reportPath},${systemTestClassCoverage},${branchCoverage},${duplication},${fraudCheckMinScore} -->`;
  },

  /**
   * Create a runnable comment for retrospect verification
   * @param userStoryPath Path to the user story
   * @param retrospectPath Path to the retrospect file
   */
  retrospectVerification: (userStoryPath: string, retrospectPath: string) => {
    return `<!-- runnable:verify-retrospect:${userStoryPath},${retrospectPath} -->`;
  },

  /**
   * Create a runnable comment for queue item validation
   * @param queueType Type of queue (system-test, scenario, user-story)
   * @param itemDescription Description of the queue item
   */
  queueItemValidation: (queueType: string, itemDescription: string) => {
    return `<!-- runnable:validate-queue-item:${queueType},${itemDescription} -->`;
  }
};

/**
 * Default export with all wrapper classes
 */
export default {
  VFFileWrapper,
  VFNameIdWrapper,
  VFIdNameWrapper,
  VFTaskQueueWrapper,
  VFScenarioEntityManager,
  DefaultTaskExecutor,
  VFFileStructureWrapper,
  VFValidatedFileWrapper,
  StoryReportValidator,
  RunnableCommentProcessor,
  VFDistributedFeatureWrapper,
  VFSearchWrapper,
  FeatureStatusManager,
  VFProtectedFileWrapper,
  ProtectedMCPServer,
  createFileWrapper,
  createNameIdWrapper,
  createIdNameWrapper,
  createTaskQueueWrapper,
  createScenarioEntityManager,
  createDefaultTaskExecutor,
  createFileStructureWrapper,
  createValidatedFileWrapper,
  createStoryReportValidator,
  createRunnableCommentProcessor,
  createDistributedFeatureWrapper,
  createSearchWrapper,
  createFeatureStatusManager,
  createProtectedFileWrapper,
  createProtectedMCPServer,
  RunnableComments
};