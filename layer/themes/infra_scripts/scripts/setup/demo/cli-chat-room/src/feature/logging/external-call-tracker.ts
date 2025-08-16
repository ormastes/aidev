/**
 * External Call Tracker
 * Tracks all external API calls with function names for traceability
 */

import { EventEmitter } from '../../../../../../../../infra_external-log-lib/src';

export interface ExternalCall {
  functionName: string;
  timestamp: Date;
  duration: number;
  args: any[];
  result?: any;
  error?: any;
  testName?: string;
  storyId?: string;
  stackTrace?: string;
}

export interface ExternalCallStats {
  functionName: string;
  totalCalls: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  testCoverage: Set<string>;
}

export class ExternalCallTracker extends EventEmitter {
  private calls: ExternalCall[] = [];
  private currentTest: string | null = null;
  private currentStory: string | null = null;
  private enabled = false;

  /**
   * Enable external call tracking
   */
  enable(): void {
    this.enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable external call tracking
   */
  disable(): void {
    this.enabled = false;
    this.emit('disabled');
  }

  /**
   * Set current test context
   */
  setTestContext(testName: string, storyId?: string): void {
    this.currentTest = testName;
    this.currentStory = storyId || this.extractStoryId(testName);
  }

  /**
   * Clear test context
   */
  clearTestContext(): void {
    this.currentTest = null;
    this.currentStory = null;
  }

  /**
   * Extract story ID from test name following naming convention
   */
  private extractStoryId(testName: string): string | null {
    // Pattern: test_US001_SD001_scenario
    const match = testName.match(/test_(US\d+)_/);
    return match ? match[1] : null;
  }

  /**
   * Track an external function call
   */
  track<T>(functionName: string, fn: (...args: any[]) => T): (...args: any[]) => T {
    const tracker = this;
    
    return function(this: any, ...args: any[]): T {
      if (!tracker.enabled) {
        return fn.apply(this, args);
      }

      const start = Date.now();
      const call: ExternalCall = {
        functionName,
        timestamp: new Date(),
        duration: 0,
        args: args,
        testName: tracker.currentTest || undefined,
        storyId: tracker.currentStory || undefined,
        stackTrace: new Error().stack
      };

      try {
        const result = fn.apply(this, args);
        
        // Handle promises
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as Promise<any>).then(
            (value) => {
              call.duration = Date.now() - start;
              call.result = value;
              tracker.recordCall(call);
              return value;
            },
            (error) => {
              call.duration = Date.now() - start;
              call.error = error;
              tracker.recordCall(call);
              throw error;
            }
          ) as any;
        }

        // Sync result
        call.duration = Date.now() - start;
        call.result = result;
        tracker.recordCall(call);
        return result;
      } catch (error) {
        call.duration = Date.now() - start;
        call.error = error;
        tracker.recordCall(call);
        throw error;
      }
    };
  }

  /**
   * Record a tracked call
   */
  private recordCall(call: ExternalCall): void {
    this.calls.push(call);
    this.emit('external-call', call);

    // Keep buffer manageable
    if (this.calls.length > 10000) {
      this.calls = this.calls.slice(-5000);
    }
  }

  /**
   * Get all tracked calls
   */
  getCalls(): ExternalCall[] {
    return [...this.calls];
  }

  /**
   * Get calls for a specific test
   */
  getCallsForTest(testName: string): ExternalCall[] {
    return this.calls.filter(c => c.testName === testName);
  }

  /**
   * Get calls for a specific story
   */
  getCallsForStory(storyId: string): ExternalCall[] {
    return this.calls.filter(c => c.storyId === storyId);
  }

  /**
   * Get statistics for external calls
   */
  getStats(): Map<string, ExternalCallStats> {
    const stats = new Map<string, ExternalCallStats>();

    this.calls.forEach(call => {
      let stat = stats.get(call.functionName);
      if (!stat) {
        stat = {
          functionName: call.functionName,
          totalCalls: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          errorCount: 0,
          testCoverage: new Set()
        };
        stats.set(call.functionName, stat);
      }

      stat.totalCalls++;
      stat.minDuration = Math.min(stat.minDuration, call.duration);
      stat.maxDuration = Math.max(stat.maxDuration, call.duration);
      
      if (call.error) {
        stat.errorCount++;
      }

      if (call.testName) {
        stat.testCoverage.add(call.testName);
      }
    });

    // Calculate averages
    stats.forEach(stat => {
      const callsForFunction = this.calls.filter(c => c.functionName === stat.functionName);
      const totalDuration = callsForFunction.reduce((sum, c) => sum + c.duration, 0);
      stat.avgDuration = totalDuration / callsForFunction.length;
    });

    return stats;
  }

  /**
   * Get unique external function names called
   */
  getUniqueFunctions(): string[] {
    return Array.from(new Set(this.calls.map(c => c.functionName)));
  }

  /**
   * Clear all tracked calls
   */
  clear(): void {
    this.calls = [];
    this.emit('cleared');
  }
}

// Singleton instance
export const externalCallTracker = new ExternalCallTracker();

/**
 * Decorator for tracking external calls
 */
export function TrackExternalCall(functionName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = functionName || `ext_${target.constructor.name}_${propertyName}`;
    
    descriptor.value = externalCallTracker.track(name, originalMethod);
    return descriptor;
  };
}

/**
 * Create a tracked version of a function
 */
export function trackExternal<T extends Function>(name: string, fn: T): T {
  return externalCallTracker.track(name, fn as any) as any;
}

// Pre-defined external function trackers
export const trackedFunctions = {
  // Database
  ext_database_query: trackExternal('ext_database_query', () => {}),
  ext_database_insert: trackExternal('ext_database_insert', () => {}),
  ext_database_update: trackExternal('ext_database_update', () => {}),
  ext_database_delete: trackExternal('ext_database_delete', () => {}),
  
  // HTTP
  ext_http_request: trackExternal('ext_http_request', () => {}),
  ext_http_get: trackExternal('ext_http_get', () => {}),
  ext_http_post: trackExternal('ext_http_post', () => {}),
  ext_http_put: trackExternal('ext_http_put', () => {}),
  ext_http_delete: trackExternal('ext_http_delete', () => {}),
  
  // WebSocket
  ext_websocket_send: trackExternal('ext_websocket_send', () => {}),
  ext_websocket_receive: trackExternal('ext_websocket_receive', () => {}),
  
  // File System
  ext_fs_read: trackExternal('ext_fs_read', () => {}),
  ext_fs_write: trackExternal('ext_fs_write', () => {}),
  
  // Cache
  ext_cache_get: trackExternal('ext_cache_get', () => {}),
  ext_cache_set: trackExternal('ext_cache_set', () => {}),
};