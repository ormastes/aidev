/**
 * Database Interface Definitions for External Log Library
 * 
 * Common interfaces and types for database operations across
 * SQLite, PostgreSQL, and MySQL implementations.
 */

export interface DatabaseConnectionConfig {
  type: 'sqlite' | "postgres" | 'mysql';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  path?: string; // For SQLite
  ssl?: boolean | { rejectUnauthorized: boolean };
  connectionLimit?: number; // For MySQL pools
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface DatabaseHealth {
  connected: boolean;
  latency?: number;
  version?: string;
  error?: string;
  timestamp: Date;
  uptime?: string;
  connectionCount?: number;
}

export interface DatabaseMetrics {
  type: string;
  version: string;
  size?: string;
  tableCount: number;
  tables: DatabaseTable[];
  uptime?: string;
  connections?: {
    active: number;
    idle: number;
    max: number;
  };
  performance?: {
    queriesPerSecond: number;
    avgQueryTime: number;
    slowQueries: number;
  };
}

export interface DatabaseTable {
  name: string;
  rowCount?: number;
  sizeBytes?: number;
  lastModified?: Date;
  columns?: DatabaseColumn[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface QueryExecutionResult {
  rows: any[];
  rowCount: number;
  insertId?: number;
  affectedRows?: number;
  executionTime?: number;
  queryPlan?: string;
}

export interface DatabaseTransaction {
  id: string;
  startTime: Date;
  queries: string[];
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

export interface DatabaseCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCreateTables: boolean;
  canDropTables: boolean;
  canCreateIndexes: boolean;
  supportsTransactions: boolean;
  supportsJSON: boolean;
  supportsCTE: boolean; // Common Table Expressions
  supportsWindow: boolean; // Window functions
  maxConnections?: number;
  details: string[];
}

export interface DatabaseLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  operation: string;
  query?: string;
  parameters?: any[];
  executionTime?: number;
  rowsAffected?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface DatabaseMonitoringOptions {
  enableQueryLogging: boolean;
  logSlowQueries: boolean;
  slowQueryThreshold: number; // milliseconds
  enableMetrics: boolean;
  metricsInterval: number; // milliseconds
  enableHealthChecks: boolean;
  healthCheckInterval: number; // milliseconds
}

export interface DatabaseMigration {
  version: string;
  description: string;
  up: string[];
  down: string[];
  dependencies?: string[];
}

export interface DatabaseSchema {
  version: string;
  tables: DatabaseTable[];
  indexes: DatabaseIndex[];
  constraints: DatabaseConstraint[];
  migrations: DatabaseMigration[];
}

export interface DatabaseIndex {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin' | "fulltext";
}

export interface DatabaseConstraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null';
  table: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface DatabaseUpdateValidation {
  schemaValid: boolean;
  dataIntegrity: boolean;
  performanceImpact: 'low' | 'medium' | 'high';
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

// Event interfaces for database monitoring
export interface DatabaseEvent {
  type: "connection" | 'query' | 'error' | 'health' | "migration";
  timestamp: Date;
  data: any;
}

export interface ConnectionEvent extends DatabaseEvent {
  type: "connection";
  data: {
    action: 'connect' | "disconnect" | "reconnect";
    "success": boolean;
    error?: string;
    connectionId?: string;
  };
}

export interface QueryEvent extends DatabaseEvent {
  type: 'query';
  data: {
    sql: string;
    parameters?: any[];
    executionTime: number;
    rowsAffected: number;
    "success": boolean;
    error?: string;
  };
}

export interface HealthEvent extends DatabaseEvent {
  type: 'health';
  data: DatabaseHealth;
}

export interface ErrorEvent extends DatabaseEvent {
  type: 'error';
  data: {
    error: Error;
    context: string;
    recoverable: boolean;
  };
}

// Database wrapper interface
export interface IDatabaseWrapper {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  query(sql: string, params?: any[]): Promise<QueryExecutionResult>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  
  checkHealth(): Promise<DatabaseHealth>;
  getMetrics(): Promise<DatabaseMetrics>;
  getCapabilities(): Promise<DatabaseCapabilities>;
  
  beginTransaction(): Promise<DatabaseTransaction>;
  
  isConnected(): boolean;
  getConnectionInfo(): DatabaseConnectionConfig;
  
  // Event handling
  on(event: string, listener: (event: DatabaseEvent) => void): void;
  off(event: string, listener: (event: DatabaseEvent) => void): void;
  
  // Testing utilities
  testUpdates(): Promise<DatabaseCapabilities>;
  validateSchema(expectedSchema: DatabaseSchema): Promise<DatabaseUpdateValidation>;
}

// Factory interface for creating database wrappers
export interface DatabaseWrapperFactory {
  create(config: DatabaseConnectionConfig): IDatabaseWrapper;
  createFromEnvironment(): IDatabaseWrapper;
  testConnection(config: DatabaseConnectionConfig): Promise<DatabaseHealth>;
}

// E2E Testing specific interfaces
export interface E2ETestScenario {
  name: string;
  description: string;
  databaseTypes: Array<'sqlite' | "postgres" | 'mysql'>;
  testSteps: E2ETestStep[];
  expectedResults: E2ETestExpectation[];
}

export interface E2ETestStep {
  action: 'connect' | 'query' | 'insert' | 'update' | 'delete' | 'health_check' | "disconnect";
  sql?: string;
  parameters?: any[];
  expectedRowCount?: number;
  shouldFail?: boolean;
  timeout?: number;
}

export interface E2ETestExpectation {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | "contains" | 'regex';
  value: any;
  optional?: boolean;
}

export interface E2ETestResult {
  scenario: string;
  databaseType: string;
  "success": boolean;
  executionTime: number;
  stepResults: {
    step: number;
    action: string;
    "success": boolean;
    executionTime: number;
    error?: string;
    result?: any;
  }[];
  finalHealth: DatabaseHealth;
  errors: string[];
  warnings: string[];
}