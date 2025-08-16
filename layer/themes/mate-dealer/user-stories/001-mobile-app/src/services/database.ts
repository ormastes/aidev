/**
 * PostgreSQL Database Configuration and Connection Management
 * 
 * This service provides database connection pooling and management
 * for the Mate Dealer application. NO SQLite is used - PostgreSQL only.
 */

import { Pool, PoolConfig, QueryResult } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Maximum number of clients in the pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  private constructor(config?: DatabaseConfig) {
    this.config = config || this.getDefaultConfig();
  }

  static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  private getDefaultConfig(): DatabaseConfig {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production' || env === 'release') {
      return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'mate_dealer_prod',
        user: process.env.DB_USER || 'mate_user',
        password: process.env.DB_PASSWORD || '',
        max: 20, // Connection pool size for production
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: { rejectUnauthorized: false }
      };
    } else if (env === 'demo') {
      return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'mate_dealer_demo',
        user: process.env.DB_USER || 'mate_user',
        password: process.env.DB_PASSWORD || 'demo_password',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: false
      };
    } else {
      // Development configuration
      return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'mate_dealer_dev',
        user: process.env.DB_USER || 'mate_user',
        password: process.env.DB_PASSWORD || 'dev_password',
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: false
      };
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.pool) {
      return;
    }

    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.max || 10,
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 2000,
      };

      if (this.config.ssl) {
        poolConfig.ssl = this.config.ssl;
      }

      this.pool = new Pool(poolConfig);

      // Test the connection
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      
      console.log(`Connected to PostgreSQL database: ${this.config.database}`);
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Disconnected from PostgreSQL database');
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool || !this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.pool!.query<T>(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async transaction<T = any>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    if (!this.pool || !this.isConnected) {
      await this.connect();
    }

    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Migration methods
  async createTables(): Promise<void> {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Products table (mate products)
      `CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(100),
        brand VARCHAR(100),
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        shipping_address TEXT,
        billing_address TEXT,
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Order items table
      `CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Cart table
      `CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        device_info TEXT,
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Payments table
      `CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        gateway_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )`,

      // Create indexes for performance
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)`
    ];

    for (const query of queries) {
      await this.query(query);
    }

    console.log('Database tables created successfully');
  }

  // Seed initial data
  async seedData(): Promise<void> {
    // Check if data already exists
    const usersResult = await this.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersResult.rows[0].count) > 0) {
      console.log('Database already contains data, skipping seed');
      return;
    }

    // Seed users
    await this.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role)
      VALUES 
        ('admin', 'admin@matedealer.com', '$2b$10$YourHashedPasswordHere', 'Admin', 'User', 'admin'),
        ('customer1', 'customer1@example.com', '$2b$10$YourHashedPasswordHere', 'John', 'Doe', 'customer'),
        ('customer2', 'customer2@example.com', '$2b$10$YourHashedPasswordHere', 'Jane', 'Smith', 'customer')
    `);

    // Seed products (mate products)
    await this.query(`
      INSERT INTO products (name, description, price, stock_quantity, category, brand, image_url)
      VALUES 
        ('Yerba Mate Traditional 500g', 'Classic yerba mate blend with stems', 12.99, 100, 'Traditional', 'MateMax', '/images/traditional-500g.jpg'),
        ('Yerba Mate Pure Leaf 1kg', 'Pure leaf yerba mate without stems', 24.99, 50, 'Pure Leaf', 'MateMax', '/images/pure-leaf-1kg.jpg'),
        ('Organic Yerba Mate 500g', 'Certified organic yerba mate', 18.99, 75, 'Organic', 'EcoMate', '/images/organic-500g.jpg'),
        ('Mate Gourd - Traditional', 'Handcrafted calabash gourd', 34.99, 30, 'Accessories', 'Artisan', '/images/gourd-traditional.jpg'),
        ('Bombilla - Stainless Steel', 'Premium stainless steel bombilla straw', 14.99, 60, 'Accessories', 'MateMax', '/images/bombilla-steel.jpg'),
        ('Mate Starter Kit', 'Complete kit with gourd, bombilla, and 250g mate', 49.99, 25, 'Kits', 'MateMax', '/images/starter-kit.jpg'),
        ('Energy Mate Blend 500g', 'Mate blend with guarana for extra energy', 16.99, 40, 'Blends', 'PowerMate', '/images/energy-blend.jpg'),
        ('Relaxing Mate Blend 500g', 'Mate with chamomile and mint', 15.99, 45, 'Blends', 'ZenMate', '/images/relax-blend.jpg')
    `);

    console.log('Database seeded with initial data');
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const result = await this.query('SELECT NOW() as time, version() as version');
      return {
        healthy: true,
        message: `PostgreSQL is healthy. Server time: ${result.rows[0].time}`
      };
    } catch (error) {
      return {
        healthy: false,
        message: `PostgreSQL health check failed: ${error}`
      };
    }
  }

  // Get pool statistics
  getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } | null {
    if (!this.pool) {
      return null;
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }
}

export default DatabaseService;