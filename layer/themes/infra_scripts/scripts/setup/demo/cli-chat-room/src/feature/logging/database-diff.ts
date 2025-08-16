/**
 * Database Diff Functionality
 * Provides transaction-based and snapshot-based database diffing
 */

import { EventEmitter } from '../../../../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { crypto } from '../../../../../../../../infra_external-log-lib/src';
import { diffJson } from 'diff';
import chalk from 'chalk';

export interface DatabaseDiff {
  id: string;
  timestamp: Date;
  type: 'transaction' | 'snapshot';
  database: string;
  operation: string;
  tableName?: string;
  before: any;
  after: any;
  changes: DiffChange[];
  summary: DiffSummary;
  metadata?: any;
}

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  path?: string;
  value?: any;
  oldValue?: any;
  newValue?: any;
}

export interface DiffSummary {
  rowsAdded: number;
  rowsRemoved: number;
  rowsModified: number;
  columnsChanged: string[];
  totalChanges: number;
}

export interface SnapshotConfig {
  name: string;
  query: string;
  database: string;
  tableName?: string;
  format?: 'json' | 'csv' | 'sql';
}

export class DatabaseDiffer extends EventEmitter {
  private static instance: DatabaseDiffer;
  private diffs: DatabaseDiff[] = [];
  private snapshots: Map<string, any> = new Map();
  private snapshotDir: string;
  private transactionDepth: number = 0;
  private activeTransactions: Map<string, any> = new Map();

  private constructor() {
    super();
    this.snapshotDir = path.join(process.cwd(), '.db-snapshots');
    this.ensureSnapshotDir();
  }

  static getInstance(): DatabaseDiffer {
    if (!DatabaseDiffer.instance) {
      DatabaseDiffer.instance = new DatabaseDiffer();
    }
    return DatabaseDiffer.instance;
  }

