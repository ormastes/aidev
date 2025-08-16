/**
 * Interceptor for child_process module
 * Monitors and controls process spawning
 */

import * as childProcess from 'child_process';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class ChildProcessInterceptor extends BaseInterceptor<typeof childProcess> {
  private readonly dangerousCommands = [
    'rm', 'del', 'format', 'dd', 'mkfs',
    'curl', 'wget', 'nc', 'netcat',
    'eval', 'exec', 'sh', 'bash', 'cmd', 'powershell'
  ];
  
  constructor(config = {}) {
    super('child_process', childProcess, config);
  }
  
  protected createInterceptor(): typeof childProcess {
    const self = this;
    
    return {
      ...this.originalModule,
      
      exec: this.wrapMethod('child_process', 'exec', this.originalModule.exec),
      execSync: this.wrapMethod('child_process', 'execSync', this.originalModule.execSync),
      execFile: this.wrapMethod('child_process', 'execFile', this.originalModule.execFile),
      execFileSync: this.wrapMethod('child_process', 'execFileSync', this.originalModule.execFileSync),
      spawn: this.wrapMethod('child_process', 'spawn', this.originalModule.spawn),
      spawnSync: this.wrapMethod('child_process', 'spawnSync', this.originalModule.spawnSync),
      fork: this.wrapMethod('child_process', 'fork', this.originalModule.fork),
      
      // Keep other properties
      ChildProcess: this.originalModule.ChildProcess,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    // Check if command is dangerous
    const command = this.extractCommand(info);
    
    if (this.config.blockDangerous && this.isDangerousCommand(command)) {
      return {
        allowed: false,
        reason: `Dangerous command blocked: ${command}`
      };
    }
    
    // Check for shell injection attempts
    if (this.hasShellInjection(command)) {
      return {
        allowed: false,
        reason: 'Potential shell injection detected'
      };
    }
    
    return { allowed: true };
  }
  
  private extractCommand(info: CallInfo): string {
    if (info.method === 'exec' || info.method === 'execSync') {
      return info.args[0] || '';
    }
    if (info.method === 'spawn' || info.method === 'spawnSync' || 
        info.method === 'execFile' || info.method === 'execFileSync') {
      return info.args[0] || '';
    }
    if (info.method === 'fork') {
      return info.args[0] || '';
    }
    return '';
  }
  
  private isDangerousCommand(command: string): boolean {
    const cmd = command.toLowerCase().trim();
    return this.dangerousCommands.some(dangerous => 
      cmd.startsWith(dangerous) || cmd.includes(`/${dangerous}`) || cmd.includes(`\\${dangerous}`)
    );
  }
  
  private hasShellInjection(command: string): boolean {
    // Check for common injection patterns
    const injectionPatterns = [
      /[;&|]/,  // Command chaining
      /\$\(/,   // Command substitution
      /`/,      // Backtick substitution
      />/,      // Redirection
      /</, // Input redirection
      /\|\|/,   // OR operator
      /&&/,     // AND operator
    ];
    
    return injectionPatterns.some(pattern => pattern.test(command));
  }
}