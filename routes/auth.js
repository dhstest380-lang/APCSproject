const express = require('express');
const passport = require('passport');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/app.db');
const db = new sqlite3.Database(dbPath);

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM);

// Register with email
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (user) {
        if (user.google_id && !user.password) {
          return res.status(400).json({ error: 'Email already registered with Google. Please sign in with Google.' });
        }
        if (!user.email_verified) {
          return res.status(400).json({ error: 'Email already registered. Please verify your email or request a new verification link.' });
        }
        return res.status(400).json({ error: 'Email already registered' });
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        // Create user with email verified immediately for this setup
        db.run(
          'INSERT INTO users (id, email, password, name, city, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, email, hashedPassword, name, 'Portland', 1],
          (err) => {
            if (err) {
              console.error('Error creating user:', err);
              return res.status(500).json({ error: 'Error creating user' });
            }

            res.json({ success: true, message: 'Registration successful! You can now sign in.' });
          }
        );
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
router.get('/verify-email/:token', (req, res) => {
  const { token } = req.params;

  db.get('SELECT * FROM email_verifications WHERE token = ? AND expires_at > datetime("now")', [token], (err, verification) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    // Update user
    db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [verification.user_id], (err) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'Error verifying email' });
      }

      // Mark verification as verified
      db.run('UPDATE email_verifications SET verified = 1 WHERE id = ?', [verification.id], (err) => {
        if (err) {
          console.error('Error updating verification:', err);
          return res.status(500).json({ error: 'Error completing verification' });
        }

        res.redirect('/?verified=true');
      });
    });
  });
});

// Login with email/password
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    const typeHeader = (req.get('Content-Type') || '').toLowerCase();
    const wantsJson = typeHeader.includes('application/json') || req.get('X-Requested-With') === 'XMLHttpRequest' || (req.get('Accept') || '').includes('json');
    if (!user) {
      const message = info && info.message ? info.message : 'Invalid email or password';
      if (wantsJson) {
        return res.status(401).json({ error: message });
      }
      return res.redirect('/?loginError=true&error=' + encodeURIComponent(message));
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      if (wantsJson) {
        return res.json({ success: true });
      }
      return res.redirect('/dashboard');
    });
  })(req, res, next);
});

// Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/dashboard');
});

module.exports = router;
