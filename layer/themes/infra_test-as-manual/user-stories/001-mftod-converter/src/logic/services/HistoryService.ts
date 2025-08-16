/**
 * History Service
 * Manages test history tracking and versioning
 */

import { DatabaseAdapter, TestHistory, TestExecution } from '../../external/database';
import { ManualTestSuite } from '../entities/ManualTest';

export interface HistoryEntry {
  id: string;
  suiteId: string;
  version: number;
  createdAt: Date;
  author: string;
  changes: string[];
  suite: ManualTestSuite;
  metadata: {
    sourceFile?: string;
    conversionType?: string;
    pluginsUsed?: string[];
  };
}

export interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  changes: {
    added: Array<{ type: string; item: any }>;
    removed: Array<{ type: string; item: any }>;
    modified: Array<{ type: string; before: any; after: any }>;
  };
  summary: string;
}

export class HistoryService {
  constructor(private database: DatabaseAdapter) {}

  /**
   * Save a new version of a test suite
   */
  async saveVersion(
    suiteId: string,
    suite: ManualTestSuite,
    userId: string,
    metadata: {
      sourceFile?: string;
      conversionType?: string;
      pluginsUsed?: string[];
    } = {}
  ): Promise<HistoryEntry> {
    // Get the latest version number
    const latestVersion = await this.database.getLatestVersion(suiteId);
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Calculate changes from previous version
    const changes = latestVersion 
      ? this.calculateChanges(latestVersion.data, suite)
      : ['Initial version'];

    // Save to database
    const history = await this.database.createTestHistory({
      suiteId,
      userId,
      version: newVersion,
      data: suite,
      metadata
    });

    return {
      id: history.id,
      suiteId: history.suiteId,
      version: history.version,
      createdAt: history.createdAt,
      author: userId,
      changes,
      suite,
      metadata: history.metadata
    };
  }

  /**
   * Get complete history for a test suite
   */
  async getHistory(suiteId: string): Promise<HistoryEntry[]> {
    const histories = await this.database.getTestHistoryBySuite(suiteId);
    
    return histories.map(history => ({
      id: history.id,
      suiteId: history.suiteId,
      version: history.version,
      createdAt: history.createdAt,
      author: history.userId,
      changes: this.extractChanges(history.data),
      suite: history.data,
      metadata: history.metadata
    }));
  }

  /**
   * Get a specific version
   */
  async getVersion(suiteId: string, version: number): Promise<HistoryEntry | null> {
    const histories = await this.database.getTestHistoryBySuite(suiteId);
    const history = histories.find(h => h.version === version);
    
    if (!history) return null;

    return {
      id: history.id,
      suiteId: history.suiteId,
      version: history.version,
      createdAt: history.createdAt,
      author: history.userId,
      changes: this.extractChanges(history.data),
      suite: history.data,
      metadata: history.metadata
    };
  }

