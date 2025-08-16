/**
 * Database Interceptor
 * Wraps and logs database connections and queries
 */

import { EventEmitter } from '../../../../../../../../infra_external-log-lib/src';
import * as Module from 'module';
import { databaseDiffer } from './database-diff';

export interface DatabaseLog {
  id: string;
  timestamp: Date;
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
  operation: 'connect' | 'query' | 'transaction' | 'disconnect' | 'error';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  query?: string;
  params?: any[];
  result?: any;
  rowCount?: number;
  duration?: number;
  error?: string;
  metadata?: any;
}

export class DatabaseInterceptor extends EventEmitter {
  private static instance: DatabaseInterceptor;
  private logs: DatabaseLog[] = [];
  private activeConnections: Map<string, any> = new Map();
  private interceptEnabled: boolean = false;
  private enableDiff: boolean = false;
  
  // Store wrapped modules
  private wrappedModules: Set<string> = new Set();

  private constructor() {
    super();
  }

  static getInstance(): DatabaseInterceptor {
    if (!DatabaseInterceptor.instance) {
      DatabaseInterceptor.instance = new DatabaseInterceptor();
    }
    return DatabaseInterceptor.instance;
  }

  /**
   * Enable database interception
   */
  enable(options: { enableDiff?: boolean } = {}): void {
    if (this.interceptEnabled) return;
    
    this.interceptEnabled = true;
    this.enableDiff = options.enableDiff || process.env.INTERCEPT_DB_DIFF === 'true';
    this.setupModuleInterception();
    this.emit('enabled');
  }

  /**
   * Setup module interception
   */
  private setupModuleInterception(): void {
    const self = this;
    const originalRequire = Module.prototype.require;

    // Override require to intercept database modules
    (Module.prototype as any).require = function(id: string) {
      const module = originalRequire.apply(this, arguments);
      
      // Intercept known database modules
      if (!self.wrappedModules.has(id)) {
        switch (id) {
          case 'pg':
          case 'pg-pool':
            self.wrapPostgres(module, id);
            break;
          case 'mysql':
          case 'mysql2':
            self.wrapMySQL(module, id);
            break;
          case 'mongodb':
          case 'mongoose':
            self.wrapMongoDB(module, id);
            break;
          case 'redis':
          case 'ioredis':
            self.wrapRedis(module, id);
            break;
          case 'sqlite3':
          case 'better-sqlite3':
            self.wrapSQLite(module, id);
            break;
        }
      }
      
      return module;
    };
  }

