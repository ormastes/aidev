import { fileAPI } from '../utils/file-api';
import { StoryReportValidator, ValidationCriteria } from './StoryReportValidator';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

/**
 * IMPORTANT: DO NOT MODIFY THIS FILE TO ADD NEW RUNNABLE COMMENT TYPES
 * 
 * To add a new runnable comment type:
 * 1. Create a new script in the scripts/runnable/ directory
 * 2. Name it according to the pattern: runnable-{comment-type}.js
 * 3. The script should accept parameters as command line arguments
 * 4. The processor will dynamically call your script when it encounters your comment type
 * 
 * Example: For <!-- runnable:generate-test-manual:input.ts,output.md -->
 * Create: scripts/runnable/runnable-generate-test-manual.js
 * 
 * The processor will execute: node scripts/runnable/runnable-generate-test-manual.js "input.ts" "output.md"
 */

export interface RunnableCommentResult {
  type: string;
  success: boolean;
  message: string;
  details?: any;
  retrospectRequired?: boolean;
}

export class RunnableCommentProcessor {
  private validators: Map<string, (params: string) => Promise<RunnableCommentResult>>;
  private storyReportValidator: StoryReportValidator;

  constructor() {
    this.storyReportValidator = new StoryReportValidator();
    this.validators = new Map();
    this.registerValidators();
  }

  private registerValidators() {
    // Register story report validation
    this.validators.set('validate-story-report', async (params: string) => {
      const parsed = StoryReportValidator.parseRunnableComment(`<!-- runnable:validate-story-report:${params} -->`);
      if (!parsed) {
        return {
          type: 'validate-story-report',
          success: false,
          message: 'Invalid runnable comment parameters',
          details: { params }
        };
      }

      const result = await this.storyReportValidator.validate(parsed.reportPath, parsed.criteria);

      return {
        type: 'validate-story-report',
        success: result.passed,
        message: result.passed 
          ? 'Story report validation passed all criteria' 
          : `Story report validation failed: ${result.errors.join(', ')}`,
        details: {
          criteria: result.criteria,
          errors: result.errors,
          suggestions: result.suggestions
        },
        retrospectRequired: result.retrospectStep?.required
      };
    });

    // Register retrospect verification
    this.validators.set('verify-retrospect', async (params: string) => {
      const [userStoryPath, retrospectPath] = params.split(',');
      
      try {
        // Check if retrospect file exists
        const retrospectExists = await fs.access(retrospectPath).then(() => true).catch(() => false);
        
        if (!retrospectExists) {
          return {
            type: 'verify-retrospect',
            success: false,
            message: `Retrospect file not found: ${retrospectPath}`,
            details: { userStoryPath, retrospectPath }
          };
        }

        // Read and validate retrospect content
        const content = await fileAPI.readFile(retrospectPath, 'utf8');
        const hasLessonsLearned = content.includes('## Lessons Learned') || content.includes('# Lessons Learned');
        const hasRuleSuggestions = content.includes('## Rule Suggestions') || content.includes('# Rule Suggestions');
        const hasKnowHowUpdates = content.includes('KNOW_HOW.md') || content.includes('know-how');

        const validSections = [];
        const missingSections = [];

        if (hasLessonsLearned) validSections.push('Lessons Learned');
        else missingSections.push('Lessons Learned');

        if (hasRuleSuggestions) validSections.push('Rule Suggestions');
        else missingSections.push('Rule Suggestions');

        if (hasKnowHowUpdates) validSections.push('Know-How Updates');
        else missingSections.push('Know-How Updates');

        const success = missingSections.length === 0;

        return {
          type: 'verify-retrospect',
          success,
          message: success 
            ? `Retrospect verification passed with sections: ${validSections.join(', ')}`
            : `Retrospect missing required sections: ${missingSections.join(', ')}`,
          details: {
            validSections,
            missingSections,
            path: retrospectPath
          }
        };

      } catch (error) {
        return {
          type: 'verify-retrospect',
          success: false,
          message: `Failed to verify retrospect: ${error.message}`,
          details: { error: error.message }
        };
      }
    });

    // Register task queue validation
    this.validators.set('validate-queue-item', async (params: string) => {
      const [queueType, itemDescription] = params.split(',', 2);
      
      // Validate based on queue type
      const validations: Record<string, () => Promise<{ valid: boolean; message: string }>> = {
        'system-test': async () => {
          // Check if system test has corresponding environment, external, and integration tests
          const hasEnvironmentTest = itemDescription.includes("environment") || itemDescription.includes('env');
          const hasExternalTest = itemDescription.includes("external") || itemDescription.includes('ext');
          const hasIntegrationTest = itemDescription.includes("integration") || itemDescription.includes('int');

          return {
            valid: hasEnvironmentTest && hasExternalTest && hasIntegrationTest,
            message: 'System test must reference environment, external, and integration test coverage'
          };
        },
        "scenario": async () => {
          // Check if scenario has research files referenced
          const hasResearch = itemDescription.includes("research") || itemDescription.includes('/research/');
          return {
            valid: hasResearch,
            message: 'Scenario must reference research files (domain/external)'
          };
        },
        'user-story': async () => {
          // Check if user story is registered in NAME_ID.vf.json
          const hasRegistration = itemDescription.includes("registered") || itemDescription.includes('NAME_ID');
          return {
            valid: hasRegistration,
            message: 'User story must be registered in NAME_ID.vf.json'
          };
        }
      };

      const validation = validations[queueType];
      if (!validation) {
        return {
          type: 'validate-queue-item',
          success: false,
          message: `Unknown queue type: ${queueType}`,
          details: { queueType, itemDescription }
        };
      }

      const result = await validation();
      return {
        type: 'validate-queue-item',
        success: result.valid,
        message: result.message,
        details: { queueType, itemDescription, valid: result.valid }
      };
    });
  }

