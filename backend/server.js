const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5500"
  ],
  credentials: true
}));

app.use(express.json());

// File paths
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize data files if they don't exist
async function initializeDataFiles() {
  try {
    await fs.access(TASKS_FILE);
  } catch {
    const defaultTasks = {
      day1: [
        "Complete 50 push-ups",
        "Drink 2 liters of water",
        "Read for 30 minutes",
        "Meditate for 10 minutes",
        "Write 3 things you're grateful for",
        "No social media for 2 hours",
        "Sleep by 11 PM"
      ],
      day2: [
        "Run 3 kilometers",
        "Eat a healthy breakfast",
        "Learn something new for 20 minutes",
        "Do 100 squats",
        "Practice deep breathing for 5 minutes",
        "Complete a work/study task",
        "Stretch for 15 minutes"
      ],
      day3: [
        "Plank for 3 minutes (cumulative)",
        "No junk food today",
        "Call a friend or family member",
        "Write down tomorrow's goals",
        "30 minutes of cardio",
        "Cold shower for 2 minutes",
        "Journal for 10 minutes"
      ],
      day4: [
        "100 jumping jacks",
        "Meal prep for tomorrow",
        "15 minutes of yoga",
        "Read 20 pages of a book",
        "Declutter one area of your space",
        "Practice a hobby for 30 minutes",
        "No screens 1 hour before bed"
      ],
      day5: [
        "50 burpees",
        "Try a new healthy recipe",
        "Spend 30 minutes outdoors",
        "Complete a challenging workout",
        "Write a positive affirmation",
        "Limit caffeine intake",
        "Practice mindfulness for 15 minutes"
      ],
      day6: [
        "Full body workout - 45 minutes",
        "Drink green tea or healthy smoothie",
        "Digital detox for 3 hours",
        "Help someone today",
        "Review your week's progress",
        "Organize your schedule for next week",
        "Evening walk for 20 minutes"
      ],
      day7: [
        "Active rest day - light stretching",
        "Reflect on the week's achievements",
        "Plan your next 7-day challenge",
        "Healthy meal with vegetables",
        "Express gratitude to 3 people",
        "Self-care activity of choice",
        "Early to bed - rest and recover"
      ]
    };
    await fs.writeFile(TASKS_FILE, JSON.stringify(defaultTasks, null, 2));
  }

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({}, null, 2));
  }
}

// Helper functions
async function readJSONFile(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function writeJSONFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function calculateDaysSinceStart(startTime) {
  const now = Date.now();
  const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);
  return Math.floor(hoursSinceStart / 10); // 10-hour days
}

function getNextUnlockTime(startTime, currentDay) {
  return startTime + (currentDay * 10 * 60 * 60 * 1000);
}

// Routes

// Get user progress
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const users = await readJSONFile(USERS_FILE);
    
    if (!users[userId]) {
      // Initialize new user
      users[userId] = {
        currentDay: 1,
        startTime: Date.now(),
        completedDays: [],
        dayNotes: {},
        lastCompletedTime: null
      };
      await writeJSONFile(USERS_FILE, users);
    }

    const user = users[userId];
    const daysSinceStart = calculateDaysSinceStart(user.startTime);
    
    // Check if user has exceeded 7 days without completing
    if (daysSinceStart > 7 && user.currentDay <= 7) {
      // Reset user progress
      user.currentDay = 1;
      user.startTime = Date.now();
      user.completedDays = [];
      user.dayNotes = {};
      user.lastCompletedTime = null;
      await writeJSONFile(USERS_FILE, users);
    }

    const nextUnlockTime = getNextUnlockTime(user.startTime, user.currentDay);
    const now = Date.now();
    const isLocked = user.lastCompletedTime && now < nextUnlockTime;

    res.json({
      currentDay: user.currentDay,
      completedDays: user.completedDays,
      dayNotes: user.dayNotes,
      isLocked,
      nextUnlockTime: isLocked ? nextUnlockTime : null,
      challengeComplete: user.currentDay > 7,
      startTime: user.startTime
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tasks for a specific day
app.get('/api/tasks/:day', async (req, res) => {
  try {
    const { day } = req.params;
    const tasks = await readJSONFile(TASKS_FILE);
    const dayKey = `day${day}`;
    
    if (!tasks[dayKey]) {
      return res.status(404).json({ error: 'Tasks not found for this day' });
    }

    res.json({ tasks: tasks[dayKey] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete a day
app.post('/api/user/:userId/complete', async (req, res) => {
  try {
    const { userId } = req.params;
    const { day, note } = req.body;
    const users = await readJSONFile(USERS_FILE);
    
    if (!users[userId]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userId];
    
    // Verify it's the correct day
    if (user.currentDay !== day) {
      return res.status(400).json({ error: 'Invalid day completion' });
    }

    // Add to completed days
    if (!user.completedDays.includes(day)) {
      user.completedDays.push(day);
    }
    
    // Save note if provided
    if (note) {
      user.dayNotes[`day${day}`] = note;
    }

    // Update progress
    user.lastCompletedTime = Date.now();
    user.currentDay = day + 1;

    await writeJSONFile(USERS_FILE, users);

    const nextUnlockTime = getNextUnlockTime(user.startTime, user.currentDay);
    const challengeComplete = user.currentDay > 7;

    res.json({
      success: true,
      currentDay: user.currentDay,
      nextUnlockTime: challengeComplete ? null : nextUnlockTime,
      challengeComplete
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset user progress
app.post('/api/user/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    const users = await readJSONFile(USERS_FILE);
    
    users[userId] = {
      currentDay: 1,
      startTime: Date.now(),
      completedDays: [],
      dayNotes: {},
      lastCompletedTime: null
    };

    await writeJSONFile(USERS_FILE, users);

    res.json({ success: true, message: 'Progress reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tasks (for admin purposes)
app.put('/api/tasks', async (req, res) => {
  try {
    const { tasks } = req.body;
    await writeJSONFile(TASKS_FILE, tasks);
    res.json({ success: true, message: 'Tasks updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all tasks (for editing)
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await readJSONFile(TASKS_FILE);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize and start server
app.listen(PORT, () => console.log("Server running on port", PORT));
