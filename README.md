# Community Help Website

A modern, sleek community help platform connecting people in Portland to share tasks and services.

## Features

### Authentication
- **User Registration**: Sign up with email/password
- **Google OAuth Sign-In**: Quick login with Google
- **Email Verification**: Secure email confirmation for new accounts
- **Location-Based**: Automatic city assignment (Portland) via IP geolocation

### Task Management
- **Create Tasks**: Anyone can post tasks with title, description, category, and optional payment
- **Browse Tasks**: View all tasks with city-prioritized filtering
- **Search & Filter**: Search by keyword and filter by category
- **Task Details**: View complete task information and creator contact
- **Manage Tasks**: Close or delete your posted tasks

### Pages
- **Login/Signup**: Modern authentication page with email/password and Google OAuth
- **Dashboard**: Home page with quick navigation
- **Create Task**: Post new tasks with flexible categories
- **Browse Tasks**: Search and filter tasks from your city and beyond
- **Task Details**: View full task information and contact creator
- **My Tasks**: Manage and track your posted tasks
- **Profile**: View your account information

## Project Structure

```
APCSProject/
├── app.js                 # Main Express server
├── package.json          # Dependencies
├── .env.example          # Environment variables template
│
├── views/                # EJS templates
│   ├── login.ejs        # Login/Signup page
│   ├── dashboard.ejs    # Dashboard
│   ├── create-task.ejs  # Task creation form
│   ├── browse.ejs       # Task listing page
│   ├── task-detail.ejs  # Task details page
│   ├── my-tasks.ejs     # User's tasks
│   └── profile.ejs      # User profile
│
├── public/
│   ├── css/
│   │   ├── login.css       # Login styles
│   │   ├── dashboard.css   # Dashboard & navbar
│   │   ├── form.css        # Form styles
│   │   ├── browse.css      # Browse page
│   │   ├── task-detail.css # Task detail styles
│   │   └── my-tasks.css    # My tasks styles
│   └── js/
│       ├── auth.js        # Authentication logic
│       ├── dashboard.js   # Dashboard scripts
│       ├── create-task.js # Task creation
│       ├── browse.js      # Task browsing/filtering
│       ├── task-detail.js # Task detail actions
│       └── my-tasks.js    # My tasks management
│
├── routes/
│   ├── auth.js  # Authentication endpoints
│   └── tasks.js # Task endpoints
│
├── middleware/
│   ├── geolocation.js # IP-based geolocation
│   └── passport.js    # Passport configuration
│
└── database/
    ├── init.js   # Database initialization
    └── app.db    # SQLite database
```

## Database Schema

### Users Table
- `id` (TEXT PRIMARY KEY)
- `email` (TEXT UNIQUE)
- `name` (TEXT)
- `password` (TEXT, bcrypt hashed)
- `city` (TEXT)
- `email_verified` (INTEGER)
- `google_id` (TEXT UNIQUE, optional)

### Email Verifications Table
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT FOREIGN KEY)
- `token` (TEXT UNIQUE)
- `expires_at` (DATETIME)
- `verified` (INTEGER)

### Tasks Table
- `id` (TEXT PRIMARY KEY)
- `creator_id` (TEXT FOREIGN KEY)
- `title` (TEXT)
- `description` (TEXT)
- `category` (TEXT)
- `city` (TEXT)
- `pay` (REAL, optional)
- `status` (TEXT: open/closed)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

## Setup Instructions

### 1. Install Dependencies
```bash
cd /Users/245712/APCSProject
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and add:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google OAuth
- `SESSION_SECRET` (any random string)
- `EMAIL_USER` and `EMAIL_PASS` for email verification

### 3. Initialize Database
```bash
node database/init.js
```

### 4. Start the Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The app will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `GET /` - Home/login page
- `POST /auth/register` - Register new user
- `GET /auth/verify-email/:token` - Verify email
- `POST /auth/login` - Login with email/password
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /logout` - Logout

### Tasks
- `GET /dashboard` - Dashboard (authenticated)
- `GET /create-task` - Create task page
- `POST /api/tasks` - Create new task
- `GET /browse` - Browse all tasks
- `GET /tasks/:id` - View task details
- `GET /my-tasks` - View user's tasks
- `POST /api/tasks/:id/close` - Close task
- `POST /api/tasks/:id/delete` - Delete task
- `GET /profile` - View user profile

## Next Steps

- [ ] Add task applications/responses
- [ ] Add messaging system between users
- [ ] Add user reviews/ratings
- [ ] Add task completion confirmation
- [ ] Implement advanced search and filters
- [ ] Add task categories with icons
- [ ] Deploy to production
- [ ] Add password reset functionality

## Configuration

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### Email Configuration
1. Enable 2-factor authentication on Gmail
2. Generate [App Password](https://support.google.com/accounts/answer/185833)
3. Add to `.env`: `EMAIL_USER` and `EMAIL_PASS`

## Version
1.0.0

Created: 2026

