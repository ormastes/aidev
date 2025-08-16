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

// Feature Progress Monitor interfaces
interface FeatureData {
    id: string;
    name: string;
    data: {
        title: string;
        description: string;
        status: string;
        priority: string;
    };
}

interface TaskQueueData {
    taskQueues: {
        critical: any[];
        high: any[];
        medium: any[];
        low: any[];
    };
    working: any[];
    metadata: {
        totalTasks: number;
        workingTasks: number;
        pendingTasks: number;
    };
}

// Service URL configuration
const SERVICE_URLS = {
    'gui-selector': 'http://localhost:3456',
    'story-reporter': '/services/story-reporter',
    'manual': '/services/manual'
};

// Navigation setup
function setupNavigation(): void {
    // Main navigation links
    const navLinks = [
        { id: 'projects-link', view: "projects", handler: loadProjects },
        { id: 'features-link', view: "features", handler: loadFeatures },
        { id: 'feature-progress-link', view: 'feature-progress', handler: loadFeatureProgress },
        { id: 'tasks-link', view: 'tasks', handler: loadTasks },
        { id: 'gui-selector-link', view: 'gui-selector', handler: loadGuiSelector },
        { id: 'story-reporter-link', view: 'story-reporter', handler: loadStoryReporter },
        { id: 'manual-link', view: 'manual', handler: loadManual },
        { id: 'profile-link', view: 'profile', handler: showProfile }
    ];

    navLinks.forEach(link => {
        const element = document.getElementById(link.id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                // Update active state
                document.querySelectorAll('.panel-link').forEach(el => el.classList.remove('active'));
                element.classList.add('active');
                showView(link.view);
                link.handler();
            });
        }
    });

    // Setup selectors
    setupSelectors();
}

// Initialize navigation on page load
setupNavigation();

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

// Load service views
function loadGuiSelector(): void {
    const iframe = getElementById<HTMLIFrameElement>('gui-selector-frame');
    iframe.src = SERVICE_URLS['gui-selector'];
}

function loadStoryReporter(): void {
    const iframe = getElementById<HTMLIFrameElement>('story-reporter-frame');
    iframe.src = SERVICE_URLS['story-reporter'];
}

function loadManual(): void {
    const iframe = getElementById<HTMLIFrameElement>('manual-frame');
    iframe.src = SERVICE_URLS['manual'];
}

// Feature Progress Monitor
async function loadFeatureProgress(): Promise<void> {
    try {
        // Load feature and task data
        const [featureResponse, taskResponse, nameIdResponse] = await Promise.all([
            fetch('/api/vfs/FEATURE.vf.json'),
            fetch('/api/vfs/TASK_QUEUE.vf.json'),
            fetch('/api/vfs/NAME_ID.vf.json').catch(() => ({ json: async () => ({}) }))
        ]);

        const featureData = await featureResponse.json();
        const taskData: TaskQueueData = await taskResponse.json();
        const nameIdData = await nameIdResponse.json();

        // Calculate statistics
        const features = featureData.aiDevPlatform || [];
        const totalFeatures = features.length;
        const inProgressFeatures = features.filter((f: FeatureData) => 
            f.data.status === 'In Progress' || f.data.status === 'in_development'
        ).length;
        const completedFeatures = features.filter((f: FeatureData) => 
            f.data.status === "completed"
        ).length;
        const pendingTasks = taskData.metadata?.pendingTasks || 0;

        // Update stats
        getElementById('total-features').textContent = totalFeatures.toString();
        getElementById('in-progress-features').textContent = inProgressFeatures.toString();
        getElementById('completed-features').textContent = completedFeatures.toString();
        getElementById('pending-tasks').textContent = pendingTasks.toString();

        // Populate selectors with themes, epics, and apps
        populateSelectors(features, nameIdData);

        // Render feature list with progress
        renderFeatureProgress(features, taskData);
    } catch (error) {
        console.error('Failed to load feature progress:', error);
        getElementById('feature-progress-list').innerHTML = 
            '<p class="error">Failed to load feature progress data</p>';
    }
}

