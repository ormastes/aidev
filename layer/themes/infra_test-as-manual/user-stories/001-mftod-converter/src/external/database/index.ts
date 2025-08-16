/**
 * Database Module Entry Point
 * Provides factory for creating database adapters
 */

import { DatabaseAdapter, DatabaseConfig, MemoryDatabaseAdapter } from './DatabaseAdapter';
import { SqliteAdapter } from './SqliteAdapter';
import { PostgresAdapter } from './PostgresAdapter';

export * from './DatabaseAdapter';

export class DatabaseFactory {
  static async create(config: DatabaseConfig): Promise<DatabaseAdapter> {
    let adapter: DatabaseAdapter;

    switch (config.type) {
      case 'memory':
        adapter = new MemoryDatabaseAdapter(config);
        break;
      
      case 'sqlite':
        adapter = new SqliteAdapter(config);
        break;
      
      case "postgresql":
        adapter = new PostgresAdapter(config);
        break;
      
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }

    await adapter.connect();
    return adapter;
  }
}

// Default configuration based on environment
export function getDefaultDatabaseConfig(): DatabaseConfig {
  const env = process.env.NODE_ENV || "development";
  
  if (env === "production") {
    return {
      type: "postgresql",
      connection: {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || "testmanual",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres"
      }
    };
  } else if (env === 'test') {
    return {
      type: 'memory'
    };
  } else {
    return {
      type: 'sqlite',
      filePath: process.env.DB_PATH || './test-manual.db'
    };
  }
}