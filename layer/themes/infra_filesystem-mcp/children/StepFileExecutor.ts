/**
 * StepFileExecutor - Executes step_file scripts from before_insert_steps and after_pop_steps
 */

import { spawn } from 'child_process';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';

export interface StepConfig {
  content: string;
  type: 'runnable' | 'message';
  step_file?: string;
  display?: string;
}

export interface StepExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  stepFile?: string;
}

export class StepFileExecutor {
  private stepsDir: string;

  constructor(stepsDir?: string) {
    this.stepsDir = stepsDir || this.findStepsDirectory();
  }

  /**
   * Find the llm_rules/steps directory by searching up the directory tree
   */
  private findStepsDirectory(): string {
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
   * Execute a step configuration
   */
  async executeStep(step: StepConfig, parameters: string[] = []): Promise<StepExecutionResult> {
    // Handle message type steps
    if (step.type === 'message') {
      return {
        success: true,
        output: step.content,
        stepFile: step.step_file
      };
    }

    // Handle runnable type steps
    if (step.type === 'runnable' && step.step_file) {
      return await this.executeStepFile(step.step_file, parameters);
    }

    // Try to execute content as a script name
    return await this.executeByContent(step.content, parameters);
  }

  /**
   * Execute a script by step_file name
   */
  private async executeStepFile(stepFile: string, parameters: string[]): Promise<StepExecutionResult> {
    // Try direct script name first
    let scriptPath = path.join(this.stepsDir, `${stepFile}.js`);
    
    if (!fs.existsSync(scriptPath)) {
      // Try without extension
      scriptPath = path.join(this.stepsDir, stepFile);
      
      if (!fs.existsSync(scriptPath)) {
        // Try with .py extension
        scriptPath = path.join(this.stepsDir, `${stepFile}.py`);
        
        if (!fs.existsSync(scriptPath)) {
          return {
            success: false,
            output: '',
            error: `Step file not found: ${stepFile}`,
            stepFile
          };
        }
      }
    }

    return await this.executeScript(scriptPath, parameters, stepFile);
  }

  /**
   * Execute by matching content to script name pattern
   */
  private async executeByContent(content: string, parameters: string[]): Promise<StepExecutionResult> {
    // Convert content to script name pattern
    const scriptName = content
      .toLowerCase()
      .replace(/[<>]/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_') + '.js';
    
    const scriptPath = path.join(this.stepsDir, scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      return {
        success: false,
        output: '',
        error: `No script found for content: "${content}"`,
        stepFile: scriptName
      };
    }

    return await this.executeScript(scriptPath, parameters, scriptName);
  }

  /**
   * Execute a script file
   */
  private async executeScript(scriptPath: string, parameters: string[], stepFile: string): Promise<StepExecutionResult> {
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
        // Assume it's executable
        command = scriptPath;
        args = parameters;
      }

      const child = spawn(command, args, { cwd: process.cwd() });
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
          error: error.trim() || (code !== 0 ? `Process exited with code ${code}` : undefined),
          stepFile
        });
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: `Failed to execute script: ${err.message}`,
          stepFile
        });
      });
    });
  }

  /**
   * Execute multiple steps in sequence
   */
  async executeSteps(steps: StepConfig[], parameters: string[] = []): Promise<StepExecutionResult[]> {
    const results: StepExecutionResult[] = [];
    
    for (const step of steps) {
      const result = await this.executeStep(step, parameters);
      results.push(result);
      
      // Stop on first failure if it's a runnable step
      if (step.type === 'runnable' && !result.success) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Check if a step file exists
   */
  stepFileExists(stepFile: string): boolean {
    const variations = [
      path.join(this.stepsDir, `${stepFile}.js`),
      path.join(this.stepsDir, stepFile),
      path.join(this.stepsDir, `${stepFile}.py`)
    ];
    
    return variations.some(scriptPath => fs.existsSync(scriptPath));
  }
}