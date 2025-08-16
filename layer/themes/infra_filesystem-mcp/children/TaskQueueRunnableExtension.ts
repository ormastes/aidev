import { fileAPI } from '../utils/file-api';
import { RunnableCommentProcessor } from './RunnableCommentProcessor';
import { StoryReportValidator } from './StoryReportValidator';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

export interface TaskQueueStep {
  type: 'before_insert' | 'after_pop';
  action: string;
  params: any;
  condition?: 'always' | 'seldom' | { count: number };
}

export interface TaskQueueValidation {
  queueName: string;
  itemPattern?: RegExp;
  validations: {
    type: string;
    check: (item: string) => Promise<{ valid: boolean; message: string }>;
  }[];
  steps?: TaskQueueStep[];
}

export class TaskQueueRunnableExtension {
  private processor: RunnableCommentProcessor;
  private validator: StoryReportValidator;
  private validations: Map<string, TaskQueueValidation>;

  constructor() {
    this.processor = new RunnableCommentProcessor();
    this.validator = new StoryReportValidator();
    this.validations = new Map();
    this.registerValidations();
  }

  private registerValidations() {
    // System Test Queue validations
    this.validations.set('system-test', {
      queueName: 'System Tests Implement Queue',
      itemPattern: /system\s*test|stest/i,
      validations: [
        {
          type: 'child-items',
          check: async (item: string) => {
            const hasEnv = /environment|env/i.test(item);
            const hasExt = /external|ext/i.test(item);
            const hasInt = /integration|int/i.test(item);
            
            if (!hasEnv || !hasExt || !hasInt) {
              return {
                valid: false,
                message: 'System test must reference matching Environment, External, and Integration tests'
              };
            }
            return { valid: true, message: 'Has required test coverage' };
          }
        }
      ],
      steps: [
        {
          type: 'before_insert',
          action: 'validate-test-coverage',
          params: { required: ["environment", "external", "integration"] }
        },
        {
          type: 'after_pop',
          action: 'show-test-requirements',
          params: { message: 'Remember to implement Environment, External, and Integration tests first' },
          condition: 'always'
        }
      ]
    });

    // Scenario Queue validations
    this.validations.set("scenario", {
      queueName: 'Scenarios Queue',
      itemPattern: /scenario/i,
      validations: [
        {
          type: 'research-files',
          check: async (item: string) => {
            const hasResearch = /research|\/research\//i.test(item);
            if (!hasResearch) {
              return {
                valid: false,
                message: 'Scenario must have associated research files in /research/(domain|external)'
              };
            }
            return { valid: true, message: 'Has research documentation' };
          }
        }
      ],
      steps: [
        {
          type: 'before_insert',
          action: 'check-research-files',
          params: { paths: ['/research/domain', '/research/external'] }
        }
      ]
    });

    // User Story Queue validations
    this.validations.set('user-story', {
      queueName: 'User Story Queue',
      itemPattern: /user\s*story|as\s+a\s+developer/i,
      validations: [
        {
          type: 'name-id-registration',
          check: async (item: string) => {
            // Extract story ID from item
            const idMatch = item.match(/\b(\d{3}-\w+)\b/);
            if (idMatch) {
              const storyId = idMatch[1];
              // Check if registered in NAME_ID.vf.json
              try {
                const nameIdPath = path.join(process.cwd(), 'NAME_ID.vf.json');
                const content = await fileAPI.readFile(nameIdPath, 'utf8');
                const nameId = JSON.parse(content);
                
                if (nameId.entities && nameId.entities[storyId]) {
                  return { valid: true, message: 'Story registered in NAME_ID' };
                }
              } catch (error) {
                // File not found or parse error
              }
            }
            return {
              valid: false,
              message: 'User story must be registered in NAME_ID.vf.json before processing'
            };
          }
        }
      ],
      steps: [
        {
          type: 'before_insert',
          action: 'register-story',
          params: { file: 'NAME_ID.vf.json' }
        }
      ]
    });

    // Retrospective Queue validations
    this.validations.set("retrospective", {
      queueName: 'Retrospective Queue',
      itemPattern: /retrospect/i,
      validations: [
        {
          type: 'story-report-exists',
          check: async (item: string) => {
            // Check if story report exists
            const storyMatch = item.match(/story[_-]report[_-](\d+)\.json/i);
            if (storyMatch) {
              const reportPath = storyMatch[0];
              try {
                await fs.access(reportPath);
                return { valid: true, message: 'Story report exists' };
              } catch {
                return {
                  valid: false,
                  message: 'Story report must exist before retrospective'
                };
              }
            }
            return { valid: true, message: 'No specific report required' };
          }
        }
      ],
      steps: [
        {
          type: 'after_pop',
          action: 'validate-story-report',
          params: {
            criteria: {
              systemTestClassCoverage: 95,
              branchCoverage: 95,
              duplication: 10,
              fraudCheckMinScore: 90
            }
          },
          condition: { count: 1 } // Only on first retrospective
        },
        {
          type: 'after_pop',
          action: 'create-retrospect-template',
          params: {
            sections: ['Lessons Learned', 'Rule Suggestions', 'Know-How Updates']
          },
          condition: 'always'
        }
      ]
    });
  }

