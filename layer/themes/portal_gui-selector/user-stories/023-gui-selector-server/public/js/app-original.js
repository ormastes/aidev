// GUI Selector App
class GuiSelectorApp {
    constructor() {
        this.templates = [];
        this.currentUser = null;
        this.selectedTemplateId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        await this.loadTemplates();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.app-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(link.getAttribute('href').substring(1));
            });
        });

        // Auth
        document.getElementById('auth-btn').addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.showLoginModal();
            }
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterTemplates(btn.dataset.category);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').classList.remove('active');
            });
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportRequirements();
        });

        // Select template button
        document.getElementById('select-template-btn').addEventListener('click', () => {
            this.selectTemplate();
        });
    }

    switchView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.app-nav a').forEach(link => link.classList.remove('active'));
        
        document.getElementById(`${viewName}-view`).classList.add('active');
        document.querySelector(`.app-nav a[href="#${viewName}"]`).classList.add('active');
        
        if (viewName === 'selections' && this.currentUser) {
            this.loadSelections();
        } else if (viewName === 'requirements' && this.currentUser) {
            this.loadRequirements();
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/session');
            const data = await response.json();
            
            if (data.authenticated) {
                this.currentUser = data.user;
                this.updateAuthUI();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    updateAuthUI() {
        const authBtn = document.getElementById('auth-btn');
        const username = document.getElementById('username');
        
        if (this.currentUser) {
            authBtn.textContent = 'Logout';
            username.textContent = `Welcome, ${this.currentUser.username}`;
        } else {
            authBtn.textContent = 'Login';
            username.textContent = '';
        }
    }

    showLoginModal() {
        document.getElementById('login-modal').classList.add('active');
    }

    async login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateAuthUI();
                document.getElementById('login-modal').classList.remove('active');
                document.getElementById('login-form').reset();
            } else {
                alert('Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.currentUser = null;
            this.updateAuthUI();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            this.templates = await response.json();
            this.renderTemplates(this.templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    filterTemplates(category) {
        if (category === 'all') {
            this.renderTemplates(this.templates);
        } else {
            const filtered = this.templates.filter(t => t.category === category);
            this.renderTemplates(filtered);
        }
    }

    renderTemplates(templates) {
        const grid = document.getElementById('template-grid');
        grid.innerHTML = '';
        
        templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `
                <div class="template-thumbnail">${template.name}</div>
                <div class="template-info">
                    <h3 class="template-name">${template.name}</h3>
                    <p class="template-description">${template.description}</p>
                    <div class="template-features">
                        ${template.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => this.showTemplatePreview(template.id));
            grid.appendChild(card);
        });
    }

    async showTemplatePreview(templateId) {
        try {
            const [template, preview] = await Promise.all([
                fetch(`/api/templates/${templateId}`).then(r => r.json()),
                fetch(`/api/templates/${templateId}/preview`).then(r => r.json())
            ]);
            
            this.selectedTemplateId = templateId;
            document.getElementById('preview-title').textContent = template.name;
            
            const frame = document.getElementById('preview-frame');
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            
            frame.innerHTML = '';
            frame.appendChild(iframe);
            
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>${preview.css}</style>
                </head>
                <body>
                    ${preview.html}
                    ${preview.javascript ? `<script>${preview.javascript}</script>` : ''}
                </body>
                </html>
            `);
            iframeDoc.close();
            
            document.getElementById('preview-modal').classList.add('active');
        } catch (error) {
            console.error('Failed to load preview:', error);
            alert('Failed to load template preview');
        }
    }

    async selectTemplate() {
        if (!this.currentUser) {
            alert('Please login to select a template');
            return;
        }
        
        const projectName = prompt('Enter project name:');
        if (!projectName) return;
        
        const comments = prompt('Add any comments (optional):');
        
        try {
            const response = await fetch('/api/selections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateId: this.selectedTemplateId,
                    projectName,
                    comments
                })
            });
            
            if (response.ok) {
                alert('Template selected successfully!');
                document.getElementById('preview-modal').classList.remove('active');
                this.switchView('selections');
            } else {
                alert('Failed to save selection');
            }
        } catch (error) {
            console.error('Selection error:', error);
            alert('Failed to save selection');
        }
    }

    async loadSelections() {
        try {
            const response = await fetch('/api/selections');
            const selections = await response.json();
            
            const container = document.getElementById('selections-list');
            container.innerHTML = '';
            
            if (selections.length === 0) {
                container.innerHTML = '<div class="empty-state">No selections yet. Browse templates to get started!</div>';
                return;
            }
            
            selections.forEach(selection => {
                const item = document.createElement('div');
                item.className = 'selection-item';
                item.innerHTML = `
                    <div class="selection-header">
                        <div class="selection-title">${selection.projectName}</div>
                        <button class="btn-secondary" onclick="app.deleteSelection('${selection.id}')">Delete</button>
                    </div>
                    <div class="selection-meta">
                        Template: ${selection.templateId} | 
                        Created: ${new Date(selection.createdAt).toLocaleDateString()}
                    </div>
                    ${selection.comments ? `<div class="selection-comments">${selection.comments}</div>` : ''}
                `;
                container.appendChild(item);
            });
        } catch (error) {
            console.error('Failed to load selections:', error);
        }
    }

    async deleteSelection(selectionId) {
        if (!confirm('Are you sure you want to delete this selection?')) return;
        
        try {
            const response = await fetch(`/api/selections/${selectionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.loadSelections();
            }
        } catch (error) {
            console.error('Failed to delete selection:', error);
        }
    }

    async loadRequirements() {
        try {
            const response = await fetch('/api/requirements');
            const requirements = await response.json();
            
            const container = document.getElementById('requirements-list');
            container.innerHTML = '';
            
            if (requirements.length === 0) {
                container.innerHTML = '<div class="empty-state">No requirements yet.</div>';
                return;
            }
            
            requirements.forEach(req => {
                const item = document.createElement('div');
                item.className = 'requirement-item';
                item.innerHTML = `
                    <div class="requirement-header">
                        <div class="requirement-title">${req.description}</div>
                        <span class="feature-tag">${req.priority}</span>
                    </div>
                    <div class="requirement-meta">
                        Type: ${req.type} | Status: ${req.status}
                    </div>
                `;
                container.appendChild(item);
            });
        } catch (error) {
            console.error('Failed to load requirements:', error);
        }
    }

    async exportRequirements() {
        try {
            const format = confirm('Export as Markdown? (Cancel for JSON)') ? 'markdown' : 'json';
            window.location.href = `/api/requirements/export?format=${format}`;
        } catch (error) {
            console.error('Export failed:', error);
        }
    }
}

// Initialize app
const app = new GuiSelectorApp();