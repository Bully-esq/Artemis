// server.js - Fixed for better-sqlite3
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy to handle Cloudflare correctly
app.set('trust proxy', true);

// Verify JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
}

// JWT Secret for signing tokens
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '24h';

// Database connection
let db;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'https://app.uncharted.social'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Security headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - can be adjusted as needed
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://app.uncharted.social;");
  
  next();
});

// Redirect to HTTPS for the production domain (Cloudflare compatible)
app.use((req, res, next) => {
  // Cloudflare sends the 'cf-visitor' header with the scheme
  const cfVisitor = req.headers['cf-visitor'] ? JSON.parse(req.headers['cf-visitor']) : {};
  
  // Check various headers that might indicate the request protocol
  const isNotSecure = 
    (cfVisitor.scheme === 'http') || 
    (req.headers['x-forwarded-proto'] === 'http') ||
    (!req.secure && req.hostname === 'app.uncharted.social');
  
  if (isNotSecure) {
    return res.redirect(`https://${req.hostname}${req.url}`);
  }
  next();
});

// Configure rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust Cloudflare's forwarded IP
  trustProxy: true,
  // Use CF-Connecting-IP header if available
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] || req.ip;
  },
  message: { 
    error: 'Too many login attempts from this IP, please try again after 15 minutes' 
  }
});

// Authentication middleware
const auth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Initialize database
async function initDatabase() {
  try {
    console.log('Initializing database...');
    const dbFile = path.join(__dirname, 'data', 'axtondb.sqlite');
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Open database connection
    // NOTE: better-sqlite3 is synchronous, no need for promisify
    db = new Database(dbFile);
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        createdAt TEXT,
        updatedAt TEXT,
        lastLogin TEXT,
        deleted INTEGER DEFAULT 0
      );
    `);
    
    // Create suppliers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        deleted INTEGER DEFAULT 0
      );
    `);
    
    // Create catalog items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS catalog (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        supplier TEXT,
        category TEXT,
        cost REAL,
        leadTime INTEGER,
        description TEXT,
        notes TEXT,
        hidden INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY (supplier) REFERENCES suppliers(id)
      );
    `);
    
    // Create quotes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        name TEXT,
        clientName TEXT,
        clientCompany TEXT,
        clientEmail TEXT,
        clientPhone TEXT,
        clientAddress TEXT,
        date TEXT,
        validUntil TEXT,
        paymentTerms TEXT,
        customTerms TEXT,
        notes TEXT,
        includeDrawingOption INTEGER DEFAULT 0,
        exclusions TEXT,
        selectedItems TEXT,
        hiddenCosts TEXT,
        globalMarkup INTEGER,
        distributionMethod TEXT,
        savedAt TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        deleted INTEGER DEFAULT 0
      );
    `);
    
    // Create invoices table
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        quoteId TEXT,
        invoiceNumber TEXT,
        clientName TEXT,
        clientCompany TEXT,
        clientEmail TEXT,
        clientPhone TEXT,
        clientAddress TEXT,
        invoiceDate TEXT,
        dueDate TEXT,
        amount REAL,
        description TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        paidAt TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY (quoteId) REFERENCES quotes(id)
      );
    `);
    
    // Create settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      );
    `);
    
    // Create contacts table with GDPR compliance fields
    db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT,
        company TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        gdprConsent INTEGER DEFAULT 0,
        gdprConsentDate TEXT,
        gdprConsentSource TEXT,
        marketingConsent INTEGER DEFAULT 0,
        marketingConsentDate TEXT,
        customerType TEXT DEFAULT 'individual',
        lastContactDate TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        deleted INTEGER DEFAULT 0
      );
    `);
    
    // Create activities table
    db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        timestamp TEXT,
        relatedDocumentId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY (contactId) REFERENCES contacts(id)
      );
    `);
    
    // Create default admin user if none exists
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ? AND deleted = 0').get('admin@example.com');
    
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('Artemis#Admin2023!', 10);
      const now = new Date().toISOString();
      
      db.prepare(`
        INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        'admin@example.com',
        hashedPassword,
        'Admin User',
        'admin',
        now,
        now
      );
      
      console.log('Default admin user created');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Helper function to wrap database operations in a promise for async routes
function runAsync(callback) {
  return new Promise((resolve, reject) => {
    try {
      const result = callback();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

// ====== API ROUTES ======

// Ping endpoint for health checks
app.get('/api/ping', (req, res) => {
  res.json({ 
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ===== AUTHENTICATION ROUTES =====

// Register new user
app.post('/api/auth/register', async (req, res) => {
  // Registration is disabled
  return res.status(403).json({ 
    success: false, 
    error: 'Registration is currently disabled by the administrator' 
  });
  
  /* Original registration code commented out
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await runAsync(() => 
      db.prepare('SELECT id FROM users WHERE email = ? AND deleted = 0').get(email)
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    await runAsync(() => 
      db.prepare(`
        INSERT INTO users (id, email, password, name, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        email,
        hashedPassword,
        name || email.split('@')[0],
        now,
        now
      )
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Get the created user (without password)
    const user = await runAsync(() => 
      db.prepare('SELECT id, email, name, role, createdAt FROM users WHERE id = ?').get(userId)
    );
    
    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
  */
});

