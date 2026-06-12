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
