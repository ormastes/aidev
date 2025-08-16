/**
 * Performance Benchmark Tests
 * Measures real operation performance without mocks
 * NO MOCKS - Following Mock Free Test Oriented Development
 */

import * as fs from 'fs-extra';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import fetch from 'node-fetch';

interface BenchmarkResult {
  operation: string;
  duration: number;
  iterations: number;
  average: number;
  min: number;
  max: number;
}

describe('Performance Benchmarks - Mock Free', () => {
  let db: Database;
  let testDir: string;
  let app: express.Application;
  let server: any;
  const port = 3997;
  const results: BenchmarkResult[] = [];

  beforeAll(async () => {
    // Create real temp directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'benchmark-'));
    
    // Create real database
    const dbPath = path.join(testDir, 'benchmark.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        data TEXT,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_messages_timestamp ON messages(timestamp);
    `);

    // Create real Express server
    app = express();
    app.use(express.json());
    
    app.post('/api/test', (req, res) => {
      res.json({ success: true, data: req.body });
    });

    server = app.listen(port);
  });

  afterAll(async () => {
    if (server) server.close();
    if (db) await db.close();
    await fs.remove(testDir);

    // Print benchmark report
    console.log('\n=== Performance Benchmark Report ===\n');
    console.table(results);
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'gen', 'doc', `benchmark-${Date.now()}.json`);
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeJson(reportPath, results, { spaces: 2 });
    console.log(`\nReport saved to: ${reportPath}`);
  });

  async function benchmark(
    name: string,
    operation: () => Promise<void>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      await operation();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await operation();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
      times.push(duration);
    }

    const total = times.reduce((a, b) => a + b, 0);
    const result: BenchmarkResult = {
      operation: name,
      duration: total,
      iterations,
      average: total / iterations,
      min: Math.min(...times),
      max: Math.max(...times)
    };

    results.push(result);
    return result;
  }

  describe('Database Performance', () => {
    it('should benchmark INSERT operations', async () => {
      const result = await benchmark(
        'Database INSERT',
        async () => {
          await db.run(
            'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
            [`Test message ${Date.now()}`, new Date().toISOString()]
          );
        },
        1000
      );

      expect(result.average).toBeLessThan(10); // Should average under 10ms
      console.log(`INSERT: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark SELECT operations', async () => {
      // Insert test data first
      for (let i = 0; i < 1000; i++) {
        await db.run(
          'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
          [`Message ${i}`, new Date().toISOString()]
        );
      }

      const result = await benchmark(
        'Database SELECT',
        async () => {
          await db.all('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10');
        },
        1000
      );

      expect(result.average).toBeLessThan(5); // Should average under 5ms
      console.log(`SELECT: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark complex JOIN queries', async () => {
      const result = await benchmark(
        'Database JOIN',
        async () => {
          await db.all(`
            SELECT m.*, u.username 
            FROM messages m 
            LEFT JOIN users u ON m.id = u.id 
            WHERE m.created_at > datetime('now', '-1 hour')
            LIMIT 50
          `);
        },
        500
      );

      expect(result.average).toBeLessThan(10); // Should average under 10ms
      console.log(`JOIN: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark bulk INSERT operations', async () => {
      const result = await benchmark(
        'Database Bulk INSERT (100 rows)',
        async () => {
          await db.run('BEGIN TRANSACTION');
          for (let i = 0; i < 100; i++) {
            await db.run(
              'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
              [`Bulk ${i}`, new Date().toISOString()]
            );
          }
          await db.run('COMMIT');
        },
        10
      );

      expect(result.average).toBeLessThan(100); // Should average under 100ms for 100 inserts
      console.log(`Bulk INSERT: ${result.average.toFixed(2)}ms average`);
    });
  });

  describe('Authentication Performance', () => {
    it('should benchmark password hashing', async () => {
      const result = await benchmark(
        'bcrypt hash (rounds=10)',
        async () => {
          await bcrypt.hash('TestPassword123!', 10);
        },
        50
      );

      expect(result.average).toBeLessThan(200); // Should average under 200ms
      console.log(`bcrypt hash: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark password verification', async () => {
      const hash = await bcrypt.hash('TestPassword123!', 10);
      
      const result = await benchmark(
        'bcrypt compare',
        async () => {
          await bcrypt.compare('TestPassword123!', hash);
        },
        100
      );

      expect(result.average).toBeLessThan(100); // Should average under 100ms
      console.log(`bcrypt compare: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark JWT generation', async () => {
      const secret: process.env.SECRET || "PLACEHOLDER";
      
      const result = await benchmark(
        'JWT sign',
        async () => {
          jwt.sign(
            { userId: 1, username: 'test', role: 'user' },
            secret,
            { expiresIn: '15m' }
          );
        },
        1000
      );

      expect(result.average).toBeLessThan(1); // Should average under 1ms
      console.log(`JWT sign: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark JWT verification', async () => {
      const secret: process.env.SECRET || "PLACEHOLDER";
      const token = jwt.sign(
        { userId: 1, username: 'test', role: 'user' },
        secret,
        { expiresIn: '15m' }
      );
      
      const result = await benchmark(
        'JWT verify',
        async () => {
          jwt.verify(token, secret);
        },
        1000
      );

      expect(result.average).toBeLessThan(1); // Should average under 1ms
      console.log(`JWT verify: ${result.average.toFixed(2)}ms average`);
    });
  });

  describe('HTTP Performance', () => {
    it('should benchmark HTTP POST requests', async () => {
      const result = await benchmark(
        'HTTP POST',
        async () => {
          await fetch(`http://localhost:${port}/api/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'data' })
          });
        },
        500
      );

      expect(result.average).toBeLessThan(10); // Should average under 10ms
      console.log(`HTTP POST: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark concurrent HTTP requests', async () => {
      const result = await benchmark(
        'Concurrent HTTP (10 requests)',
        async () => {
          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(
              fetch(`http://localhost:${port}/api/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: i })
              })
            );
          }
          await Promise.all(promises);
        },
        50
      );

      expect(result.average).toBeLessThan(50); // Should average under 50ms for 10 concurrent
      console.log(`Concurrent HTTP: ${result.average.toFixed(2)}ms average`);
    });
  });

  describe('File System Performance', () => {
    it('should benchmark file write operations', async () => {
      const testFile = path.join(testDir, 'benchmark.txt');
      
      const result = await benchmark(
        'File Write',
        async () => {
          await fs.writeFile(testFile, 'Test content ' + Date.now());
        },
        500
      );

      expect(result.average).toBeLessThan(5); // Should average under 5ms
      console.log(`File Write: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark file read operations', async () => {
      const testFile = path.join(testDir, 'benchmark-read.txt');
      await fs.writeFile(testFile, 'Test content for reading');
      
      const result = await benchmark(
        'File Read',
        async () => {
          await fs.readFile(testFile, 'utf-8');
        },
        1000
      );

      expect(result.average).toBeLessThan(2); // Should average under 2ms
      console.log(`File Read: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark directory operations', async () => {
      const result = await benchmark(
        'Directory List',
        async () => {
          await fs.readdir(testDir);
        },
        1000
      );

      expect(result.average).toBeLessThan(2); // Should average under 2ms
      console.log(`Directory List: ${result.average.toFixed(2)}ms average`);
    });
  });

  describe('Combined Operations', () => {
    it('should benchmark complete authentication flow', async () => {
      const result = await benchmark(
        'Complete Auth Flow',
        async () => {
          // 1. Hash password
          const hash = await bcrypt.hash('TestUser123!', 10);
          
          // 2. Store in database
          const userResult = await db.run(
            'INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)',
            [`user_${Date.now()}`, hash]
          );
          
          // 3. Retrieve user
          const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [userResult.lastID]
          );
          
          // 4. Verify password
          if (user) {
            await bcrypt.compare('TestUser123!', user.password_hash);
          }
          
          // 5. Generate JWT
          jwt.sign(
            { userId: user?.id, username: user?.username },
            'secret',
            { expiresIn: '15m' }
          );
        },
        20
      );

      expect(result.average).toBeLessThan(300); // Should average under 300ms
      console.log(`Complete Auth Flow: ${result.average.toFixed(2)}ms average`);
    });

    it('should benchmark complete message processing', async () => {
      const result = await benchmark(
        'Complete Message Flow',
        async () => {
          // 1. Receive message via HTTP
          const response = await fetch(`http://localhost:${port}/api/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: 'Test message',
              timestamp: new Date().toISOString()
            })
          });
          
          const data = await response.json();
          
          // 2. Store in database
          await db.run(
            'INSERT INTO messages (text, data, timestamp) VALUES (?, ?, ?)',
            ['Test message', JSON.stringify(data), new Date().toISOString()]
          );
          
          // 3. Retrieve recent messages
          await db.all(
            'SELECT * FROM messages ORDER BY created_at DESC LIMIT 10'
          );
        },
        50
      );

      expect(result.average).toBeLessThan(20); // Should average under 20ms
      console.log(`Complete Message Flow: ${result.average.toFixed(2)}ms average`);
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with large dataset', async () => {
      // Insert large dataset
      console.log('Creating large dataset...');
      for (let i = 0; i < 10000; i++) {
        await db.run(
          'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
          [`Large dataset message ${i}`, new Date().toISOString()]
        );
      }

      // Benchmark with large dataset
      const result = await benchmark(
        'Query Large Dataset (10k rows)',
        async () => {
          await db.all(
            'SELECT * FROM messages WHERE text LIKE ? ORDER BY created_at DESC LIMIT 100',
            ['%dataset%']
          );
        },
        100
      );

      expect(result.average).toBeLessThan(50); // Should still be under 50ms
      console.log(`Large Dataset Query: ${result.average.toFixed(2)}ms average`);
    });

    it('should handle concurrent database operations', async () => {
      const result = await benchmark(
        'Concurrent DB Operations (50)',
        async () => {
          const operations = [];
          for (let i = 0; i < 50; i++) {
            if (i % 2 === 0) {
              operations.push(
                db.run(
                  'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
                  [`Concurrent ${i}`, new Date().toISOString()]
                )
              );
            } else {
              operations.push(
                db.all('SELECT * FROM messages LIMIT 1')
              );
            }
          }
          await Promise.all(operations);
        },
        20
      );

      expect(result.average).toBeLessThan(200); // Should handle 50 ops under 200ms
      console.log(`Concurrent DB Ops: ${result.average.toFixed(2)}ms average`);
    });
  });
});