// Login user
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get client IP, respecting Cloudflare headers
    const clientIP = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
    
    if (!email || !password) {
      // Log invalid attempt
      console.log(`[${new Date().toISOString()}] SECURITY: Login attempt with missing credentials from IP: ${clientIP}`);
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = await runAsync(() => 
      db.prepare('SELECT * FROM users WHERE email = ? AND deleted = 0').get(email)
    );
    
    if (!user) {
      // Log invalid user attempt
      console.log(`[${new Date().toISOString()}] SECURITY: Login attempt for non-existent user: ${email} from IP: ${clientIP}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // Log failed password attempt
      console.log(`[${new Date().toISOString()}] SECURITY: Failed password attempt for user: ${email} from IP: ${clientIP}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Log successful login
    console.log(`[${new Date().toISOString()}] User logged in: ${email} from IP: ${clientIP}`);
    
    // Update last login time
    const now = new Date().toISOString();
    await runAsync(() => 
      db.prepare('UPDATE users SET lastLogin = ?, updatedAt = ? WHERE id = ?')
        .run(now, now, user.id)
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Return user without password
    const { password: pw, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await runAsync(() => 
      db.prepare('SELECT id, email, name, role, createdAt, lastLogin FROM users WHERE id = ? AND deleted = 0').get(req.user.id)
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

// Verify token
app.get('/api/auth/verify', auth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ===== SUPPLIER ROUTES =====

// Get all suppliers
app.get('/api/suppliers', auth, async (req, res) => {
  try {
    const suppliers = await runAsync(() => 
      db.prepare('SELECT * FROM suppliers WHERE deleted = 0 ORDER BY name').all()
    );
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Update suppliers
app.put('/api/suppliers', auth, async (req, res) => {
  try {
    const { suppliers } = req.body;
    
    if (!suppliers || !Array.isArray(suppliers)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    await runAsync(() => {
      const updateStmt = db.prepare(`
        UPDATE suppliers SET 
          name = ?, contact = ?, email = ?, phone = ?, notes = ?, updatedAt = ?, deleted = ?
        WHERE id = ?
      `);
      
      const insertStmt = db.prepare(`
        INSERT INTO suppliers (id, name, contact, email, phone, notes, createdAt, updatedAt, deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Begin transaction
      const transaction = db.transaction((suppliersData) => {
        for (const supplier of suppliersData) {
          // Check if supplier exists
          const existing = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(supplier.id);
          
          if (existing) {
            updateStmt.run(
              supplier.name || '',
              supplier.contact || '',
              supplier.email || '',
              supplier.phone || '',
              supplier.notes || '',
              supplier.updatedAt || new Date().toISOString(),
              supplier.deleted ? 1 : 0,
              supplier.id
            );
          } else {
            insertStmt.run(
              supplier.id,
              supplier.name || '',
              supplier.contact || '',
              supplier.email || '',
              supplier.phone || '',
              supplier.notes || '',
              supplier.createdAt || new Date().toISOString(),
              supplier.updatedAt || new Date().toISOString(),
              supplier.deleted ? 1 : 0
            );
          }
        }
      });
      
      // Execute transaction
      transaction(suppliers);
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating suppliers:', error);
    res.status(500).json({ error: 'Failed to update suppliers' });
  }
});

// ===== CATALOG ROUTES =====

// Get all catalog items
app.get('/api/catalog', auth, async (req, res) => {
  try {
    // Modified to only return non-deleted items by default
    const items = await runAsync(() => 
      db.prepare('SELECT * FROM catalog WHERE deleted = 0 ORDER BY name').all()
    );
    res.json(items);
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// Update catalog items
app.put('/api/catalog', auth, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    await runAsync(() => {
      const updateStmt = db.prepare(`
        UPDATE catalog SET 
          name = ?, supplier = ?, category = ?, cost = ?, leadTime = ?,
          description = ?, notes = ?, hidden = ?, updatedAt = ?, deleted = ?
        WHERE id = ?
      `);
      
      const insertStmt = db.prepare(`
        INSERT INTO catalog (
          id, name, supplier, category, cost, leadTime, 
          description, notes, hidden, createdAt, updatedAt, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Begin transaction
      const transaction = db.transaction((catalogItems) => {
        for (const item of catalogItems) {
          // Check if item exists
          const existing = db.prepare('SELECT id FROM catalog WHERE id = ?').get(item.id);
          
          if (existing) {
            updateStmt.run(
              item.name || '',
              item.supplier || null,
              item.category || 'other',
              item.cost || 0,
              item.leadTime || 0,
              item.description || '',
              item.notes || '',
              item.hidden ? 1 : 0,
              item.updatedAt || new Date().toISOString(),
              item.deleted ? 1 : 0,
              item.id
            );
          } else {
            insertStmt.run(
              item.id,
              item.name || '',
              item.supplier || null,
              item.category || 'other',
              item.cost || 0,
              item.leadTime || 0,
              item.description || '',
              item.notes || '',
              item.hidden ? 1 : 0,
              item.createdAt || new Date().toISOString(),
              item.updatedAt || new Date().toISOString(),
              item.deleted ? 1 : 0
            );
          }
        }
      });
      
      // Execute transaction
      transaction(items);
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating catalog:', error);
    res.status(500).json({ error: 'Failed to update catalog' });
  }
});

// Delete catalog item
app.delete('/api/catalog/:id', auth, async (req, res) => {
  try {
    await runAsync(() => {
      db.prepare(
        'UPDATE catalog SET deleted = 1, updatedAt = ? WHERE id = ?'
      ).run(new Date().toISOString(), req.params.id);
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    res.status(500).json({ error: 'Failed to delete catalog item' });
  }
});

// ===== QUOTE ROUTES =====

// Get all quotes
app.get('/api/quotes', auth, async (req, res) => {
  try {
    const quotes = await runAsync(() => 
      db.prepare('SELECT * FROM quotes WHERE deleted = 0 ORDER BY savedAt DESC').all()
    );
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get a specific quote
app.get('/api/quotes/:id', auth, async (req, res) => {
  try {
    const quote = await runAsync(() => 
      db.prepare('SELECT * FROM quotes WHERE id = ? AND deleted = 0').get(req.params.id)
    );
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    // Parse JSON fields
    if (quote.selectedItems) quote.selectedItems = JSON.parse(quote.selectedItems);
    if (quote.hiddenCosts) quote.hiddenCosts = JSON.parse(quote.hiddenCosts);
    if (quote.exclusions) quote.exclusions = JSON.parse(quote.exclusions);
    
    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Save or update a quote
app.post('/api/quotes', auth, async (req, res) => {
  try {
    const { quote } = req.body;
    
    if (!quote || !quote.id) {
      return res.status(400).json({ error: 'Invalid quote data' });
    }
    
    await runAsync(() => {
      // Convert JSON to strings for storage
      const selectedItems = JSON.stringify(quote.selectedItems || []);
      const hiddenCosts = JSON.stringify(quote.hiddenCosts || []);
      const exclusions = JSON.stringify(quote.exclusions || []);
      
      // Check if quote exists
      const existing = db.prepare('SELECT id FROM quotes WHERE id = ?').get(quote.id);
      
      if (existing) {
        // Update existing quote
        db.prepare(`
          UPDATE quotes SET
            name = ?, clientName = ?, clientCompany = ?, clientEmail = ?, 
            clientPhone = ?, clientAddress = ?, date = ?, validUntil = ?,
            paymentTerms = ?, customTerms = ?, notes = ?, includeDrawingOption = ?,
            exclusions = ?, selectedItems = ?, hiddenCosts = ?, globalMarkup = ?,
            distributionMethod = ?, savedAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          quote.name || '',
          quote.client?.name || '',
          quote.client?.company || '',
          quote.client?.email || '',
          quote.client?.phone || '',
          quote.client?.address || '',
          quote.date || null,
          quote.validUntil || null,
          quote.paymentTerms || '1',
          quote.customTerms || '',
          quote.notes || '',
          quote.includeDrawingOption ? 1 : 0,
          exclusions,
          selectedItems,
          hiddenCosts,
          quote.globalMarkup || 20,
          quote.distributionMethod || 'even',
          quote.savedAt || new Date().toISOString(),
          new Date().toISOString(),
          quote.id
        );
      } else {
        // Insert new quote
        db.prepare(`
          INSERT INTO quotes (
            id, name, clientName, clientCompany, clientEmail, clientPhone, 
            clientAddress, date, validUntil, paymentTerms, customTerms,
            notes, includeDrawingOption, exclusions, selectedItems, hiddenCosts,
            globalMarkup, distributionMethod, savedAt, createdAt, updatedAt, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          quote.id,
          quote.name || '',
          quote.client?.name || '',
          quote.client?.company || '',
          quote.client?.email || '',
          quote.client?.phone || '',
          quote.client?.address || '',
          quote.date || null,
          quote.validUntil || null,
          quote.paymentTerms || '1',
          quote.customTerms || '',
          quote.notes || '',
          quote.includeDrawingOption ? 1 : 0,
          exclusions,
          selectedItems,
          hiddenCosts,
          quote.globalMarkup || 20,
          quote.distributionMethod || 'even',
          quote.savedAt || new Date().toISOString(),
          quote.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });
    
    res.json({ success: true, id: quote.id });
  } catch (error) {
    console.error('Error saving quote:', error);
    res.status(500).json({ error: 'Failed to save quote' });
  }
});

// Delete a quote
app.delete('/api/quotes/:id', auth, async (req, res) => {
  try {
    await runAsync(() => {
      db.prepare(
        'UPDATE quotes SET deleted = 1, updatedAt = ? WHERE id = ?'
      ).run(new Date().toISOString(), req.params.id);
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// ===== INVOICE ROUTES =====

// Get all invoices
app.get('/api/invoices', auth, async (req, res) => {
  try {
    console.log('GET /api/invoices - Fetching all invoices');
    const invoices = await runAsync(() => 
      db.prepare('SELECT * FROM invoices WHERE deleted = 0 ORDER BY createdAt DESC').all()
    );
    console.log(`Returning ${invoices.length} invoices`);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
  }
});

// Get a specific invoice
app.get('/api/invoices/:id', auth, async (req, res) => {
  try {
    console.log(`GET /api/invoices/${req.params.id} - Fetching invoice`);
    const invoice = await runAsync(() => 
      db.prepare('SELECT * FROM invoices WHERE id = ? AND deleted = 0').get(req.params.id)
    );
    
    if (!invoice) {
      console.log(`Invoice not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    console.log(`Returning invoice: ${invoice.id}`);
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
  }
});

// Save or update an invoice
app.post('/api/invoices', auth, async (req, res) => {
  try {
    const { invoice } = req.body;
    
    if (!invoice || !invoice.id) {
      console.log('Invalid invoice data received:', req.body);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid invoice data' 
      });
    }
    
    console.log(`POST /api/invoices - Saving invoice ${invoice.id}`);
    
    await runAsync(() => {
      // Check if invoice exists
      const existing = db.prepare('SELECT id FROM invoices WHERE id = ?').get(invoice.id);
      
      if (existing) {
        // Update existing invoice
        console.log(`Updating existing invoice: ${invoice.id}`);
        db.prepare(`
          UPDATE invoices SET
            quoteId = ?, invoiceNumber = ?, clientName = ?, clientCompany = ?, 
            clientEmail = ?, clientPhone = ?, clientAddress = ?, invoiceDate = ?,
            dueDate = ?, amount = ?, description = ?, notes = ?, status = ?, 
            paidAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          invoice.quoteId || null,
          invoice.invoiceNumber || null,
          invoice.clientName || '',
          invoice.clientCompany || '',
          invoice.clientEmail || '',
          invoice.clientPhone || '',
          invoice.clientAddress || '',
          invoice.invoiceDate || null,
          invoice.dueDate || null,
          invoice.amount || 0,
          invoice.description || '',
          invoice.notes || '',
          invoice.status || 'pending',
          invoice.paidAt || null,
          new Date().toISOString(),
          invoice.id
        );
        
        console.log(`Updated invoice: ${invoice.id}`);
      } else {
        // Insert new invoice
        console.log(`Creating new invoice: ${invoice.id}`);
        db.prepare(`
          INSERT INTO invoices (
            id, quoteId, invoiceNumber, clientName, clientCompany, clientEmail, 
            clientPhone, clientAddress, invoiceDate, dueDate, amount, description, 
            notes, status, paidAt, createdAt, updatedAt, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          invoice.id,
          invoice.quoteId || null,
          invoice.invoiceNumber || null,
          invoice.clientName || '',
          invoice.clientCompany || '',
          invoice.clientEmail || '',
          invoice.clientPhone || '',
          invoice.clientAddress || '',
          invoice.invoiceDate || null,
          invoice.dueDate || null,
          invoice.amount || 0,
          invoice.description || '',
          invoice.notes || '',
          invoice.status || 'pending',
          invoice.paidAt || null,
          invoice.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );
        
        console.log(`Created new invoice: ${invoice.id}`);
      }
    });
    
    // Get the updated/inserted invoice to return
    const savedInvoice = await runAsync(() => 
      db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id)
    );
    
    console.log(`Successfully saved invoice: ${invoice.id}`);
    res.json({ 
      success: true, 
      id: invoice.id,
      invoice: savedInvoice
    });
  } catch (error) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save invoice',
      details: error.message
    });
  }
});

// Delete an invoice
app.delete('/api/invoices/:id', auth, async (req, res) => {
  try {
    console.log(`DELETE /api/invoices/${req.params.id} - Deleting invoice`);
    
    await runAsync(() => {
      db.prepare(
        'UPDATE invoices SET deleted = 1, updatedAt = ? WHERE id = ?'
      ).run(new Date().toISOString(), req.params.id);
    });
    
    console.log(`Deleted invoice: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete invoice',
      details: error.message 
    });
  }
});

// ===== SETTINGS ROUTES =====

// Get settings
app.get('/api/settings', auth, async (req, res) => {
  try {
    const settingsRows = await runAsync(() => 
      db.prepare('SELECT id, value FROM settings').all()
    );
    
    const settings = {};
    
    // Convert rows to a settings object
    settingsRows.forEach(row => {
      try {
        settings[row.id] = JSON.parse(row.value);
      } catch (e) {
        settings[row.id] = row.value;
      }
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save settings
app.post('/api/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({ error: 'Invalid settings data' });
    }
    
    await runAsync(() => {
      const transaction = db.transaction((settingsData) => {
        for (const [key, value] of Object.entries(settingsData)) {
          const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          
          const existing = db.prepare('SELECT id FROM settings WHERE id = ?').get(key);
          
          if (existing) {
            db.prepare(
              'UPDATE settings SET value = ?, updatedAt = ? WHERE id = ?'
            ).run(stringValue, new Date().toISOString(), key);
          } else {
            db.prepare(
              'INSERT INTO settings (id, value, updatedAt) VALUES (?, ?, ?)'
            ).run(key, stringValue, new Date().toISOString());
          }
        }
      });
      
      transaction(settings);
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ===== CONTACTS ROUTES =====

// Get all contacts
app.get('/api/contacts', auth, async (req, res) => {
  try {
    console.log('GET /api/contacts - Fetching all contacts');
    const contacts = await runAsync(() => 
      db.prepare('SELECT * FROM contacts WHERE deleted = 0 ORDER BY lastName, firstName').all()
    );
    console.log(`Returning ${contacts.length} contacts`);
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts', details: error.message });
  }
});

// Get a specific contact
app.get('/api/contacts/:id', auth, async (req, res) => {
  try {
    console.log(`GET /api/contacts/${req.params.id} - Fetching contact`);
    const contact = await runAsync(() => 
      db.prepare('SELECT * FROM contacts WHERE id = ? AND deleted = 0').get(req.params.id)
    );
    
    if (!contact) {
      console.log(`Contact not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    console.log(`Returning contact: ${contact.id}`);
    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact', details: error.message });
  }
});

// Save or update a contact
app.post('/api/contacts', auth, async (req, res) => {
  try {
    const { contact } = req.body;
    
    if (!contact || !contact.id) {
      console.log('Invalid contact data received:', req.body);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid contact data' 
      });
    }
    
    console.log(`POST /api/contacts - Saving contact ${contact.id}`);
    
    await runAsync(() => {
      // Check if contact exists
      const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact.id);
      
      if (existing) {
        // Update existing contact
        console.log(`Updating existing contact: ${contact.id}`);
        db.prepare(`
          UPDATE contacts SET
            firstName = ?, lastName = ?, company = ?, email = ?, 
            phone = ?, address = ?, notes = ?, gdprConsent = ?,
            gdprConsentDate = ?, gdprConsentSource = ?, marketingConsent = ?,
            marketingConsentDate = ?, customerType = ?, lastContactDate = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          contact.firstName || '',
          contact.lastName || '',
          contact.company || '',
          contact.email || '',
          contact.phone || '',
          contact.address || '',
          contact.notes || '',
          contact.gdprConsent || 0,
          contact.gdprConsentDate || null,
          contact.gdprConsentSource || '',
          contact.marketingConsent || 0,
          contact.marketingConsentDate || null,
          contact.customerType || 'individual',
          contact.lastContactDate || null,
          new Date().toISOString(),
          contact.id
        );
        
        console.log(`Updated contact: ${contact.id}`);
      } else {
        // Insert new contact
        console.log(`Creating new contact: ${contact.id}`);
        db.prepare(`
          INSERT INTO contacts (
            id, firstName, lastName, company, email, phone, address, 
            notes, gdprConsent, gdprConsentDate, gdprConsentSource, 
            marketingConsent, marketingConsentDate, customerType, 
            lastContactDate, createdAt, updatedAt, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          contact.id,
          contact.firstName || '',
          contact.lastName || '',
          contact.company || '',
          contact.email || '',
          contact.phone || '',
          contact.address || '',
          contact.notes || '',
          contact.gdprConsent || 0,
          contact.gdprConsentDate || null,
          contact.gdprConsentSource || '',
          contact.marketingConsent || 0,
          contact.marketingConsentDate || null,
          contact.customerType || 'individual',
          contact.lastContactDate || null,
          contact.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );
        
        console.log(`Created new contact: ${contact.id}`);
      }
    });
    
    // Get the updated/inserted contact to return
    const savedContact = await runAsync(() => 
      db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact.id)
    );
    
    console.log(`Successfully saved contact: ${contact.id}`);
    res.json({ 
      success: true, 
      id: contact.id,
      contact: savedContact
    });
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save contact',
      details: error.message
    });
  }
});

// Delete a contact (soft delete)
app.delete('/api/contacts/:id', auth, async (req, res) => {
  try {
    console.log(`DELETE /api/contacts/${req.params.id} - Deleting contact`);
    
    await runAsync(() => {
      db.prepare(
        'UPDATE contacts SET deleted = 1, updatedAt = ? WHERE id = ?'
      ).run(new Date().toISOString(), req.params.id);
    });
    
    console.log(`Deleted contact: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete contact',
      details: error.message 
    });
  }
});

// Search contacts
app.get('/api/contacts/search/:query', auth, async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    console.log(`GET /api/contacts/search/${req.params.query} - Searching contacts`);
    
    const contacts = await runAsync(() => 
      db.prepare(`
        SELECT * FROM contacts 
        WHERE deleted = 0 AND (
          firstName LIKE ? OR 
          lastName LIKE ? OR 
          company LIKE ? OR 
          email LIKE ? OR
          phone LIKE ?
        )
        ORDER BY lastName, firstName
      `).all(searchQuery, searchQuery, searchQuery, searchQuery, searchQuery)
    );
    
    console.log(`Found ${contacts.length} contacts matching search: ${req.params.query}`);
    res.json(contacts);
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: 'Failed to search contacts', details: error.message });
  }
});

// ===== ACTIVITIES ROUTES =====

// Get activities for a specific contact
app.get('/api/activities/contact/:contactId', auth, async (req, res) => {
  try {
    console.log(`GET /api/activities/contact/${req.params.contactId} - Fetching activities for contact`);
    const activities = await runAsync(() => 
      db.prepare(`
        SELECT * FROM activities 
        WHERE contactId = ? AND deleted = 0 
        ORDER BY timestamp DESC, createdAt DESC
      `).all(req.params.contactId)
    );
    
    console.log(`Returning ${activities.length} activities for contact ${req.params.contactId}`);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities', details: error.message });
  }
});

// Create a new activity
app.post('/api/activities', auth, async (req, res) => {
  try {
    const { activity } = req.body;
    
    if (!activity || !activity.id || !activity.contactId) {
      console.log('Invalid activity data received:', req.body);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid activity data. Missing id or contactId.' 
      });
    }
    
    console.log(`POST /api/activities - Creating activity ${activity.id} for contact ${activity.contactId}`);
    
    await runAsync(() => {
      // Insert new activity
      db.prepare(`
        INSERT INTO activities (
          id, contactId, type, title, description, timestamp,
          relatedDocumentId, createdAt, updatedAt, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        activity.id,
        activity.contactId,
        activity.type || 'note',
        activity.title || '',
        activity.description || '',
        activity.timestamp || new Date().toISOString(),
        activity.relatedDocumentId || null,
        activity.createdAt || new Date().toISOString(),
        new Date().toISOString()
      );
      
      console.log(`Created new activity: ${activity.id}`);
      
      // Also update the contact's lastContactDate
      db.prepare(`
        UPDATE contacts SET 
          lastContactDate = ?, 
          updatedAt = ? 
        WHERE id = ?
      `).run(
        activity.timestamp || new Date().toISOString(),
        new Date().toISOString(),
        activity.contactId
      );
      
      console.log(`Updated lastContactDate for contact ${activity.contactId}`);
    });
    
    // Get the inserted activity to return
    const savedActivity = await runAsync(() => 
      db.prepare('SELECT * FROM activities WHERE id = ?').get(activity.id)
    );
    
    console.log(`Successfully created activity: ${activity.id}`);
    res.json(savedActivity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create activity',
      details: error.message
    });
  }
});

// Delete an activity
app.delete('/api/activities/:id', auth, async (req, res) => {
  try {
    console.log(`DELETE /api/activities/${req.params.id} - Deleting activity`);
    
    await runAsync(() => {
      db.prepare(
        'UPDATE activities SET deleted = 1, updatedAt = ? WHERE id = ?'
      ).run(new Date().toISOString(), req.params.id);
    });
    
    console.log(`Deleted activity: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete activity',
      details: error.message 
    });
  }
});

// Get all users (admin only)
app.get('/api/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    // Retrieve all users from database (excluding password)
    const users = await runAsync(() => 
      db.prepare(`
        SELECT id, email, name, role, createdAt, updatedAt, lastLogin 
        FROM users 
        WHERE deleted = 0
        ORDER BY createdAt DESC
      `).all()
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get single user (admin only)
app.get('/api/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin or the user themselves
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await runAsync(() => 
      db.prepare(`
        SELECT id, email, name, role, createdAt, updatedAt, lastLogin 
        FROM users 
        WHERE id = ? AND deleted = 0
      `).get(req.params.id)
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(`Error fetching user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Start the server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
startServer();