  async processComment(comment: string): Promise<RunnableCommentResult | null> {
    const match = comment.match(/<!-- runnable:([^:]+):(.+) -->/);
    if (!match) return null;

    const [, type, params] = match;
    const validator = this.validators.get(type);

    if (!validator) {
      return {
        type,
        success: false,
        message: `Unknown runnable comment type: ${type}`,
        details: { comment }
      };
    }

    try {
      return await validator(params);
    } catch (error) {
      return {
        type,
        success: false,
        message: `Error processing runnable comment: ${error.message}`,
        details: { error: error.message, comment }
      };
    }
  }

  /**
   * Process multiple runnable comments in a file
   */
  async processFile(filePath: string): Promise<RunnableCommentResult[]> {
    try {
      const content = await fileAPI.readFile(filePath, 'utf8');
      const commentPattern = /<!-- runnable:[^>]+ -->/g;
      const comments = content.match(commentPattern) || [];
      
      const results: RunnableCommentResult[] = [];
      
      for (const comment of comments) {
        const result = await this.processComment(comment);
        if (result) {
          results.push(result);
        }
      }
      
      return results;
    } catch (error) {
      return [{
        type: 'file-processing',
        success: false,
        message: `Failed to process file: ${error.message}`,
        details: { filePath, error: error.message }
      }];
    }
  }

  /**
   * Generate runnable comments for common validations
   */
  static generateComments = {
    storyReportValidation: (
      reportPath: string,
      systemTestClassCoverage = 95,
      branchCoverage = 95,
      duplication = 10,
      fraudCheckMinScore = 90
    ) => {
      return `<!-- runnable:validate-story-report:${reportPath},${systemTestClassCoverage},${branchCoverage},${duplication},${fraudCheckMinScore} -->`;
    },

    retrospectVerification: (userStoryPath: string, retrospectPath: string) => {
      return `<!-- runnable:verify-retrospect:${userStoryPath},${retrospectPath} -->`;
    },

    queueItemValidation: (queueType: string, itemDescription: string) => {
      return `<!-- runnable:validate-queue-item:${queueType},${itemDescription} -->`;
    }
  };
}