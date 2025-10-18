/**
 * AI Dev Portal - Task Queue Focused Portal
 * Primary landing page showing TASK_QUEUE.vf.json as per CLAUDE.md rules
 */

import { Elysia } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
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

// Format task for display
function formatTask(task: any): string {
  const statusBadge = task.status === 'completed'
    ? '<span class="badge completed">Completed</span>'
    : task.status === 'in_progress'
    ? '<span class="badge in-progress">In Progress</span>'
    : '<span class="badge pending">Pending</span>'

  const priority = task.priority === 'critical' ? '🔴'
    : task.priority === 'high' ? '🟠'
    : task.priority === 'medium' ? '🟡'
    : task.priority === 'low' ? '🟢'
    : ''

  return `
    <div class="task-card">
      <div class="task-header">
        ${priority} ${statusBadge}
        <span class="task-id">${task.id}</span>
      </div>
      <h4>${task.content}</h4>
      ${task.details?.description ? `<p class="task-desc">${task.details.description}</p>` : ''}
      ${task.created_at ? `<div class="task-meta">Created: ${new Date(task.created_at).toLocaleDateString()}</div>` : ''}
    </div>
  `
}

// Create the portal app
export const app = new Elysia()
  .use(html())

  // Main dashboard - Task Queue focused
  .get('/', () => {
    const taskQueue = getTaskQueue()

    let taskContent = ''
    let stats = {
      total: 0,
      completed: 0,
      in_progress: 0,
      pending: 0
    }

    if (taskQueue) {
      // Process all queue types
      Object.entries(taskQueue.queues).forEach(([queueType, queue]: [string, any]) => {
        if (queue.items && queue.items.length > 0) {
          taskContent += `<h3 class="queue-title">${queueType.replace(/_/g, ' ').toUpperCase()}</h3>`

          queue.items.forEach((task: any) => {
            taskContent += formatTask(task)
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
      <title>AI Dev Portal - Task Queue</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #1a1a2e;
          color: #eee;
          min-height: 100vh;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .header h1 {
          color: white;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .header p {
          color: rgba(255,255,255,0.9);
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: #16213e;
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid #394867;
        }
        .stat-card h3 {
          font-size: 2rem;
          color: #667eea;
          margin-bottom: 0.5rem;
        }
        .stat-card p {
          color: #888;
          text-transform: uppercase;
          font-size: 0.875rem;
        }
        .task-section {
          background: #0f1419;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .section-header h2 {
          color: #667eea;
          font-size: 1.5rem;
        }
        .queue-title {
          color: #764ba2;
          margin: 1.5rem 0 1rem;
          font-size: 1.2rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .task-card {
          background: #16213e;
          border-left: 4px solid #667eea;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .task-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .task-card h4 {
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .task-desc {
          color: #aaa;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .task-id {
          color: #666;
          font-size: 0.75rem;
          font-family: monospace;
        }
        .task-meta {
          color: #666;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge.completed { background: #10b981; color: white; }
        .badge.in-progress { background: #f59e0b; color: white; }
        .badge.pending { background: #6b7280; color: white; }
        .refresh-btn {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 600;
        }
        .refresh-btn:hover {
          background: #5a67d8;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }
        .priority-legend {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="container">
          <h1>📋 AI Dev Portal - Task Queue</h1>
          <p>Primary task management dashboard (TASK_QUEUE.vf.json)</p>
        </div>
      </div>

      <div class="container">
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

        <div class="task-section">
          <div class="section-header">
            <h2>Task Queue</h2>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
          </div>

          <div class="priority-legend">
            <span>Priority: </span>
            <span>🔴 Critical</span>
            <span>🟠 High</span>
            <span>🟡 Medium</span>
            <span>🟢 Low</span>
          </div>

          ${taskContent || '<div class="empty-state">No tasks in queue</div>'}
        </div>
      </div>

      <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
      </script>
    </body>
    </html>`
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
    service: 'aidev-portal',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }))

// Start the server
if (import.meta.main) {
  app.listen(3456, () => {
    console.log('🚀 AI Dev Portal running at http://localhost:3456')
    console.log('📋 Task Queue focused portal - TASK_QUEUE.vf.json first!')
  })
}

export default app