  /**
   * Process queue item with validations
   */
  async validateQueueItem(
    queueType: string,
    item: string
  ): Promise<{ valid: boolean; errors: string[]; suggestions: string[] }> {
    const validation = this.validations.get(queueType);
    if (!validation) {
      return {
        valid: false,
        errors: [`Unknown queue type: ${queueType}`],
        suggestions: ['Use one of: system-test, scenario, user-story, retrospective']
      };
    }

    const errors: string[] = [];
    const suggestions: string[] = [];
    let valid = true;

    // Run all validations
    for (const val of validation.validations) {
      const result = await val.check(item);
      if (!result.valid) {
        valid = false;
        errors.push(`[${val.type}] ${result.message}`);
      }
    }

    // Add suggestions based on queue type
    if (!valid) {
      switch (queueType) {
        case 'system-test':
          suggestions.push('Ensure your system test references all required test types');
          suggestions.push('Example: "System test for login flow (env, ext, int tests included)"');
          break;
        case "scenario":
          suggestions.push('Add research reference: "Scenario: Login flow - research/domain/auth.md"');
          break;
        case 'user-story':
          suggestions.push('Register story in NAME_ID.vf.json first');
          suggestions.push('Use format: "001-story-name" for story IDs');
          break;
      }
    }

    return { valid, errors, suggestions };
  }

  /**
   * Execute queue steps (before_insert or after_pop)
   */
  async executeQueueSteps(
    queueType: string,
    stepType: 'before_insert' | 'after_pop',
    item: string,
    context?: any
  ): Promise<{ success: boolean; messages: string[] }> {
    const validation = this.validations.get(queueType);
    if (!validation || !validation.steps) {
      return { success: true, messages: [] };
    }

    const messages: string[] = [];
    let success = true;

    const steps = validation.steps.filter(s => s.type === stepType);
    
    for (const step of steps) {
      // Check condition
      if (step.condition) {
        if (step.condition === 'seldom' && Math.random() > 0.2) continue;
        if (typeof step.condition === 'object' && step.condition.count) {
          const count = context?.executionCount || 0;
          if (count !== step.condition.count) continue;
        }
      }

      // Execute action
      switch (step.action) {
        case 'validate-test-coverage':
          const coverageResult = await this.validateQueueItem(queueType, item);
          if (!coverageResult.valid) {
            success = false;
            messages.push(...coverageResult.errors);
          }
          break;

        case 'show-test-requirements':
          messages.push(step.params.message);
          break;

        case 'validate-story-report':
          if (context?.reportPath) {
            const result = await this.validator.validate(
              context.reportPath,
              step.params.criteria
            );
            if (!result.passed) {
              messages.push('Story report validation failed:');
              messages.push(...result.errors);
              messages.push('Suggestions:');
              messages.push(...result.suggestions);
            }
          }
          break;

        case 'create-retrospect-template':
          messages.push('Retrospect template sections:');
          step.params.sections.forEach((section: string) => {
            messages.push(`- ${section}`);
          });
          break;
      }
    }

    return { success, messages };
  }

  /**
   * Generate queue item with runnable comment
   */
  generateQueueItem(
    queueType: string,
    description: string,
    options?: {
      reportPath?: string;
      criteria?: any;
    }
  ): string {
    let item = description;

    // Add runnable comment based on queue type
    switch (queueType) {
      case "retrospective":
        if (options?.reportPath && options?.criteria) {
          const comment = this.processor.constructor.generateComments.storyReportValidation(
            options.reportPath,
            options.criteria.systemTestClassCoverage,
            options.criteria.branchCoverage,
            options.criteria.duplication,
            options.criteria.fraudCheckMinScore
          );
          item = `${description}\n${comment}`;
        }
        break;

      case 'system-test':
        const validateComment = this.processor.constructor.generateComments.queueItemValidation(
          queueType,
          description
        );
        item = `${description}\n${validateComment}`;
        break;
    }

    return item;
  }
}