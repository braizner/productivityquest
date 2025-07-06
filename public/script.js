// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// API Base URL
const API_BASE = 'http://localhost:3001/api';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const tasksContainer = document.getElementById('tasks-container');
const progressChart = document.getElementById('progress-chart');
const notification = document.getElementById('notification');
const onboardingModal = document.getElementById('onboarding-modal');
const onboardingForm = document.getElementById('onboarding-form');
const onboardingTaskList = document.getElementById('onboarding-task-list');
const recurringTasksContainer = document.getElementById('recurring-tasks-container');
const goalModal = document.getElementById('goal-modal');
const goalForm = document.getElementById('goal-form');
const goalInput = document.getElementById('goal-input');
const pointsGoalCard = document.getElementById('points-goal-card');

let onboardingTasks = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Initialize the application
function initializeApp() {
    if (authToken) {
        // Try to validate the token and load user data
        validateToken();
    } else {
        showAuthScreen();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth form listeners
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Auth switch listeners
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Task modal listeners
    document.getElementById('add-task-btn').addEventListener('click', showTaskModal);
    document.getElementById('close-modal').addEventListener('click', hideTaskModal);
    document.getElementById('cancel-task').addEventListener('click', hideTaskModal);
    taskForm.addEventListener('submit', handleCreateTask);
    
    // Goal modal listeners
    pointsGoalCard.addEventListener('click', showGoalModal);
    document.getElementById('close-goal-modal').addEventListener('click', hideGoalModal);
    document.getElementById('cancel-goal').addEventListener('click', hideGoalModal);
    goalForm.addEventListener('submit', handleUpdateGoal);
    
    // Logout listener
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Modal backdrop click to close
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            hideTaskModal();
        }
    });
    
    goalModal.addEventListener('click', (e) => {
        if (e.target === goalModal) {
            hideGoalModal();
        }
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showApp();
            loadUserData();
            showNotification('Login successful!');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            // Show onboarding instead of main app
            showOnboarding();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Registration failed. Please try again.', 'error');
    }
}

