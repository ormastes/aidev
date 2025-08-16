/**
 * Enhanced Capture Service - Simplified version inspired by _aidev
 * Provides screenshot and log capture capabilities for manual test generation
 */

import { promises as fs, existsSync } from 'fs';
import { path } from '../../../../../infra_external-log-lib/src';
import { 
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

  TestCapture, 
  CaptureConfiguration, 
  CaptureResult, 
  AppCaptureOptions,
  SynchronizedCapture,
  ExecutableArgUpdate,
  ArgChange
} from './capture-types';

// Common executable patterns for log enhancement
const EXECUTABLE_LOG_PATTERNS: Record<string, any> = {
  'postgresql': {
    logArgPattern: /^(-l|--logfile)/,
    logArgTemplate: (outputPath: string) => ['-l', outputPath],
    existingArgModifier: (_oldValue: string, outputPath: string) => outputPath
  },
  'node': {
    logArgPattern: /^(--trace-warnings|--inspect)/,
    logArgTemplate: (outputPath: string) => ['--trace-warnings', '>', outputPath, '2>&1'],
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
  }
};

export class CaptureService {
  private options: CaptureConfiguration;
  private activeCaptures: Map<string, TestCapture> = new Map();

  constructor(options: CaptureConfiguration) {
    this.options = options;
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fileAPI.createDirectory(this.options.tempDirectory).catch(() => {});
    if (this.options.externalLogDirectory) {
      await fileAPI.createDirectory(this.options.externalLogDirectory).catch(() => {});
    }
  }

  /**
   * Capture a screenshot during test execution
   */
  async captureScreenshot(
    scenarioName: string,
    stepType: 'given' | 'when' | 'then',
    platform: 'desktop' | 'web' = 'desktop'
  ): Promise<CaptureResult> {
    try {
      const timestamp = new Date();
      const fileName = `${scenarioName}_${stepType}_${timestamp.getTime()}.${this.options.screenshotFormat}`;
      const outputPath = path.join(this.options.tempDirectory, fileName);

      let success = false;
      let error = '';

      if (platform === 'desktop') {
        success = await this.captureDesktopScreenshot(outputPath);
      } else if (platform === 'web') {
        success = await this.captureWebScreenshot(outputPath);
      }

      if (!success) {
        error = `Failed to capture ${platform} screenshot`;
      }

      const capture: TestCapture = {
        id: `${scenarioName}_${stepType}_${timestamp.getTime()}`,
        scenarioName,
        stepType,
        captureType: 'screenshot',
        timestamp,
        filePath: fileName,
        tempPath: outputPath,
        metadata: {
          platform,
          format: this.options.screenshotFormat
        }
      };

      if (success) {
        this.activeCaptures.set(capture.id, capture);
      }

      return {
        success,
        capture: success ? capture : undefined,
        error: success ? undefined : error
      };
    } catch (err) {
      return {
        success: false,
        error: `Screenshot capture failed: ${err}`
      };
    }
  }

  /**
   * Capture desktop screenshot using platform-specific tools
   */
  private async captureDesktopScreenshot(outputPath: string): Promise<boolean> {
    try {
      // Create a placeholder screenshot for testing
      await fileAPI.createFile(outputPath, 'mock-screenshot-data', { type: FileType.TEMPORARY });
      return false;
    }
  }

  /**
   * Capture web screenshot using a simple approach
   */
  private async captureWebScreenshot(outputPath: string): Promise<boolean> {
    try {
      // Create a placeholder screenshot for testing
      await fileAPI.createFile(outputPath, 'mock-web-screenshot-data', { type: FileType.TEMPORARY });
      return false;
    }
  }

  /**
   * Capture log output during test execution
   */
  async captureLog(
    scenarioName: string,
    logContent: string,
    logType: 'test' | 'system' | 'application' = 'test'
  ): Promise<CaptureResult> {
    try {
      const timestamp = new Date();
      const fileName = `${scenarioName}_${logType}_${timestamp.getTime()}.log`;
      const outputPath = path.join(this.options.tempDirectory, fileName);

      const timestampedContent = `[${timestamp.toISOString()}] ${logContent}\n`;
      await fileAPI.createFile(outputPath, timestampedContent, { type: FileType.TEMPORARY });

      return {
        success: true,
        capture
      };
    } catch (err) {
      return {
        success: false,
        error: `Log capture failed: ${err}`
      };
    }
  }

