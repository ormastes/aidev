import { config } from 'dotenv';
import { Client, ClientConfig } from 'pg';
import sqlite3 from 'sqlite3';

// Load environment-specific .env file
config();
const envFile = process.env.NODE_ENV === "development" ? '.env.development' : '.env';
config({ path: envFile });

// Type definitions
interface PostgresConfig {
  type: "postgres";
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

interface SQLiteConfig {
  type: 'sqlite';
  path: string;
}

type DatabaseConfig = PostgresConfig | SQLiteConfig;

type Database = Client | sqlite3.Database;

export function getDbConfig(): DatabaseConfig {
  // Auto-select database based on environment
  let dbType = process.env.DB_TYPE;
  
  if (!dbType) {
    // Default based on NODE_ENV
    if (process.env.NODE_ENV === "development") {
      dbType = 'sqlite';
    } else {
      dbType = "postgres";
    }
  }
  
  if (dbType === "postgres") {
    // PostgreSQL configuration
    if (process.env.DATABASE_URL) {
      // Use connection string if provided
      return {
        type: "postgres",
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
      };
    } else {
      // Use individual parameters
      return {
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ai_dev_portal',
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
      };
    }
  } else {
    // SQLite configuration (default)
    return {
      type: 'sqlite',
      path: process.env.SQLITE_PATH || './data/ai_dev_portal.db'
    };
  }
};

// Database connection wrapper
export async function createConnection(): Promise<Database> {
  const config = getDbConfig();
  
  if (config.type === "postgres") {
    const clientConfig: ClientConfig = config.connectionString ? {
      connectionString: config.connectionString,
      ssl: config.ssl
    } : {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    };
    
    const client = new Client(clientConfig);
    await client.connect();
    console.log('Connected to PostgreSQL database');
    return client;
  } else {
    // SQLite
    const sqlite = sqlite3.verbose();
    const db = new sqlite.Database(config.path);
    console.log('Connected to SQLite database at:', config.path);
    return db;
  }
};

// Query wrapper to handle both databases
export function query<T = any>(db: Database, sql: string, params: any[] = []): Promise<T[]> {
  const config = getDbConfig();
  
  return new Promise((resolve, reject) => {
    if (config.type === "postgres") {
      (db as Client).query(sql, params)
        .then(result => resolve(result.rows as T[]))
        .catch(reject);
    } else {
      // SQLite
      if (sql.toLowerCase().startsWith('select')) {
        (db as sqlite3.Database).all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows as T[]);
        });
      } else {
        (db as sqlite3.Database).run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
          if (err) reject(err);
          else resolve([{ lastID: this.lastID, changes: this.changes }] as any);
        });
      }
    }
  });
};

// Get single row
export const queryOne = <T = any>(db: Database, sql: string, params: any[] = []): Promise<T | undefined> => {
  const config = getDbConfig();
  
  return new Promise((resolve, reject) => {
    if (config.type === "postgres") {
      (db as Client).query(sql, params)
        .then(result => resolve(result.rows[0] as T))
        .catch(reject);
    } else {
      // SQLite
      (db as sqlite3.Database).get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    }
  });
};