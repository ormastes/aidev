// State management
const state = {
    user: null,
    token: null,
    currentView: "projects",
    projects: [],
    features: [],
    tasks: []
};

// API helper
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            "Authorization": state.token ? `Bearer ${state.token}` : '',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API error');
    }
    
    return response.json();
}

// Login functionality
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    try {
        const response = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        state.token = response.token;
        state.user = response.user;
        
        // Save token to localStorage for session persistence
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        showDashboard();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});

// Logout functionality
document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        await apiCall('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    state.user = null;
    state.token = null;
    showLogin();
});

// Navigation
document.getElementById('projects-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView("projects");
    loadProjects();
});

document.getElementById('features-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView("features");
    loadFeatures();
});

document.getElementById('tasks-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('tasks');
    loadTasks();
});

document.getElementById('profile-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('profile');
    showProfile();
});

// View management
function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('dashboard-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'block';
    loadProjects();
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    document.getElementById(`${viewName}-view`).style.display = 'block';
    state.currentView = viewName;
}

// Load projects
async function loadProjects() {
    try {
        state.projects = await apiCall('/projects');
        renderProjects();
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

function renderProjects() {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';
    
    state.projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <h3>${escapeHtml(project.name)}
                <span class="status-badge status-${escapeHtml(project.status)}">${escapeHtml(project.status)}</span>
            </h3>
            <p>${escapeHtml(project.description || 'No description')}</p>
        `;
        item.addEventListener('click', () => selectProject(project));
        container.appendChild(item);
    });
}

async function selectProject(project) {
    state.selectedProject = project;
    const features = await apiCall(`/projects/${project.id}/features`);
    state.features = features;
    showView("features");
    renderFeatures();
}

// Load features
async function loadFeatures() {
    if (!state.selectedProject) {
        state.features = [];
    }
    renderFeatures();
}

function renderFeatures() {
    const container = document.getElementById('features-list');
    container.innerHTML = '';
    
    if (!state.selectedProject) {
        container.innerHTML = '<p>Please select a project first.</p>';
        return;
    }
    
    container.innerHTML = `<h3>Features for: ${escapeHtml(state.selectedProject.name)}</h3>`;
    
    state.features.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <h3>${feature.title}
                <span class="status-badge status-${feature.status}">${feature.status}</span>
            </h3>
            <p>${feature.description || 'No description'}</p>
            <p><small>Priority: ${feature.priority}</small></p>
        `;
        item.addEventListener('click', () => selectFeature(feature));
        container.appendChild(item);
    });
}

async function selectFeature(feature) {
    state.selectedFeature = feature;
    const tasks = await apiCall(`/features/${feature.id}/tasks`);
    state.tasks = tasks;
    showView('tasks');
    renderTasks();
}

// Load tasks
async function loadTasks() {
    if (!state.selectedFeature) {
        state.tasks = [];
    }
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    container.innerHTML = '';
    
    if (!state.selectedFeature) {
        container.innerHTML = '<p>Please select a feature first.</p>';
        return;
    }
    
    container.innerHTML = `<h3>Tasks for: ${state.selectedFeature.title}</h3>`;
    
    state.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <h3>${task.title}
                <span class="status-badge status-${task.status}">${task.status}</span>
            </h3>
            <p>${task.description || 'No description'}</p>
        `;
        container.appendChild(item);
    });
}

// HTML escape function to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show profile
function showProfile() {
    const container = document.getElementById('profile-info');
    container.innerHTML = `
        <div><strong>Username:</strong> ${escapeHtml(state.user.username)}</div>
        <div><strong>Email:</strong> ${escapeHtml(state.user.email)}</div>
        <div><strong>Role:</strong> ${escapeHtml(state.user.role)}</div>
        <div><strong>User ID:</strong> ${state.user.id}</div>
    `;
}

// New project functionality
document.getElementById('new-project-btn').addEventListener('click', async () => {
    const name = prompt('Enter project name:');
    if (!name) return;
    
    const description = prompt('Enter project description:');
    
    try {
        await apiCall('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
        loadProjects();
    } catch (error) {
        alert('Failed to create project: ' + error.message);
    }
});

// Initialize
showLogin();