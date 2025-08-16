// Enhanced AI Dev Portal - Modern JavaScript with Beautiful Interactions

class AIDevPortal {
    constructor() {
        this.currentUser = null;
        this.currentView = 'projects';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadTheme();
        this.checkAuthentication();
    }

    // ========================
    // Event Listeners
    // ========================
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Navigation links
        this.setupNavigationLinks();

        // Logout
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => this.handleLogout(e));
        }

        // Theme toggle (if implemented)
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Selectors
        this.setupSelectors();
    }

    setupNavigationLinks() {
        const navLinks = {
            'projects-link': 'projects',
            'features-link': 'features',
            'feature-progress-link': 'feature-progress',
            'tasks-link': 'tasks',
            'gui-selector-link': 'gui-selector',
            'story-reporter-link': 'story-reporter',
            'manual-link': 'manual',
            'profile-link': 'profile'
        };

        Object.entries(navLinks).forEach(([linkId, viewName]) => {
            const link = document.getElementById(linkId);
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchView(viewName);
                });
            }
        });
    }

    setupSelectors() {
        const selectors = ['theme-selector', 'epic-selector', 'app-selector'];
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                // Load options dynamically
                this.loadSelectorOptions(selector);
                
                // Add change listener
                selector.addEventListener('change', (e) => {
                    this.handleSelectorChange(e.target);
                });
            }
        });
    }

    // ========================
    // Authentication
    // ========================
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Add loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Logging in...';
        submitButton.disabled = true;

        // Simulate API call with beautiful delay
        await this.delay(1000);

        try {
            // Demo authentication
            if (password === 'demo123' && ['admin', 'developer', 'tester'].includes(username)) {
                this.currentUser = {
                    username,
                    role: username,
                    loginTime: new Date().toISOString()
                };
                
                // Store in session
                sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                // Animate transition
                await this.animatePageTransition('login-page', 'dashboard-page');
                
                // Load dashboard data
                this.loadDashboard();
                
                // Show welcome message
                this.showNotification(`Welcome back, ${username}!`, 'success');
            } else {
                throw new Error('Invalid credentials');
            }
        } catch (error) {
            this.showNotification('Invalid username or password', 'error');
            this.shakeElement(e.target);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    handleLogout(e) {
        e.preventDefault();
        
        // Clear session
        sessionStorage.removeItem('currentUser');
        this.currentUser = null;
        
        // Animate transition
        this.animatePageTransition('dashboard-page', 'login-page');
        
        // Show notification
        this.showNotification('Logged out successfully', 'info');
    }

    checkAuthentication() {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('dashboard-page').style.display = 'block';
            this.loadDashboard();
        }
    }

    // ========================
    // View Management
    // ========================
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none';
            view.classList.remove('fade-in');
        });

        // Remove active class from all links
        document.querySelectorAll('.panel-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected view
        const selectedView = document.getElementById(`${viewName}-view`);
        if (selectedView) {
            selectedView.style.display = 'block';
            selectedView.classList.add('fade-in');
        }

        // Add active class to clicked link
        const activeLink = document.getElementById(`${viewName}-link`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load view-specific data
        this.loadViewData(viewName);
        
        this.currentView = viewName;
    }

    async loadViewData(viewName) {
        switch(viewName) {
            case 'projects':
                await this.loadProjects();
                break;
            case 'features':
                await this.loadFeatures();
                break;
            case 'feature-progress':
                await this.loadFeatureProgress();
                break;
            case 'tasks':
                await this.loadTasks();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'gui-selector':
                this.loadService('gui-selector-frame', 'http://localhost:3457');
                break;
            case 'story-reporter':
                this.loadService('story-reporter-frame', 'http://localhost:3458');
                break;
            case 'manual':
                this.loadService('manual-frame', 'http://localhost:3459');
                break;
        }
    }

    // ========================
    // Data Loading
    // ========================
    async loadDashboard() {
        // Load initial view
        this.switchView('projects');
        
        // Load user profile in nav
        if (this.currentUser) {
            const profileLink = document.getElementById('profile-link');
            if (profileLink) {
                profileLink.textContent = this.currentUser.username;
            }
        }
    }

    async loadProjects() {
        const container = document.getElementById('projects-list');
        if (!container) return;

        // Show loading skeleton
        container.innerHTML = this.createSkeletonItems(3);

        await this.delay(500);

        // Demo data
        const projects = [
            { id: 1, name: 'AI Development Platform', status: 'active', description: 'Core platform development' },
            { id: 2, name: 'MCP Integration', status: 'active', description: 'Model Context Protocol implementation' },
            { id: 3, name: 'GUI Generator', status: 'pending', description: 'Automated UI generation system' }
        ];

        container.innerHTML = projects.map(project => `
            <div class="list-item fade-in" data-project-id="${project.id}">
                <h3>${project.name} <span class="status-badge status-${project.status}">${project.status}</span></h3>
                <p>${project.description}</p>
            </div>
        `).join('');
    }

    async loadFeatures() {
        const container = document.getElementById('features-list');
        if (!container) return;

        container.innerHTML = this.createSkeletonItems(4);
        await this.delay(500);

        const features = [
            { id: 1, name: 'Authentication System', priority: 'high', status: 'completed' },
            { id: 2, name: 'Real-time Monitoring', priority: 'high', status: 'active' },
            { id: 3, name: 'Automated Testing', priority: 'medium', status: 'active' },
            { id: 4, name: 'Documentation Generator', priority: 'low', status: 'pending' }
        ];

        container.innerHTML = features.map(feature => `
            <div class="list-item fade-in">
                <h3>${feature.name}</h3>
                <div class="feature-meta">
                    <span>Priority: ${feature.priority}</span>
                    <span class="status-badge status-${feature.status}">${feature.status}</span>
                </div>
            </div>
        `).join('');
    }

    async loadFeatureProgress() {
        // Update stats
        const stats = {
            'total-features': 12,
            'in-progress-features': 4,
            'completed-features': 6,
            'pending-tasks': 18
        };

        Object.entries(stats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateNumber(element, 0, value, 1000);
            }
        });

        // Load feature list with progress
        const container = document.getElementById('feature-progress-list');
        if (!container) return;

        container.innerHTML = this.createSkeletonItems(3);
        await this.delay(500);

        const features = [
            { name: 'User Authentication', progress: 100, tasks: '8/8 completed' },
            { name: 'API Integration', progress: 75, tasks: '6/8 completed' },
            { name: 'Dashboard UI', progress: 60, tasks: '3/5 completed' }
        ];

        container.innerHTML = features.map(feature => `
            <div class="feature-item fade-in">
                <h4>${feature.name}</h4>
                <div class="feature-meta">
                    <span>Progress: ${feature.progress}%</span>
                    <span>Tasks: ${feature.tasks}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%" data-progress="${feature.progress}"></div>
                </div>
            </div>
        `).join('');

        // Animate progress bars
        setTimeout(() => {
            document.querySelectorAll('.progress-fill').forEach(bar => {
                const progress = bar.dataset.progress;
                bar.style.width = `${progress}%`;
            });
        }, 100);
    }

    async loadTasks() {
        const container = document.getElementById('tasks-list');
        if (!container) return;

        container.innerHTML = this.createSkeletonItems(5);
        await this.delay(500);

        const tasks = [
            { id: 1, title: 'Implement login validation', status: 'completed', assignee: 'John' },
            { id: 2, title: 'Add error handling', status: 'active', assignee: 'Sarah' },
            { id: 3, title: 'Write unit tests', status: 'active', assignee: 'Mike' },
            { id: 4, title: 'Update documentation', status: 'pending', assignee: 'Lisa' },
            { id: 5, title: 'Performance optimization', status: 'pending', assignee: 'Tom' }
        ];

        container.innerHTML = tasks.map(task => `
            <div class="list-item fade-in">
                <h3>${task.title}</h3>
                <p>Assigned to: ${task.assignee}</p>
                <span class="status-badge status-${task.status}">${task.status}</span>
            </div>
        `).join('');
    }

    loadProfile() {
        const container = document.getElementById('profile-info');
        if (!container || !this.currentUser) return;

        container.innerHTML = `
            <div class="profile-card fade-in">
                <div><strong>Username:</strong> ${this.currentUser.username}</div>
                <div><strong>Role:</strong> ${this.currentUser.role}</div>
                <div><strong>Login Time:</strong> ${new Date(this.currentUser.loginTime).toLocaleString()}</div>
                <div><strong>Theme:</strong> ${localStorage.getItem('theme') || 'dark'}</div>
            </div>
        `;
    }

    loadService(frameId, url) {
        const frame = document.getElementById(frameId);
        if (frame && frame.src !== url) {
            frame.src = url;
        }
    }

    async loadSelectorOptions(selector) {
        // Simulate loading options
        const options = {
            'theme-selector': ['portal_aidev', 'portal_security', 'portal_gui-selector'],
            'epic-selector': ['Authentication', 'Infrastructure', 'Testing'],
            'app-selector': ['Main Portal', 'Admin Panel', 'Developer Tools']
        };

        const selectorOptions = options[selector.id] || [];
        
        selectorOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.toLowerCase().replace(/\s+/g, '-');
            optionElement.textContent = option;
            selector.appendChild(optionElement);
        });
    }

    handleSelectorChange(selector) {
        const value = selector.value;
        if (value) {
            this.showNotification(`Selected: ${value}`, 'info');
            // Implement actual filtering logic here
        }
    }

    // ========================
    // UI Helpers
    // ========================
    createSkeletonItems(count) {
        return Array(count).fill(0).map(() => `
            <div class="list-item skeleton" style="height: 80px; margin-bottom: 10px;"></div>
        `).join('');
    }

    async animatePageTransition(fromPage, toPage) {
        const from = document.getElementById(fromPage);
        const to = document.getElementById(toPage);

        if (from && to) {
            from.style.opacity = '0';
            await this.delay(300);
            from.style.display = 'none';
            to.style.display = 'block';
            to.style.opacity = '0';
            await this.delay(50);
            to.style.opacity = '1';
        }
    }

    animateNumber(element, start, end, duration) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    }

    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            padding: '16px 24px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '9999',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            background: type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' :
                       type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                       type === 'warning' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                       'linear-gradient(135deg, #3b82f6, #2563eb)'
        });

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // ========================
    // Theme Management
    // ========================
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.showNotification(`Switched to ${newTheme} theme`, 'info');
    }

    // ========================
    // Animations
    // ========================
    initAnimations() {
        // Add shake animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }
            .shake { animation: shake 0.5s; }
        `;
        document.head.appendChild(style);

        // Intersection Observer for fade-in animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        });

        // Observe all elements that should fade in
        document.querySelectorAll('.list-item, .stat-card').forEach(el => {
            observer.observe(el);
        });
    }

    // ========================
    // Utilities
    // ========================
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.aiDevPortal = new AIDevPortal();
});