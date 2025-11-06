const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// File paths - Railway persistent storage
const TASKS_FILE = path.join(__dirname, "tasks.json");
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware
app.use(
  cors({
    origin: [
      "https://projectsevendays.netlify.app",
      "http://localhost:8000",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5500"
    ],
    credentials: true
  })
);

app.use(express.json());

// Initialize data files if they don't exist
async function initializeDataFiles() {
  try {
    await fs.access(TASKS_FILE);
    console.log("✅ tasks.json exists");
  } catch {
    console.log("📝 Creating tasks.json...");
    const defaultTasks = {
      day1: [
        "Complete 20 pushups",
        "Practice box breathing for a total of 3 minutes",
        "No sugar for the day",
        "Capture a perspective distortion shot",
        "Learn Game Theory to see how strategy influences outcomes"
      ],
      day2: [
        "Hold a plank for a total of 2 minutes",
        "Zen sit for 5 minutes in quiet stillness",
        "Make bed in under 60 seconds",
        "Draw something without lifting the pen",
        "Learn about The Overview Effect experienced by astronauts"
      ],
      day3: [
        "Perform bodyweight squats for a total of 3 minutes",
        "Shadow box for a total of 3 minutes",
        "Eat one meal phone-free",
        "Draw your room as a simple map and label the areas",
        "Study the Great Depression and its long-term economic impact"
      ],
      day4: [
        "Walk briskly for 20 minutes",
        "Complete a 5-4-3-2-1 grounding check",
        "Write your sleep time and end the day accordingly",
        "Sketch a simple artwork using your non-dominant hand",
        "Understand Butterfly Effect and small changes compounding"
      ],
      day5: [
        "Hold a wall-sit for a total of 3 minutes",
        "Do Nadi Shodhana for 3 minutes",
        "Track your expenses for today",
        "Choose an everyday object and refine its design",
        "Understand game theory via one prisoner's dilemma"
      ],
      day6: [
        "Do step-ups for a total of 3 minutes",
        "Practice Qigong Inner Smile for 2 minutes",
        "Wake and drink 500 ml of water",
        "Write a letter to your future self @futureme.org",
        "Explore neuroplasticity to understand brain change"
      ],
      day7: [
        "Run/jog a total distance of 1 kilometer",
        "Hold gentle gaze on the vast sky",
        "Take 1-minute cold shower",
        "Make 20-second sound composition",
        "Learn what dopamine baseline is and how habits shift it"
      ]
    };
    await fs.writeFile(TASKS_FILE, JSON.stringify(defaultTasks, null, 2));
    console.log("✅ tasks.json created");
  }

  try {
    await fs.access(USERS_FILE);
    console.log("✅ users.json exists");
  } catch {
    console.log("📝 Creating users.json...");
    await fs.writeFile(USERS_FILE, JSON.stringify({}, null, 2));
    console.log("✅ users.json created");
  }
}

// Helper functions
async function readJSONFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

async function writeJSONFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

function calculateDaysSinceStart(startTime) {
  const now = Date.now();
  const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);
  return Math.floor(hoursSinceStart / 10); // 10-hour days
}

function getNextUnlockTime(startTime, currentDay) {
  return startTime + currentDay * 10 * 60 * 60 * 1000;
}

// Routes

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "✅ Server is running", 
    timestamp: new Date().toISOString() 
  });
});

// Get user progress
app.get("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 GET /api/user/${userId}`);
    
    const users = await readJSONFile(USERS_FILE);

    // Initialize new user if not exists
    if (!users[userId]) {
      console.log(`👤 Creating new user: ${userId}`);
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

    // Check if user exceeded 7 days without completing
    if (daysSinceStart > 7 && user.currentDay <= 7) {
      console.log(`⚠️ User ${userId} exceeded time limit - resetting`);
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

    const response = {
      currentDay: user.currentDay,
      completedDays: user.completedDays,
      dayNotes: user.dayNotes,
      isLocked,
      nextUnlockTime: isLocked ? nextUnlockTime : null,
      challengeComplete: user.currentDay > 7,
      startTime: user.startTime
    };

    console.log(`✅ User data sent:`, response);
    res.json(response);
  } catch (error) {
    console.error("❌ Error in GET /api/user:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Get tasks for a specific day
app.get("/api/tasks/:day", async (req, res) => {
  try {
    const { day } = req.params;
    console.log(`📥 GET /api/tasks/${day}`);

    const tasks = await readJSONFile(TASKS_FILE);
    const dayKey = `day${day}`;

    if (!tasks[dayKey]) {
      console.log(`❌ No tasks found for ${dayKey}`);
      return res.status(404).json({ error: "Tasks not found for this day" });
    }

    console.log(`✅ Tasks sent for ${dayKey}:`, tasks[dayKey].length, "tasks");
    res.json({ tasks: tasks[dayKey] });
  } catch (error) {
    console.error("❌ Error in GET /api/tasks:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Complete a day
app.post("/api/user/:userId/complete", async (req, res) => {
  try {
    const { userId } = req.params;
    const { day, note } = req.body;
    console.log(`📥 POST /api/user/${userId}/complete - Day ${day}`);

    const users = await readJSONFile(USERS_FILE);

    if (!users[userId]) {
      console.log(`❌ User ${userId} not found`);
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[userId];

    // Verify correct day
    if (user.currentDay !== day) {
      console.log(`❌ Invalid day: expected ${user.currentDay}, got ${day}`);
      return res.status(400).json({ error: "Invalid day completion" });
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

    console.log(`✅ Day ${day} completed for ${userId}`);
    res.json({
      success: true,
      currentDay: user.currentDay,
      nextUnlockTime: challengeComplete ? null : nextUnlockTime,
      challengeComplete
    });
  } catch (error) {
    console.error("❌ Error in POST /api/user/complete:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Reset user progress
app.post("/api/user/:userId/reset", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 POST /api/user/${userId}/reset`);

    const users = await readJSONFile(USERS_FILE);

    users[userId] = {
      currentDay: 1,
      startTime: Date.now(),
      completedDays: [],
      dayNotes: {},
      lastCompletedTime: null
    };

    await writeJSONFile(USERS_FILE, users);

    console.log(`✅ User ${userId} reset successfully`);
    res.json({ success: true, message: "Progress reset successfully" });
  } catch (error) {
    console.error("❌ Error in POST /api/user/reset:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Get all tasks (for admin/editing)
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await readJSONFile(TASKS_FILE);
    res.json(tasks);
  } catch (error) {
    console.error("❌ Error in GET /api/tasks:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Update tasks (for admin)
app.put("/api/tasks", async (req, res) => {
  try {
    const { tasks } = req.body;
    await writeJSONFile(TASKS_FILE, tasks);
    res.json({ success: true, message: "Tasks updated successfully" });
  } catch (error) {
    console.error("❌ Error in PUT /api/tasks:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Initialize and start server
initializeDataFiles().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
🚀 ========================================
   PROJECT SEVEN Server Running
   Port: ${PORT}
   Time: ${new Date().toISOString()}
========================================
    `);
  });
}).catch((error) => {
  console.error("❌ Failed to initialize server:", error);
  process.exit(1);
});