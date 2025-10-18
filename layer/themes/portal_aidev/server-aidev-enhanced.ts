/**
 * AI Dev Portal - Enhanced Task Queue Portal
 * Primary landing page showing TASK_QUEUE.vf.json with enhanced features
 */

import { Elysia } from 'elysia'
import { html } from '@elysiajs/html'
import * as fs from 'fs'
import * as path from 'path'

// Read task queue data
function getTaskQueue() {
  try {
    const taskQueuePath = path.join(process.cwd(), '../../..', 'TASK_QUEUE.vf.json')
    const data = fs.readFileSync(taskQueuePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading TASK_QUEUE.vf.json:', error)
    return null
  }
}

// Format task for display with expandable details
function formatTask(task: any, index: number): string {
  const statusBadge = task.status === 'completed'
    ? '<span class="badge completed">✓ Completed</span>'
    : task.status === 'in_progress'
    ? '<span class="badge in-progress">⚡ In Progress</span>'
    : '<span class="badge pending">○ Pending</span>'

  const priority = task.priority === 'critical' ? '🔴'
    : task.priority === 'high' ? '🟠'
    : task.priority === 'medium' ? '🟡'
    : task.priority === 'low' ? '🟢'
    : '⚪'

  const hasDetails = task.details || task.results || task.progress

  return `
    <div class="task-card ${task.status}" data-priority="${task.priority || 'none'}" data-status="${task.status || 'pending'}">
      <div class="task-header" ${hasDetails ? `onclick="toggleDetails('task-${index}')"` : ''}>
        <div class="task-main">
          ${priority} ${statusBadge}
          <span class="task-id">${task.id}</span>
        </div>
        ${hasDetails ? '<span class="expand-icon">▼</span>' : ''}
      </div>
      <h4>${task.content}</h4>
      ${task.details?.description ? `<p class="task-desc">${task.details.description}</p>` : ''}

      <div id="task-${index}" class="task-details" style="display: none;">
        ${task.details?.subagent ? `<div class="detail-item"><strong>Subagent:</strong> ${task.details.subagent}</div>` : ''}
        ${task.created_at ? `<div class="detail-item"><strong>Created:</strong> ${new Date(task.created_at).toLocaleString()}</div>` : ''}
        ${task.completed_at ? `<div class="detail-item"><strong>Completed:</strong> ${new Date(task.completed_at).toLocaleString()}</div>` : ''}

        ${task.details?.expected_checks ? `
          <div class="detail-section">
            <strong>Expected Checks:</strong>
            <ul>${task.details.expected_checks.map((check: string) => `<li>${check}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${task.results ? `
          <div class="detail-section">
            <strong>Results:</strong>
            <pre>${JSON.stringify(task.results, null, 2)}</pre>
          </div>
        ` : ''}

        ${task.progress?.completed ? `
          <div class="detail-section">
            <strong>Progress:</strong>
            <ul>${task.progress.completed.map((item: string) => `<li>${item}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

// Create the enhanced portal app
export const app = new Elysia()
  .use(html())

  // Main dashboard - Enhanced Task Queue
  .get('/', () => {
    const taskQueue = getTaskQueue()

    let taskContent = ''
    let taskIndex = 0
    let stats = {
      total: 0,
      completed: 0,
      in_progress: 0,
      pending: 0,
      byQueue: {} as Record<string, number>
    }

    if (taskQueue) {
      // Process all queue types
      Object.entries(taskQueue.queues).forEach(([queueType, queue]: [string, any]) => {
        if (queue.items && queue.items.length > 0) {
          const queueName = queueType.replace(/_/g, ' ').toUpperCase()
          taskContent += `<h3 class="queue-title" data-queue="${queueType}">${queueName} (${queue.items.length})</h3>`

          stats.byQueue[queueType] = queue.items.length

          queue.items.forEach((task: any) => {
            taskContent += formatTask(task, taskIndex++)
            stats.total++
            if (task.status === 'completed') stats.completed++
            else if (task.status === 'in_progress') stats.in_progress++
            else stats.pending++
          })
        }
      })
    }

    return `<!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - Enhanced Task Queue</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          min-height: 100vh;
        }
        .header {
          background: linear-gradient(135deg, #1f6feb 0%, #8b5cf6 100%);
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .header h1 {
          color: white;
          font-size: 1.8rem;
          margin-bottom: 0.3rem;
        }
        .header p {
          color: rgba(255,255,255,0.9);
          font-size: 0.95rem;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem;
        }

        /* Filter Bar */
        .filter-bar {
          background: #161b22;
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .filter-group label {
          color: #8b949e;
          font-size: 0.875rem;
        }
        .filter-group select, .search-box {
          background: #0d1117;
          color: #c9d1d9;
          border: 1px solid #30363d;
          padding: 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .search-box {
          flex: 1;
          min-width: 200px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          background: #161b22;
          border-radius: 0.75rem;
          padding: 1.25rem;
          border: 1px solid #30363d;
          transition: transform 0.2s, border-color 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          border-color: #58a6ff;
        }
        .stat-card h3 {
          font-size: 1.75rem;
          color: #58a6ff;
          margin-bottom: 0.25rem;
        }
        .stat-card p {
          color: #8b949e;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        /* Task Section */
        .task-section {
          background: #161b22;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #30363d;
        }
        .section-header h2 {
          color: #58a6ff;
          font-size: 1.4rem;
        }

        /* Queue Titles */
        .queue-title {
          color: #8b5cf6;
          margin: 1.5rem 0 1rem;
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem;
          background: #1c2128;
          border-radius: 0.375rem;
        }

        /* Task Cards */
        .task-card {
          background: #0d1117;
          border-left: 3px solid #30363d;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 0.75rem;
          transition: all 0.2s;
        }
        .task-card.completed {
          border-left-color: #3fb950;
          opacity: 0.8;
        }
        .task-card.in_progress {
          border-left-color: #f59e0b;
          background: #181f27;
        }
        .task-card:hover {
          background: #1c2128;
        }
        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          cursor: pointer;
        }
        .task-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .task-card h4 {
          color: #f0f6fc;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }
        .task-desc {
          color: #8b949e;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .task-id {
          color: #484f58;
          font-size: 0.7rem;
          font-family: 'SF Mono', monospace;
        }

        /* Task Details */
        .task-details {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #30363d;
        }
        .detail-item {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #8b949e;
        }
        .detail-section {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #161b22;
          border-radius: 0.375rem;
        }
        .detail-section strong {
          color: #58a6ff;
          display: block;
          margin-bottom: 0.5rem;
        }
        .detail-section ul {
          margin-left: 1.5rem;
        }
        .detail-section pre {
          overflow-x: auto;
          font-size: 0.75rem;
          color: #8b949e;
          background: #0d1117;
          padding: 0.5rem;
          border-radius: 0.25rem;
        }
        .expand-icon {
          color: #58a6ff;
          font-size: 0.75rem;
          transition: transform 0.2s;
        }
        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        /* Badges */
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .badge.completed {
          background: #238636;
          color: #3fb950;
        }
        .badge.in-progress {
          background: #9e6a03;
          color: #f59e0b;
        }
        .badge.pending {
          background: #21262d;
          color: #8b949e;
        }

        /* Buttons */
        .btn {
          padding: 0.5rem 1rem;
          background: #238636;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #2ea043;
        }
        .btn-secondary {
          background: #21262d;
        }
        .btn-secondary:hover {
          background: #30363d;
        }

        /* Priority Legend */
        .priority-legend {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.75rem;
          font-size: 0.8rem;
          color: #8b949e;
          padding: 0.5rem;
          background: #0d1117;
          border-radius: 0.375rem;
        }

        /* Queue Stats */
        .queue-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #0d1117;
          border-radius: 0.375rem;
        }
        .queue-stat {
          font-size: 0.8rem;
          color: #8b949e;
        }
        .queue-stat span {
          color: #58a6ff;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="container">
          <h1>📋 AI Dev Portal - Task Queue Dashboard</h1>
          <p>Enhanced view of TASK_QUEUE.vf.json with filtering and details</p>
        </div>
      </div>

      <div class="container">
        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <label>Status:</label>
            <select id="statusFilter" onchange="filterTasks()">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Priority:</label>
            <select id="priorityFilter" onchange="filterTasks()">
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Queue:</label>
            <select id="queueFilter" onchange="filterTasks()">
              <option value="">All Queues</option>
              ${Object.keys(stats.byQueue).map(q =>
                `<option value="${q}">${q.replace(/_/g, ' ')}</option>`
              ).join('')}
            </select>
          </div>

          <input type="text" class="search-box" id="searchBox"
                 placeholder="Search tasks..." onkeyup="filterTasks()">
        </div>

        <!-- Statistics -->
        <div class="stats-grid">
          <div class="stat-card">
            <h3>${stats.total}</h3>
            <p>Total Tasks</p>
          </div>
          <div class="stat-card">
            <h3>${stats.pending}</h3>
            <p>Pending</p>
          </div>
          <div class="stat-card">
            <h3>${stats.in_progress}</h3>
            <p>In Progress</p>
          </div>
          <div class="stat-card">
            <h3>${stats.completed}</h3>
            <p>Completed</p>
          </div>
        </div>

        <!-- Queue Statistics -->
        <div class="queue-stats">
          ${Object.entries(stats.byQueue).map(([queue, count]) =>
            `<div class="queue-stat">${queue.replace(/_/g, ' ')}: <span>${count}</span></div>`
          ).join('')}
        </div>

        <!-- Task Section -->
        <div class="task-section">
          <div class="section-header">
            <h2>Task Queue</h2>
            <div>
              <button class="btn btn-secondary" onclick="collapseAll()">Collapse All</button>
              <button class="btn" onclick="location.reload()">🔄 Refresh</button>
            </div>
          </div>

          <div class="priority-legend">
            <span>Priority:</span>
            <span>🔴 Critical</span>
            <span>🟠 High</span>
            <span>🟡 Medium</span>
            <span>🟢 Low</span>
            <span>⚪ None</span>
          </div>

          <div id="taskList">
            ${taskContent || '<div style="text-align:center; padding:2rem; color:#8b949e;">No tasks in queue</div>'}
          </div>
        </div>
      </div>

      <script>
        // Toggle task details
        function toggleDetails(taskId) {
          const details = document.getElementById(taskId);
          const icon = event.currentTarget.querySelector('.expand-icon');

          if (details.style.display === 'none') {
            details.style.display = 'block';
            if (icon) icon.classList.add('expanded');
          } else {
            details.style.display = 'none';
            if (icon) icon.classList.remove('expanded');
          }
        }

        // Collapse all details
        function collapseAll() {
          document.querySelectorAll('.task-details').forEach(d => d.style.display = 'none');
          document.querySelectorAll('.expand-icon').forEach(i => i.classList.remove('expanded'));
        }

        // Filter tasks
        function filterTasks() {
          const statusFilter = document.getElementById('statusFilter').value;
          const priorityFilter = document.getElementById('priorityFilter').value;
          const queueFilter = document.getElementById('queueFilter').value;
          const searchFilter = document.getElementById('searchBox').value.toLowerCase();

          // Filter task cards
          document.querySelectorAll('.task-card').forEach(card => {
            const status = card.dataset.status;
            const priority = card.dataset.priority;
            const text = card.textContent.toLowerCase();

            let show = true;
            if (statusFilter && status !== statusFilter) show = false;
            if (priorityFilter && priority !== priorityFilter) show = false;
            if (searchFilter && !text.includes(searchFilter)) show = false;

            card.style.display = show ? 'block' : 'none';
          });

          // Filter queue titles
          document.querySelectorAll('.queue-title').forEach(title => {
            const queue = title.dataset.queue;

            if (queueFilter && queue !== queueFilter) {
              title.style.display = 'none';
              // Hide all tasks under this queue
              let sibling = title.nextElementSibling;
              while (sibling && !sibling.classList.contains('queue-title')) {
                if (sibling.classList.contains('task-card')) {
                  sibling.style.display = 'none';
                }
                sibling = sibling.nextElementSibling;
              }
            } else if (!queueFilter) {
              title.style.display = 'block';
            }
          });
        }

        // Auto-refresh every 60 seconds
        setTimeout(() => location.reload(), 60000);
      </script>
    </body>
    </html>`
  })

  // API endpoint for filtered tasks
  .get('/api/tasks/filter', ({ query }) => {
    const taskQueue = getTaskQueue()
    if (!taskQueue) return { success: false, error: 'Unable to load task queue' }

    const { status, priority, queue, search } = query
    let filteredTasks: any[] = []

    Object.entries(taskQueue.queues).forEach(([queueType, q]: [string, any]) => {
      if (queue && queueType !== queue) return

      q.items?.forEach((task: any) => {
        let include = true

        if (status && task.status !== status) include = false
        if (priority && task.priority !== priority) include = false
        if (search && !JSON.stringify(task).toLowerCase().includes(search.toLowerCase())) include = false

        if (include) {
          filteredTasks.push({ ...task, queue: queueType })
        }
      })
    })

    return {
      success: true,
      data: filteredTasks,
      count: filteredTasks.length,
      timestamp: new Date().toISOString()
    }
  })

  // API endpoint for task queue data
  .get('/api/tasks', () => {
    const taskQueue = getTaskQueue()
    return {
      success: true,
      data: taskQueue,
      timestamp: new Date().toISOString()
    }
  })

  // Health check
  .get('/health', () => ({
    status: 'healthy',
    service: 'aidev-portal-enhanced',
    version: '2.0.0',
    features: ['filtering', 'search', 'expandable-details', 'queue-stats'],
    timestamp: new Date().toISOString()
  }))

// Start the server
if (import.meta.main) {
  app.listen(3456, () => {
    console.log('🚀 AI Dev Portal Enhanced running at http://localhost:3456')
    console.log('📋 Task Queue with filtering, search, and expandable details')
    console.log('🔍 API endpoints:')
    console.log('   - GET /api/tasks - Full task queue')
    console.log('   - GET /api/tasks/filter - Filtered tasks')
  })
}

export default app