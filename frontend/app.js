// App State
let appState = {
    currentDay: 1,
    tasks: [],
    completedTasks: new Set(),
    isLocked: false,
    challengeComplete: false,
    nextUnlockTime: null,
    countdownInterval: null,
    attemptNumber: 1,
    startDate: null
};

// DOM Elements
const elements = {
    mainContent: document.getElementById('mainContent'),
    completeScreen: document.getElementById('completeScreen'),
    currentDayNum: document.getElementById('currentDayNum'),
    submitDay: document.getElementById('submitDay'),
    dayStatus: document.getElementById('dayStatus'),
    endDate: document.getElementById('endDate'),
    attemptNumber: document.getElementById('attemptNumber'),
    taskProgressFill: document.getElementById('taskProgressFill'),
    taskProgressCount: document.getElementById('taskProgressCount'),
    taskProgressTotal: document.getElementById('taskProgressTotal'),
    tasksList: document.getElementById('tasksList'),
    tasksContainer: document.getElementById('tasksContainer'),
    lockedScreen: document.getElementById('lockedScreen'),
    countdownTimer: document.getElementById('countdownTimer'),
    dayNotes: document.getElementById('dayNotes'),
    submitBtn: document.getElementById('submitBtn'),
    resetBtn: document.getElementById('resetBtn'),
    /*restartComplete: document.getElementById('restartComplete'),*/
    confirmModal: document.getElementById('confirmModal'),
    confirmReset: document.getElementById('confirmReset'),
    cancelReset: document.getElementById('cancelReset')
};

// API Functions
async function fetchUserProgress() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/user/${CONFIG.USER_ID}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user progress:', error);
        return null;
    }
}

async function fetchTasks(day) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/tasks/${day}`);
        const data = await response.json();
        return data.tasks;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

async function completeDay(day, note) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/user/${CONFIG.USER_ID}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ day, note })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error completing day:', error);
        return null;
    }
}

async function resetProgress() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/user/${CONFIG.USER_ID}/reset`, {
            method: 'POST'
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error resetting progress:', error);
        return null;
    }
}

// Utility Functions
function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

function calculateEndDate(startTime) {
    
    const startDate = new Date(startTime);
   
    const endDate = new Date(startDate.getTime() + (144 * 60 * 60 * 1000));
    return formatDate(endDate);
}

function getAttemptNumber() {
    const attempts = localStorage.getItem('sevendays_attempts');
    return attempts ? parseInt(attempts) : 1;
}

function incrementAttempts() {
    const current = getAttemptNumber();
    localStorage.setItem('sevendays_attempts', (current + 1).toString());
}

// UI Functions
function renderTasks(tasks) {
    elements.tasksList.innerHTML = '';
    appState.tasks = tasks;
    appState.completedTasks.clear();

    elements.taskProgressTotal.textContent = tasks.length;

    tasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.innerHTML = `
            <div class="task-checkbox" data-index="${index}"></div>
            <div class="task-text">${index + 1}. ${task}</div>
            <div class="task-checkmark">✓</div>
        `;
        
        taskItem.addEventListener('click', () => toggleTask(index));
        elements.tasksList.appendChild(taskItem);
    });

    updateTaskProgress();
    updateSubmitButton();
}

function toggleTask(index) {
    const checkbox = document.querySelector(`.task-checkbox[data-index="${index}"]`);
    const taskItem = checkbox.parentElement;

    if (appState.completedTasks.has(index)) {
        appState.completedTasks.delete(index);
        checkbox.classList.remove('checked');
        taskItem.classList.remove('completed');
    } else {
        appState.completedTasks.add(index);
        checkbox.classList.add('checked');
        taskItem.classList.add('completed');
    }

    updateTaskProgress();
    updateSubmitButton();
}

function updateTaskProgress() {
    const completed = appState.completedTasks.size;
    const total = appState.tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    elements.taskProgressFill.style.width = `${percentage}%`;
    elements.taskProgressCount.textContent = completed;
}

function updateSubmitButton() {
    const allTasksCompleted = appState.completedTasks.size === appState.tasks.length && appState.tasks.length > 0;
    elements.submitBtn.disabled = !allTasksCompleted;
}

