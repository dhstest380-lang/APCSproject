const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/app.db');
const db = new sqlite3.Database(dbPath);

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
};

// Get create task page
router.get('/create-task', isAuthenticated, (req, res) => {
  res.render('create-task', { user: req.user });
});

// Create a task
router.post('/api/tasks', isAuthenticated, (req, res) => {
  try {
    const { title, description, category, pay } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const taskId = uuidv4();
    const pay_value = pay ? parseFloat(pay) : null;

    db.run(
      'INSERT INTO tasks (id, creator_id, title, description, category, city, pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, req.user.id, title, description, category || 'General', req.user.city, pay_value, 'open'],
      (err) => {
        if (err) {
          console.error('Error creating task:', err);
          return res.status(500).json({ error: 'Error creating task' });
        }

        res.json({ success: true, taskId, message: 'Task created successfully!' });
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Browse tasks
router.get('/browse', isAuthenticated, (req, res) => {
  const city = req.query.city || req.user.city;

  // Get tasks - city tasks first, then other cities
  db.all(
    `SELECT t.*, u.name as creator_name 
     FROM tasks t 
     JOIN users u ON t.creator_id = u.id 
     WHERE t.status = 'open'
     ORDER BY (CASE WHEN t.city = ? THEN 0 ELSE 1 END), t.created_at DESC`,
    [city],
    (err, tasks) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        return res.render('browse', { user: req.user, tasks: [], error: 'Error loading tasks' });
      }

      res.render('browse', { user: req.user, tasks: tasks || [], currentCity: city });
    }
  );
});

// Get task details
router.get('/tasks/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.get(
    'SELECT t.*, u.name as creator_name, u.email as creator_email FROM tasks t JOIN users u ON t.creator_id = u.id WHERE t.id = ?',
    [id],
    (err, task) => {
      if (err) {
        console.error('Error fetching task:', err);
        return res.render('task-detail', { user: req.user, task: null, error: 'Error loading task' });
      }

      if (!task) {
        return res.status(404).render('task-detail', { user: req.user, task: null, error: 'Task not found' });
      }

      res.render('task-detail', { user: req.user, task });
    }
  );
});

// Get user's tasks
router.get('/my-tasks', isAuthenticated, (req, res) => {
  db.all(
    'SELECT * FROM tasks WHERE creator_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, tasks) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        return res.render('my-tasks', { user: req.user, tasks: [], error: 'Error loading tasks' });
      }

      res.render('my-tasks', { user: req.user, tasks: tasks || [] });
    }
  );
});

// Close a task
router.post('/api/tasks/:id/close', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM tasks WHERE id = ? AND creator_id = ?', [id, req.user.id], (err, task) => {
    if (err) {
      console.error('Error finding task:', err);
      return res.status(500).json({ error: 'Error closing task' });
    }

    if (!task) {
      return res.status(403).json({ error: 'You can only close your own tasks' });
    }

    db.run('UPDATE tasks SET status = ? WHERE id = ?', ['closed', id], (err) => {
      if (err) {
        console.error('Error closing task:', err);
        return res.status(500).json({ error: 'Error closing task' });
      }

      res.json({ success: true, message: 'Task closed' });
    });
  });
});

// Delete a task
router.post('/api/tasks/:id/delete', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM tasks WHERE id = ? AND creator_id = ?', [id, req.user.id], (err, task) => {
    if (err) {
      console.error('Error finding task:', err);
      return res.status(500).json({ error: 'Error deleting task' });
    }

    if (!task) {
      return res.status(403).json({ error: 'You can only delete your own tasks' });
    }

    db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ error: 'Error deleting task' });
      }

      res.json({ success: true, message: 'Task deleted' });
    });
  });
});

// Get user profile
router.get('/profile', isAuthenticated, (req, res) => {
  res.render('profile', { user: req.user });
});

// Update user theme preference
router.post('/api/profile/theme', isAuthenticated, (req, res) => {
  const { theme } = req.body;
  const allowedThemes = ['light', 'dark', 'neutral'];

  if (!allowedThemes.includes(theme)) {
    return res.status(400).json({ error: 'Invalid theme selected' });
  }

  db.run('UPDATE users SET theme = ? WHERE id = ?', [theme, req.user.id], (err) => {
    if (err) {
      console.error('Error updating theme:', err);
      return res.status(500).json({ error: 'Unable to save theme' });
    }

    req.user.theme = theme;
    res.json({ success: true });
  });
});

// Report a suspicious task
router.post('/api/tasks/:id/report', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Please provide a reason for reporting' });
  }

  if (reason.length > 500) {
    return res.status(400).json({ error: 'Reason must be under 500 characters' });
  }

  const reportId = uuidv4();

  // Check if already reported by this user
  db.get(
    'SELECT * FROM task_reports WHERE task_id = ? AND reporter_id = ?',
    [id, req.user.id],
    (err, existingReport) => {
      if (err) {
        console.error('Error checking report:', err);
        return res.status(500).json({ error: 'Error processing report' });
      }

      if (existingReport) {
        return res.status(400).json({ error: 'You have already reported this task' });
      }

      // Insert report
      db.run(
        'INSERT INTO task_reports (id, task_id, reporter_id, reason) VALUES (?, ?, ?, ?)',
        [reportId, id, req.user.id, reason],
        (err) => {
          if (err) {
            console.error('Error creating report:', err);
            return res.status(500).json({ error: 'Error submitting report' });
          }

          // Increment report count
          db.run('UPDATE tasks SET report_count = report_count + 1 WHERE id = ?', [id], (err) => {
            if (err) {
              console.error('Error updating report count:', err);
              return res.status(500).json({ error: 'Error updating task' });
            }

            res.json({ success: true, message: 'Report submitted successfully. Thank you for helping keep the community safe.' });
          });
        }
      );
    }
  );
});

module.exports = router;