  /**
   * Get the latest version
   */
  async getLatestVersion(suiteId: string): Promise<HistoryEntry | null> {
    const history = await this.database.getLatestVersion(suiteId);
    
    if (!history) return null;

    return {
      id: history.id,
      suiteId: history.suiteId,
      version: history.version,
      createdAt: history.createdAt,
      author: history.userId,
      changes: this.extractChanges(history.data),
      suite: history.data,
      metadata: history.metadata
    };
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    suiteId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionComparison> {
    const comparison = await this.database.compareVersions(suiteId, fromVersion, toVersion);
    
    const summary = this.generateComparisonSummary(comparison.differences);

    return {
      fromVersion,
      toVersion,
      changes: comparison.differences,
      summary
    };
  }

  /**
   * Start a test execution
   */
  async startExecution(
    historyId: string,
    userId: string,
    notes?: string
  ): Promise<TestExecution> {
    return await this.database.createTestExecution({
      historyId,
      userId,
      startedAt: new Date(),
      status: 'running',
      notes
    });
  }

  /**
   * Complete a test execution
   */
  async completeExecution(
    executionId: string,
    results: any,
    status: "completed" | 'failed',
    notes?: string
  ): Promise<TestExecution> {
    return await this.database.updateTestExecution(executionId, {
      completedAt: new Date(),
      status,
      results,
      notes
    });
  }

  /**
   * Get execution history for a test version
   */
  async getExecutionHistory(historyId: string): Promise<TestExecution[]> {
    return await this.database.getExecutionsByHistory(historyId);
  }

  /**
   * Get user's recent executions
   */
  async getUserExecutions(userId: string, limit?: number): Promise<TestExecution[]> {
    return await this.database.getExecutionsByUser(userId, limit);
  }

  /**
   * Get statistics for test executions
   */
  async getStatistics(userId?: string): Promise<{
    totalSuites: number;
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    return await this.database.getTestStatistics(userId);
  }

  /**
   * Get most used plugins
   */
  async getMostUsedPlugins(): Promise<Array<{ plugin: string; count: number }>> {
    return await this.database.getMostUsedPlugins();
  }

  /**
   * Calculate changes between versions
   */
  private calculateChanges(oldSuite: ManualTestSuite, newSuite: ManualTestSuite): string[] {
    const changes: string[] = [];

    // Compare basic properties
    if (oldSuite.title !== newSuite.title) {
      changes.push(`Title changed from "${oldSuite.title}" to "${newSuite.title}"`);
    }

    if (oldSuite.description !== newSuite.description) {
      changes.push('Description updated');
    }

    // Compare procedures
    const oldProcs = new Map(oldSuite.procedures.map(p => [p.id, p]));
    const newProcs = new Map(newSuite.procedures.map(p => [p.id, p]));

    // Added procedures
    for (const [id, proc] of newProcs) {
      if (!oldProcs.has(id)) {
        changes.push(`Added procedure: ${proc.title}`);
      }
    }

    // Removed procedures
    for (const [id, proc] of oldProcs) {
      if (!newProcs.has(id)) {
        changes.push(`Removed procedure: ${proc.title}`);
      }
    }

    // Modified procedures
    for (const [id, newProc] of newProcs) {
      const oldProc = oldProcs.get(id);
      if (oldProc && JSON.stringify(oldProc) !== JSON.stringify(newProc)) {
        changes.push(`Modified procedure: ${newProc.title}`);
      }
    }

    // Compare common procedures
    if (oldSuite.commonProcedures.length !== newSuite.commonProcedures.length) {
      changes.push('Common procedures count changed');
    }

    // Compare sequences
    if (oldSuite.sequences.length !== newSuite.sequences.length) {
      changes.push('Test sequences count changed');
    }

    return changes.length > 0 ? changes : ['No significant changes detected'];
  }

  /**
   * Extract meaningful changes from suite data
   */
  private extractChanges(suite: ManualTestSuite): string[] {
    const changes: string[] = [];
    
    changes.push(`${suite.procedures.length} test procedures`);
    
    if (suite.commonProcedures.length > 0) {
      changes.push(`${suite.commonProcedures.length} common procedures`);
    }
    
    if (suite.sequences.length > 0) {
      changes.push(`${suite.sequences.length} test sequences`);
    }

    // Extract categories
    const categories = new Set(suite.procedures.map(p => p.category));
    if (categories.size > 0) {
      changes.push(`${categories.size} categories: ${Array.from(categories).join(', ')}`);
    }

    return changes;
  }

  /**
   * Generate human-readable comparison summary
   */
  private generateComparisonSummary(differences: any): string {
    const { added, removed, modified } = differences;
    const parts: string[] = [];

    if (added.length > 0) {
      parts.push(`${added.length} added`);
    }

    if (removed.length > 0) {
      parts.push(`${removed.length} removed`);
    }

    if (modified.length > 0) {
      parts.push(`${modified.length} modified`);
    }

    if (parts.length === 0) {
      return 'No changes detected';
    }

    return `Changes: ${parts.join(', ')}`;
  }

  /**
   * Clean up old versions (keep last N versions)
   */
  async cleanupOldVersions(suiteId: string, keepVersions: number = 10): Promise<number> {
    const histories = await this.database.getTestHistoryBySuite(suiteId);
    
    if (histories.length <= keepVersions) {
      return 0; // Nothing to cleanup
    }

    const versionsToDelete = histories
      .sort((a, b) => b.version - a.version)
      .slice(keepVersions)
      .map(h => h.version);

    // Note: This would require implementing a delete method in the database adapter
    // For now, we'll just return the count of versions that would be deleted
    return versionsToDelete.length;
  }

  /**
   * Export history to JSON
   */
  async exportHistory(suiteId: string): Promise<any> {
    const history = await this.getHistory(suiteId);
    const executions = await Promise.all(
      history.map(h => this.getExecutionHistory(h.id))
    );

    return {
      suiteId,
      exportedAt: new Date().toISOString(),
      totalVersions: history.length,
      history: history.map((entry, index) => ({
        ...entry,
        suite: undefined, // Exclude large suite data from export
        executions: executions[index] || []
      }))
    };
  }
}