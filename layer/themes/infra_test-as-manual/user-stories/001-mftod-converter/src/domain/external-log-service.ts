/**
 * External Log Service - Captures logs from external executables and libraries
 * Inspired by _aidev implementation
 */

import { path } from '../../../../../infra_external-log-lib/src';
import { ExecutableArgUpdate, ArgChange, ExternalLogConfiguration } from './capture-types';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Common executable patterns for log enhancement
export const EXECUTABLE_LOG_PATTERNS: Record<string, any> = {
  'postgresql': {
    logArgPattern: /^(-l|--logfile)/,
    logArgTemplate: (outputPath: string) => ['-l', outputPath],
    existingArgModifier: (_oldValue: string, outputPath: string) => outputPath
  },
  'psql': {
    logArgPattern: /^(-l|--logfile)/,
    logArgTemplate: (outputPath: string) => ['-l', outputPath],
    existingArgModifier: (_oldValue: string, outputPath: string) => outputPath
  },
  'node': {
    logArgPattern: /^(--trace-warnings|--inspect)/,
    logArgTemplate: (outputPath: string) => ['--trace-warnings', '>', outputPath, '2>&1'],
    existingArgModifier: (oldValue: string, _outputPath: string) => oldValue
  },
  'python': {
    logArgPattern: /^(-v|--verbose)/,
    logArgTemplate: (outputPath: string) => ['-v', '>', outputPath, '2>&1'],
    existingArgModifier: (_oldValue: string, _outputPath: string) => '-v'
  },
  'java': {
    logArgPattern: /^-Djava\.util\.logging/,
    logArgTemplate: (outputPath: string) => [
      '-Djava.util.logging.config.file=/dev/null',
      '-Djava.util.logging.ConsoleHandler.level=ALL',
      '>',
      outputPath,
      '2>&1'
    ],
    existingArgModifier: (oldValue: string, _outputPath: string) => oldValue
  },
  'npm': {
    logArgPattern: /^(--loglevel)/,
    logArgTemplate: (outputPath: string) => ['--loglevel', 'verbose', '>', outputPath, '2>&1'],
    existingArgModifier: (_oldValue: string, _outputPath: string) => '--loglevel=verbose'
  },
  'docker': {
    logArgPattern: /^(--log-driver)/,
    logArgTemplate: (outputPath: string) => ['--log-driver', 'json-file', '--log-opt', `path=${outputPath}`],
    existingArgModifier: (oldValue: string, _outputPath: string) => oldValue
  },
  'git': {
    logArgPattern: /^(--verbose|-v)/,
    logArgTemplate: (outputPath: string) => ['--verbose', '>', outputPath, '2>&1'],
    existingArgModifier: (_oldValue: string, _outputPath: string) => '--verbose'
  }
};

// Common library logging configurations
export const COMMON_LOG_CONFIGS: Record<string, any> = {
  'vscode': {
    setup: (context: any, outputPath: string) => {
      // VSCode extension context
      if (context && context.subscriptions) {
        const channel = {
          name: 'Test Log Capture',
          append: (_value: string) => {},
          appendLine: (value: string) => {
            // Write to file instead
            const fs = require('fs');
            await fileAPI.writeFile(outputPath, `${new Date(, { append: true }).toISOString()} - ${value}\n`);
          },
          clear: () => {},
          dispose: () => {},
          hide: () => {},
          show: () => {}
        };
        
        return channel;
      }
      return undefined;
    }
  },
  'winston': {
    setup: (_logger: any, outputPath: string) => ({
      level: 'debug',
      format: 'json',
      transports: [
        { filename: outputPath, level: 'debug' }
      ]
    })
  },
  'bunyan': {
    setup: (_logger: any, outputPath: string) => ({
      name: 'test-capture',
      streams: [
        { level: 'debug', path: outputPath }
      ]
    })
  },
  'log4js': {
    setup: (_logger: any, outputPath: string) => ({
      appenders: {
        file: { type: 'file', filename: outputPath }
      },
      categories: {
        default: { appenders: ['file'], level: 'debug' }
      }
    })
  }
};

export class ExternalLogService {
  private logDirectory: string;
  private activeCaptures: Map<string, ExternalLogConfiguration> = new Map();

  constructor(logDirectory: string) {
    this.logDirectory = logDirectory;
  }