  /**
   * Wrap PostgreSQL (pg module)
   */
  private wrapPostgres(pgModule: any, moduleName: string): void {
    if (this.wrappedModules.has(moduleName)) return;
    this.wrappedModules.add(moduleName);

    const self = this;

    // Wrap Client
    if (pgModule.Client) {
      const OriginalClient = pgModule.Client;
      
      pgModule.Client = class extends OriginalClient {
        constructor(...args: any[]) {
          super(...args);
          
          const config = args[0] || {};
          const connectionId = self.generateId();
          
          // Wrap connect
          const originalConnect = this.connect.bind(this);
          this.connect = async function(...connectArgs: any[]) {
            const log: DatabaseLog = {
              id: connectionId,
              timestamp: new Date(),
              type: 'postgres',
              operation: 'connect',
              host: config.host || this.host || 'localhost',
              port: config.port || this.port || 5432,
              database: config.database || this.database,
              user: config.user || this.user
            };

            try {
              const result = await originalConnect(...connectArgs);
              self.emit('database', log);
              self.logs.push(log);
              self.activeConnections.set(connectionId, this);
              return result;
            } catch (error: any) {
              log.error = error.message;
              self.emit('database', log);
              self.logs.push(log);
              throw error;
            }
          };

          // Wrap query
          const originalQuery = this.query.bind(this);
          this.query = function(...queryArgs: any[]) {
            const startTime = Date.now();
            const queryLog: DatabaseLog = {
              id: self.generateId(),
              timestamp: new Date(),
              type: 'postgres',
              operation: 'query',
              host: config.host || this.host,
              database: config.database || this.database
            };

            // Parse query arguments
            if (typeof queryArgs[0] === 'string') {
              queryLog.query = queryArgs[0];
              queryLog.params = queryArgs[1];
            } else if (typeof queryArgs[0] === 'object') {
              queryLog.query = queryArgs[0].text;
              queryLog.params = queryArgs[0].values;
            }

            const callback = queryArgs[queryArgs.length - 1];
            const hasCallback = typeof callback === 'function';

            // Check if this is a modifying query that should be diffed
            const shouldDiff = self.enableDiff && self.isModifyingQuery(queryLog.query);

            if (shouldDiff && !hasCallback) {
              // Wrap in transaction diff for promise style
              return databaseDiffer.transactionDiff(
                this,
                () => originalQuery(...queryArgs),
                {
                  database: config.database || this.database,
                  query: queryLog.query,
                  tableName: self.extractTableName(queryLog.query)
                }
              ).then(({ result, diff }) => {
                queryLog.duration = Date.now() - startTime;
                queryLog.rowCount = result.rowCount;
                queryLog.metadata = { diff: diff.summary };
                self.emit('database', queryLog);
                self.logs.push(queryLog);
                self.emit('database-diff', diff);
                return result;
              }).catch(err => {
                queryLog.duration = Date.now() - startTime;
                queryLog.error = err.message;
                self.emit('database', queryLog);
                self.logs.push(queryLog);
                throw err;
              });
            }

            if (hasCallback) {
              // Callback style
              queryArgs[queryArgs.length - 1] = function(err: any, result: any) {
                queryLog.duration = Date.now() - startTime;
                if (err) {
                  queryLog.error = err.message;
                } else {
                  queryLog.rowCount = result.rowCount;
                }
                self.emit('database', queryLog);
                self.logs.push(queryLog);
                callback(err, result);
              };
              return originalQuery(...queryArgs);
            } else {
              // Promise style
              const promise = originalQuery(...queryArgs);
              return promise.then(
                (result: any) => {
                  queryLog.duration = Date.now() - startTime;
                  queryLog.rowCount = result.rowCount;
                  self.emit('database', queryLog);
                  self.logs.push(queryLog);
                  return result;
                },
                (err: any) => {
                  queryLog.duration = Date.now() - startTime;
                  queryLog.error = err.message;
                  self.emit('database', queryLog);
                  self.logs.push(queryLog);
                  throw err;
                }
              );
            }
          };

          // Wrap end/disconnect
          const originalEnd = this.end.bind(this);
          this.end = function(...endArgs: any[]) {
            const log: DatabaseLog = {
              id: self.generateId(),
              timestamp: new Date(),
              type: 'postgres',
              operation: 'disconnect',
              host: config.host || this.host,
              database: config.database || this.database
            };
            
            self.emit('database', log);
            self.logs.push(log);
            self.activeConnections.delete(connectionId);
            
            return originalEnd(...endArgs);
          };
        }
      };
    }

    // Wrap Pool
    if (pgModule.Pool) {
      const OriginalPool = pgModule.Pool;
      
      pgModule.Pool = class extends OriginalPool {
        constructor(...args: any[]) {
          super(...args);
          
          // Wrap query method
          const originalQuery = this.query.bind(this);
          this.query = function(...queryArgs: any[]) {
            return self.wrapPoolQuery(originalQuery, queryArgs, 'postgres', args[0]);
          };
        }
      };
    }
  }

