/**
 * CommentTaskExecutor - Task executor that handles pop_comment execution
 * 
 * Integrates with llm_rules/steps scripts to execute runnable comments
 */

import { DefaultTaskExecutor } from './DefaultTaskExecutor';
import { Task, TaskExecutor } from './VFTaskQueueWrapper';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export class CommentTaskExecutor extends DefaultTaskExecutor {
  private scriptMatcher: any;
  private stepsDir: string;

  constructor(workingDirectory: string = process.cwd()) {
    super(workingDirectory);
    
    // Find the llm_rules/steps directory
    this.stepsDir = this.findStepsDirectory();
    
    // Dynamically require ScriptMatcher
    try {
      const ScriptMatcher = require(path.join(this.stepsDir, 'script-matcher.js'));
      this.scriptMatcher = new ScriptMatcher(this.stepsDir);
    } catch (error) {
      console.warn('ScriptMatcher not found, runnable comments will not work:', error);
      this.scriptMatcher = null;
    }
  }

  /**
   * Find the llm_rules/steps directory by searching up the directory tree
   */
  private async findStepsDirectory(): string {
    let currentDir = process.cwd();
    const maxLevels = 10;
    
    for (let i = 0; i < maxLevels; i++) {
      const stepsPath = path.join(currentDir, 'llm_rules', 'steps');
      if (fs.existsSync(stepsPath)) {
        return stepsPath;
      }
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root
      }
      currentDir = parentDir;
    }
    
    // Default to relative path
    return path.join(__dirname, '../../../../llm_rules/steps');
  }

  /**
   * Execute a pop_comment if it's a runnable comment
   * @param comment The pop_comment object or string
   * @returns Execution result or null if not executable
   */
  async executePopComment(comment: any): Promise<any> {
    if (!comment) {
      return null;
    }

    // Handle string comments (not runnable)
    if (typeof comment === 'string') {
      return { type: 'message', content: comment };
    }

    // Handle object comments with text and parameters
    if (typeof comment === 'object' && comment.text) {
      const { text, parameters = [] } = comment;
      
      try {
        if (!this.scriptMatcher) {
          return {
            type: 'comment',
            content: text,
            note: 'ScriptMatcher not available'
          };
        }
        
        const result = await this.scriptMatcher.execute(text, parameters);
        
        // If the script wrote to NAME_ID.vf.json, return success
        if (result.success) {
          return {
            type: 'script_executed',
            script: text,
            parameters,
            output: result.output,
            nameIdUpdated: parameters.some(p => p.includes('NAME_ID'))
          };
        } else {
          return {
            type: 'script_error',
            script: text,
            error: result.error
          };
        }
      } catch (error: any) {
        // Script not found or other error
        return {
          type: 'comment',
          content: text,
          note: 'No matching script found'
        };
      }
    }

    return null;
  }

  /**
   * Get an enhanced task executor that also handles pop_comments
   * @returns Enhanced TaskExecutor function
   */
  async getEnhancedExecutor(): TaskExecutor {
    const baseExecutor = this.getExecutor();
    
    return async (task: Task) => {
      // First execute the task normally if it's runnable
      if (task.type === 'runnable' && task.runnable) {
        return await baseExecutor(task);
      }
      
      // For non-runnable tasks, we don't execute anything
      return {
        skipped: true,
        reason: 'Task is not marked as runnable'
      };
    };
  }

  /**
   * Create a comment-aware task executor with script integration
   * @param workingDirectory Working directory for commands/scripts
   * @returns CommentTaskExecutor instance
   */
  static createWithCommentSupport(workingDirectory?: string): CommentTaskExecutor {
    const executor = new CommentTaskExecutor(workingDirectory);
    
    // Register NAME_ID update function
    executor.registerFunction('updateNameId', async (filePath: string, entity: string) => {
      const nameIdPath = path.join(executor.directory || '.', 'NAME_ID.vf.json');
      
      try {
        // Read existing NAME_ID.vf.json
        let nameIdData: any = { types: {}, indices: {} };
        if (fs.existsSync(nameIdPath)) {
          const content = await fs.promises.readFile(nameIdPath, 'utf-8');
          nameIdData = JSON.parse(content);
        }
        
        // Parse entity data
        const entityData = typeof entity === 'string' ? JSON.parse(entity) : entity;
        
        // Add to appropriate type array
        const type = entityData.type || 'other';
        if (!nameIdData.types[type]) {
          nameIdData.types[type] = [];
        }
        nameIdData.types[type].push(entityData);
        
        // Update indices
        if (!nameIdData.indices) {
          nameIdData.indices = { by_name: {}, by_namespace: {}, by_tag: {} };
        }
        
        // Index by name
        if (entityData.name) {
          nameIdData.indices.by_name[entityData.name] = entityData.id;
        }
        
        // Write back
        await fileAPI.createFile(nameIdPath, JSON.stringify(nameIdData, { type: FileType.TEMPORARY }));
        
        return `Updated NAME_ID.vf.json with entity: ${entityData.name || entityData.id}`;
      } catch (error: any) {
        throw new Error(`Failed to update NAME_ID.vf.json: ${error.message}`);
      }
    });
    
    return executor;
  }
}