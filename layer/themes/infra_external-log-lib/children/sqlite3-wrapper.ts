/**
 * SQLite3 Wrapper with External Logging
 * Maintains same interface as sqlite3 module but adds logging
 */

import * as originalSqlite3 from 'sqlite3';
import { ExternalLogLib } from '../user-stories/001-basic-log-capture/src/external/external-log-lib';

class DatabaseWrapper {
  private logger: ExternalLogLib;
  private _db: originalSqlite3.Database;
  private dbPath: string;

  constructor(filename: string, mode?: number, callback?: (err: Error | null) => void) {
    this.logger = new ExternalLogLib({
      appName: 'sqlite3-wrapper',
      logLevel: 'info',
      transports: ['file'],
      logDir: './logs'
    });
    
    this.dbPath = filename;
    const startTime = Date.now();
    
    this._db = new originalSqlite3.Database(filename, mode, (err) => {
      if (err) {
        this.logError('Database.constructor', err);
      } else {
        this.logOperation('Database.constructor', {
          filename,
          mode,
          duration: Date.now() - startTime
        });
      }
      if (callback) callback(err);
    });
  }

  private logOperation(operation: string, details: any = {}) {
    this.logger.log('info', `SQLite3 Operation: ${operation}`, {
      operation,
      database: this.dbPath,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  private logError(operation: string, error: Error, details: any = {}) {
    this.logger.log('error', `SQLite3 Error: ${operation}`, {
      operation,
      database: this.dbPath,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  private sanitizeSql(sql: string): string {
    // Remove sensitive data patterns for logging
    return sql
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='[REDACTED]'");
  }

  run(sql: string, ...params: any[]): this {
    const startTime = Date.now();
    const callback = params[params.length - 1];
    const hasCallback = typeof callback === 'function';
    const actualParams = hasCallback ? params.slice(0, -1) : params;
    
    this.logOperation('run', {
      sql: this.sanitizeSql(sql.substring(0, 200)),
      paramCount: actualParams.length
    });

    const wrappedCallback = (err: Error | null) => {
      const duration = Date.now() - startTime;
      if (err) {
        this.logError('run', err, { sql: this.sanitizeSql(sql), duration });
      } else {
        this.logOperation('run.complete', {
          changes: (this._db as any).changes,
          lastID: (this._db as any).lastID,
          duration
        });
      }
      if (hasCallback) callback.call(this, err);
    };

    if (hasCallback) {
      this._db.run(sql, ...actualParams, wrappedCallback);
    } else {
      this._db.run(sql, ...actualParams);
      this.logOperation('run.queued', { sql: this.sanitizeSql(sql.substring(0, 200)) });
    }

    return this;
  }

  get(sql: string, ...params: any[]): this {
    const startTime = Date.now();
    const callback = params[params.length - 1];
    const hasCallback = typeof callback === 'function';
    const actualParams = hasCallback ? params.slice(0, -1) : params;
    
    this.logOperation('get', {
      sql: this.sanitizeSql(sql.substring(0, 200)),
      paramCount: actualParams.length
    });

    const wrappedCallback = (err: Error | null, row: any) => {
      const duration = Date.now() - startTime;
      if (err) {
        this.logError('get', err, { sql: this.sanitizeSql(sql), duration });
      } else {
        this.logOperation('get.complete', {
          hasResult: !!row,
          duration
        });
      }
      if (hasCallback) callback.call(this, err, row);
    };

    if (hasCallback) {
      this._db.get(sql, ...actualParams, wrappedCallback);
    } else {
      this._db.get(sql, ...actualParams);
      this.logOperation('get.queued', { sql: this.sanitizeSql(sql.substring(0, 200)) });
    }

    return this;
  }

  all(sql: string, ...params: any[]): this {
    const startTime = Date.now();
    const callback = params[params.length - 1];
    const hasCallback = typeof callback === 'function';
    const actualParams = hasCallback ? params.slice(0, -1) : params;
    
    this.logOperation('all', {
      sql: this.sanitizeSql(sql.substring(0, 200)),
      paramCount: actualParams.length
    });

    const wrappedCallback = (err: Error | null, rows: any[]) => {
      const duration = Date.now() - startTime;
      if (err) {
        this.logError('all', err, { sql: this.sanitizeSql(sql), duration });
      } else {
        this.logOperation('all.complete', {
          rowCount: rows ? rows.length : 0,
          duration
        });
      }
      if (hasCallback) callback.call(this, err, rows);
    };

    if (hasCallback) {
      this._db.all(sql, ...actualParams, wrappedCallback);
    } else {
      this._db.all(sql, ...actualParams);
      this.logOperation('all.queued', { sql: this.sanitizeSql(sql.substring(0, 200)) });
    }

    return this;
  }

  each(sql: string, ...params: any[]): this {
    const callbacks = params.filter(p => typeof p === 'function');
    const rowCallback = callbacks[0];
    const completeCallback = callbacks[1];
    const actualParams = params.slice(0, params.length - callbacks.length);
    
    let rowCount = 0;
    const startTime = Date.now();
    
    this.logOperation('each', {
      sql: this.sanitizeSql(sql.substring(0, 200)),
      paramCount: actualParams.length
    });

    const wrappedRowCallback = (err: Error | null, row: any) => {
      if (err) {
        this.logError('each.row', err, { sql: this.sanitizeSql(sql) });
      } else {
        rowCount++;
      }
      if (rowCallback) rowCallback.call(this, err, row);
    };

    const wrappedCompleteCallback = (err: Error | null, count: number) => {
      const duration = Date.now() - startTime;
      if (err) {
        this.logError('each.complete', err, { sql: this.sanitizeSql(sql), duration });
      } else {
        this.logOperation('each.complete', {
          rowCount: count,
          duration
        });
      }
      if (completeCallback) completeCallback.call(this, err, count);
    };

    this._db.each(sql, ...actualParams, wrappedRowCallback, wrappedCompleteCallback);
    return this;
  }

  prepare(sql: string, ...params: any[]): originalSqlite3.Statement {
    const callback = params[params.length - 1];
    const hasCallback = typeof callback === 'function';
    const actualParams = hasCallback ? params.slice(0, -1) : params;
    
    this.logOperation('prepare', {
      sql: this.sanitizeSql(sql.substring(0, 200)),
      paramCount: actualParams.length
    });

    const wrappedCallback = (err: Error | null) => {
      if (err) {
        this.logError('prepare', err, { sql: this.sanitizeSql(sql) });
      } else {
        this.logOperation('prepare.complete', { sql: this.sanitizeSql(sql.substring(0, 200)) });
      }
      if (hasCallback) callback(err);
    };

    if (hasCallback) {
      return this._db.prepare(sql, ...actualParams, wrappedCallback);
    } else {
      return this._db.prepare(sql, ...actualParams);
    }
  }

  close(callback?: (err: Error | null) => void): void {
    const startTime = Date.now();
    this.logOperation('close');
    
    this._db.close((err) => {
      const duration = Date.now() - startTime;
      if (err) {
        this.logError('close', err, { duration });
      } else {
        this.logOperation('close.complete', { duration });
      }
      if (callback) callback(err);
    });
  }

  serialize(callback?: () => void): void {
    this.logOperation('serialize');
    this._db.serialize(callback);
  }

  parallelize(callback?: () => void): void {
    this.logOperation('parallelize');
    this._db.parallelize(callback);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.logOperation('on', { event });
    this._db.on(event, listener);
    return this;
  }

  exec(sql: string, callback?: (err: Error | null) => void): this {
    const startTime = Date.now();
    this.logOperation('exec', {
      sql: this.sanitizeSql(sql.substring(0, 500)),
      sqlLength: sql.length
    });
    
    this._db.exec(sql, (err) => {
      const duration = Date.now() - startTime;
      if (err) {
        this.logError('exec', err, { duration });
      } else {
        this.logOperation('exec.complete', { duration });
      }
      if (callback) callback(err);
    });
    
    return this;
  }

  // Proxy other properties and methods
  get filename(): string {
    return this._db.filename;
  }

  get mode(): number {
    return this._db.mode;
  }
}

// Statement wrapper
class StatementWrapper {
  private logger: ExternalLogLib;
  private _stmt: originalSqlite3.Statement;
  private sql: string;

  constructor(stmt: originalSqlite3.Statement, sql: string, logger: ExternalLogLib) {
    this._stmt = stmt;
    this.sql = sql;
    this.logger = logger;
  }

  bind(...params: any[]): this {
    this._stmt.bind(...params);
    this.logger.log('info', 'Statement.bind', {
      sql: this.sql.substring(0, 200),
      paramCount: params.length
    });
    return this;
  }

  reset(callback?: (err: Error | null) => void): this {
    this._stmt.reset(callback);
    this.logger.log('info', 'Statement.reset', { sql: this.sql.substring(0, 200) });
    return this;
  }

  finalize(callback?: (err: Error | null) => void): void {
    this._stmt.finalize(callback);
    this.logger.log('info', 'Statement.finalize', { sql: this.sql.substring(0, 200) });
  }

  run(...params: any[]): this {
    this._stmt.run(...params);
    this.logger.log('info', 'Statement.run', {
      sql: this.sql.substring(0, 200),
      paramCount: params.filter(p => typeof p !== 'function').length
    });
    return this;
  }

  get(...params: any[]): this {
    this._stmt.get(...params);
    this.logger.log('info', 'Statement.get', {
      sql: this.sql.substring(0, 200),
      paramCount: params.filter(p => typeof p !== 'function').length
    });
    return this;
  }

  all(...params: any[]): this {
    this._stmt.all(...params);
    this.logger.log('info', 'Statement.all', {
      sql: this.sql.substring(0, 200),
      paramCount: params.filter(p => typeof p !== 'function').length
    });
    return this;
  }

  each(...params: any[]): this {
    this._stmt.each(...params);
    this.logger.log('info', 'Statement.each', {
      sql: this.sql.substring(0, 200),
      paramCount: params.filter(p => typeof p !== 'function').length - 1
    });
    return this;
  }
}

// Export wrapper classes with same interface as sqlite3
export const Database = DatabaseWrapper;
export const Statement = StatementWrapper;

// Re-export other sqlite3 exports
export const { 
  OPEN_READONLY, 
  OPEN_READWRITE, 
  OPEN_CREATE, 
  OPEN_FULLMUTEX,
  OPEN_SHAREDCACHE, 
  OPEN_PRIVATECACHE, 
  OPEN_URI,
  verbose 
} = originalSqlite3;

// Default export
export default {
  Database: DatabaseWrapper,
  Statement: StatementWrapper,
  OPEN_READONLY: originalSqlite3.OPEN_READONLY,
  OPEN_READWRITE: originalSqlite3.OPEN_READWRITE,
  OPEN_CREATE: originalSqlite3.OPEN_CREATE,
  OPEN_FULLMUTEX: originalSqlite3.OPEN_FULLMUTEX,
  OPEN_SHAREDCACHE: originalSqlite3.OPEN_SHAREDCACHE,
  OPEN_PRIVATECACHE: originalSqlite3.OPEN_PRIVATECACHE,
  OPEN_URI: originalSqlite3.OPEN_URI,
  verbose: originalSqlite3.verbose
};