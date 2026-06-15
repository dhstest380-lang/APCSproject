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
migrationDb.serialize(() => {
  // Check and add theme column to users
  migrationDb.get("PRAGMA table_info(users)", (err, row) => {
    if (!err) {
      migrationDb.all("PRAGMA table_info(users)", (error, columns) => {
        if (!error) {
          const hasTheme = columns.some(col => col.name === 'theme');
          if (!hasTheme) {
            migrationDb.run("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'neutral'", (alterErr) => {
              if (alterErr) console.error('Theme column migration failed:', alterErr);
            });
          }
        }
      });
    }
  });

  // Add address and people_needed columns to tasks if they don't exist
  migrationDb.all("PRAGMA table_info(tasks)", (err, columns) => {
    if (!err && columns) {
      const hasAddress = columns.some(col => col.name === 'address');
      const hasPeopleNeeded = columns.some(col => col.name === 'people_needed');
      
      if (!hasAddress) {
        migrationDb.run("ALTER TABLE tasks ADD COLUMN address TEXT", (alterErr) => {
          if (alterErr) console.error('Address column migration failed:', alterErr);
          else console.log('Added address column to tasks');
        });
      }
      
      if (!hasPeopleNeeded) {
        migrationDb.run("ALTER TABLE tasks ADD COLUMN people_needed INTEGER DEFAULT 1", (alterErr) => {
          if (alterErr) console.error('People needed column migration failed:', alterErr);
          else console.log('Added people_needed column to tasks');
        });
      }
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
    if (err) console.error('Error creating task_claims table:', err);
    else console.log('task_claims table ready');
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
    if (err) console.error('Error creating messages table:', err);
    else console.log('messages table ready');
  });

  migrationDb.close();
});

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