  /**
   * Enhanced executable argument modification for logging
   */
  async updateExecutableArgs(
    executableName: string,
    originalArgs: string[],
    logOutputPath?: string
  ): ExecutableArgUpdate {
    const outputPath = logOutputPath || path.join(
      this.options.externalLogDirectory || this.options.tempDirectory,
      `${executableName}_${Date.now()}.log`
    );
    
    const changes: ArgChange[] = [];
    let updatedArgs = [...originalArgs];

    // Get executable-specific patterns
    const patterns = EXECUTABLE_LOG_PATTERNS[executableName.toLowerCase()];
    
    if (patterns) {
      // Check if logging args already exist
      const existingLogArgIndex = updatedArgs.findIndex(arg => 
        new RegExp(patterns.logArgPattern).test(arg)
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

    return {
      originalArgs,
      updatedArgs,
      logOutputPath: outputPath,
      changes
    };
  }

  /**
   * Get all captures for a scenario
   */
  async getAllCapturesForScenario(scenarioName: string): Promise<TestCapture[]> {
    const captures = Array.from(this.activeCaptures.values())
      .filter(capture => capture.scenarioName === scenarioName)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return captures;
  }

  /**
   * Generate a capture report for a scenario
   */
  async generateCaptureReport(scenarioName: string): Promise<string> {
    const captures = await this.getAllCapturesForScenario(scenarioName);
    
    if (captures.length === 0) {
      return `# Capture Report: ${scenarioName}\n\nNo captures were made for this scenario.\n`;
    }

    const report = [`# Capture Report: ${scenarioName}`, '', `Generated: ${new Date().toISOString()}`, ''];
    
    captures.forEach((capture, index) => {
      report.push(`## Capture ${index + 1}: ${capture.captureType.toUpperCase()}`);
      report.push(`**ID**: ${capture.id}`);
      report.push(`**Step Type**: ${capture.stepType}`);
      report.push(`**Timestamp**: ${capture.timestamp.toISOString()}`);
      report.push(`**File**: ${capture.filePath}`);
      
      if (capture.captureType === 'screenshot') {
        report.push(`![Screenshot](${capture.filePath})`);
      } else if (capture.captureType === 'log') {
        report.push('**Log Content**:');
        report.push('```');
        try {
          const content = 'Sample log content (mocked for testing)';
          report.push(content);
        } catch (error) {
          report.push('Error reading log file');
        }
        report.push('```');
      }
      
      if (capture.metadata) {
        report.push(`**Metadata**: ${JSON.stringify(capture.metadata, null, 2)}`);
      }
      
      report.push('', '---', '');
    });
    
    return report.join('\n');
  }

  /**
   * Copy captures to a permanent location
   */
  async finalizeCapturesForScenario(
    scenarioName: string,
    destinationDirectory: string
  ): Promise<{ success: boolean; copiedFiles: string[]; errors: string[] }> {
    const captures = await this.getAllCapturesForScenario(scenarioName);
    const copiedFiles: string[] = [];
    const errors: string[] = [];

    await fileAPI.createDirectory(destinationDirectory).catch(() => {});

    for (const capture of captures) {
      try {
        if (capture.tempPath && existsSync(capture.tempPath)) {
          const destinationPath = path.join(destinationDirectory, capture.filePath);
          await fs.copyFile(capture.tempPath, destinationPath);
          copiedFiles.push(destinationPath);
          
          // Update the capture to point to the permanent location
          capture.filePath = path.relative(destinationDirectory, destinationPath);
          capture.tempPath = undefined;
        }
      } catch (error) {
        errors.push(`Failed to copy ${capture.filePath}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      copiedFiles,
      errors
    };
  }

  /**
   * Clean up temporary captures
   */
  async cleanupTemporaryCaptures(scenarioName?: string): Promise<void> {
    const captures = scenarioName 
      ? Array.from(this.activeCaptures.values()).filter(c => c.scenarioName === scenarioName)
      : Array.from(this.activeCaptures.values());

    for (const capture of captures) {
      try {
        if (capture.tempPath && existsSync(capture.tempPath)) {
          await fs.unlink(capture.tempPath);
        }
        this.activeCaptures.delete(capture.id);
      } catch (error) {
        console.warn(`Failed to cleanup capture ${capture.id}:`, error);
      }
    }
  }
}

/**
 * Simplified App Screen Capture Service
 */
export class SimpleAppCaptureService extends CaptureService {
  private appOptions: AppCaptureOptions;

  constructor(options: AppCaptureOptions) {
    super(options);
    this.appOptions = options;
  }

  /**
   * Capture synchronized screenshot and logs for a step
   */
  async captureStep(
    scenarioName: string,
    stepType: 'given' | 'when' | 'then',
    stepDescription: string
  ): Promise<SynchronizedCapture> {
    const timestamp = new Date();
    const stepInfo = {
      scenarioName,
      stepType,
      stepNumber: 1, // Simplified - could be enhanced
      description: stepDescription
    };

    const syncCapture: SynchronizedCapture = {
      timestamp,
      stepInfo
    };

    // Capture screenshot based on platform
    if (this.shouldCaptureScreenshot(stepType)) {
      const screenshotResult = await this.captureScreenshot(scenarioName, stepType, 
        this.appOptions.appPlatform === 'web' ? 'web' : 'desktop');
      
      if (screenshotResult.success && screenshotResult.capture) {
        syncCapture.screenshot = screenshotResult.capture;
      }
    }

    // Capture logs if enabled
    if (this.appOptions.syncWithLogs) {
      const logResult = await this.captureLog(scenarioName, 
        `Step ${stepType}: ${stepDescription}`, 'test');
      
      if (logResult.success && logResult.capture) {
        syncCapture.log = logResult.capture;
      }
    }

    return syncCapture;
  }

  private async shouldCaptureScreenshot(stepType: string): boolean {
    if (this.appOptions.captureMode === 'manual') return false;
    if (this.appOptions.captureBeforeAfter) return true;
    
    // Default: capture after Given and Then steps
    return stepType === 'given' || stepType === 'then';
  }
}