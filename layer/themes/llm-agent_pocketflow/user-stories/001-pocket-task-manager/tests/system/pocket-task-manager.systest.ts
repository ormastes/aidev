import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface TaskFilter {
  status?: Task['status'];
  priority?: Task['priority'];
  searchTerm?: string;
  dateRange?: { start: string; end: string };
}

class PocketTaskManager {
  private tasks: Map<string, Task> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  createTask(title: string, description: string, priority: Task['priority'] = 'medium'): Task {
    const task: Task = {
      id: this.generateId(),
      title,
      description,
      status: 'pending',
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(task.id, task);
    this.emit('taskCreated', task);
    return task;
  }

  updateTaskStatus(taskId: string, status: Task['status']): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();

    this.tasks.set(taskId, task);
    this.emit('taskStatusChanged', { task, oldStatus, newStatus: status });
    return task;
  }

  updateTask(taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority'>>): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(taskId, updatedTask);
    this.emit('taskUpdated', { task: updatedTask, changes: updates });
    return updatedTask;
  }

  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.tasks.delete(taskId);
    this.emit('taskDeleted', task);
    return true;
  }

  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getFilteredTasks(filter: TaskFilter): Task[] {
    let filteredTasks = this.getAllTasks();

    if (filter.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filter.status);
    }

    if (filter.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filter.priority);
    }

    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    if (filter.dateRange) {
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        const startDate = new Date(filter.dateRange!.start);
        const endDate = new Date(filter.dateRange!.end);
        return taskDate >= startDate && taskDate <= endDate;
      });
    }

    return filteredTasks;
  }

  getTaskStats(): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    byPriority: { low: number; medium: number; high: number };
  } {
    const tasks = this.getAllTasks();
    const stats = {
      total: tasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      byPriority: { low: 0, medium: 0, high: 0 }
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'pending': stats.pending++; break;
        case 'in_progress': stats.inProgress++; break;
        case 'completed': stats.completed++; break;
      }
      stats.byPriority[task.priority]++;
    });

    return stats;
  }

  async saveToFile(filePath: string): Promise<void> {
    const data = {
      tasks: Array.from(this.tasks.entries()),
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async loadFromFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      this.tasks.clear();
      data.tasks.forEach(([id, task]: [string, Task]) => {
        this.tasks.set(id, task);
      });

      this.emit('tasksLoaded', { count: this.tasks.size });
    } catch (error) {
      throw new Error(`Failed to load tasks from file: ${error}`);
    }
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  async exportTasks(format: 'json' | 'csv' | 'markdown'): Promise<string> {
    const tasks = this.getAllTasks();

    switch (format) {
      case 'json':
        return JSON.stringify(tasks, null, 2);

      case 'csv':
        const headers = 'ID,Title,Description,Status,Priority,Created,Updated';
        const rows = tasks.map(task =>
          `"${task.id}","${task.title}","${task.description}","${task.status}","${task.priority}","${task.createdAt}","${task.updatedAt}"`
        );
        return [headers, ...rows].join('\n');

      case 'markdown':
        const mdHeaders = '| ID | Title | Status | Priority | Created |';
        const mdSeparator = '|---|---|---|---|---|';
        const mdRows = tasks.map(task =>
          `| ${task.id} | ${task.title} | ${task.status} | ${task.priority} | ${new Date(task.createdAt).toLocaleDateString()} |`
        );
        return [mdHeaders, mdSeparator, ...mdRows].join('\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

test.describe('Pocket Task Manager System Tests', () => {
  let tempDir: string;
  let taskManager: PocketTaskManager;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `task-manager-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    taskManager = new PocketTaskManager();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should create and manage basic tasks', async () => {
    // Create tasks with different priorities
    const task1 = taskManager.createTask('Implement user login', 'Create login functionality with validation', 'high');
    const task2 = taskManager.createTask('Update documentation', 'Update API documentation', 'medium');
    const task3 = taskManager.createTask('Fix minor UI bug', 'Adjust button alignment', 'low');

    expect(task1.id).toMatch(/^task-\d+-[a-z0-9]{9}$/);
    expect(task1.title).toBe('Implement user login');
    expect(task1.status).toBe('pending');
    expect(task1.priority).toBe('high');
    expect(new Date(task1.createdAt)).toBeInstanceOf(Date);

    // Verify all tasks are stored
    const allTasks = taskManager.getAllTasks();
    expect(allTasks).toHaveLength(3);

    // Verify stats
    const stats = taskManager.getTaskStats();
    expect(stats.total).toBe(3);
    expect(stats.pending).toBe(3);
    expect(stats.inProgress).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.byPriority.high).toBe(1);
    expect(stats.byPriority.medium).toBe(1);
    expect(stats.byPriority.low).toBe(1);
  });

  test('should handle task status transitions', async () => {
    const events: any[] = [];
    
    // Listen to task events
    taskManager.on('taskStatusChanged', (event: any) => {
      events.push(event);
    });

    const task = taskManager.createTask('Test task', 'Test description');

    // Update status: pending -> in_progress
    const updatedTask1 = taskManager.updateTaskStatus(task.id, 'in_progress');
    expect(updatedTask1!.status).toBe('in_progress');
    expect(updatedTask1!.updatedAt).not.toBe(task.createdAt);

    // Update status: in_progress -> completed
    const updatedTask2 = taskManager.updateTaskStatus(task.id, 'completed');
    expect(updatedTask2!.status).toBe('completed');

    // Verify events were emitted
    expect(events).toHaveLength(2);
    expect(events[0].oldStatus).toBe('pending');
    expect(events[0].newStatus).toBe('in_progress');
    expect(events[1].oldStatus).toBe('in_progress');
    expect(events[1].newStatus).toBe('completed');

    // Verify stats updated correctly
    const stats = taskManager.getTaskStats();
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(0);
    expect(stats.inProgress).toBe(0);
  });

  test('should filter tasks by multiple criteria', async () => {
    // Create tasks with various properties
    const tasks = [
      taskManager.createTask('High priority bug fix', 'Fix critical authentication bug', 'high'),
      taskManager.createTask('Medium priority feature', 'Implement new dashboard', 'medium'),
      taskManager.createTask('Low priority cleanup', 'Code refactoring', 'low'),
      taskManager.createTask('Another high priority', 'Security update', 'high'),
      taskManager.createTask('Documentation update', 'Update user manual', 'low')
    ];

    // Update some task statuses
    taskManager.updateTaskStatus(tasks[0].id, 'in_progress');
    taskManager.updateTaskStatus(tasks[1].id, 'completed');
    taskManager.updateTaskStatus(tasks[3].id, 'in_progress');

    // Filter by status
    const inProgressTasks = taskManager.getFilteredTasks({ status: 'in_progress' });
    expect(inProgressTasks).toHaveLength(2);
    expect(inProgressTasks.every(t => t.status === 'in_progress')).toBe(true);

    // Filter by priority
    const highPriorityTasks = taskManager.getFilteredTasks({ priority: 'high' });
    expect(highPriorityTasks).toHaveLength(2);
    expect(highPriorityTasks.every(t => t.priority === 'high')).toBe(true);

    // Filter by search term
    const bugTasks = taskManager.getFilteredTasks({ searchTerm: 'bug' });
    expect(bugTasks).toHaveLength(1);
    expect(bugTasks[0].title).toContain('bug fix');

    // Combine filters
    const highPriorityInProgress = taskManager.getFilteredTasks({ 
      status: 'in_progress', 
      priority: 'high' 
    });
    expect(highPriorityInProgress).toHaveLength(2);

    // Filter by date range (all tasks should be within today)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTasks = taskManager.getFilteredTasks({
      dateRange: {
        start: today.toISOString().split('T')[0],
        end: tomorrow.toISOString().split('T')[0]
      }
    });
    expect(todayTasks).toHaveLength(5);
  });

  test('should persist and load tasks from file', async () => {
    // Create some tasks
    const task1 = taskManager.createTask('Task 1', 'Description 1', 'high');
    const task2 = taskManager.createTask('Task 2', 'Description 2', 'medium');
    taskManager.updateTaskStatus(task1.id, 'in_progress');

    const saveFile = path.join(tempDir, 'tasks.json');

    // Save to file
    await taskManager.saveToFile(saveFile);

    // Verify file was created
    const fileExists = await fs.access(saveFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Verify file content
    const fileContent = JSON.parse(await fs.readFile(saveFile, 'utf-8'));
    expect(fileContent.tasks).toHaveLength(2);
    expect(fileContent.metadata.version).toBe('1.0.0');

    // Create new task manager and load from file
    const newTaskManager = new PocketTaskManager();
    await newTaskManager.loadFromFile(saveFile);

    const loadedTasks = newTaskManager.getAllTasks();
    expect(loadedTasks).toHaveLength(2);

    const loadedTask1 = newTaskManager.getTask(task1.id);
    expect(loadedTask1!.title).toBe('Task 1');
    expect(loadedTask1!.status).toBe('in_progress');
    expect(loadedTask1!.priority).toBe('high');
  });

  test('should handle task updates and modifications', async () => {
    let updateEvents: any[] = [];
    
    taskManager.on('taskUpdated', (event: any) => {
      updateEvents.push(event);
    });

    const task = taskManager.createTask('Original title', 'Original description', 'low');

    // Update title and description
    const updated1 = taskManager.updateTask(task.id, {
      title: 'Updated title',
      description: 'Updated description'
    });

    expect(updated1!.title).toBe('Updated title');
    expect(updated1!.description).toBe('Updated description');
    expect(updated1!.priority).toBe('low'); // Unchanged
    expect(updated1!.updatedAt).not.toBe(task.createdAt);

    // Update priority
    const updated2 = taskManager.updateTask(task.id, {
      priority: 'high'
    });

    expect(updated2!.priority).toBe('high');
    expect(updated2!.title).toBe('Updated title'); // Previous update persisted

    // Verify update events
    expect(updateEvents).toHaveLength(2);
    expect(updateEvents[0].changes).toEqual({
      title: 'Updated title',
      description: 'Updated description'
    });
    expect(updateEvents[1].changes).toEqual({
      priority: 'high'
    });

    // Try to update non-existent task
    const nonExistentUpdate = taskManager.updateTask('non-existent-id', { title: 'New title' });
    expect(nonExistentUpdate).toBeNull();
  });

  test('should handle task deletion with events', async () => {
    let deletedTasks: Task[] = [];

    taskManager.on('taskDeleted', (task: Task) => {
      deletedTasks.push(task);
    });

    const task1 = taskManager.createTask('Task to delete', 'Will be deleted');
    const task2 = taskManager.createTask('Task to keep', 'Will remain');

    expect(taskManager.getAllTasks()).toHaveLength(2);

    // Delete first task
    const deleted = taskManager.deleteTask(task1.id);
    expect(deleted).toBe(true);
    expect(taskManager.getAllTasks()).toHaveLength(1);
    expect(taskManager.getTask(task1.id)).toBeNull();
    expect(taskManager.getTask(task2.id)).not.toBeNull();

    // Try to delete non-existent task
    const notDeleted = taskManager.deleteTask('non-existent-id');
    expect(notDeleted).toBe(false);

    // Verify deletion events
    expect(deletedTasks).toHaveLength(1);
    expect(deletedTasks[0].id).toBe(task1.id);

    // Verify stats updated
    const stats = taskManager.getTaskStats();
    expect(stats.total).toBe(1);
  });

  test('should export tasks in multiple formats', async () => {
    // Create sample tasks
    const tasks = [
      taskManager.createTask('Task 1', 'Description 1', 'high'),
      taskManager.createTask('Task 2', 'Description 2', 'medium'),
      taskManager.createTask('Task 3', 'Description 3', 'low')
    ];

    taskManager.updateTaskStatus(tasks[0].id, 'completed');
    taskManager.updateTaskStatus(tasks[1].id, 'in_progress');

    // Test JSON export
    const jsonExport = await taskManager.exportTasks('json');
    const jsonData = JSON.parse(jsonExport);
    expect(jsonData).toHaveLength(3);
    expect(jsonData[0]).toHaveProperty('id');
    expect(jsonData[0]).toHaveProperty('title');
    expect(jsonData[0]).toHaveProperty('status');

    // Test CSV export
    const csvExport = await taskManager.exportTasks('csv');
    const csvLines = csvExport.split('\n');
    expect(csvLines[0]).toBe('ID,Title,Description,Status,Priority,Created,Updated');
    expect(csvLines).toHaveLength(4); // Header + 3 tasks
    expect(csvLines[1]).toContain('Task 1');
    expect(csvLines[1]).toContain('completed');

    // Test Markdown export
    const mdExport = await taskManager.exportTasks('markdown');
    const mdLines = mdExport.split('\n');
    expect(mdLines[0]).toContain('| ID | Title | Status | Priority | Created |');
    expect(mdLines[1]).toContain('|---|---|---|---|---|');
    expect(mdLines[2]).toContain('Task 1');
    expect(mdLines[2]).toContain('completed');

    // Save exports to files
    await fs.writeFile(path.join(tempDir, 'export.json'), jsonExport);
    await fs.writeFile(path.join(tempDir, 'export.csv'), csvExport);
    await fs.writeFile(path.join(tempDir, 'export.md'), mdExport);

    // Verify files were created
    const files = await fs.readdir(tempDir);
    expect(files).toContain('export.json');
    expect(files).toContain('export.csv');
    expect(files).toContain('export.md');
  });

  test('should handle high-volume task management', async () => {
    const taskCount = 1000;
    const startTime = Date.now();

    // Create many tasks
    const tasks: Task[] = [];
    for (let i = 0; i < taskCount; i++) {
      const priority = ['low', 'medium', 'high'][i % 3] as Task['priority'];
      const task = taskManager.createTask(`Task ${i}`, `Description for task ${i}`, priority);
      tasks.push(task);

      // Update some task statuses
      if (i % 3 === 0) {
        taskManager.updateTaskStatus(task.id, 'completed');
      } else if (i % 3 === 1) {
        taskManager.updateTaskStatus(task.id, 'in_progress');
      }
    }

    const creationTime = Date.now() - startTime;
    console.log(`Created ${taskCount} tasks in ${creationTime}ms`);

    // Verify all tasks were created
    expect(taskManager.getAllTasks()).toHaveLength(taskCount);

    // Test filtering performance
    const filterStart = Date.now();
    const highPriorityTasks = taskManager.getFilteredTasks({ priority: 'high' });
    const completedTasks = taskManager.getFilteredTasks({ status: 'completed' });
    const searchResults = taskManager.getFilteredTasks({ searchTerm: 'Task 50' });
    const filterTime = Date.now() - filterStart;

    expect(highPriorityTasks.length).toBeCloseTo(taskCount / 3, 10);
    expect(completedTasks.length).toBeCloseTo(taskCount / 3, 10);
    expect(searchResults.length).toBeGreaterThan(0);

    console.log(`Filtering operations completed in ${filterTime}ms`);
    expect(filterTime).toBeLessThan(1000); // Should complete within 1 second

    // Test stats calculation performance
    const statsStart = Date.now();
    const stats = taskManager.getTaskStats();
    const statsTime = Date.now() - statsStart;

    expect(stats.total).toBe(taskCount);
    expect(stats.pending + stats.inProgress + stats.completed).toBe(taskCount);
    expect(stats.byPriority.low + stats.byPriority.medium + stats.byPriority.high).toBe(taskCount);

    console.log(`Stats calculation completed in ${statsTime}ms`);
    expect(statsTime).toBeLessThan(100); // Should be very fast
  });

  test('should handle concurrent task operations', async () => {
    const concurrentOperations = 50;
    const operations: Promise<any>[] = [];

    // Perform concurrent task creation
    for (let i = 0; i < concurrentOperations; i++) {
      operations.push(
        new Promise(resolve => {
          setTimeout(() => {
            const task = taskManager.createTask(`Concurrent Task ${i}`, `Description ${i}`);
            resolve(task);
          }, Math.random() * 100);
        })
      );
    }

    const createdTasks = await Promise.all(operations);
    expect(createdTasks).toHaveLength(concurrentOperations);
    expect(taskManager.getAllTasks()).toHaveLength(concurrentOperations);

    // Verify all tasks have unique IDs
    const taskIds = createdTasks.map((task: Task) => task.id);
    const uniqueIds = new Set(taskIds);
    expect(uniqueIds.size).toBe(concurrentOperations);

    // Perform concurrent status updates
    const updateOperations = createdTasks.map((task: Task, index: number) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const status = ['in_progress', 'completed'][index % 2] as Task['status'];
          const updated = taskManager.updateTaskStatus(task.id, status);
          resolve(updated);
        }, Math.random() * 50);
      });
    });

    const updatedTasks = await Promise.all(updateOperations);
    expect(updatedTasks.every(task => task !== null)).toBe(true);

    // Verify final state
    const stats = taskManager.getTaskStats();
    expect(stats.total).toBe(concurrentOperations);
    expect(stats.inProgress + stats.completed).toBe(concurrentOperations);
    expect(stats.pending).toBe(0);
  });

  test('should handle event listener management', async () => {
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    const onCreated = () => createdCount++;
    const onUpdated = () => updatedCount++;
    const onDeleted = () => deletedCount++;

    // Add event listeners
    taskManager.on('taskCreated', onCreated);
    taskManager.on('taskUpdated', onUpdated);
    taskManager.on('taskDeleted', onDeleted);

    // Perform operations
    const task1 = taskManager.createTask('Test Task 1', 'Description');
    const task2 = taskManager.createTask('Test Task 2', 'Description');
    
    taskManager.updateTask(task1.id, { title: 'Updated Title' });
    taskManager.updateTaskStatus(task2.id, 'completed');
    
    taskManager.deleteTask(task1.id);

    expect(createdCount).toBe(2);
    expect(updatedCount).toBe(2); // One updateTask + one updateTaskStatus
    expect(deletedCount).toBe(1);

    // Remove event listeners
    taskManager.off('taskCreated', onCreated);
    taskManager.off('taskUpdated', onUpdated);
    taskManager.off('taskDeleted', onDeleted);

    // Perform more operations - counts should not increase
    taskManager.createTask('Test Task 3', 'Description');
    taskManager.updateTask(task2.id, { title: 'Another Update' });
    taskManager.deleteTask(task2.id);

    expect(createdCount).toBe(2); // No change
    expect(updatedCount).toBe(2); // No change
    expect(deletedCount).toBe(1); // No change
  });
});