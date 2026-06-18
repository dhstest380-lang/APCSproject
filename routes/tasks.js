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
    const { title, description, category, pay, address, peopleNeeded } = req.body;

    if (!title || !description || !address || !peopleNeeded) {
      return res.status(400).json({ error: 'Title, description, address, and people needed are required' });
    }

    const taskId = uuidv4();
    const pay_value = pay ? parseFloat(pay) : null;
    const people_needed = parseInt(peopleNeeded) || 1;

    db.run(
      'INSERT INTO tasks (id, creator_id, title, description, category, city, pay, status, address, people_needed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, req.user.id, title, description, category || 'General', req.user.city, pay_value, 'open', address, people_needed],
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

  // Get tasks - city tasks first, then other cities, excluding tasks that are full
  db.all(
    `SELECT t.*, u.name as creator_name,
            (SELECT COUNT(*) FROM task_claims WHERE task_id = t.id) as current_claims
     FROM tasks t 
     JOIN users u ON t.creator_id = u.id 
     WHERE t.status = 'open'
     AND (SELECT COUNT(*) FROM task_claims WHERE task_id = t.id) < t.people_needed
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

// Get messages page
router.get('/messages', isAuthenticated, (req, res) => {
  res.render('messages', { user: req.user });
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

// Claim a task
router.post('/api/tasks/:id/claim', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const claimId = uuidv4();
  const messageId = uuidv4();

  // Get task details
  db.get(
    'SELECT t.*, u.name as creator_name, u.email as creator_email FROM tasks t JOIN users u ON t.creator_id = u.id WHERE t.id = ?',
    [id],
    (err, task) => {
      if (err) {
        console.error('Error finding task:', err);
        return res.status(500).json({ error: 'Error claiming task' });
      }

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if already claimed
      db.get(
        'SELECT * FROM task_claims WHERE task_id = ? AND user_id = ?',
        [id, req.user.id],
        (err, existingClaim) => {
          if (err) {
            console.error('Error checking claim:', err);
            return res.status(500).json({ error: 'Error claiming task' });
          }

          if (existingClaim) {
            return res.status(400).json({ error: 'You have already claimed this task' });
          }

          // Get current claims count
          db.get(
            'SELECT COUNT(*) as count FROM task_claims WHERE task_id = ?',
            [id],
            (err, result) => {
              if (err) {
                console.error('Error counting claims:', err);
                return res.status(500).json({ error: 'Error claiming task' });
              }

              const currentClaims = result.count;
              
              // Check if task is full
              if (currentClaims >= task.people_needed) {
                return res.status(400).json({ error: 'This task has already received enough claims' });
              }

              // Insert claim
              db.run(
                'INSERT INTO task_claims (id, task_id, user_id) VALUES (?, ?, ?)',
                [claimId, id, req.user.id],
                (err) => {
                  if (err) {
                    console.error('Error creating claim:', err);
                    return res.status(500).json({ error: 'Error claiming task' });
                  }

                  // Create message for task creator
                  const messageTitle = `${req.user.name} claimed your task: ${task.title}`;
                  const messageContent = `${req.user.name} has claimed your task "${task.title}". Task address: ${task.address}`;

                  db.run(
                    'INSERT INTO messages (id, recipient_id, sender_id, task_id, title, content, read) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [messageId, task.creator_id, req.user.id, id, messageTitle, messageContent, 0],
                    (err) => {
                      if (err) {
                        console.error('Error creating message:', err);
                        // Don't fail the claim, just log the error
                      }

                      const newClaimCount = currentClaims + 1;
                      const isTaskFull = newClaimCount >= task.people_needed;

                      // If task is now full, update status to closed
                      if (isTaskFull) {
                        db.run('UPDATE tasks SET status = ? WHERE id = ?', ['closed', id], (updateErr) => {
                          if (updateErr) {
                            console.error('Error closing task:', updateErr);
                          }
                        });
                      }

                      res.json({ 
                        success: true, 
                        message: `Task claimed! (${newClaimCount}/${task.people_needed})`,
                        claimsProgress: `${newClaimCount}/${task.people_needed}`,
                        taskFull: isTaskFull
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get unread message count
router.get('/api/messages/unread', isAuthenticated, (req, res) => {
  db.get(
    'SELECT COUNT(*) as unread_count FROM messages WHERE recipient_id = ? AND read = 0',
    [req.user.id],
    (err, result) => {
      if (err) {
        console.error('Error getting unread messages:', err);
        return res.status(500).json({ error: 'Error fetching messages' });
      }

      res.json({ unread_count: result.unread_count });
    }
  );
});

// Get all messages for current user
router.get('/api/messages', isAuthenticated, (req, res) => {
  db.all(
    `SELECT m.*, u.name as sender_name FROM messages m 
     JOIN users u ON m.sender_id = u.id 
     WHERE m.recipient_id = ? 
     ORDER BY m.created_at DESC`,
    [req.user.id],
    (err, messages) => {
      if (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'Error fetching messages' });
      }

      res.json({ messages: messages || [] });
    }
  );
});

// Mark message as read
router.post('/api/messages/:id/read', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE messages SET read = 1 WHERE id = ? AND recipient_id = ?',
    [id, req.user.id],
    (err) => {
      if (err) {
        console.error('Error marking message as read:', err);
        return res.status(500).json({ error: 'Error updating message' });
      }

      res.json({ success: true });
    }
  );
});

// Delete message
router.delete('/api/messages/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM messages WHERE id = ? AND recipient_id = ?',
    [id, req.user.id],
    (err) => {
      if (err) {
        console.error('Error deleting message:', err);
        return res.status(500).json({ error: 'Error deleting message' });
      }

      res.json({ success: true });
    }
  );
});

// Get claims count for a task
router.get('/api/tasks/:id/claims', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT 
      (SELECT COUNT(*) FROM task_claims WHERE task_id = ?) as current_claims,
      (SELECT people_needed FROM tasks WHERE id = ?) as people_needed
     `,
    [id, id],
    (err, result) => {
      if (err) {
        console.error('Error getting claims:', err);
        return res.status(500).json({ error: 'Error fetching task claims' });
      }

      if (!result) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({
        current_claims: result.current_claims,
        people_needed: result.people_needed
      });
    }
  );
});

// Check if user has claimed a task
router.get('/api/tasks/:id/user-claim', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.get(
    'SELECT * FROM task_claims WHERE task_id = ? AND user_id = ?',
    [id, req.user.id],
    (err, claim) => {
      if (err) {
        console.error('Error checking claim:', err);
        return res.status(500).json({ error: 'Error checking claim' });
      }

      res.json({ has_claimed: !!claim });
    }
  );
});

module.exports = router;