  /**
   * Wrap MySQL
   */
  private wrapMySQL(mysqlModule: any, moduleName: string): void {
    if (this.wrappedModules.has(moduleName)) return;
    this.wrappedModules.add(moduleName);

    const self = this;

    // Wrap createConnection
    if (mysqlModule.createConnection) {
      const originalCreateConnection = mysqlModule.createConnection;
      
      mysqlModule.createConnection = function(config: any) {
        const connection = originalCreateConnection(config);
        const connectionId = self.generateId();
        
        // Wrap connect
        const originalConnect = connection.connect.bind(connection);
        connection.connect = function(callback?: Function) {
          const log: DatabaseLog = {
            id: connectionId,
            timestamp: new Date(),
            type: 'mysql',
            operation: 'connect',
            host: config.host || 'localhost',
            port: config.port || 3306,
            database: config.database,
            user: config.user
          };

          const wrappedCallback = callback ? function(err: any) {
            if (err) {
              log.error = err.message;
            }
            self.emit('database', log);
            self.logs.push(log);
            if (!err) {
              self.activeConnections.set(connectionId, connection);
            }
            callback(err);
          } : undefined;

          return originalConnect(wrappedCallback);
        };

        // Wrap query
        const originalQuery = connection.query.bind(connection);
        connection.query = function(...queryArgs: any[]) {
          return self.wrapMySQLQuery(originalQuery, queryArgs, config);
        };

        // Wrap end
        const originalEnd = connection.end.bind(connection);
        connection.end = function(...endArgs: any[]) {
          const log: DatabaseLog = {
            id: self.generateId(),
            timestamp: new Date(),
            type: 'mysql',
            operation: 'disconnect',
            host: config.host,
            database: config.database
          };
          
          self.emit('database', log);
          self.logs.push(log);
          self.activeConnections.delete(connectionId);
          
          return originalEnd(...endArgs);
        };

        return connection;
      };
    }
  }

  /**
   * Wrap MongoDB
   */
  private wrapMongoDB(mongoModule: any, moduleName: string): void {
    if (this.wrappedModules.has(moduleName)) return;
    this.wrappedModules.add(moduleName);

    const self = this;

    if (moduleName === 'mongodb' && mongoModule.MongoClient) {
      const OriginalMongoClient = mongoModule.MongoClient;
      
      mongoModule.MongoClient = class extends OriginalMongoClient {
        async connect() {
          const connectionId = self.generateId();
          const log: DatabaseLog = {
            id: connectionId,
            timestamp: new Date(),
            type: 'mongodb',
            operation: 'connect',
            host: this.s?.options?.hosts?.[0]?.host || 'localhost',
            port: this.s?.options?.hosts?.[0]?.port || 27017
          };

          try {
            const result = await super.connect();
            self.emit('database', log);
            self.logs.push(log);
            self.activeConnections.set(connectionId, this);
            return result;
          } catch (error: any) {
            log.error = error.message;
            self.emit('database', log);
            self.logs.push(log);
            throw error;
          }
        }
      };
    }
  }

  /**
   * Wrap Redis
   */
  private wrapRedis(redisModule: any, moduleName: string): void {
    if (this.wrappedModules.has(moduleName)) return;
    this.wrappedModules.add(moduleName);

    const self = this;

    // For node-redis
    if (moduleName === 'redis' && redisModule.createClient) {
      const originalCreateClient = redisModule.createClient;
      
      redisModule.createClient = function(...args: any[]) {
        const client = originalCreateClient(...args);
        const connectionId = self.generateId();
        
        // Log connection
        client.on('connect', () => {
          const log: DatabaseLog = {
            id: connectionId,
            timestamp: new Date(),
            type: 'redis',
            operation: 'connect',
            host: client.options?.host || 'localhost',
            port: client.options?.port || 6379
          };
          self.emit('database', log);
          self.logs.push(log);
          self.activeConnections.set(connectionId, client);
        });

        // Wrap command methods
        const commands = ['get', 'set', 'del', 'hget', 'hset', 'lpush', 'rpush', 'sadd', 'zadd'];
        commands.forEach(cmd => {
          if (client[cmd]) {
            const original = client[cmd].bind(client);
            client[cmd] = function(...cmdArgs: any[]) {
              return self.wrapRedisCommand(original, cmd, cmdArgs);
            };
          }
        });

        return client;
      };
    }
  }

