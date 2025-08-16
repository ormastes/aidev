import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { path } from '../../../../../../infra_external-log-lib/src';
import dotenv from 'dotenv';
import { Database } from 'sqlite3';
import { promisify } from 'util';
import { logger, loggingMiddleware, errorLoggingMiddleware } from './services/ExternalLogger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3303;
const JWT_SECRET = process.env.JWT_SECRET || 'mate-dealer-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize SQLite database
const db = new Database(':memory:'); // Use file-based in production
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false
}));
app.use(cors({
  origin: NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(loggingMiddleware);

// Initialize database tables
async function initDatabase() {
  try {
    // Users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer', 'dealer')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dealers table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS dealers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        business_name TEXT NOT NULL,
        description TEXT,
        rating REAL DEFAULT 0,
        total_customers INTEGER DEFAULT 0,
        active_orders INTEGER DEFAULT 0,
        monthly_revenue REAL DEFAULT 0,
        latitude REAL,
        longitude REAL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Products table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dealer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dealer_id) REFERENCES dealers(id)
      )
    `);

    // Orders table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        dealer_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (dealer_id) REFERENCES dealers(id)
      )
    `);

    // Reviews table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        dealer_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (dealer_id) REFERENCES dealers(id)
      )
    `);

    // Insert demo data
    await insertDemoData();
    
    logger.info('Database initialized successfully', 'DATABASE');
  } catch (error) {
    logger.error('Database initialization failed', 'DATABASE', {}, error as Error);
    throw error;
  }
}

// Insert demo data
async function insertDemoData() {
  try {
    // Check if demo data already exists
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
    if (existingUser) return;

    // Create demo users
    const demoPasswordHash = await bcrypt.hash('demo123', 10);
    
    // Customer user
    await dbRun(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      ['demo@example.com', demoPasswordHash, 'customer']
    );
    
    // Dealer users
    const dealerIds = [];
    const dealers = [
      { email: 'juan@matedealer.com', name: "Juan's Mate Shop" },
      { email: 'maria@matedealer.com', name: "Maria's Traditional Mate" },
      { email: 'gaucho@matedealer.com', name: "El Gaucho Mate" },
      { email: 'green@matedealer.com', name: "Green Leaf Mate Co." }
    ];

    for (const dealer of dealers) {
      await dbRun(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [dealer.email, demoPasswordHash, 'dealer']
      );
      
      const user = await dbGet('SELECT id FROM users WHERE email = ?', [dealer.email]);
      
      await dbRun(
        'INSERT INTO dealers (user_id, business_name, rating, total_customers, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, dealer.name, 4.5 + Math.random() * 0.5, Math.floor(Math.random() * 50) + 10, 
         -34.6037 + (Math.random() - 0.5) * 0.1, -58.3816 + (Math.random() - 0.5) * 0.1]
      );
      
      const dealerRecord = await dbGet('SELECT id FROM dealers WHERE user_id = ?', [user.id]);
      dealerIds.push(dealerRecord.id);
    }

    // Add sample products
    const products = [
      { name: 'Traditional Yerba Mate', price: 12.99, category: 'Traditional' },
      { name: 'Organic Mate Blend', price: 18.99, category: 'Organic' },
      { name: 'Flavored Mate - Mint', price: 14.99, category: 'Flavored' },
      { name: 'Premium Argentine Mate', price: 24.99, category: 'Premium' }
    ];

    for (const dealerId of dealerIds) {
      for (const product of products) {
        await dbRun(
          'INSERT INTO products (dealer_id, name, price, category, stock) VALUES (?, ?, ?, ?, ?)',
          [dealerId, product.name, product.price, product.category, Math.floor(Math.random() * 100) + 10]
        );
      }
    }

    logger.info('Demo data inserted successfully', 'DATABASE');
  } catch (error) {
    logger.error('Failed to insert demo data', 'DATABASE', {}, error as Error);
  }
}

// JWT token generation
function generateTokens(userId: number, email: string, role: string) {
  const accessToken = jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

// Authentication middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = user;
    next();
  });
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'mate-dealer',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, businessName } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    if (!['customer', 'dealer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'dealer' && !businessName) {
      return res.status(400).json({ error: 'Business name is required for dealers' });
    }

    // Check if user exists
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await dbRun(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, role]
    );

    const user = await dbGet('SELECT id, email, role FROM users WHERE email = ?', [email]);

    // If dealer, create dealer record
    if (role === 'dealer') {
      await dbRun(
        'INSERT INTO dealers (user_id, business_name) VALUES (?, ?)',
        [user.id, businessName]
      );
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email, user.role);

    logger.logUserAction('user_registered', { userId: user.id, role });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens
    });
  } catch (error) {
    logger.error('Registration failed', 'AUTH', { email: req.body.email }, error as Error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await dbGet(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?',
      [email]
    ) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check role if specified
    if (role && user.role !== role) {
      return res.status(401).json({ error: 'Invalid role for this user' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email, user.role);

    logger.logUserAction('user_login', { userId: user.id, role: user.role });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens
    });
  } catch (error) {
    logger.error('Login failed', 'AUTH', { email: req.body.email }, error as Error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    jwt.verify(refreshToken, JWT_SECRET, (err: any, decoded: any) => {
      if (err || decoded.type !== 'refresh') {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const tokens = generateTokens(decoded.userId, decoded.email, decoded.role);
      res.json(tokens);
    });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Protected routes

// Get dealers (for customers)
app.get('/api/dealers', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    let query = `
      SELECT d.*, u.email, 
        COUNT(DISTINCT r.id) as review_count,
        AVG(r.rating) as average_rating
      FROM dealers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN reviews r ON d.id = r.dealer_id
      GROUP BY d.id
    `;

    const dealers = await dbAll(query);

    // Calculate distance if coordinates provided
    if (lat && lng) {
      dealers.forEach((dealer: any) => {
        if (dealer.latitude && dealer.longitude) {
          const distance = calculateDistance(
            parseFloat(lat as string),
            parseFloat(lng as string),
            dealer.latitude,
            dealer.longitude
          );
          dealer.distance = distance;
        }
      });

      // Sort by distance
      dealers.sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));
    }

    res.json(dealers);
  } catch (error) {
    logger.error('Failed to fetch dealers', 'API', {}, error as Error);
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
});

// Get dealer products
app.get('/api/dealers/:dealerId/products', authenticateToken, async (req, res) => {
  try {
    const { dealerId } = req.params;
    
    const products = await dbAll(
      'SELECT * FROM products WHERE dealer_id = ? AND stock > 0',
      [dealerId]
    );

    res.json(products);
  } catch (error) {
    logger.error('Failed to fetch products', 'API', { dealerId: req.params.dealerId }, error as Error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create order
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { dealerId, items } = req.body;
    const userId = (req as any).user.userId;

    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      const product = await dbGet(
        'SELECT price FROM products WHERE id = ? AND dealer_id = ?',
        [item.productId, dealerId]
      ) as any;
      
      if (!product) {
        return res.status(400).json({ error: `Invalid product: ${item.productId}` });
      }
      
      totalAmount += product.price * item.quantity;
    }

    // Create order
    await dbRun(
      'INSERT INTO orders (customer_id, dealer_id, total_amount) VALUES (?, ?, ?)',
      [userId, dealerId, totalAmount]
    );

    const order = await dbGet('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [userId]);

    logger.logUserAction('order_created', { orderId: order.id, totalAmount });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    logger.error('Failed to create order', 'API', req.body, error as Error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get dealer dashboard data
app.get('/api/dealer/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== 'dealer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dealer = await dbGet('SELECT * FROM dealers WHERE user_id = ?', [userId]) as any;
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer profile not found' });
    }

    // Get metrics
    const metrics = await dbGet(`
      SELECT 
        COUNT(DISTINCT o.customer_id) as total_customers,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as active_orders,
        SUM(CASE WHEN o.created_at >= date('now', '-30 days') THEN o.total_amount ELSE 0 END) as monthly_revenue,
        AVG(r.rating) as average_rating,
        COUNT(DISTINCT p.id) as total_products
      FROM dealers d
      LEFT JOIN orders o ON d.id = o.dealer_id
      LEFT JOIN reviews r ON d.id = r.dealer_id
      LEFT JOIN products p ON d.id = p.dealer_id
      WHERE d.id = ?
    `, [dealer.id]);

    res.json({
      dealer,
      metrics
    });
  } catch (error) {
    logger.error('Failed to fetch dealer dashboard', 'API', {}, error as Error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Error handling middleware
app.use(errorLoggingMiddleware);

// Helper function to calculate distance between coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Mate Dealer server running on http://localhost:${PORT}`, 'SERVER', {
        port: PORT,
        environment: NODE_ENV
      });
      console.log(`🚀 Mate Dealer server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', 'SERVER', {}, error as Error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();