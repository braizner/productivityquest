const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('productivity.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    points_goal INTEGER DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tasks table
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Weekly progress table
  db.run(`CREATE TABLE IF NOT EXISTS weekly_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    total_points INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Recurring tasks table
  db.run(`CREATE TABLE IF NOT EXISTS recurring_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    times_per_week INTEGER NOT NULL,
    points_per_completion INTEGER NOT NULL,
    reward_type TEXT NOT NULL, -- 'per_completion' or 'per_goal'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Recurring task completions table
  db.run(`CREATE TABLE IF NOT EXISTS recurring_task_completions (
    id TEXT PRIMARY KEY,
    recurring_task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    week_start DATE NOT NULL,
    FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register user
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [userId, username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign({ id: userId, username }, JWT_SECRET);
        res.status(201).json({ token, user: { id: userId, username, email } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          total_points: user.total_points 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Create task
app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, points } = req.body;
  const userId = req.user.id;

  if (!title || !points) {
    return res.status(400).json({ error: 'Title and points are required' });
  }

  const taskId = uuidv4();
  db.run(
    'INSERT INTO tasks (id, user_id, title, description, points) VALUES (?, ?, ?, ?, ?)',
    [taskId, userId, title, description, points],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating task' });
      }
      res.status(201).json({ 
        id: taskId, 
        title, 
        description, 
        points, 
        completed: false 
      });
    }
  );
});

// Get user's tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching tasks' });
    }
    res.json(tasks);
  });
});

// Complete task
app.put('/api/tasks/:id/complete', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId], (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.completed) {
      return res.status(400).json({ error: 'Task already completed' });
    }

    const completedAt = moment().format('YYYY-MM-DD HH:mm:ss');
    
    db.run(
      'UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?',
      [completedAt, taskId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error completing task' });
        }

        // Update user's total points
        db.run(
          'UPDATE users SET total_points = total_points + ? WHERE id = ?',
          [task.points, userId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error updating points' });
            }

            // Update weekly progress
            updateWeeklyProgress(userId, task.points);

            res.json({ 
              message: 'Task completed successfully',
              points_earned: task.points
            });
          }
        );
      }
    );
  });
});

// Get weekly progress
app.get('/api/progress/weekly', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { weeks = 4 } = req.query;

  const query = `
    SELECT 
      week_start,
      week_end,
      total_points,
      tasks_completed
    FROM weekly_progress 
    WHERE user_id = ? 
    ORDER BY week_start DESC 
    LIMIT ?
  `;

  db.all(query, [userId, weeks], (err, progress) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching progress' });
    }
    res.json(progress);
  });
});

// Get user stats
app.get('/api/user/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;

  // Get user data and regular task stats separately
  db.get('SELECT total_points, points_goal FROM users WHERE id = ?', [userId], (err, userData) => {
    if (err) {
      console.error('Error fetching user data:', err);
      return res.status(500).json({ error: 'Error fetching user data' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get regular task stats
    const regularTaskQuery = `
      SELECT 
        COALESCE(COUNT(id), 0) as total_tasks,
        COALESCE(COUNT(CASE WHEN completed = 1 THEN 1 END), 0) as completed_tasks,
        COALESCE(SUM(CASE WHEN completed = 1 THEN points ELSE 0 END), 0) as earned_points_from_tasks
      FROM tasks 
      WHERE user_id = ?
    `;

    db.get(regularTaskQuery, [userId], (err, regularStats) => {
      if (err) {
        console.error('Error fetching regular task stats:', err);
        return res.status(500).json({ error: 'Error fetching regular task stats' });
      }
    
    // Get recurring task stats for this week (simplified)
    const now = moment();
    const weekStart = now.clone().startOf('week').format('YYYY-MM-DD');
    
    // Simple recurring task count
    db.get('SELECT COUNT(*) as total_recurring_tasks FROM recurring_tasks WHERE user_id = ?', [userId], (err, recurringCount) => {
      if (err) {
        console.error('Error fetching recurring task count:', err);
        return res.status(500).json({ error: 'Error fetching recurring task count' });
      }
      
      // Get recurring task completions with goal tracking
      const recurringCompletionsQuery = `
        SELECT 
          rt.id,
          rt.times_per_week,
          rt.points_per_completion,
          rt.reward_type,
          COALESCE(COUNT(rtc.id), 0) as completions
        FROM recurring_tasks rt
        LEFT JOIN recurring_task_completions rtc ON rt.id = rtc.recurring_task_id 
          AND rtc.week_start = ?
        WHERE rt.user_id = ?
        GROUP BY rt.id, rt.times_per_week, rt.points_per_completion, rt.reward_type
      `;
      
      db.all(recurringCompletionsQuery, [weekStart, userId], (err, recurringTasks) => {
        if (err) {
          console.error('Error fetching recurring task details:', err);
          return res.status(500).json({ error: 'Error fetching recurring task details' });
        }
        
        // Calculate completed goals and earned points
        let completedRecurringGoals = 0;
        let earnedPointsFromRecurring = 0;
        
        recurringTasks.forEach(task => {
          // Count as completed if reached the weekly goal
          if (task.completions >= task.times_per_week) {
            completedRecurringGoals++;
          }
          
          // Calculate points based on reward type
          if (task.reward_type === 'per_completion') {
            earnedPointsFromRecurring += task.completions * task.points_per_completion;
          } else if (task.reward_type === 'per_goal' && task.completions >= task.times_per_week) {
            earnedPointsFromRecurring += task.points_per_completion;
          }
        });
        
        // Combine regular and recurring stats
        const combinedStats = {
          total_points: userData.total_points || 0,
          points_goal: userData.points_goal || 100,
          total_tasks: ((regularStats && regularStats.total_tasks) || 0) + (recurringCount.total_recurring_tasks || 0),
          completed_tasks: ((regularStats && regularStats.completed_tasks) || 0) + completedRecurringGoals,
          earned_points: ((regularStats && regularStats.earned_points_from_tasks) || 0) + earnedPointsFromRecurring
        };
        
        console.log('Stats for user', userId, ':', combinedStats);
        res.json(combinedStats);
      });
    });
  });
  });
});

// Update user points goal
app.put('/api/user/points-goal', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { points_goal } = req.body;

  if (!points_goal || points_goal < 1) {
    return res.status(400).json({ error: 'Valid points goal is required' });
  }

  db.run(
    'UPDATE users SET points_goal = ? WHERE id = ?',
    [points_goal, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating points goal' });
      }
      res.json({ message: 'Points goal updated successfully', points_goal });
    }
  );
});

// Helper function to update weekly progress
function updateWeeklyProgress(userId, points) {
  const now = moment();
  const weekStart = now.clone().startOf('week').format('YYYY-MM-DD');
  const weekEnd = now.clone().endOf('week').format('YYYY-MM-DD');

  db.get(
    'SELECT * FROM weekly_progress WHERE user_id = ? AND week_start = ?',
    [userId, weekStart],
    (err, existing) => {
      if (err) return;

      if (existing) {
        db.run(
          'UPDATE weekly_progress SET total_points = total_points + ?, tasks_completed = tasks_completed + 1 WHERE id = ?',
          [points, existing.id]
        );
      } else {
        const progressId = uuidv4();
        db.run(
          'INSERT INTO weekly_progress (id, user_id, week_start, week_end, total_points, tasks_completed) VALUES (?, ?, ?, ?, ?, ?)',
          [progressId, userId, weekStart, weekEnd, points, 1]
        );
      }
    }
  );
}

// Common onboarding task bank
const TASK_BANK = [
  { name: 'Exercise', defaultTimes: 3, defaultPoints: 10 },
  { name: 'Read', defaultTimes: 4, defaultPoints: 8 },
  { name: 'Meditate', defaultTimes: 5, defaultPoints: 6 },
  { name: 'Drink Water', defaultTimes: 7, defaultPoints: 2 },
  { name: 'Journal', defaultTimes: 3, defaultPoints: 7 },
  { name: 'Walk Outside', defaultTimes: 4, defaultPoints: 5 },
  { name: 'Sleep 8 Hours', defaultTimes: 7, defaultPoints: 4 },
  { name: 'Plan Tomorrow', defaultTimes: 7, defaultPoints: 3 }
];

// GET onboarding task bank
app.get('/api/onboarding/task-bank', authenticateToken, (req, res) => {
  res.json(TASK_BANK);
});

// POST onboarding recurring tasks
app.post('/api/onboarding/recurring-tasks', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { tasks } = req.body; // [{ name, times_per_week, points_per_completion, reward_type }]
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'No tasks provided' });
  }
  const stmt = db.prepare('INSERT INTO recurring_tasks (id, user_id, name, times_per_week, points_per_completion, reward_type) VALUES (?, ?, ?, ?, ?, ?)');
  tasks.forEach(task => {
    stmt.run(uuidv4(), userId, task.name, task.times_per_week, task.points_per_completion, task.reward_type);
  });
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: 'Error saving recurring tasks' });
    res.status(201).json({ message: 'Recurring tasks created' });
  });
});

// POST complete recurring task
app.post('/api/recurring-tasks/:id/complete', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const recurringTaskId = req.params.id;
  const now = moment();
  const weekStart = now.clone().startOf('week').format('YYYY-MM-DD');

  db.get('SELECT * FROM recurring_tasks WHERE id = ? AND user_id = ?', [recurringTaskId, userId], (err, task) => {
    if (err || !task) return res.status(404).json({ error: 'Task not found' });
    // Count completions this week
    db.all('SELECT * FROM recurring_task_completions WHERE recurring_task_id = ? AND user_id = ? AND week_start = ?', [recurringTaskId, userId, weekStart], (err, completions) => {
      if (err) return res.status(500).json({ error: 'Error checking completions' });
      const alreadyCompleted = completions.length;
      if (alreadyCompleted >= task.times_per_week) {
        return res.status(400).json({ error: 'Weekly goal already met' });
      }
      // Insert completion
      db.run('INSERT INTO recurring_task_completions (id, recurring_task_id, user_id, week_start) VALUES (?, ?, ?, ?)', [uuidv4(), recurringTaskId, userId, weekStart], function(err) {
        if (err) return res.status(500).json({ error: 'Error saving completion' });
        // Award points
        let pointsAwarded = 0;
        if (task.reward_type === 'per_completion') {
          pointsAwarded = task.points_per_completion;
          db.run('UPDATE users SET total_points = total_points + ? WHERE id = ?', [pointsAwarded, userId]);
        } else if (task.reward_type === 'per_goal' && alreadyCompleted + 1 === task.times_per_week) {
          pointsAwarded = task.points_per_completion;
          db.run('UPDATE users SET total_points = total_points + ? WHERE id = ?', [pointsAwarded, userId]);
        }
        res.json({ message: 'Task completion recorded', points_awarded: pointsAwarded });
      });
    });
  });
});

// GET user's recurring tasks and progress for the week
app.get('/api/recurring-tasks', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const now = moment();
  const weekStart = now.clone().startOf('week').format('YYYY-MM-DD');
  db.all('SELECT * FROM recurring_tasks WHERE user_id = ?', [userId], (err, tasks) => {
    if (err) return res.status(500).json({ error: 'Error fetching recurring tasks' });
    // For each task, get completions this week
    const result = [];
    let count = 0;
    if (tasks.length === 0) return res.json([]);
    tasks.forEach(task => {
      db.all('SELECT * FROM recurring_task_completions WHERE recurring_task_id = ? AND user_id = ? AND week_start = ?', [task.id, userId, weekStart], (err, completions) => {
        result.push({ ...task, completions: completions.length });
        count++;
        if (count === tasks.length) {
          res.json(result);
        }
      });
    });
  });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Gamified Productivity Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
}); 