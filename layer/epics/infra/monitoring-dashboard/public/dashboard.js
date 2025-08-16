/**
 * Monitoring Dashboard JavaScript
 * Real-time updates and interactive features
 */

class MonitoringDashboard {
    constructor() {
        this.ws = null;
        this.charts = {};
        this.isConnected = false;
        this.currentSection = 'overview';
        this.updateInterval = null;
        
        this.initialize();
    }

    initialize() {
        this.setupWebSocket();
        this.setupNavigation();
        this.setupTabs();
        this.setupCharts();
        this.setupEventListeners();
        this.startDataUpdates();
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.connectWebSocket(wsUrl);
    }

    connectWebSocket(url) {
        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus(true);
                this.subscribeToChannels();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    this.connectWebSocket(url);
                }, 5000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
                this.updateConnectionStatus(false);
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false);
        }
    }

    subscribeToChannels() {
        if (!this.isConnected) return;

        const channels = ['metrics', 'logs', 'health', 'alerts', 'system'];
        
        channels.forEach(channel => {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: channel
            }));
        });
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'data':
                this.handleDataMessage(message);
                break;
            case 'heartbeat':
                // Keep connection alive
                break;
            case 'error':
                console.error('WebSocket error:', message.error);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    handleDataMessage(message) {
        const { channel, data } = message;

        switch (channel) {
            case 'metrics':
            case 'system':
                this.updateMetrics(data);
                break;
            case 'logs':
                this.updateLogs(data);
                break;
            case 'health':
                this.updateHealth(data);
                break;
            case 'alerts':
                this.updateAlerts(data);
                break;
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            statusElement.className = 'connection-status';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Disconnected';
            statusElement.className = 'connection-status disconnected';
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.showSection(section);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.showTab(tabId);
                
                // Update active tab
                const tabContainer = tab.closest('.dashboard-card');
                tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('[id$="-section"]');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
        }
    }

    showTab(tabId) {
        const tabContainer = document.querySelector(`[data-tab="${tabId}"]`).closest('.dashboard-card');
        
        // Hide all tab contents
        tabContainer.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab content
        const targetContent = document.getElementById(tabId);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    setupCharts() {
        // CPU Chart
        const cpuCtx = document.getElementById('cpu-chart');
        if (cpuCtx) {
            this.charts.cpu = new Chart(cpuCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU Usage %',
                        data: [],
                        borderColor: '#58a6ff',
                        backgroundColor: 'rgba(88, 166, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'minute',
                                displayFormats: {
                                    minute: 'HH:mm'
                                }
                            },
                            ticks: {
                                color: '#8b949e'
                            },
                            grid: {
                                color: '#21262d'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: '#8b949e',
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: '#21262d'
                            }
                        }
                    }
                }
            });
        }

        // Memory Chart
        const memoryCtx = document.getElementById('memory-chart');
        if (memoryCtx) {
            this.charts.memory = new Chart(memoryCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Memory Usage %',
                        data: [],
                        borderColor: '#f97583',
                        backgroundColor: 'rgba(249, 117, 131, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'minute',
                                displayFormats: {
                                    minute: 'HH:mm'
                                }
                            },
                            ticks: {
                                color: '#8b949e'
                            },
                            grid: {
                                color: '#21262d'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: '#8b949e',
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: '#21262d'
                            }
                        }
                    }
                }
            });
        }

        // System Metrics Chart
        const systemCtx = document.getElementById('system-metrics-chart');
        if (systemCtx) {
            this.charts.systemMetrics = new Chart(systemCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'CPU %',
                            data: [],
                            borderColor: '#58a6ff',
                            backgroundColor: 'rgba(88, 166, 255, 0.1)',
                            borderWidth: 2,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Memory %',
                            data: [],
                            borderColor: '#f97583',
                            backgroundColor: 'rgba(249, 117, 131, 0.1)',
                            borderWidth: 2,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Disk %',
                            data: [],
                            borderColor: '#85e89d',
                            backgroundColor: 'rgba(133, 232, 157, 0.1)',
                            borderWidth: 2,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'minute',
                                displayFormats: {
                                    minute: 'HH:mm'
                                }
                            },
                            ticks: { color: '#8b949e' },
                            grid: { color: '#21262d' }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: '#8b949e',
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: { color: '#21262d' }
                        }
                    }
                }
            });
        }
    }

    updateMetrics(data) {
        const now = new Date();

        if (data.type === 'system_update' || data.data?.system) {
            const systemData = data.data?.system || data.data;
            
            if (systemData) {
                // Update CPU metric
                if (systemData.cpu) {
                    this.updateMetricDisplay('cpu-usage', `${systemData.cpu.usage.toFixed(1)}%`);
                    this.updateChart(this.charts.cpu, now, systemData.cpu.usage);
                    this.updateChart(this.charts.systemMetrics, now, systemData.cpu.usage, 0);
                }

                // Update Memory metric
                if (systemData.memory) {
                    this.updateMetricDisplay('memory-usage', `${systemData.memory.usage.toFixed(1)}%`);
                    this.updateChart(this.charts.memory, now, systemData.memory.usage);
                    this.updateChart(this.charts.systemMetrics, now, systemData.memory.usage, 1);
                }

                // Update Disk metric
                if (systemData.disk) {
                    this.updateChart(this.charts.systemMetrics, now, systemData.disk.usage, 2);
                }
            }
        }
    }

    updateMetricDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updateChart(chart, time, value, datasetIndex = 0) {
        if (!chart || !chart.data.datasets[datasetIndex]) return;

        const dataset = chart.data.datasets[datasetIndex];
        
        // Add new data point
        chart.data.labels.push(time);
        dataset.data.push(value);

        // Keep only last 50 data points
        if (chart.data.labels.length > 50) {
            chart.data.labels.shift();
            dataset.data.shift();
        }

        chart.update('none');
    }

    updateLogs(data) {
        if (data.type === 'new_log') {
            this.addLogEntry(data.data);
        } else if (data.type === 'initial_data') {
            this.displayLogs(data.data);
        }
    }

    displayLogs(logs) {
        const containers = ['recent-logs', 'all-logs'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
                
                const displayLogs = containerId === 'recent-logs' ? logs.slice(-10) : logs;
                displayLogs.forEach(log => this.addLogEntry(log, container));
            }
        });
    }

    addLogEntry(logData, container = null) {
        const containers = container ? [container] : 
            [document.getElementById('recent-logs'), document.getElementById('all-logs')];

        containers.forEach(cont => {
            if (!cont) return;

            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';

            const timestamp = new Date(logData.timestamp);
            const levelClass = logData.level.toLowerCase();

            logEntry.innerHTML = `
                <div class="log-timestamp">${timestamp.toLocaleTimeString()}</div>
                <div class="log-level ${levelClass}">${logData.level.toUpperCase()}</div>
                <div class="log-message">${this.escapeHtml(logData.message)}</div>
            `;

            cont.insertBefore(logEntry, cont.firstChild);

            // Keep only last 100 entries
            while (cont.children.length > 100) {
                cont.removeChild(cont.lastChild);
            }
        });
    }

    updateHealth(data) {
        if (data.type === 'health_overview') {
            this.displayHealthOverview(data.data);
        } else if (data.type === 'health_update') {
            this.updateServiceHealth(data.data);
        }
    }

    displayHealthOverview(healthData) {
        // Update header status indicators
        const summary = healthData.summary || {};
        document.getElementById('healthy-services').textContent = `${summary.healthy || 0} Healthy`;
        document.getElementById('warning-services').textContent = `${summary.warning || 0} Warning`;
        document.getElementById('critical-services').textContent = `${summary.critical || 0} Critical`;

        // Update health grid
        const healthGrid = document.getElementById('health-grid');
        if (healthGrid && healthData.services) {
            healthGrid.innerHTML = '';

            Object.entries(healthData.services).forEach(([serviceId, healthResult]) => {
                if (healthResult) {
                    const healthItem = this.createHealthItem(serviceId, healthResult);
                    healthGrid.appendChild(healthItem);
                }
            });
        }
    }

    createHealthItem(serviceId, healthResult) {
        const div = document.createElement('div');
        div.className = `health-item ${healthResult.status}`;
        
        const responseTime = healthResult.responseTime ? 
            ` (${healthResult.responseTime}ms)` : '';

        div.innerHTML = `
            <div class="health-name">${healthResult.serviceName}</div>
            <div class="health-status">${healthResult.status.toUpperCase()}${responseTime}</div>
            <div class="health-status">${healthResult.message || ''}</div>
        `;

        return div;
    }

    updateAlerts(data) {
        if (data.type === 'alert_triggered') {
            this.addAlert(data.data);
        } else if (data.type === 'alerts_update') {
            this.displayAlerts(data.data);
        }

        // Update active alerts count
        this.updateActiveAlertsCount();
    }

    displayAlerts(alerts) {
        const alertsContainer = document.getElementById('alerts-container');
        if (alertsContainer) {
            alertsContainer.innerHTML = '';

            if (alerts.length === 0) {
                alertsContainer.innerHTML = '<div style="text-align: center; color: #8b949e; padding: 2rem;">No active alerts</div>';
                return;
            }

            alerts.forEach(alert => {
                const alertElement = this.createAlertElement(alert);
                alertsContainer.appendChild(alertElement);
            });
        }

        // Update recent alerts in overview
        const recentAlertsContainer = document.getElementById('recent-alerts');
        if (recentAlertsContainer) {
            recentAlertsContainer.innerHTML = '';
            const recentAlerts = alerts.slice(0, 3);
            
            recentAlerts.forEach(alert => {
                const div = document.createElement('div');
                div.className = `alert-item ${alert.severity}`;
                div.innerHTML = `
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-time">${new Date(alert.triggeredAt).toLocaleTimeString()}</div>
                `;
                recentAlertsContainer.appendChild(div);
            });
        }
    }

    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.severity}`;
        
        const triggeredTime = new Date(alert.triggeredAt);
        const timeAgo = this.getTimeAgo(triggeredTime);

        div.innerHTML = `
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-time">Triggered ${timeAgo}</div>
            </div>
        `;

        return div;
    }

    updateActiveAlertsCount() {
        // This would be updated from the alerts data
        // For now, we'll simulate it
        const activeAlertsElement = document.getElementById('active-alerts');
        if (activeAlertsElement) {
            // This would come from actual data
            const count = document.querySelectorAll('#alerts-container .alert-item').length;
            activeAlertsElement.textContent = count.toString();
        }
    }

    setupEventListeners() {
        // Handle window resize for responsive charts
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        });

        // Handle visibility change to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopDataUpdates();
            } else {
                this.startDataUpdates();
            }
        });
    }

    startDataUpdates() {
        // Start periodic API calls for fallback data
        this.updateInterval = setInterval(() => {
            if (!this.isConnected) {
                this.fetchDataFromAPI();
            }
        }, 30000); // 30 seconds

        // Initial data fetch
        this.fetchDataFromAPI();
    }

    stopDataUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async fetchDataFromAPI() {
        try {
            // Fetch overview data
            if (this.currentSection === 'overview') {
                const response = await fetch('/api/dashboard/overview');
                const data = await response.json();
                
                if (data.success) {
                    this.updateOverviewData(data.data);
                }
            }

            // Fetch other section-specific data as needed
            switch (this.currentSection) {
                case 'health':
                    await this.fetchHealthData();
                    break;
                case 'logs':
                    await this.fetchLogsData();
                    break;
                case 'alerts':
                    await this.fetchAlertsData();
                    break;
            }

        } catch (error) {
            console.error('Error fetching data from API:', error);
        }
    }

    async fetchHealthData() {
        try {
            const response = await fetch('/api/health/overview');
            const data = await response.json();
            
            if (data.success) {
                this.displayHealthOverview(data.data);
            }
        } catch (error) {
            console.error('Error fetching health data:', error);
        }
    }

    async fetchLogsData() {
        try {
            const response = await fetch('/api/logs/recent?limit=50');
            const data = await response.json();
            
            if (data.success) {
                this.displayLogs(data.data);
            }
        } catch (error) {
            console.error('Error fetching logs data:', error);
        }
    }

    async fetchAlertsData() {
        try {
            const response = await fetch('/api/alerts/active');
            const data = await response.json();
            
            if (data.success) {
                this.displayAlerts(data.data);
            }
        } catch (error) {
            console.error('Error fetching alerts data:', error);
        }
    }

    updateOverviewData(data) {
        // Update metrics if available
        if (data.metrics?.system) {
            const systemMetrics = data.metrics.system;
            
            if (systemMetrics.cpu) {
                this.updateMetricDisplay('cpu-usage', `${systemMetrics.cpu.usage.toFixed(1)}%`);
            }
            
            if (systemMetrics.memory) {
                this.updateMetricDisplay('memory-usage', `${systemMetrics.memory.usage.toFixed(1)}%`);
            }
        }

        // Update health summary
        if (data.health?.summary) {
            const summary = data.health.summary;
            document.getElementById('healthy-services').textContent = `${summary.healthy} Healthy`;
            document.getElementById('warning-services').textContent = `${summary.warning} Warning`;
            document.getElementById('critical-services').textContent = `${summary.critical} Critical`;
        }

        // Update alerts count
        if (data.alerts?.active !== undefined) {
            this.updateMetricDisplay('active-alerts', data.alerts.active.toString());
        }
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MonitoringDashboard();
});

// Handle unload to cleanup WebSocket
window.addEventListener('beforeunload', () => {
    if (window.dashboard && window.dashboard.ws) {
        window.dashboard.ws.close();
    }
});