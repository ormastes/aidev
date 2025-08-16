/**
 * RunnableCommentExecutor - Executes runnable comments with script matching
 */

import { spawn } from 'child_process';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';

export interface RunnableComment {
  text: string;
  parameters?: string[];
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

export class RunnableCommentExecutor {
  private stepsDir: string;

  constructor(stepsDir: string = path.join(__dirname, '../../../llm_rules/steps')) {
    this.stepsDir = stepsDir;
  }

  /**
   * Convert comment text to script filename
   * @param text - The runnable comment text (e.g., "write a <file>")
   * @returns The script filename (e.g., "write_a__file_.js")
   */
  textToScriptName(text: string): string {
    // Replace characters that can't be in filenames with underscores
    return text
      .replace(/[<>]/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase() + '.js';
  }

  /**
   * Find matching script for given text
   * @param text - The runnable comment text
   * @returns Full path to script or null if not found
   */
  findScript(text: string): string | null {
    const scriptName = this.textToScriptName(text);
    const scriptPath = path.join(this.stepsDir, scriptName);
    
    if (fs.existsSync(scriptPath)) {
      return scriptPath;
    }
    
    // Try with .py extension as well
    const pyScriptPath = scriptPath.replace(/\.js$/, '.py');
    if (fs.existsSync(pyScriptPath)) {
      return pyScriptPath;
    }
    
    return null;
  }

  /**
   * Execute a runnable comment
   * @param comment - The runnable comment (string or object)
   * @returns Execution result
   */
  async execute(comment: string | RunnableComment): Promise<ExecutionResult> {
    let text: string;
    let parameters: string[] = [];

    if (typeof comment === 'string') {
      text = comment;
    } else {
      text = comment.text;
      parameters = comment.parameters || [];
    }

    const scriptPath = this.findScript(text);
    
    if (!scriptPath) {
      return {
        success: false,
        output: '',
        error: `No script found for: "${text}"`
      };
    }

    return new Promise((resolve) => {
      const ext = path.extname(scriptPath);
      let command: string;
      let args: string[];
      
      if (ext === '.js') {
        command = 'node';
        args = [scriptPath, ...parameters];
      } else if (ext === '.py') {
        command = 'python3';
        args = [scriptPath, ...parameters];
      } else {
        command = scriptPath;
        args = parameters;
      }

      const child = spawn(command, args);
      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim() || (code !== 0 ? `Process exited with code ${code}` : undefined)
        });
      });
    });
  }

  /**
   * Check if a comment is runnable (has matching script)
   * @param comment - The comment to check
   * @returns true if runnable
   */
  isRunnable(comment: string | RunnableComment): boolean {
    const text = typeof comment === 'string' ? comment : comment.text;
    return this.findScript(text) !== null;
  }
}

export default RunnableCommentExecutor;