async function validateToken() {
    try {
        const response = await fetch(`${API_BASE}/user/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            showApp();
            loadUserData();
        } else {
            localStorage.removeItem('authToken');
            authToken = null;
            showAuthScreen();
        }
    } catch (error) {
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthScreen();
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showAuthScreen();
    showNotification('Logged out successfully');
}

// UI Navigation functions
function showAuthScreen() {
    loadingScreen.classList.add('hidden');
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    showLoginForm();
}

function showApp() {
    loadingScreen.classList.add('hidden');
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

function showLoginForm() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showRegisterForm() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
}

// Task management functions
function showTaskModal() {
    taskModal.classList.remove('hidden');
    taskForm.reset();
}

function hideTaskModal() {
    taskModal.classList.add('hidden');
}

async function handleCreateTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const points = parseInt(document.getElementById('task-points').value);
    
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ title, description, points }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            hideTaskModal();
            loadTasks();
            loadUserStats();
            showNotification('Task created successfully!');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to create task. Please try again.', 'error');
    }
}

async function completeTask(taskId) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadTasks();
            loadUserStats();
            loadWeeklyProgress();
            showNotification(`Task completed! +${data.points_earned} points earned!`);
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to complete task. Please try again.', 'error');
    }
}

// Data loading functions
async function loadUserData() {
    await Promise.all([
        loadUserStats(),
        loadTasks(),
        loadWeeklyProgress(),
        loadRecurringTasks()
    ]);
}

async function loadUserStats() {
    try {
        const response = await fetch(`${API_BASE}/user/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            const tasks = await response.json();
            displayTasks(tasks);
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

async function loadWeeklyProgress() {
    try {
        const response = await fetch(`${API_BASE}/progress/weekly?weeks=4`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            const progress = await response.json();
            displayWeeklyProgress(progress);
        }
    } catch (error) {
        console.error('Failed to load weekly progress:', error);
    }
}

async function loadRecurringTasks() {
    try {
        const response = await fetch(`${API_BASE}/recurring-tasks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        if (response.ok) {
            const tasks = await response.json();
            // Store recurring tasks globally to use in displayTasks
            window.recurringTasks = tasks;
            // Refresh the main task display to include recurring tasks
            await loadTasks();
        }
    } catch (error) {
        console.error('Failed to load recurring tasks:', error);
    }
}

// Display functions
function updateStatsDisplay(stats) {
    document.getElementById('total-points').textContent = stats.total_points || 0;
    document.getElementById('total-tasks').textContent = stats.total_tasks || 0;
    document.getElementById('completed-tasks').textContent = stats.completed_tasks || 0;
    document.getElementById('earned-points').textContent = stats.earned_points || 0;
    
    // Update points goal and progress (goal stays static, progress updates)
    const pointsGoal = stats.points_goal || 100;
    const currentPoints = stats.total_points || 0;
    const progressPercentage = Math.min(Math.round((currentPoints / pointsGoal) * 100), 100);
    
    document.getElementById('points-goal').textContent = pointsGoal;
    document.getElementById('goal-progress').textContent = `${progressPercentage}%`;
    
    // Update goal input value
    goalInput.value = pointsGoal;
    
    // Update progress color based on completion
    const goalProgress = document.getElementById('goal-progress');
    if (progressPercentage >= 100) {
        goalProgress.style.color = '#43e97b';
        goalProgress.textContent = 'Goal Achieved! 🎉';
    } else if (progressPercentage >= 75) {
        goalProgress.style.color = '#4facfe';
    } else if (progressPercentage >= 50) {
        goalProgress.style.color = '#f093fb';
    } else {
        goalProgress.style.color = '#f5576c';
    }
    
    if (currentUser) {
        document.getElementById('username-display').textContent = currentUser.username;
    }
}

function displayTasks(tasks) {
    tasksContainer.innerHTML = '';
    
    // First, display recurring tasks (weekly quests)
    if (window.recurringTasks && window.recurringTasks.length > 0) {
        const recurringHeader = document.createElement('div');
        recurringHeader.className = 'task-section-header';
        recurringHeader.innerHTML = '<h3>🔄 Weekly Quests</h3>';
        tasksContainer.appendChild(recurringHeader);
        
        window.recurringTasks.forEach(task => {
            const taskElement = createRecurringTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
        
        // Add a separator
        const separator = document.createElement('div');
        separator.className = 'task-separator';
        separator.innerHTML = '<hr>';
        tasksContainer.appendChild(separator);
    }
    
    // Then display regular tasks
    if (tasks.length === 0 && (!window.recurringTasks || window.recurringTasks.length === 0)) {
        tasksContainer.innerHTML = `
            <div class="task-item" style="text-align: center; color: #666;">
                <p>No tasks yet. Create your first quest to get started!</p>
            </div>
        `;
        return;
    }
    
    if (tasks.length > 0) {
        const regularHeader = document.createElement('div');
        regularHeader.className = 'task-section-header';
        regularHeader.innerHTML = '<h3>📝 One-time Quests</h3>';
        tasksContainer.appendChild(regularHeader);
        
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
    }
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    const createdDate = new Date(task.created_at).toLocaleDateString();
    const completedDate = task.completed_at 
        ? new Date(task.completed_at).toLocaleDateString() 
        : '';
    
    taskDiv.innerHTML = `
        <div class="task-content">
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span>Created: ${createdDate}</span>
                ${completedDate ? `<span>Completed: ${completedDate}</span>` : ''}
            </div>
        </div>
        <div class="task-actions">
            <div class="task-points">${task.points} pts</div>
            ${!task.completed ? 
                `<button class="complete-btn" onclick="completeTask('${task.id}')">
                    Complete
                </button>` : 
                `<button class="complete-btn" disabled>Completed</button>`
            }
        </div>
    `;
    
    return taskDiv;
}

function createRecurringTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'recurring-task-item';
    const goalMet = task.completions >= task.times_per_week;
    const progressPercentage = (task.completions / task.times_per_week) * 100;
    
    taskDiv.innerHTML = `
        <div class="recurring-task-main">
            <div class="recurring-task-title">${task.name}</div>
            <div class="recurring-task-progress">
                <div class="recurring-task-progress-bar" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="recurring-task-meta">
                <span>${task.completions}/${task.times_per_week} completed</span>
                <span>${task.points_per_completion} pts</span>
                <span>${task.reward_type === 'per_completion' ? 'Per completion' : 'On goal met'}</span>
            </div>
        </div>
        <div class="recurring-task-actions">
            <button class="recurring-complete-btn" ${goalMet ? 'disabled' : ''} data-id="${task.id}">
                ${goalMet ? 'Goal Met! 🎉' : 'Complete'}
            </button>
        </div>
    `;
    
    // Add event listener for completion button
    const completeBtn = taskDiv.querySelector('.recurring-complete-btn');
    completeBtn.addEventListener('click', async function() {
        const id = this.getAttribute('data-id');
        await completeRecurringTask(id);
    });
    
    return taskDiv;
}

function displayWeeklyProgress(progress) {
    progressChart.innerHTML = '';
    
    if (progress.length === 0) {
        progressChart.innerHTML = `
            <div class="week-card" style="grid-column: 1 / -1; text-align: center; color: #666;">
                <p>No weekly progress data yet. Complete some tasks to see your progress!</p>
            </div>
        `;
        return;
    }
    
    progress.forEach(week => {
        const weekElement = createWeekElement(week);
        progressChart.appendChild(weekElement);
    });
}

function createWeekElement(week) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week-card';
    
    const startDate = new Date(week.week_start).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    const endDate = new Date(week.week_end).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    
    weekDiv.innerHTML = `
        <h4>${startDate} - ${endDate}</h4>
        <div class="week-stats">
            <div class="week-stat">
                <div class="week-stat-value">${week.total_points}</div>
                <div class="week-stat-label">Points</div>
            </div>
            <div class="week-stat">
                <div class="week-stat-value">${week.tasks_completed}</div>
                <div class="week-stat-label">Tasks</div>
            </div>
        </div>
    `;
    
    return weekDiv;
}

function displayRecurringTasks(tasks) {
    recurringTasksContainer.innerHTML = '';
    if (!tasks || tasks.length === 0) {
        recurringTasksContainer.innerHTML = `<div class="task-item" style="text-align: center; color: #666;">No weekly quests set up. Add some in onboarding!</div>`;
        return;
    }
    tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'recurring-task-item';
        const goalMet = task.completions >= task.times_per_week;
        taskDiv.innerHTML = `
            <div class="recurring-task-main">
                <div class="recurring-task-title">${task.name}</div>
                <div class="recurring-task-meta">
                    <span>Progress: ${task.completions}/${task.times_per_week}</span>
                    <span>Points: ${task.points_per_completion}</span>
                    <span>Reward: ${task.reward_type === 'per_completion' ? 'Each time' : 'On goal met'}</span>
                </div>
            </div>
            <div class="recurring-task-actions">
                <button class="recurring-complete-btn btn btn-small" ${goalMet ? 'disabled' : ''} data-id="${task.id}">
                    ${goalMet ? 'Goal Met' : 'Complete'}
                </button>
            </div>
        `;
        recurringTasksContainer.appendChild(taskDiv);
    });
    // Add event listeners for completion buttons
    Array.from(document.getElementsByClassName('recurring-complete-btn')).forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            await completeRecurringTask(id);
        });
    });
}

async function completeRecurringTask(taskId) {
    try {
        const response = await fetch(`${API_BASE}/recurring-tasks/${taskId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        const data = await response.json();
        if (response.ok) {
            loadRecurringTasks();
            loadUserStats();
            loadWeeklyProgress();
            showNotification(`Weekly quest progress updated!${data.points_awarded ? ' +' + data.points_awarded + ' points!' : ''}`);
        } else {
            showNotification(data.error || 'Could not complete quest.', 'error');
        }
    } catch (error) {
        showNotification('Could not complete quest.', 'error');
    }
}

// Utility functions
function showNotification(message, type = 'success') {
    const notificationElement = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    messageElement.textContent = message;
    
    // Update notification style based on type
    notificationElement.className = `notification ${type}`;
    
    // Show notification
    notificationElement.classList.remove('hidden');
    setTimeout(() => {
        notificationElement.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notificationElement.classList.remove('show');
        setTimeout(() => {
            notificationElement.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

// Network error handling
window.addEventListener('offline', () => {
    showNotification('You are offline. Please check your internet connection.', 'error');
});

window.addEventListener('online', () => {
    showNotification('You are back online!', 'success');
});

function showOnboarding() {
    loadingScreen.classList.add('hidden');
    authContainer.classList.add('hidden');
    appContainer.classList.add('hidden');
    onboardingModal.classList.remove('hidden');
    fetchTaskBank();
}

function hideOnboarding() {
    onboardingModal.classList.add('hidden');
}

async function fetchTaskBank() {
    onboardingTaskList.innerHTML = '<div class="onboarding-loading">Loading your quest options...</div>';
    try {
        const response = await fetch(`${API_BASE}/onboarding/task-bank`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const tasks = await response.json();
            renderOnboardingTaskBank(tasks);
        } else {
            onboardingTaskList.innerHTML = '<div style="color:red; text-align:center; padding:20px;">Failed to load task bank. Please refresh and try again.</div>';
        }
    } catch (e) {
        onboardingTaskList.innerHTML = '<div style="color:red; text-align:center; padding:20px;">Failed to load task bank. Please check your connection.</div>';
    }
}

function renderOnboardingTaskBank(tasks) {
    onboardingTaskList.innerHTML = '';
    tasks.forEach((task, idx) => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'onboarding-task-item';
        taskDiv.innerHTML = `
            <label>
                <input type="checkbox" class="onboarding-task-checkbox" data-idx="${idx}">
                <span class="onboarding-task-name">${task.name}</span>
            </label>
            <div class="onboarding-task-config hidden" id="onboarding-task-config-${idx}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <label>
                        Times per week
                        <input type="number" min="1" max="14" value="${task.defaultTimes}" class="onboarding-task-times">
                    </label>
                    <label>
                        Points per completion
                        <input type="number" min="1" max="1000" value="${task.defaultPoints}" class="onboarding-task-points">
                    </label>
                </div>
                <label style="margin-top: 15px;">
                    Reward type
                    <select class="onboarding-task-reward">
                        <option value="per_completion">Points each time completed</option>
                        <option value="per_goal">Points only when weekly goal met</option>
                    </select>
                </label>
            </div>
        `;
        onboardingTaskList.appendChild(taskDiv);
    });
    
    // Add event listeners for checkboxes
    Array.from(document.getElementsByClassName('onboarding-task-checkbox')).forEach(cb => {
        cb.addEventListener('change', function() {
            const idx = this.getAttribute('data-idx');
            const configDiv = document.getElementById(`onboarding-task-config-${idx}`);
            if (this.checked) {
                configDiv.classList.remove('hidden');
                configDiv.style.animation = 'slideDown 0.3s ease';
            } else {
                configDiv.classList.add('hidden');
            }
        });
    });
}

onboardingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    // Gather selected tasks
    const selected = [];
    Array.from(document.getElementsByClassName('onboarding-task-checkbox')).forEach((cb, idx) => {
        if (cb.checked) {
            const configDiv = document.getElementById(`onboarding-task-config-${idx}`);
            const times = configDiv.querySelector('.onboarding-task-times').value;
            const points = configDiv.querySelector('.onboarding-task-points').value;
            const reward = configDiv.querySelector('.onboarding-task-reward').value;
            const name = configDiv.parentElement.querySelector('.onboarding-task-name').textContent;
            selected.push({
                name,
                times_per_week: parseInt(times),
                points_per_completion: parseInt(points),
                reward_type: reward
            });
        }
    });
    if (selected.length === 0) {
        showNotification('Please select at least one task.', 'error');
        return;
    }
    // Submit to backend
    try {
        const response = await fetch(`${API_BASE}/onboarding/recurring-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ tasks: selected })
        });
        if (response.ok) {
            hideOnboarding();
            showApp();
            loadUserData();
            showNotification('Onboarding complete! Your weekly quests are ready.');
        } else {
            showNotification('Failed to save onboarding tasks.', 'error');
        }
    } catch (e) {
        showNotification('Failed to save onboarding tasks.', 'error');
    }
});

function showGoalModal() {
    goalModal.classList.remove('hidden');
    goalInput.focus();
}

function hideGoalModal() {
    goalModal.classList.add('hidden');
}

async function handleUpdateGoal(e) {
    e.preventDefault();
    
    const newGoal = parseInt(goalInput.value);
    
    try {
        const response = await fetch(`${API_BASE}/user/points-goal`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ points_goal: newGoal }),
        });
        
        if (response.ok) {
            hideGoalModal();
            loadUserStats();
            showNotification('Points goal updated successfully!');
        } else {
            const data = await response.json();
            showNotification(data.error || 'Failed to update goal', 'error');
        }
    } catch (error) {
        showNotification('Failed to update goal', 'error');
    }
} 