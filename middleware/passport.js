const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../database/app.db');
const db = new sqlite3.Database(dbPath);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return done(err);
    done(null, row);
  });
});

// Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'User not found' });

    if (!user.password) {
      return done(null, false, { message: 'This account was created with Google. Please sign in with Google.' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return done(null, false, { message: 'Invalid password' });
    
    if (!user.email_verified) return done(null, false, { message: 'Please verify your email' });
    
    return done(null, user);
  });
}));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, (accessToken, refreshToken, profile, done) => {
    db.get('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, user) => {
      if (err) return done(err);
      
      if (user) {
        return done(null, user);
      } else {
        // User doesn't exist, create new user
        const newUser = {
          id: uuidv4(),
          email: profile.emails[0].value,
          name: profile.displayName,
          google_id: profile.id,
          email_verified: 1,
          city: 'Portland'
        };
        
        db.run(
          'INSERT INTO users (id, email, name, google_id, email_verified, city) VALUES (?, ?, ?, ?, ?, ?)',
          [newUser.id, newUser.email, newUser.name, newUser.google_id, newUser.email_verified, newUser.city],
          (err) => {
            if (err) return done(err);
            done(null, newUser);
          }
        );
      }
    });
  }));
}

module.exports = passport;
