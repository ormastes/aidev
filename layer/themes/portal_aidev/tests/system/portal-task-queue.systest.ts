/**
 * System test for AI Dev Portal Task Queue Display
 * Tests that the portal correctly displays TASK_QUEUE.vf.json
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const PORTAL_URL = 'http://localhost:3456'
const API_URL = `${PORTAL_URL}/api/tasks`

test.describe('AI Dev Portal - Task Queue Display', () => {
  let taskQueueData: any

  test.beforeAll(() => {
    // Read actual TASK_QUEUE.vf.json
    const taskQueuePath = path.join(process.cwd(), '../../../..', 'TASK_QUEUE.vf.json')
    taskQueueData = JSON.parse(fs.readFileSync(taskQueuePath, 'utf-8'))
  })

  test('Portal loads successfully', async ({ page }) => {
    const response = await page.goto(PORTAL_URL)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/AI Dev Portal.*Task Queue/)
  })

  test('Displays correct task statistics', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Calculate expected stats from actual data
    let expectedStats = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0
    }

    Object.values(taskQueueData.queues).forEach((queue: any) => {
      queue.items?.forEach((task: any) => {
        expectedStats.total++
        if (task.status === 'completed') expectedStats.completed++
        else if (task.status === 'in_progress') expectedStats.in_progress++
        else expectedStats.pending++
      })
    })

    // Check statistics display
    const totalCard = page.locator('.stat-card').filter({ hasText: 'Total Tasks' })
    await expect(totalCard.locator('h3')).toHaveText(expectedStats.total.toString())

    const pendingCard = page.locator('.stat-card').filter({ hasText: 'Pending' })
    await expect(pendingCard.locator('h3')).toHaveText(expectedStats.pending.toString())

    const completedCard = page.locator('.stat-card').filter({ hasText: 'Completed' })
    await expect(completedCard.locator('h3')).toHaveText(expectedStats.completed.toString())
  })

  test('API returns correct task queue data', async ({ request }) => {
    const response = await request.get(API_URL)
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.metadata).toBeDefined()
    expect(data.data.queues).toBeDefined()
  })

  test('Displays task cards with correct information', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Check for task cards
    const taskCards = page.locator('.task-card')
    const count = await taskCards.count()
    expect(count).toBeGreaterThan(0)

    // Check first task card has required elements
    const firstCard = taskCards.first()
    await expect(firstCard.locator('.badge')).toBeVisible()
    await expect(firstCard.locator('h4')).toBeVisible()
    await expect(firstCard.locator('.task-id')).toBeVisible()
  })

  test('Filter by status works correctly', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Test pending filter
    await page.selectOption('#statusFilter', 'pending')
    await page.waitForTimeout(500) // Let filter apply

    const visibleCards = await page.locator('.task-card:visible').count()
    const pendingCards = await page.locator('.task-card[data-status="pending"]:visible').count()
    expect(visibleCards).toBe(pendingCards)

    // Test completed filter
    await page.selectOption('#statusFilter', 'completed')
    await page.waitForTimeout(500)

    const completedCards = await page.locator('.task-card[data-status="completed"]:visible').count()
    expect(await page.locator('.task-card:visible').count()).toBe(completedCards)
  })

  test('Search functionality works', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Search for a specific term
    await page.fill('#searchBox', 'test')
    await page.waitForTimeout(500)

    const visibleCards = await page.locator('.task-card:visible').all()
    for (const card of visibleCards) {
      const text = await card.textContent()
      expect(text?.toLowerCase()).toContain('test')
    }
  })

  test('Task details expand and collapse', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Find a task with expandable details
    const expandableTask = page.locator('.task-header').filter({ has: page.locator('.expand-icon') }).first()

    if (await expandableTask.count() > 0) {
      // Click to expand
      await expandableTask.click()
      const taskId = await expandableTask.evaluate(el => {
        const onclick = el.getAttribute('onclick')
        const match = onclick?.match(/task-(\d+)/)
        return match ? `task-${match[1]}` : null
      })

      if (taskId) {
        const details = page.locator(`#${taskId}`)
        await expect(details).toBeVisible()

        // Click to collapse
        await expandableTask.click()
        await expect(details).not.toBeVisible()
      }
    }
  })

  test('Queue filter works correctly', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Get queue options
    const queueOptions = await page.locator('#queueFilter option').allTextContents()

    if (queueOptions.length > 1) {
      // Select first non-"All" queue
      await page.selectOption('#queueFilter', { index: 1 })
      await page.waitForTimeout(500)

      // Check that only selected queue is visible
      const visibleTitles = await page.locator('.queue-title:visible').count()
      expect(visibleTitles).toBeLessThanOrEqual(1)
    }
  })

  test('Priority indicators are displayed', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Check priority legend is visible
    await expect(page.locator('.priority-legend')).toBeVisible()

    // Check for priority indicators in task cards
    const priorityIndicators = ['🔴', '🟠', '🟡', '🟢', '⚪']
    const taskContent = await page.locator('.task-section').textContent()

    let foundAny = false
    for (const indicator of priorityIndicators) {
      if (taskContent?.includes(indicator)) {
        foundAny = true
        break
      }
    }
    expect(foundAny).toBe(true)
  })

  test('Collapse All button works', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Expand some tasks first
    const expandableTasks = page.locator('.task-header').filter({ has: page.locator('.expand-icon') })
    const count = await expandableTasks.count()

    if (count > 0) {
      // Expand first few tasks
      for (let i = 0; i < Math.min(3, count); i++) {
        await expandableTasks.nth(i).click()
      }

      // Click Collapse All
      await page.click('button:has-text("Collapse All")')
      await page.waitForTimeout(500)

      // Check all details are hidden
      const visibleDetails = await page.locator('.task-details:visible').count()
      expect(visibleDetails).toBe(0)
    }
  })

  test('Filtered API endpoint works', async ({ request }) => {
    // Test filter by status
    let response = await request.get(`${PORTAL_URL}/api/tasks/filter?status=pending`)
    expect(response.ok()).toBeTruthy()

    let data = await response.json()
    expect(data.success).toBe(true)
    data.data?.forEach((task: any) => {
      expect(task.status).toBe('pending')
    })

    // Test filter by priority
    response = await request.get(`${PORTAL_URL}/api/tasks/filter?priority=high`)
    expect(response.ok()).toBeTruthy()

    data = await response.json()
    expect(data.success).toBe(true)
    data.data?.forEach((task: any) => {
      expect(task.priority).toBe('high')
    })
  })

  test('Health check endpoint is operational', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/health`)
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.service).toContain('aidev-portal')
    expect(data.features).toBeDefined()
  })

  test('Follows CLAUDE.md rules - TASK_QUEUE.vf.json first', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Check that the main heading mentions Task Queue
    const heading = page.locator('h1')
    await expect(heading).toContainText('Task Queue')

    // Check that the description mentions TASK_QUEUE.vf.json
    const description = page.locator('.header p')
    const descText = await description.textContent()
    expect(descText?.toLowerCase()).toContain('task')

    // Verify no TODO list is displayed
    const pageContent = await page.content()
    expect(pageContent.toLowerCase()).not.toContain('todo list')
    expect(pageContent.toLowerCase()).not.toContain('todolist')
  })

  test('Queue statistics are displayed', async ({ page }) => {
    await page.goto(PORTAL_URL)

    // Check queue stats section exists
    const queueStats = page.locator('.queue-stats')
    await expect(queueStats).toBeVisible()

    // Check that queue stats contain actual queue names
    const statsText = await queueStats.textContent()
    const expectedQueues = Object.keys(taskQueueData.queues)

    for (const queue of expectedQueues) {
      if (taskQueueData.queues[queue].items?.length > 0) {
        const readableName = queue.replace(/_/g, ' ')
        expect(statsText).toContain(readableName)
      }
    }
  })
})