function renderFeatureProgress(features: FeatureData[], taskData: TaskQueueData): void {
    const container = getElementById('feature-progress-list');
    container.innerHTML = '';

    features.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'feature-item';
        
        // Calculate progress based on related tasks
        const relatedTasks = countRelatedTasks(feature.id, taskData);
        const progress = calculateProgress(feature.data.status);
        
        item.innerHTML = `
            <h4>${escapeHtml(feature.data.title)}</h4>
            <div class="feature-meta">
                <span>Status: <strong>${escapeHtml(feature.data.status)}</strong></span>
                <span>Priority: <strong>${escapeHtml(feature.data.priority)}</strong></span>
                <span>ID: <strong>${escapeHtml(feature.id)}</strong></span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="task-summary">
                ${relatedTasks > 0 ? `${relatedTasks} related tasks in queue` : 'No pending tasks'}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function countRelatedTasks(featureId: string, taskData: TaskQueueData): number {
    // Count tasks that might be related to this feature
    let count = 0;
    const allQueues = ["critical", 'high', 'medium', 'low'] as const;
    
    allQueues.forEach(priority => {
        const tasks = taskData.taskQueues[priority] || [];
        count += tasks.filter(task => 
            task.content?.title?.toLowerCase().includes(featureId.toLowerCase()) ||
            task.content?.description?.toLowerCase().includes(featureId.toLowerCase())
        ).length;
    });
    
    return count;
}

function calculateProgress(status: string): number {
    const statusProgress: { [key: string]: number } = {
        "completed": 100,
        'In Progress': 60,
        'in_development': 40,
        'pending': 10,
        'planned': 5
    };
    
    return statusProgress[status] || 0;
}

// Populate selectors with data
function populateSelectors(features: FeatureData[], nameIdData: any): void {
    const themes = new Set<string>();
    const epics = new Set<string>();
    const apps = new Set<string>();

    // Extract unique themes, epics, and apps from features
    features.forEach(feature => {
        // Add theme names (you might need to adjust based on your data structure)
        if (feature.data.title) {
            themes.add(feature.data.title);
        }
    });

    // Extract from NAME_ID data if available
    if (nameIdData && typeof nameIdData === 'object') {
        Object.keys(nameIdData).forEach(key => {
            if (key.includes('theme')) themes.add(key);
            if (key.includes('epic')) epics.add(key);
            if (key.includes('app')) apps.add(key);
        });
    }

    // Update theme selector
    const themeSelector = getElementById<HTMLSelectElement>('theme-selector');
    themeSelector.innerHTML = '<option value="">All Themes</option>';
    Array.from(themes).sort().forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        themeSelector.appendChild(option);
    });

    // Update epic selector
    const epicSelector = getElementById<HTMLSelectElement>('epic-selector');
    epicSelector.innerHTML = '<option value="">All Epics</option>';
    Array.from(epics).sort().forEach(epic => {
        const option = document.createElement('option');
        option.value = epic;
        option.textContent = epic;
        epicSelector.appendChild(option);
    });

    // Update app selector
    const appSelector = getElementById<HTMLSelectElement>('app-selector');
    appSelector.innerHTML = '<option value="">All Apps</option>';
    Array.from(apps).sort().forEach(app => {
        const option = document.createElement('option');
        option.value = app;
        option.textContent = app;
        appSelector.appendChild(option);
    });
}

// Setup selectors
function setupSelectors(): void {
    // Theme selector
    const themeSelector = getElementById<HTMLSelectElement>('theme-selector');
    themeSelector.addEventListener('change', () => {
        filterBySelection();
    });

    // Epic selector
    const epicSelector = getElementById<HTMLSelectElement>('epic-selector');
    epicSelector.addEventListener('change', () => {
        filterBySelection();
    });

    // App selector
    const appSelector = getElementById<HTMLSelectElement>('app-selector');
    appSelector.addEventListener('change', () => {
        filterBySelection();
    });
}

function filterBySelection(): void {
    // This function would filter the current view based on selector values
    const theme = (getElementById<HTMLSelectElement>('theme-selector')).value;
    const epic = (getElementById<HTMLSelectElement>('epic-selector')).value;
    const app = (getElementById<HTMLSelectElement>('app-selector')).value;
    
    console.log('Filtering by:', { theme, epic, app });
    // Implement filtering logic here
}

// Initialize
checkSession();