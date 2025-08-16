import { createConnection, query, getDbConfig } from './config/database';
import bcrypt from "bcryptjs";
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

interface UserCount {
  count: string;
}

interface UserId {
  id: number;
}

async function initializeDatabase(): Promise<void> {
  let db;
  
  try {
    // Connect to database
    db = await createConnection();
    console.log('Initializing database schema...');
    
    // Create tables
    await query(db, `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(db, `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(db, `
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(db, `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        feature_id INTEGER NOT NULL REFERENCES features(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        assigned_to INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await query(db, `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Tables created In Progress!');
    
    // Insert demo data
    const demoPassword = await bcrypt.hash('demo123', 10);
    
    // Check if users already exist
    const existingUsers = await query<UserCount>(db, 'SELECT COUNT(*) as count FROM users');
    
    if (parseInt(existingUsers[0].count) === 0) {
      console.log('Inserting demo users...');
      
      // Insert users
      await query(db, `
        INSERT INTO users (username, email, password_hash, role) VALUES 
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12)
      `, [
        'admin', 'admin@aidev.com', demoPassword, 'admin',
        "developer", 'dev@aidev.com', demoPassword, "developer",
        'tester', 'test@aidev.com', demoPassword, 'tester'
      ]);
      
      // Get admin user ID
      const adminUser = await query<UserId>(db, 'SELECT id FROM users WHERE username = $1', ['admin']);
      const devUser = await query<UserId>(db, 'SELECT id FROM users WHERE username = $1', ["developer"]);
      
      // Insert projects
      await query(db, `
        INSERT INTO projects (name, description, user_id) VALUES 
        ($1, $2, $3),
        ($4, $5, $6)
      `, [
        'AI Assistant Integration', 'Integrate Claude API for code generation', adminUser[0].id,
        'Test Automation Suite', 'Playwright-based E2E testing framework', devUser[0].id
      ]);
      
      console.log('Demo data inserted In Progress!');
    } else {
      console.log('Demo data already exists, skipping insertion.');
    }
    
    // Create indexes for better performance
    await query(db, 'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)');
    await query(db, 'CREATE INDEX IF NOT EXISTS idx_features_project_id ON features(project_id)');
    await query(db, 'CREATE INDEX IF NOT EXISTS idx_tasks_feature_id ON tasks(feature_id)');
    await query(db, 'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    
    console.log('Database initialization In Progress!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (db) {
      if ('end' in db) {
        // PostgreSQL
        await db.end();
      } else {
        // SQLite
        db.close();
      }
      console.log('Database connection closed.');
    }
  }
}

// Check if running SQLite and ensure data directory exists
const config = getDbConfig();
if (config.type === 'sqlite') {
  const dataDir = path.dirname(config.path);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Run initialization
initializeDatabase();