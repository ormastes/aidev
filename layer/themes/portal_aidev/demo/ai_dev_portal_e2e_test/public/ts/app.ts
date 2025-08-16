// Type definitions
interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface Project {
    id: number;
    name: string;
    description: string;
    user_id: number;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Feature {
    id: number;
    project_id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Task {
    id: number;
    feature_id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface AppState {
    user: User | null;
    token: string | null;
    currentView: string;
    projects: Project[];
    features: Feature[];
    tasks: Task[];
    selectedProject?: Project;
    selectedFeature?: Feature;
}

interface ApiError {
    error: string;
}

// State management
const state: AppState = {
    user: null,
    token: null,
    currentView: "projects",
    projects: [],
    features: [],
    tasks: []
};

// HTML escape function to prevent XSS
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// API helper
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            "Authorization": state.token ? `Bearer ${state.token}` : '',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.json() as ApiError;
        throw new Error(error.error || 'API error');
    }
    
    return response.json() as Promise<T>;
}

// Helper function to get element by ID with type safety
function getElementById<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with id '${id}' not found`);
    }
    return element as T;
}

// Login functionality
getElementById<HTMLFormElement>('login-form').addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    
    const username = getElementById<HTMLInputElement>("username").value;
    const password = getElementById<HTMLInputElement>("password").value;
    
    try {
        const response = await apiCall<{ token: string; user: User }>('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        state.token = response.token;
        state.user = response.user;
        
        // Store token in localStorage for session persistence
        if (response.token) {
            localStorage.setItem('token', response.token);
        }
        
        showDashboard();
    } catch (error) {
        alert('Login failed: ' + (error as Error).message);
    }
});

// Logout functionality
getElementById('logout-link').addEventListener('click', async (e: Event) => {
    e.preventDefault();
    
    try {
        await apiCall<{ message: string }>('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    state.user = null;
    state.token = null;
    localStorage.removeItem('token');
    showLogin();
});

// Navigation
getElementById('projects-link').addEventListener('click', (e: Event) => {
    e.preventDefault();
    showView("projects");
    loadProjects();
});

getElementById('features-link').addEventListener('click', (e: Event) => {
    e.preventDefault();
    showView("features");
    loadFeatures();
});

getElementById('tasks-link').addEventListener('click', (e: Event) => {
    e.preventDefault();
    showView('tasks');
    loadTasks();
});

getElementById('profile-link').addEventListener('click', (e: Event) => {
    e.preventDefault();
    showView('profile');
    showProfile();
});

// View management
function showLogin(): void {
    getElementById('login-page').style.display = 'flex';
    getElementById('dashboard-page').style.display = 'none';
}

function showDashboard(): void {
    getElementById('login-page').style.display = 'none';
    getElementById('dashboard-page').style.display = 'block';
    loadProjects();
}

function showView(viewName: string): void {
    document.querySelectorAll('.view').forEach((view: Element) => {
        (view as HTMLElement).style.display = 'none';
    });
    getElementById(`${viewName}-view`).style.display = 'block';
    state.currentView = viewName;
}

// Load projects
async function loadProjects(): Promise<void> {
    try {
        state.projects = await apiCall<Project[]>('/projects');
        renderProjects();
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

function renderProjects(): void {
    const container = getElementById('projects-list');
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

async function selectProject(project: Project): Promise<void> {
    state.selectedProject = project;
    const features = await apiCall<Feature[]>(`/projects/${project.id}/features`);
    state.features = features;
    showView("features");
    renderFeatures();
}

// Load features
async function loadFeatures(): Promise<void> {
    if (!state.selectedProject) {
        state.features = [];
    }
    renderFeatures();
}

function renderFeatures(): void {
    const container = getElementById('features-list');
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
            <h3>${escapeHtml(feature.title)}
                <span class="status-badge status-${escapeHtml(feature.status)}">${escapeHtml(feature.status)}</span>
            </h3>
            <p>${escapeHtml(feature.description || 'No description')}</p>
            <p><small>Priority: ${escapeHtml(feature.priority)}</small></p>
        `;
        item.addEventListener('click', () => selectFeature(feature));
        container.appendChild(item);
    });
}

async function selectFeature(feature: Feature): Promise<void> {
    state.selectedFeature = feature;
    const tasks = await apiCall<Task[]>(`/features/${feature.id}/tasks`);
    state.tasks = tasks;
    showView('tasks');
    renderTasks();
}

// Load tasks
async function loadTasks(): Promise<void> {
    if (!state.selectedFeature) {
        state.tasks = [];
    }
    renderTasks();
}

function renderTasks(): void {
    const container = getElementById('tasks-list');
    container.innerHTML = '';
    
    if (!state.selectedFeature) {
        container.innerHTML = '<p>Please select a feature first.</p>';
        return;
    }
    
    container.innerHTML = `<h3>Tasks for: ${escapeHtml(state.selectedFeature.title)}</h3>`;
    
    state.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <h3>${escapeHtml(task.title)}
                <span class="status-badge status-${escapeHtml(task.status)}">${escapeHtml(task.status)}</span>
            </h3>
            <p>${escapeHtml(task.description || 'No description')}</p>
        `;
        container.appendChild(item);
    });
}

// Show profile
function showProfile(): void {
    if (!state.user) {
        console.error('No user logged in');
        return;
    }
    
    const container = getElementById('profile-info');
    container.innerHTML = `
        <div><strong>Username:</strong> ${escapeHtml(state.user.username)}</div>
        <div><strong>Email:</strong> ${escapeHtml(state.user.email)}</div>
        <div><strong>Role:</strong> ${escapeHtml(state.user.role)}</div>
        <div><strong>User ID:</strong> ${state.user.id}</div>
    `;
}

// New project functionality
getElementById('new-project-btn').addEventListener('click', async () => {
    const name = prompt('Enter project name:');
    if (!name) return;
    
    const description = prompt('Enter project description:') || '';
    
    try {
        await apiCall<{ id: number; name: string; description: string }>('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
        loadProjects();
    } catch (error) {
        alert('Failed to create project: ' + (error as Error).message);
    }
});

// Check for existing session on page load
async function checkSession(): Promise<void> {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
        showLogin();
        return;
    }
    
    state.token = storedToken;
    
    try {
        const user = await apiCall<User>('/user');
        if (user) {
            state.user = user;
            showDashboard();
            loadProjects();
        } else {
            showLogin();
        }
    } catch (error) {
        // Invalid token
        localStorage.removeItem('token');
        showLogin();
    }
}

// Initialize
checkSession();