// Enhanced GUI Selector App with Story Reports
class GuiSelectorApp {
    constructor() {
        this.templates = [];
        this.currentUser = null;
        this.selectedTemplateId = null;
        this.accessToken = localStorage.getItem('accessToken') || null;
        this.reports = [];
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

        // Mobile theme sync button
        document.getElementById('sync-mobile-themes')?.addEventListener('click', async () => {
            await this.syncMobileThemes();
        });

        // Theme export button
        document.getElementById('export-themes')?.addEventListener('click', async () => {
            await this.exportThemes();
        });

        // Mobile demo controls
        document.getElementById('start-mobile-demo')?.addEventListener('click', () => {
            this.startMobileDemo();
        });

        document.getElementById('sync-demo-theme')?.addEventListener('click', async () => {
            await this.syncDemoTheme();
        });

        document.getElementById('view-demo-data')?.addEventListener('click', async () => {
            await this.viewDemoData();
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

        // Story Reports functionality
        document.getElementById('generate-report-btn').addEventListener('click', () => {
            this.showReportModal();
        });

        document.getElementById('refresh-reports-btn').addEventListener('click', () => {
            this.loadReports();
        });

        // Report form
        document.getElementById('report-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.generateReport();
        });

        document.getElementById('cancel-report-btn').addEventListener('click', () => {
            document.getElementById('report-modal').classList.remove('active');
        });

        // Report filters
        document.getElementById('report-type-filter').addEventListener('change', () => {
            this.filterReports();
        });

        document.getElementById('report-date-filter').addEventListener('change', () => {
            this.filterReports();
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
        } else if (viewName === 'reports') {
            this.loadReports();
        }
    }

    async checkAuth() {
        if (this.accessToken) {
            try {
                const response = await fetch('/api/v2/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.updateAuthUI();
                    return;
                }
            } catch (error) {
                console.error('Token verification failed:', error);
            }
        }

        // Fallback to session check
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
            // Try JWT login first
            const jwtResponse = await fetch('/api/v2/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (jwtResponse.ok) {
                const data = await jwtResponse.json();
                this.currentUser = data.user;
                this.accessToken = data.accessToken;
                localStorage.setItem('accessToken', this.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                this.updateAuthUI();
                document.getElementById('login-modal').classList.remove('active');
                document.getElementById('login-form').reset();
                return;
            }

            // Fallback to session login
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
            if (this.accessToken) {
                await fetch('/api/v2/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                this.accessToken = null;
            } else {
                await fetch('/api/auth/logout', { method: 'POST' });
            }
            
            this.currentUser = null;
            this.updateAuthUI();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const templates = await response.json();
            this.templates = templates;
            this.renderTemplates();
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    renderTemplates() {
        const grid = document.getElementById('template-grid');
        grid.innerHTML = '';

        this.templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.dataset.category = template.category;
            
            card.innerHTML = `
                <div class="template-thumbnail">${template.name}</div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-description">${template.description}</div>
                    <div class="template-features">
                        <span class="feature-tag">${template.category}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                this.showTemplatePreview(template);
            });

            grid.appendChild(card);
        });
    }

    filterTemplates(category) {
        const cards = document.querySelectorAll('.template-card');
        cards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    async showTemplatePreview(template) {
        this.selectedTemplateId = template.id;
        document.getElementById('preview-title').textContent = template.name;
        
        try {
            const response = await fetch(`/api/templates/${template.id}/preview`);
            const preview = await response.json();
            
            const frame = document.getElementById('preview-frame');
            frame.innerHTML = `
                <style>${preview.css}</style>
                ${preview.html}
            `;
        } catch (error) {
            console.error('Failed to load preview:', error);
        }

        document.getElementById('preview-modal').classList.add('active');
    }

    async selectTemplate() {
        if (!this.currentUser) {
            alert('Please login to select templates');
            return;
        }

        if (!this.selectedTemplateId) return;

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            const response = await fetch('/api/selections', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    templateId: this.selectedTemplateId,
                    projectName: `Project with ${this.selectedTemplateId}`,
                    comments: 'Selected from GUI'
                })
            });

            if (response.ok) {
                alert('Template selected successfully!');
                document.getElementById('preview-modal').classList.remove('active');
            } else {
                const error = await response.json();
                alert(`Selection failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Template selection failed:', error);
            alert('Selection failed. Please try again.');
        }
    }

    async loadSelections() {
        if (!this.currentUser) return;

        try {
            const headers = {};
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            const response = await fetch('/api/selections', { headers });
            if (response.ok) {
                const selections = await response.json();
                this.renderSelections(selections);
            }
        } catch (error) {
            console.error('Failed to load selections:', error);
        }
    }

    renderSelections(selections) {
        const container = document.getElementById('selections-list');
        container.innerHTML = '';

        if (!selections || selections.length === 0) {
            container.innerHTML = '<div class="empty-state">No selections yet</div>';
            return;
        }

        selections.forEach(selection => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.innerHTML = `
                <div class="selection-header">
                    <div class="selection-title">${selection.projectName}</div>
                    <div class="selection-meta">${new Date(selection.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="selection-template">Template: ${selection.templateId}</div>
                <div class="selection-comments">${selection.comments}</div>
            `;
            container.appendChild(item);
        });
    }

    async loadRequirements() {
        if (!this.currentUser) return;

        try {
            const headers = {};
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            const response = await fetch('/api/requirements', { headers });
            if (response.ok) {
                const requirements = await response.json();
                this.renderRequirements(requirements);
            }
        } catch (error) {
            console.error('Failed to load requirements:', error);
        }
    }

    renderRequirements(requirements) {
        const container = document.getElementById('requirements-list');
        container.innerHTML = '';

        if (!requirements || requirements.length === 0) {
            container.innerHTML = '<div class="empty-state">No requirements yet</div>';
            return;
        }

        requirements.forEach(req => {
            const item = document.createElement('div');
            item.className = 'requirement-item';
            item.innerHTML = `
                <div class="requirement-header">
                    <div class="requirement-title">${req.description}</div>
                    <div class="requirement-meta">${req.priority} priority</div>
                </div>
                <div class="requirement-type">Type: ${req.type}</div>
            `;
            container.appendChild(item);
        });
    }

    async exportRequirements() {
        if (!this.currentUser) {
            alert('Please login to export requirements');
            return;
        }

        try {
            const headers = {};
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            const response = await fetch('/api/requirements/export?format=json', { headers });
            if (response.ok) {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'requirements.json';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    }

    // Story Reports functionality
    showReportModal() {
        document.getElementById('report-modal').classList.add('active');
    }

    async generateReport() {
        const title = document.getElementById('report-title').value;
        const type = document.getElementById('report-type').value;
        const description = document.getElementById('report-description').value;
        const storyPath = document.getElementById('story-path').value;

        if (!title || !type) {
            alert('Please fill in all required fields');
            return;
        }

        // Show progress
        document.getElementById('report-form').style.display = 'none';
        document.getElementById('report-progress').style.display = 'block';
        
        let progress = 0;
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.getElementById('progress-text');

        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            progressFill.style.width = `${progress}%`;
        }, 300);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            // Simulate API call for report generation
            const response = await fetch('/api/reports/generate', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title,
                    type,
                    description,
                    storyPath,
                    timestamp: new Date().toISOString()
                })
            });

            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            progressText.textContent = 'Report generated successfully!';

            setTimeout(() => {
                document.getElementById('report-modal').classList.remove('active');
                document.getElementById('report-form').style.display = 'block';
                document.getElementById('report-progress').style.display = 'none';
                document.getElementById('report-form').reset();
                progressFill.style.width = '0%';
                progressText.textContent = 'Generating report...';
                
                // Add the new report to local list
                const newReport = {
                    id: Date.now(),
                    title,
                    type,
                    description,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    storyPath
                };
                this.reports.unshift(newReport);
                this.renderReports();
            }, 2000);

        } catch (error) {
            clearInterval(progressInterval);
            console.error('Report generation failed:', error);
            progressText.textContent = 'Report generation failed!';
            
            setTimeout(() => {
                document.getElementById('report-modal').classList.remove('active');
                document.getElementById('report-form').style.display = 'block';
                document.getElementById('report-progress').style.display = 'none';
            }, 2000);
        }
    }

    async loadReports() {
        const container = document.getElementById('reports-grid');
        container.innerHTML = '<div class="loading">Loading reports</div>';

        try {
            const headers = {};
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            // Try to load from API, fallback to mock data
            try {
                const response = await fetch('/api/reports', { headers });
                if (response.ok) {
                    this.reports = await response.json();
                }
            } catch (apiError) {
                // Use mock data if API is not available
                this.reports = this.getMockReports();
            }

            this.renderReports();
        } catch (error) {
            console.error('Failed to load reports:', error);
            container.innerHTML = '<div class="empty-state">Failed to load reports</div>';
        }
    }

    getMockReports() {
        return [
            {
                id: 1,
                title: 'Test-as-Manual Feature Analysis',
                type: 'user-story',
                description: 'Comprehensive analysis of test-as-manual conversion features and user stories',
                status: 'completed',
                createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                storyPath: 'layer/themes/test-as-manual/user-stories/'
            },
            {
                id: 2,
                title: 'GUI Selector Coverage Report',
                type: 'test-coverage',
                description: 'Test coverage analysis for GUI selector components',
                status: 'completed', 
                createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                storyPath: 'layer/themes/gui-selector/user-stories/'
            },
            {
                id: 3,
                title: 'Sprint Q3 Security Assessment',
                type: 'security',
                description: 'Security vulnerability analysis for current sprint deliverables',
                status: 'generating',
                createdAt: new Date().toISOString(),
                storyPath: 'layer/themes/*/user-stories/'
            }
        ];
    }

    renderReports() {
        const container = document.getElementById('reports-grid');
        container.innerHTML = '';

        if (!this.reports || this.reports.length === 0) {
            container.innerHTML = '<div class="empty-state">No reports generated yet. Click "Generate New Report" to create one.</div>';
            return;
        }

        this.reports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-card';
            card.dataset.type = report.type;
            card.dataset.date = report.createdAt.split('T')[0];

            card.innerHTML = `
                <div class="report-actions">
                    <button title="View Details">👁️</button>
                    <button title="Download">📥</button>
                    <button title="Delete">🗑️</button>
                </div>
                <div class="report-header">
                    <div>
                        <div class="report-title">${report.title}</div>
                        <div class="report-type">${this.getTypeLabel(report.type)}</div>
                    </div>
                </div>
                <div class="report-description">${report.description}</div>
                <div class="report-meta">
                    <div class="report-date">${new Date(report.createdAt).toLocaleDateString()}</div>
                    <div class="report-status ${report.status}">${report.status}</div>
                </div>
            `;

            // Add click handlers
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.report-actions')) {
                    this.showReportDetails(report);
                }
            });

            // Action buttons
            const actions = card.querySelector('.report-actions');
            actions.children[0].addEventListener('click', (e) => {
                e.stopPropagation();
                this.showReportDetails(report);
            });
            actions.children[1].addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadReport(report);
            });
            actions.children[2].addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteReport(report.id);
            });

            container.appendChild(card);
        });
    }

    getTypeLabel(type) {
        const labels = {
            'user-story': 'User Stories',
            'test-coverage': 'Test Coverage',
            'performance': 'Performance',
            'security': 'Security'
        };
        return labels[type] || type;
    }

    filterReports() {
        const typeFilter = document.getElementById('report-type-filter').value;
        const dateFilter = document.getElementById('report-date-filter').value;
        
        const cards = document.querySelectorAll('.report-card');
        cards.forEach(card => {
            let show = true;
            
            if (typeFilter && typeFilter !== 'all' && card.dataset.type !== typeFilter) {
                show = false;
            }
            
            if (dateFilter && card.dataset.date !== dateFilter) {
                show = false;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    showReportDetails(report) {
        const content = document.getElementById('report-details-content');
        content.innerHTML = `
            <h3>${report.title}</h3>
            <div class="report-summary">
                <h4>Report Summary</h4>
                <p>${report.description}</p>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-number">12</div>
                        <div class="stat-label">User Stories</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">85%</div>
                        <div class="stat-label">Coverage</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">3</div>
                        <div class="stat-label">Issues</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">24h</div>
                        <div class="stat-label">Est. Time</div>
                    </div>
                </div>
            </div>
            
            <div class="report-section">
                <h4>Story Analysis</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Story ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Completion</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>001-mftod-converter</td>
                            <td>Mock Free Test Oriented Development Converter</td>
                            <td>✅ Complete</td>
                            <td>High</td>
                            <td>100%</td>
                        </tr>
                        <tr>
                            <td>002-gui-selector</td>
                            <td>GUI Template Selector</td>
                            <td>🔄 In Progress</td>
                            <td>Medium</td>
                            <td>75%</td>
                        </tr>
                        <tr>
                            <td>003-story-reports</td>
                            <td>Story Report Generator</td>
                            <td>⚠️ Issues</td>
                            <td>Medium</td>
                            <td>60%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="report-section">
                <h4>Recommendations</h4>
                <ul>
                    <li>Complete GUI selector integration with test-as-manual converter</li>
                    <li>Add automated testing coverage for story report generation</li>
                    <li>Implement database persistence for report history</li>
                    <li>Add export functionality for multiple formats (PDF, CSV, JSON)</li>
                </ul>
            </div>
        `;
        
        document.getElementById('report-details-modal').classList.add('active');
    }

    downloadReport(report) {
        const data = {
            ...report,
            generatedAt: new Date().toISOString(),
            details: 'Full report data would be here...'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}-report.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    deleteReport(reportId) {
        if (confirm('Are you sure you want to delete this report?')) {
            this.reports = this.reports.filter(r => r.id !== reportId);
            this.renderReports();
        }
    }

    async syncMobileThemes() {
        try {
            const response = await fetch('/api/themes/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {})
                },
                body: JSON.stringify({
                    fromDevice: 'gui-selector-web',
                    toDevice: 'react-native-app',
                    themeId: this.selectedTemplateId || 'modern'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ Theme synchronized with mobile app!', 'success');
            } else {
                this.showNotification('❌ Failed to sync theme with mobile app', 'error');
            }
        } catch (error) {
            console.error('Theme sync failed:', error);
            this.showNotification('❌ Theme sync failed', 'error');
        }
    }

    async exportThemes() {
        try {
            const formats = ['json', 'css', 'ts'];
            const themeId = this.selectedTemplateId || 'modern';
            
            for (const format of formats) {
                const response = await fetch(`/api/themes/export/${format}?themeId=${themeId}`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `theme-${themeId}.${format}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }
            
            this.showNotification('📁 Theme files exported successfully!', 'success');
        } catch (error) {
            console.error('Theme export failed:', error);
            this.showNotification('❌ Theme export failed', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    startMobileDemo() {
        const iframe = document.getElementById('mobile-demo-iframe');
        const placeholder = document.getElementById('mobile-demo-placeholder');
        const statusElement = document.getElementById('demo-app-status');
        
        if (!iframe || !placeholder) return;

        // Show loading state
        statusElement.textContent = 'Starting...';
        statusElement.style.color = '#ff9500';

        // Start the mobile demo server and load iframe
        iframe.src = 'http://localhost:3457';
        
        iframe.onload = () => {
            placeholder.style.display = 'none';
            iframe.style.display = 'block';
            statusElement.textContent = 'Running';
            statusElement.style.color = '#4CAF50';
            this.showNotification('📱 Mobile demo started successfully!', 'success');
        };

        iframe.onerror = () => {
            statusElement.textContent = 'Failed to Load';
            statusElement.style.color = '#f44336';
            this.showNotification('❌ Failed to start mobile demo. Make sure the demo server is running.', 'error');
        };

        // Fallback timeout
        setTimeout(() => {
            if (iframe.style.display === 'none') {
                iframe.onerror();
            }
        }, 10000);
    }

    async syncDemoTheme() {
        try {
            const currentTheme = this.selectedTemplateId || 'modern';
            
            // Get theme data from API
            const response = await fetch(`/api/themes/${currentTheme}?platform=react-native`);
            const themeData = await response.json();
            
            if (themeData.success) {
                // Send theme to mobile demo via postMessage
                const iframe = document.getElementById('mobile-demo-iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'THEME_UPDATE',
                        theme: themeData.theme
                    }, '*');
                    
                    this.showNotification(`🎨 Theme "${currentTheme}" applied to mobile demo!`, 'success');
                } else {
                    this.showNotification('❌ Mobile demo not running. Start the demo first.', 'error');
                }
            } else {
                this.showNotification('❌ Failed to load theme data', 'error');
            }
        } catch (error) {
            console.error('Theme sync failed:', error);
            this.showNotification('❌ Theme sync failed', 'error');
        }
    }

    async viewDemoData() {
        try {
            const response = await fetch('/api/messages?limit=10');
            const data = await response.json();
            
            if (data.success) {
                const messages = data.messages;
                let content = `
                    <h3>📊 Saved Messages (${data.total} total)</h3>
                    <div class="demo-data-list">
                `;
                
                if (messages.length === 0) {
                    content += '<p>No messages saved yet. Try the mobile demo to save some data!</p>';
                } else {
                    messages.forEach((msg, index) => {
                        const date = new Date(msg.timestamp).toLocaleString();
                        content += `
                            <div class="demo-data-item">
                                <div class="demo-data-text">${msg.text}</div>
                                <div class="demo-data-meta">
                                    <span class="demo-data-id">#${msg.id}</span>
                                    <span class="demo-data-date">${date}</span>
                                </div>
                            </div>
                        `;
                    });
                }
                
                content += '</div>';
                
                // Show in a modal or alert for now
                const modal = document.createElement('div');
                modal.className = 'demo-data-modal';
                modal.innerHTML = `
                    <div class="demo-data-content">
                        ${content}
                        <button onclick="this.parentNode.parentNode.remove()" class="demo-data-close">Close</button>
                    </div>
                `;
                
                // Add styles
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                `;
                
                modal.querySelector('.demo-data-content').style.cssText = `
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                `;
                
                document.body.appendChild(modal);
                
                this.showNotification('📊 Demo data loaded successfully!', 'success');
            } else {
                this.showNotification('❌ Failed to load demo data', 'error');
            }
        } catch (error) {
            console.error('Failed to load demo data:', error);
            this.showNotification('❌ Failed to load demo data', 'error');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new GuiSelectorApp();
});