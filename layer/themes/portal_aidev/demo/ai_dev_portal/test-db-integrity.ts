import sqlite3 from 'sqlite3';
import { path } from '../../../infra_external-log-lib/src';

interface CountResult {
  count: number;
}

interface DuplicateResult {
  total: number;
  unique_users?: number;
  unique_emails?: number;
}

interface OrphanResult {
  orphan_projects?: number;
  orphan_features?: number;
}

interface UserResult {
  username: string;
  role: string;
}

const sqlite = sqlite3.verbose();
const dbPath = path.join(__dirname, 'data', 'ai_dev_portal.db');
const db = new sqlite.Database(dbPath);

console.log('Testing database integrity...\n');

// Test 1: Check table existence
db.serialize(() => {
  console.log('1. Checking tables exist:');
  const tables = ['users', 'projects', 'features', 'tasks', 'sessions'];
  
  tables.forEach(table => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
      if (err) {
        console.error(`   ❌ Error checking ${table}:`, err);
      } else if (row) {
        console.log(`   🔄 Table '${table}' exists`);
      } else {
        console.error(`   ❌ Table '${table}' missing!`);
      }
    });
  });

  // Test 2: Check user data
  setTimeout(() => {
    console.log('\n2. Checking demo users:');
    db.all<UserResult>('SELECT username, role FROM users ORDER BY username', (err, users) => {
      if (err) {
        console.error('   ❌ Error fetching users:', err);
      } else {
        users.forEach(user => {
          console.log(`   🔄 User '${user.username}' (${user.role})`);
        });
      }
    });
  }, 100);

  // Test 3: Check referential integrity
  setTimeout(() => {
    console.log('\n3. Testing referential integrity:');
    
    // Check if all projects have valid user_id
    db.get<OrphanResult>(`SELECT COUNT(*) as orphan_projects FROM projects p 
            LEFT JOIN users u ON p.user_id = u.id 
            WHERE u.id IS NULL`, (err, result) => {
      if (err) {
        console.error('   ❌ Error checking project integrity:', err);
      } else if (result && result.orphan_projects && result.orphan_projects > 0) {
        console.error(`   ❌ Found ${result.orphan_projects} orphaned projects!`);
      } else {
        console.log('   🔄 All projects have valid users');
      }
    });

    // Check if all features have valid project_id
    db.get<OrphanResult>(`SELECT COUNT(*) as orphan_features FROM features f 
            LEFT JOIN projects p ON f.project_id = p.id 
            WHERE p.id IS NULL`, (err, result) => {
      if (err) {
        console.error('   ❌ Error checking feature integrity:', err);
      } else if (result && result.orphan_features && result.orphan_features > 0) {
        console.error(`   ❌ Found ${result.orphan_features} orphaned features!`);
      } else {
        console.log('   🔄 All features have valid projects');
      }
    });
  }, 200);

  // Test 4: Check for duplicate data
  setTimeout(() => {
    console.log('\n4. Checking for duplicates:');
    
    db.get<DuplicateResult>(`SELECT COUNT(*) as total, COUNT(DISTINCT username) as unique_users FROM users`, (err, result) => {
      if (err) {
        console.error('   ❌ Error checking duplicates:', err);
      } else if (result && result.total !== result.unique_users) {
        console.error(`   ❌ Found duplicate usernames!`);
      } else {
        console.log('   🔄 No duplicate usernames');
      }
    });

    db.get<DuplicateResult>(`SELECT COUNT(*) as total, COUNT(DISTINCT email) as unique_emails FROM users`, (err, result) => {
      if (err) {
        console.error('   ❌ Error checking email duplicates:', err);
      } else if (result && result.total !== result.unique_emails) {
        console.error(`   ❌ Found duplicate emails!`);
      } else {
        console.log('   🔄 No duplicate emails');
      }
    });
  }, 300);

  // Test 5: Performance metrics
  setTimeout(() => {
    console.log('\n5. Performance metrics:');
    
    db.get<CountResult>('SELECT COUNT(*) as count FROM users', (err, result) => {
      if (!err && result) {
        console.log(`   📊 Total users: ${result.count}`);
      }
    });
    
    db.get<CountResult>('SELECT COUNT(*) as count FROM projects', (err, result) => {
      if (!err && result) {
        console.log(`   📊 Total projects: ${result.count}`);
      }
    });
    
    db.get<CountResult>('SELECT COUNT(*) as count FROM features', (err, result) => {
      if (!err && result) {
        console.log(`   📊 Total features: ${result.count}`);
      }
    });
    
    db.get<CountResult>('SELECT COUNT(*) as count FROM tasks', (err, result) => {
      if (!err && result) {
        console.log(`   📊 Total tasks: ${result.count}`);
      }
    });
  }, 400);

  // Close database after tests
  setTimeout(() => {
    db.close((err: Error | null) => {
      if (err) {
        console.error('\n❌ Error closing database:', err);
      } else {
        console.log('\n🔄 Database integrity check In Progress!');
      }
    });
  }, 500);
});