  private ensureSnapshotDir(): void {
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  /**
   * Wrap a database operation in a transaction for diffing
   */
  async transactionDiff<T>(
    connection: any,
    operation: () => Promise<T>,
    options: {
      database: string;
      tableName?: string;
      query?: string;
      captureQueries?: string[];
    }
  ): Promise<{ result: T; diff: DatabaseDiff }> {
    const transactionId = this.generateId();

    try {
      // Begin transaction or savepoint
      await this.beginTransaction(connection);
      
      // Capture before state
      const before = await this.captureState(connection, options);
      
      // Execute operation
      const result = await operation();
      
      // Capture after state
      const after = await this.captureState(connection, options);
      
      // Generate diff
      const diff = this.generateDiff({
        id: transactionId,
        timestamp: new Date(),
        type: 'transaction',
        database: options.database,
        operation: 'transaction',
        tableName: options.tableName,
        before,
        after
      });
      
      // Emit diff event
      this.emit('diff', diff);
      this.diffs.push(diff);
      
      // Rollback transaction (preserving the diff)
      await this.rollbackTransaction(connection);
      
      return { result, diff };
    } catch (error) {
      await this.rollbackTransaction(connection);
      throw error;
    }
  }

  /**
   * Database-specific transaction handling
   */
  private async beginTransaction(connection: any): Promise<void> {
    this.transactionDepth++;
    
    // PostgreSQL
    if (connection.query && connection.constructor.name === 'Client') {
      if (this.transactionDepth === 1) {
        await connection.query('BEGIN');
      } else {
        await connection.query(`SAVEPOINT sp_${this.transactionDepth}`);
      }
    }
    // MySQL
    else if (connection.beginTransaction) {
      await new Promise((resolve, reject) => {
        connection.beginTransaction((err: any) => err ? reject(err) : resolve(undefined));
      });
    }
    // MongoDB (use sessions)
    else if (connection.startSession) {
      const session = await connection.startSession();
      session.startTransaction();
      this.activeTransactions.set(`mongo_${this.transactionDepth}`, session);
    }
  }

  private async rollbackTransaction(connection: any): Promise<void> {
    // PostgreSQL
    if (connection.query && connection.constructor.name === 'Client') {
      if (this.transactionDepth === 1) {
        await connection.query('ROLLBACK');
      } else {
        await connection.query(`ROLLBACK TO SAVEPOINT sp_${this.transactionDepth}`);
      }
    }
    // MySQL
    else if (connection.rollback) {
      await new Promise((resolve, reject) => {
        connection.rollback((err: any) => err ? reject(err) : resolve(undefined));
      });
    }
    // MongoDB
    else if (connection.startSession) {
      const session = this.activeTransactions.get(`mongo_${this.transactionDepth}`);
      if (session) {
        await session.abortTransaction();
        await session.endSession();
        this.activeTransactions.delete(`mongo_${this.transactionDepth}`);
      }
    }
    
    this.transactionDepth--;
  }

  /**
   * Capture database state
   */
  private async captureState(connection: any, options: any): Promise<any> {
    const states: any = {};
    
    // Capture main query if provided
    if (options.query) {
      states.main = await this.executeQuery(connection, options.query);
    }
    
    // Capture additional queries
    if (options.captureQueries) {
      for (const [name, query] of Object.entries(options.captureQueries)) {
        states[name] = await this.executeQuery(connection, query as string);
      }
    }
    
    // Auto-capture table if specified
    if (options.tableName) {
      states.table = await this.captureTable(connection, options.tableName);
    }
    
    return states;
  }

  private async executeQuery(connection: any, query: string): Promise<any> {
    // PostgreSQL
    if (connection.query && connection.constructor.name === 'Client') {
      const result = await connection.query(query);
      return result.rows;
    }
    // MySQL
    else if (connection.query && !connection.startSession) {
      return new Promise((resolve, reject) => {
        connection.query(query, (err: any, results: any) => {
          err ? reject(err) : resolve(results);
        });
      });
    }
    // MongoDB
    else if (connection.db) {
      // Parse MongoDB-style query
      const match = query.match(/db\.(\w+)\.(\w+)\((.*)\)/);
      if (match) {
        const [, collection, method, args] = match;
        const coll = connection.db().collection(collection);
        return await (coll as any)[method](JSON.parse(args || '{}')).toArray();
      }
    }
    
    return null;
  }

  private async captureTable(connection: any, tableName: string): Promise<any> {
    // PostgreSQL
    if (connection.query && connection.constructor.name === 'Client') {
      const result = await connection.query(`SELECT * FROM ${tableName} ORDER BY 1`);
      return result.rows;
    }
    // MySQL
    else if (connection.query && !connection.startSession) {
      return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM ${tableName} ORDER BY 1`, (err: any, results: any) => {
          err ? reject(err) : resolve(results);
        });
      });
    }
    // MongoDB
    else if (connection.db) {
      return await connection.db().collection(tableName).find({}).sort({ _id: 1 }).toArray();
    }
    
    return null;
  }

  /**
   * Generate diff between before and after states
   */
  private generateDiff(data: Omit<DatabaseDiff, 'changes' | 'summary'>): DatabaseDiff {
    const changes: DiffChange[] = [];
    const summary: DiffSummary = {
      rowsAdded: 0,
      rowsRemoved: 0,
      rowsModified: 0,
      columnsChanged: [],
      totalChanges: 0
    };

    // Handle different state structures
    if (data.before.table && data.after.table) {
      // Table diff
      const tableDiff = this.diffTables(data.before.table, data.after.table);
      changes.push(...tableDiff.changes);
      Object.assign(summary, tableDiff.summary);
    } else {
      // Generic JSON diff
      const jsonDiff = this.diffJson(data.before, data.after);
      changes.push(...jsonDiff);
      summary.totalChanges = changes.length;
    }

    return {
      ...data,
      changes,
      summary
    };
  }

  /**
   * Diff two tables (arrays of rows)
   */
  private diffTables(before: any[], after: any[]): { changes: DiffChange[]; summary: DiffSummary } {
    const changes: DiffChange[] = [];
    const summary: DiffSummary = {
      rowsAdded: 0,
      rowsRemoved: 0,
      rowsModified: 0,
      columnsChanged: new Set<string>() as any,
      totalChanges: 0
    };

    // Create maps for efficient lookup
    const beforeMap = new Map(before.map(row => [this.getRowKey(row), row]));
    const afterMap = new Map(after.map(row => [this.getRowKey(row), row]));

    // Find removed rows
    for (const [key, row] of beforeMap) {
      if (!afterMap.has(key)) {
        changes.push({
          type: 'removed',
          path: `row[${key}]`,
          oldValue: row
        });
        summary.rowsRemoved++;
      }
    }

    // Find added and modified rows
    for (const [key, row] of afterMap) {
      if (!beforeMap.has(key)) {
        changes.push({
          type: 'added',
          path: `row[${key}]`,
          newValue: row
        });
        summary.rowsAdded++;
      } else {
        // Check for modifications
        const beforeRow = beforeMap.get(key);
        const rowChanges = this.diffRows(beforeRow, row);
        if (rowChanges.length > 0) {
          changes.push(...rowChanges.map(change => ({
            ...change,
            path: `row[${key}].${change.path}`
          })));
          summary.rowsModified++;
          rowChanges.forEach(change => {
            if (change.path) {
              (summary.columnsChanged as any).add(change.path);
            }
          });
        }
      }
    }

    summary.columnsChanged = Array.from(summary.columnsChanged as any);
    summary.totalChanges = changes.length;

    return { changes, summary };
  }

  /**
   * Get a unique key for a row
   */
  private getRowKey(row: any): string {
    // Try common ID fields
    if (row.id !== undefined) return `id:${row.id}`;
    if (row._id !== undefined) return `_id:${row._id}`;
    if (row.uuid !== undefined) return `uuid:${row.uuid}`;
    
    // Fallback to hash of entire row
    return `hash:${crypto.createHash('md5').update(JSON.stringify(row)).digest('hex')}`;
  }

  /**
   * Diff two rows
   */
  private diffRows(before: any, after: any): DiffChange[] {
    const changes: DiffChange[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (!(key in before)) {
        changes.push({
          type: 'added',
          path: key,
          newValue: after[key]
        });
      } else if (!(key in after)) {
        changes.push({
          type: 'removed',
          path: key,
          oldValue: before[key]
        });
      } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes.push({
          type: 'modified',
          path: key,
          oldValue: before[key],
          newValue: after[key]
        });
      }
    }

    return changes;
  }

  /**
   * Generic JSON diff
   */
  private diffJson(before: any, after: any): DiffChange[] {
    const changes: DiffChange[] = [];

    const diff = diffJson(before, after);
    diff.forEach((part: any) => {
      if (part.added) {
        changes.push({
          type: 'added',
          value: part.value
        });
      } else if (part.removed) {
        changes.push({
          type: 'removed',
          value: part.value
        });
      }
    });

    return changes;
  }

  /**
   * Snapshot testing functionality
   */
  async createSnapshot(config: SnapshotConfig, connection: any): Promise<string> {
    const snapshotId = `${config.name}_${Date.now()}`;
    const data = await this.captureState(connection, {
      database: config.database,
      query: config.query,
      tableName: config.tableName
    });

    const snapshot = {
      id: snapshotId,
      name: config.name,
      timestamp: new Date(),
      database: config.database,
      data,
      format: config.format || 'json'
    };

    // Save snapshot
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.snapshot`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    this.snapshots.set(config.name, snapshot);
    this.emit('snapshot-created', snapshot);

    return snapshotId;
  }

  /**
   * Compare current state with snapshot
   */
  async compareWithSnapshot(
    snapshotName: string,
    connection: any,
    options?: { updateSnapshot?: boolean }
  ): Promise<DatabaseDiff | null> {
    const snapshot = this.loadSnapshot(snapshotName);
    if (!snapshot) {
      throw new Error(`Snapshot '${snapshotName}' not found`);
    }

    const currentState = await this.captureState(connection, {
      database: snapshot.database,
      query: snapshot.query,
      tableName: snapshot.tableName
    });

    const diff = this.generateDiff({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'snapshot',
      database: snapshot.database,
      operation: 'snapshot-compare',
      before: snapshot.data,
      after: currentState
    });

    if (diff.changes.length > 0) {
      this.emit('snapshot-mismatch', { snapshot, diff });
      
      if (options?.updateSnapshot) {
        await this.updateSnapshot(snapshotName, currentState);
      }
      
      return diff;
    }

    this.emit('snapshot-match', { snapshot });
    return null;
  }

  /**
   * Load snapshot from disk
   */
  private loadSnapshot(name: string): any {
    // Check memory cache first
    if (this.snapshots.has(name)) {
      return this.snapshots.get(name);
    }

    // Load from disk
    const files = fs.readdirSync(this.snapshotDir);
    const snapshotFile = files.find(f => f.startsWith(`${name}_`) && f.endsWith('.snapshot'));
    
    if (snapshotFile) {
      const snapshotPath = path.join(this.snapshotDir, snapshotFile);
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      this.snapshots.set(name, snapshot);
      return snapshot;
    }

    return null;
  }

  /**
   * Update existing snapshot
   */
  private async updateSnapshot(name: string, newData: any): Promise<void> {
    const snapshot = this.loadSnapshot(name);
    if (!snapshot) return;

    snapshot.data = newData;
    snapshot.timestamp = new Date();

    const snapshotPath = path.join(this.snapshotDir, `${snapshot.id}.snapshot`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    this.snapshots.set(name, snapshot);
    this.emit('snapshot-updated', snapshot);
  }

  /**
   * Format diff for display
   */
  formatDiff(diff: DatabaseDiff, format: 'console' | 'html' | 'json' = 'console'): string {
    if (format === 'json') {
      return JSON.stringify(diff, null, 2);
    }

    if (format === 'console') {
      let output = '';
      output += chalk.bold(`Database Diff: ${diff.database}\n`);
      output += chalk.gray(`Time: ${diff.timestamp}\n`);
      output += chalk.gray(`Type: ${diff.type}\n`);
      
      if (diff.summary.totalChanges === 0) {
        output += chalk.green('No changes detected\n');
        return output;
      }

      output += chalk.yellow(`\nSummary:\n`);
      output += `  Rows added: ${diff.summary.rowsAdded}\n`;
      output += `  Rows removed: ${diff.summary.rowsRemoved}\n`;
      output += `  Rows modified: ${diff.summary.rowsModified}\n`;
      
      if (diff.summary.columnsChanged.length > 0) {
        output += `  Columns changed: ${diff.summary.columnsChanged.join(', ')}\n`;
      }

      output += chalk.yellow(`\nChanges:\n`);
      diff.changes.forEach(change => {
        if (change.type === 'added') {
          output += chalk.green(`+ ${change.path || 'Added'}: ${JSON.stringify(change.newValue || change.value)}\n`);
        } else if (change.type === 'removed') {
          output += chalk.red(`- ${change.path || 'Removed'}: ${JSON.stringify(change.oldValue || change.value)}\n`);
        } else if (change.type === 'modified') {
          output += chalk.yellow(`~ ${change.path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}\n`);
        }
      });

      return output;
    }

    // HTML format
    return `<pre>${this.formatDiff(diff, 'console')}</pre>`;
  }

  /**
   * Get all diffs
   */
  getDiffs(): DatabaseDiff[] {
    return [...this.diffs];
  }

  /**
   * Clear diffs
   */
  clearDiffs(): void {
    this.diffs = [];
  }

  /**
   * Export diffs to file
   */
  exportDiffs(filePath: string): void {
    const exportData = {
      exportTime: new Date(),
      totalDiffs: this.diffs.length,
      diffs: this.diffs
    };
    
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    this.emit('diffs-exported', { path: filePath, count: this.diffs.length });
  }

  private generateId(): string {
    return `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const databaseDiffer = DatabaseDiffer.getInstance();