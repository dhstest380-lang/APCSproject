require('./middleware/passport'); // Load passport strategies

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Geolocation middleware
app.use(require('./middleware/geolocation'));

// Ensure the users table has a theme column
const migrationDb = new sqlite3.Database(path.join(__dirname, 'database', 'app.db'));

function initializeDatabase() {
  migrationDb.serialize(() => {
    // Create users table
    migrationDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT,
        city TEXT NOT NULL,
        country TEXT DEFAULT 'USA',
        email_verified INTEGER DEFAULT 0,
        google_id TEXT UNIQUE,
        theme TEXT DEFAULT 'neutral',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table ready');
      }
    });

    // Create email_verifications table
    migrationDb.run(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating email_verifications table:', err);
      }
    });

    // Create tasks table
    migrationDb.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        city TEXT NOT NULL,
        pay REAL,
        status TEXT DEFAULT 'open',
        address TEXT,
        people_needed INTEGER DEFAULT 1,
        report_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(creator_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating tasks table:', err);
      }
    });

    // Create task_reports table
    migrationDb.run(`
      CREATE TABLE IF NOT EXISTS task_reports (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id),
        FOREIGN KEY(reporter_id) REFERENCES users(id),
        UNIQUE(task_id, reporter_id)
      )
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating task_reports table:', err);
      }
    });

    // Create task_claims table if it doesn't exist
    migrationDb.run(`
      CREATE TABLE IF NOT EXISTS task_claims (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(task_id, user_id)
      )
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating task_claims table:', err);
      } else {
        console.log('task_claims table ready');
      }
    });

    // Create messages table if it doesn't exist
    migrationDb.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        recipient_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        task_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(recipient_id) REFERENCES users(id),
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      )
    `, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('Error creating messages table:', err);
      } else {
        console.log('messages table ready');
      }
    });

    migrationDb.close();
  });
}

// Initialize database on app start
initializeDatabase();

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/tasks'));

// Home route - redirect to login if not authenticated
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.render('login', {
      loginError: req.query.loginError,
      verified: req.query.verified,
      errorMessage: req.query.error
    });
  }
});

app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('dashboard', { user: req.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.redirect('/');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