  /**
   * Wrap SQLite
   */
  private wrapSQLite(sqliteModule: any, moduleName: string): void {
    if (this.wrappedModules.has(moduleName)) return;
    this.wrappedModules.add(moduleName);

    const self = this;

    if (moduleName === 'sqlite3' && sqliteModule.Database) {
      const OriginalDatabase = sqliteModule.Database;
      
      sqliteModule.Database = class extends OriginalDatabase {
        constructor(filename: string, ...args: any[]) {
          super(filename, ...args);
          
          const connectionId = self.generateId();
          const log: DatabaseLog = {
            id: connectionId,
            timestamp: new Date(),
            type: 'sqlite',
            operation: 'connect',
            database: filename
          };
          
          self.emit('database', log);
          self.logs.push(log);
          self.activeConnections.set(connectionId, this);

          // Wrap run, get, all methods
          ['run', 'get', 'all'].forEach(method => {
            const original = this[method].bind(this);
            this[method] = function(...methodArgs: any[]) {
              return self.wrapSQLiteMethod(original, method, methodArgs, filename);
            };
          });
        }
      };
    }
  }

  /**
   * Helper methods
   */
  private wrapPoolQuery(originalQuery: Function, queryArgs: any[], dbType: string, config: any): any {
    const self = this;
    const startTime = Date.now();
    const queryLog: DatabaseLog = {
      id: self.generateId(),
      timestamp: new Date(),
      type: dbType as any,
      operation: 'query',
      host: config?.host || 'localhost',
      database: config?.database
    };

    // Parse query
    if (typeof queryArgs[0] === 'string') {
      queryLog.query = queryArgs[0];
      queryLog.params = queryArgs[1];
    } else if (typeof queryArgs[0] === 'object') {
      queryLog.query = queryArgs[0].text || queryArgs[0].sql;
      queryLog.params = queryArgs[0].values || queryArgs[0].params;
    }

    const result = originalQuery(...queryArgs);

    if (result && typeof result.then === 'function') {
      return result.then(
        (res: any) => {
          queryLog.duration = Date.now() - startTime;
          queryLog.rowCount = res.rowCount || res.affectedRows || res.length;
          self.emit('database', queryLog);
          self.logs.push(queryLog);
          return res;
        },
        (err: any) => {
          queryLog.duration = Date.now() - startTime;
          queryLog.error = err.message;
          self.emit('database', queryLog);
          self.logs.push(queryLog);
          throw err;
        }
      );
    }

    return result;
  }

  private wrapMySQLQuery(originalQuery: Function, queryArgs: any[], config: any): any {
    const self = this;
    const startTime = Date.now();
    const queryLog: DatabaseLog = {
      id: self.generateId(),
      timestamp: new Date(),
      type: 'mysql',
      operation: 'query',
      host: config.host || 'localhost',
      database: config.database
    };

    // Parse query
    if (typeof queryArgs[0] === 'string') {
      queryLog.query = queryArgs[0];
      queryLog.params = queryArgs[1];
    } else if (typeof queryArgs[0] === 'object') {
      queryLog.query = queryArgs[0].sql;
      queryLog.params = queryArgs[0].values;
    }

    const callback = queryArgs[queryArgs.length - 1];
    if (typeof callback === 'function') {
      queryArgs[queryArgs.length - 1] = function(err: any, results: any) {
        queryLog.duration = Date.now() - startTime;
        if (err) {
          queryLog.error = err.message;
        } else {
          queryLog.rowCount = results.affectedRows || results.length;
        }
        self.emit('database', queryLog);
        self.logs.push(queryLog);
        callback(err, results);
      };
    }

    return originalQuery(...queryArgs);
  }

  private wrapRedisCommand(original: Function, command: string, cmdArgs: any[]): any {
    const self = this;
    const startTime = Date.now();
    const log: DatabaseLog = {
      id: self.generateId(),
      timestamp: new Date(),
      type: 'redis',
      operation: 'query',
      query: command,
      params: cmdArgs
    };

    const result = original(...cmdArgs);

    if (result && typeof result.then === 'function') {
      return result.then(
        (res: any) => {
          log.duration = Date.now() - startTime;
          log.result = res;
          self.emit('database', log);
          self.logs.push(log);
          return res;
        },
        (err: any) => {
          log.duration = Date.now() - startTime;
          log.error = err.message;
          self.emit('database', log);
          self.logs.push(log);
          throw err;
        }
      );
    }

    return result;
  }