  /**
   * Update executable arguments to enable logging
   */
  async updateExecutableArgs(
    executableName: string,
    originalArgs: string[],
    scenarioName: string
  ): ExecutableArgUpdate {
    const outputPath = path.join(
      this.logDirectory,
      `${scenarioName}_${executableName}_${Date.now()}.log`
    );
    
    const changes: ArgChange[] = [];
    let updatedArgs = [...originalArgs];

    // Get executable-specific patterns
    const patterns = EXECUTABLE_LOG_PATTERNS[executableName.toLowerCase()];
    
    if (patterns) {
      // Check if logging args already exist
      const existingLogArgIndex = updatedArgs.findIndex(arg => 
        patterns.logArgPattern.test(arg)
      );

      if (existingLogArgIndex !== -1 && patterns.existingArgModifier) {
        // Modify existing log argument
        const oldValue = updatedArgs[existingLogArgIndex];
        updatedArgs[existingLogArgIndex] = patterns.existingArgModifier(oldValue, outputPath);
        changes.push({
          type: 'modify',
          index: existingLogArgIndex,
          oldValue,
          newValue: updatedArgs[existingLogArgIndex],
          description: `Modified existing log argument to output to ${outputPath}`
        });
      } else {
        // Add new log arguments
        const newArgs = patterns.logArgTemplate(outputPath);
        updatedArgs.push(...newArgs);
        newArgs.forEach((arg: string, idx: number) => {
          changes.push({
            type: 'add',
            index: originalArgs.length + idx,
            newValue: arg,
            description: `Added log argument: ${arg}`
          });
        });
      }
    } else {
      // Generic approach for unknown executables
      updatedArgs.push('>', outputPath, '2>&1');
      changes.push(
        {
          type: 'add',
          index: originalArgs.length,
          newValue: '>',
          description: 'Added stdout redirection'
        },
        {
          type: 'add',
          index: originalArgs.length + 1,
          newValue: outputPath,
          description: `Redirecting output to ${outputPath}`
        },
        {
          type: 'add',
          index: originalArgs.length + 2,
          newValue: '2>&1',
          description: 'Redirecting stderr to stdout'
        }
      );
    }

    // Track this capture
    this.activeCaptures.set(scenarioName, {
      type: 'executable',
      name: executableName,
      outputPath,
      format: 'text'
    });

    return {
      originalArgs,
      updatedArgs,
      logOutputPath: outputPath,
      changes
    };
  }

  /**
   * Configure library logging without code changes
   */
  async configureLibraryLogging(
    libraryName: string,
    libraryInstance: any,
    scenarioName: string
  ): any {
    const outputPath = path.join(
      this.logDirectory,
      `${scenarioName}_${libraryName}_${Date.now()}.log`
    );

    const config = COMMON_LOG_CONFIGS[libraryName.toLowerCase()];
    
    if (config && config.setup) {
      // Use predefined configuration
      return config.setup(libraryInstance, outputPath);
    }

    // Generic approach - wrap common log methods
    if (libraryInstance && typeof libraryInstance === 'object') {
      const logMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
      const fs = require('fs');
      
      logMethods.forEach(method => {
        if (typeof libraryInstance[method] === 'function') {
          const original = libraryInstance[method].bind(libraryInstance);
          libraryInstance[method] = (...args: any[]) => {
            const logEntry = {
              timestamp: new Date().toISOString(),
              level: method,
              message: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' ')
            };
            
            await fileAPI.writeFile(outputPath, JSON.stringify(logEntry, { append: true }) + '\n');
            return original(...args);
          };
        }
      });
    }

    // Track this capture
    this.activeCaptures.set(scenarioName, {
      type: 'library',
      name: libraryName,
      outputPath,
      format: 'json'
    });

    return libraryInstance;
  }

  /**
   * Get all active captures for a scenario
   */
  async getActiveCapturesForScenario(scenarioName: string): ExternalLogConfiguration[] {
    return Array.from(this.activeCaptures.entries())
      .filter(([key]) => key.startsWith(scenarioName))
      .map(([, config]) => config);
  }

  /**
   * Convenience methods for common tools
   */
  async preparePostgreSQLCommand(args: string[], scenarioName: string): ExecutableArgUpdate {
    return this.updateExecutableArgs('postgresql', args, scenarioName);
  }

  async prepareNodeCommand(args: string[], scenarioName: string): ExecutableArgUpdate {
    return this.updateExecutableArgs('node', args, scenarioName);
  }

  async preparePythonCommand(args: string[], scenarioName: string): ExecutableArgUpdate {
    return this.updateExecutableArgs('python', args, scenarioName);
  }

  async captureVSCodeExtensionLogs(context: any, scenarioName: string): any {
    return this.configureLibraryLogging('vscode', context, scenarioName);
  }

  async capturePostgreSQLLogs(pgClient: any, scenarioName: string): void {
    if (pgClient && pgClient.on) {
      const outputPath = path.join(
        this.logDirectory,
        `${scenarioName}_pg_queries_${Date.now()}.log`
      );
      
      const fs = require('fs');
      
      // Capture query events
      pgClient.on('query', (query: any) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'query',
          text: query.text || query,
          values: query.values
        };
        await fileAPI.writeFile(outputPath, JSON.stringify(logEntry, { append: true }) + '\n');
      });
      
      // Capture errors
      pgClient.on('error', (error: any) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'error',
          error: error.message,
          stack: error.stack
        };
        await fileAPI.writeFile(outputPath, JSON.stringify(logEntry, { append: true }) + '\n');
      });
    }
  }
}