function showLockedScreen(nextUnlockTime, completedDay) {
    elements.tasksContainer.classList.add('hidden');
    elements.lockedScreen.classList.remove('hidden');
    
    // Update day number
    const lockedDayNum = document.getElementById('lockedDayNumber');
    if (lockedDayNum) {
        lockedDayNum.textContent = completedDay || appState.currentDay - 1;
    }
    
    // Calculate progress
    const totalDays = 7;
    const daysCompleted = completedDay || appState.currentDay - 1;
    const percentage = Math.round((daysCompleted / totalDays) * 100);
    const tasksCompleted = daysCompleted * 5; // 5 tasks per day
    
    // Update stats
    document.getElementById('statDays').textContent = daysCompleted;
    document.getElementById('statTasks').textContent = tasksCompleted;
    document.getElementById('statProgress').textContent = percentage + '%';
    document.getElementById('progressPercentage').textContent = percentage + '%';
    
    // Animate progress ring
    const circle = document.getElementById('progressRingCircle');
    const circumference = 2 * Math.PI * 90; // radius = 90
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Update timestamp
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const timestamp = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} • ${displayHours}:${displayMinutes} ${ampm}`;
    document.getElementById('completionTimestamp').textContent = timestamp;
    
    startCountdownToMidnight(nextUnlockTime);
}

function hideLockedScreen() {
    elements.tasksContainer.classList.remove('hidden');
    elements.lockedScreen.classList.add('hidden');
    
    if (appState.countdownInterval) {
        clearInterval(appState.countdownInterval);
    }
}

function startCountdownToMidnight() {
    if (appState.countdownInterval) {
        clearInterval(appState.countdownInterval);
    }

    function getNextMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0); // set to next 12:00 AM
        return midnight;
    }

    function updateCountdown() {
        const now = new Date();
        const targetTime = getNextMidnight();
        const diff = targetTime - now;

        if (diff <= 0) {
            clearInterval(appState.countdownInterval);
            loadApp(); // your reset or reload logic
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        elements.countdownTimer.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateCountdown();
    appState.countdownInterval = setInterval(updateCountdown, 1000);
}



function showCompleteScreen() {
    elements.mainContent.classList.add('hidden');
    elements.completeScreen.classList.remove('hidden');
}

function hideCompleteScreen() {
    elements.mainContent.classList.remove('hidden');
    elements.completeScreen.classList.add('hidden');
}

function showModal() {
    elements.confirmModal.classList.remove('hidden');
}

function hideModal() {
    elements.confirmModal.classList.add('hidden');
}

// Event Handlers
elements.submitBtn.addEventListener('click', async () => {
    const note = elements.dayNotes.value.trim();
    const result = await completeDay(appState.currentDay, note);

    if (result && result.success) {
        elements.dayNotes.value = '';
        appState.completedTasks.clear();
        
        setTimeout(() => {
            loadApp();
        }, 500);
    }
});

elements.resetBtn.addEventListener('click', () => {
    showModal();
});

/* elements.restartComplete.addEventListener('click', async () => {
    incrementAttempts();
    await resetProgress();
    hideCompleteScreen();
    loadApp();
}); */

elements.confirmReset.addEventListener('click', async () => {
    incrementAttempts();
    await resetProgress();
    hideModal();
    loadApp();
});

elements.cancelReset.addEventListener('click', () => {
    hideModal();
});

// Main App Loader
async function loadApp() {
    const progress = await fetchUserProgress();
    
    if (!progress) {
        elements.dayStatus.textContent = 'Error loading data. Please refresh.';
        return;
    }

    console.log('Progress:', progress); // DEBUG LINE

    appState.currentDay = progress.currentDay;
    appState.isLocked = progress.isLocked;
    appState.nextUnlockTime = progress.nextUnlockTime;
    appState.challengeComplete = progress.challengeComplete;
    appState.attemptNumber = getAttemptNumber();
    appState.startDate = progress.startTime || Date.now();

    // Update UI
    elements.currentDayNum.textContent = Math.min(progress.currentDay, 7);
    elements.submitDay.textContent = Math.min(progress.currentDay, 7);
    elements.attemptNumber.textContent = appState.attemptNumber;
    elements.endDate.textContent = calculateEndDate(appState.startDate);

    // Check if challenge is complete
    if (progress.challengeComplete) {
        showCompleteScreen();
        return;
    }

    // Check if locked
   /*if (progress.isLocked) {
        console.log('Locked until:', new Date(progress.nextUnlockTime)); // DEBUG LINE
        elements.dayStatus.textContent = '';
        const completedDay = progress.currentDay - 1;
        showLockedScreen(progress.nextUnlockTime, completedDay);
        return;
    } */

    // Load current day tasks
    console.log('Loading tasks for day:', progress.currentDay); // DEBUG LINE
    hideLockedScreen();
    elements.dayStatus.textContent = '';
    const tasks = await fetchTasks(progress.currentDay);
    console.log('Tasks loaded:', tasks); // DEBUG LINE
    
    if (!tasks || tasks.length === 0) {
        console.error('No tasks returned for day', progress.currentDay);
        elements.dayStatus.textContent = 'Error: No tasks available';
        return;
    }
    
    renderTasks(tasks);

    // Load saved note if exists
    const savedNote = progress.dayNotes[`day${progress.currentDay}`];
    if (savedNote) {
        elements.dayNotes.value = savedNote;
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadApp();
    
    // Refresh every minute to check for unlock
    setInterval(() => {
        if (appState.isLocked) {
            loadApp();
        }
    }, 60000);
});
// Welcome Screen Logic - Show only once
document.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const hasSeenWelcome = localStorage.getItem('sevendays_welcome_seen');
    
    // If user has seen welcome before, hide it immediately
    if (hasSeenWelcome) {
        welcomeScreen.style.display = 'none';
    }
    
    // Let's Go button click handler
    document.getElementById('letsGoBtn').addEventListener('click', () => {
        // Mark as seen
        localStorage.setItem('sevendays_welcome_seen', 'true');
        
        // Hide with animation
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
        }, 500);
    });
});