  private wrapSQLiteMethod(original: Function, method: string, methodArgs: any[], filename: string): any {
    const self = this;
    const startTime = Date.now();
    const log: DatabaseLog = {
      id: self.generateId(),
      timestamp: new Date(),
      type: 'sqlite',
      operation: 'query',
      database: filename,
      query: methodArgs[0]
    };

    const callback = methodArgs[methodArgs.length - 1];
    if (typeof callback === 'function') {
      methodArgs[methodArgs.length - 1] = function(err: any, result: any) {
        log.duration = Date.now() - startTime;
        if (err) {
          log.error = err.message;
        } else if (method === 'run') {
          log.rowCount = this.changes;
        } else if (Array.isArray(result)) {
          log.rowCount = result.length;
        }
        self.emit('database', log);
        self.logs.push(log);
        callback.call(this, err, result);
      };
    }

    return original(...methodArgs);
  }

  private generateId(): string {
    return `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API
   */
  getLogs(): DatabaseLog[] {
    return [...this.logs];
  }

  getActiveConnections(): any[] {
    return Array.from(this.activeConnections.values());
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats(): any {
    const stats = {
      total: this.logs.length,
      active: this.activeConnections.size,
      byType: {} as any,
      byOperation: {} as any,
      totalQueries: 0,
      totalErrors: 0,
      avgDuration: 0
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const log of this.logs) {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.byOperation[log.operation] = (stats.byOperation[log.operation] || 0) + 1;
      
      if (log.operation === 'query') {
        stats.totalQueries++;
      }
      
      if (log.error) {
        stats.totalErrors++;
      }
      
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
    }

    if (durationCount > 0) {
      stats.avgDuration = Math.round(totalDuration / durationCount);
    }

    return stats;
  }

  /**
   * Check if query is modifying data
   */
  private isModifyingQuery(query?: string): boolean {
    if (!query) return false;
    const upperQuery = query.trim().toUpperCase();
    return upperQuery.startsWith('INSERT') ||
           upperQuery.startsWith('UPDATE') ||
           upperQuery.startsWith('DELETE') ||
           upperQuery.startsWith('MERGE') ||
           upperQuery.startsWith('REPLACE');
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query?: string): string | undefined {
    if (!query) return undefined;
    
    // Basic regex patterns for common SQL operations
    const patterns = [
      /INSERT\s+INTO\s+([`"]?\w+[`"]?)/i,
      /UPDATE\s+([`"]?\w+[`"]?)/i,
      /DELETE\s+FROM\s+([`"]?\w+[`"]?)/i,
      /MERGE\s+INTO\s+([`"]?\w+[`"]?)/i,
      /REPLACE\s+INTO\s+([`"]?\w+[`"]?)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1].replace(/[`"]/g, '');
      }
    }
    
    return undefined;
  }

  /**
   * Enable diff for specific connections
   */
  enableDiffForConnection(connection: any): void {
    if (!connection.__diffEnabled) {
      connection.__diffEnabled = true;
      // Additional connection-specific diff setup if needed
    }
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(name: string, connection: any, query: string): Promise<string> {
    return databaseDiffer.createSnapshot({
      name,
      query,
      database: this.getConnectionDatabase(connection)
    }, connection);
  }

  /**
   * Compare with snapshot
   */
  async compareSnapshot(name: string, connection: any): Promise<any> {
    return databaseDiffer.compareWithSnapshot(name, connection);
  }

  /**
   * Get connection database name
   */
  private getConnectionDatabase(connection: any): string {
    // PostgreSQL
    if (connection.database) return connection.database;
    // MySQL
    if (connection.config?.database) return connection.config.database;
    // MongoDB
    if (connection.databaseName) return connection.databaseName;
    // Default
    return 'unknown';
  }

  /**
   * Get diff logs
   */
  getDiffLogs(): any[] {
    return databaseDiffer.getDiffs();
  }

  /**
   * Format diff for output
   */
  formatDiff(diff: any, format: 'console' | 'json' = 'console'): string {
    return databaseDiffer.formatDiff(diff, format);
  }

  /**
   * Disable interception
   */
  disable(): void {
    // Note: Disabling module interception is complex as modules are cached
    // This would require clearing require cache and reloading modules
    this.interceptEnabled = false;
    this.emit('disabled');
  }
}

// Export singleton
export const databaseInterceptor = DatabaseInterceptor.getInstance();