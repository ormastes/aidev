require('dotenv').config();

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
require('dotenv').config({ path: envFile });

const getDbConfig = () => {
  // Auto-select database based on environment
  let dbType = process.env.DB_TYPE;
  
  if (!dbType) {
    // Default based on NODE_ENV
    if (process.env.NODE_ENV === 'development') {
      dbType = 'sqlite';
    } else {
      dbType = 'postgres';
    }
  }
  
  if (dbType === 'postgres') {
    // PostgreSQL configuration
    if (process.env.DATABASE_URL) {
      // Use connection string if provided
      return {
        type: 'postgres',
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    } else {
      // Use individual parameters
      return {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ai_dev_portal',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
const createConnection = async () => {
  const config = getDbConfig();
  
  if (config.type === 'postgres') {
    const { Client } = require('pg');
    
    const client = new Client(config.connectionString ? {
      connectionString: config.connectionString,
      ssl: config.ssl
    } : {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    });
    
    await client.connect();
    console.log('Connected to PostgreSQL database');
    return client;
  } else {
    // SQLite
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(config.path);
    console.log('Connected to SQLite database at:', config.path);
    return db;
  }
};

// Query wrapper to handle both databases
const query = (db, sql, params = []) => {
  const config = getDbConfig();
  
  return new Promise((resolve, reject) => {
    if (config.type === 'postgres') {
      db.query(sql, params)
        .then(result => resolve(result.rows))
        .catch(reject);
    } else {
      // SQLite
      if (sql.toLowerCase().startsWith('select')) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    }
  });
};

// Get single row
const queryOne = (db, sql, params = []) => {
  const config = getDbConfig();
  
  return new Promise((resolve, reject) => {
    if (config.type === 'postgres') {
      db.query(sql, params)
        .then(result => resolve(result.rows[0]))
        .catch(reject);
    } else {
      // SQLite
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }
  });
};

module.exports = {
  getDbConfig,
  createConnection,
  query,
  queryOne
};