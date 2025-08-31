/**
 * Profile Management Performance System Tests
 * 
 * Performance testing for profile management operations.
 * Tests load handling, response times, resource usage, and scalability.
 * 
 * Performance Test Coverage:
 * - Profile loading performance
 * - Bulk operations scalability
 * - Image upload and processing performance
 * - Search performance under load
 * - Database query optimization
 * - Concurrent user handling
 * - Memory and resource usage
 * - CDN and caching effectiveness
 */

import { test, expect, Page } from '@playwright/test';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { 
  TEST_CONFIG,
  generateTestUser,
  setupTestUser,
  registerAndLoginViaBrowser,
  cleanupTestUser,
  generateTestImage,
  measureOperationTime,
  generateConcurrentLoad
} from './test-helpers';

const TEST_DATA_DIR = path.join(__dirname, 'test-data-performance');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  PROFILE_LOAD_TIME: 2000, // 2 seconds
  PROFILE_UPDATE_TIME: 1000, // 1 second
  IMAGE_UPLOAD_TIME: 5000, // 5 seconds
  SEARCH_RESPONSE_TIME: 1500, // 1.5 seconds
  BULK_OPERATION_PER_ITEM: 100, // 100ms per item
  CONCURRENT_USER_LIMIT: 50, // Minimum concurrent users to handle
  PAGE_LOAD_TIME: 3000, // 3 seconds for In Progress page load
  API_RESPONSE_TIME_P95: 500 // 95th percentile response time
};

test.describe('Profile Management Performance System Tests', () => {
  let testUsers: any[] = [];
  let performanceUser: any;

  test.beforeAll(async () => {
    console.log('Setting up performance test environment...');
    
    // Create test data directory
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    // Setup primary performance test user
    performanceUser = await setupTestUser('user');
    
    // Pre-create test users for load testing
    const userCreationPromises = Array(20).fill(null).map(() => setupTestUser('user'));
    testUsers = await Promise.all(userCreationPromises);
    
    console.log(`Created ${testUsers.length} test users for performance testing`);
  });

  test.afterAll(async () => {
    console.log('Cleaning up performance test environment...');
    
    // Cleanup all test users
    const cleanupPromises = [
      cleanupTestUser(performanceUser),
      ...testUsers.map(user => cleanupTestUser(user))
    ];
    
    await Promise.allSettled(cleanupPromises);
    
    // Cleanup test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  test.describe('Profile Loading Performance', () => {
    test('should load profile page within performance threshold', async ({ page }) => {
      console.log('Testing profile page load performance...');
      
      await registerAndLoginViaBrowser(page, performanceUser);
      
      // Measure profile page load time
      const { duration } = await measureOperationTime(async () => {
        await page.locator('[data-testid="user-menu"]').click();
        await page.locator('[data-testid="profile-link"]').click();
        await page.waitForURL('**/profile');
        await expect(page.locator('[data-testid="profile-content"]')).toBeVisible();
      });
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_LOAD_TIME);
      console.log(`Profile page loaded in ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.PROFILE_LOAD_TIME}ms)`);
      
      // Test cold vs warm load performance
      await page.reload();
      
      const { duration: warmLoadDuration } = await measureOperationTime(async () => {
        await expect(page.locator('[data-testid="profile-content"]')).toBeVisible();
      });
      
      expect(warmLoadDuration).toBeLessThan(duration); // Warm load should be faster
      console.log(`Warm load completed in ${warmLoadDuration}ms (${Math.round((1 - warmLoadDuration/duration) * 100)}% faster)`);
    });

    test('should efficiently load profiles with large datasets', async ({ page }) => {
      // Create comprehensive profile with lots of data
      const largeProfileData = {
        firstName: 'Performance',
        lastName: 'TestUser',
        bio: 'A'.repeat(2000), // Large bio
        skills: Array(50).fill(null).map((_, i) => ({
          name: `Skill ${i + 1}`,
          level: ['beginner', 'intermediate', 'advanced', 'expert'][i % 4],
          yearsExperience: Math.floor(Math.random() * 15) + 1
        })),
        workExperience: Array(10).fill(null).map((_, i) => ({
          company: `Company ${i + 1}`,
          position: `Position ${i + 1}`,
          startDate: `${2015 + i}-01-01`,
          endDate: i < 8 ? `${2016 + i}-12-31` : null,
          description: 'B'.repeat(500), // Large descriptions
          technologies: Array(10).fill(null).map((_, j) => `Tech${i}-${j}`)
        })),
        education: Array(5).fill(null).map((_, i) => ({
          institution: `University ${i + 1}`,
          degree: `Degree ${i + 1}`,
          graduationYear: 2010 + i,
          honors: Array(5).fill(null).map((_, j) => `Honor ${i}-${j}`)
        })),
        projects: Array(20).fill(null).map((_, i) => ({
          name: `Project ${i + 1}`,
          description: 'C'.repeat(300),
          technologies: Array(8).fill(null).map((_, j) => `ProjectTech${i}-${j}`),
          url: `https://project${i}.example.com`
        }))
      };
      
      // Create large profile via API
      await axios.post(`${TEST_CONFIG.API_URL}/profiles`, largeProfileData, {
        headers: { 'Authorization': `Bearer ${performanceUser.authToken}` }
      });
      
      await registerAndLoginViaBrowser(page, performanceUser);
      
      // Measure load time for large profile
      const { duration } = await measureOperationTime(async () => {
        await page.locator('[data-testid="user-menu"]').click();
        await page.locator('[data-testid="profile-link"]').click();
        await page.waitForURL('**/profile');
        
        // Wait for all sections to load
        await expect(page.locator('[data-testid="skills-section"]')).toBeVisible();
        await expect(page.locator('[data-testid="experience-section"]')).toBeVisible();
        await expect(page.locator('[data-testid="education-section"]')).toBeVisible();
        await expect(page.locator('[data-testid="projects-section"]')).toBeVisible();
      });
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_LOAD_TIME * 2); // Allow 2x for large data
      console.log(`Large profile loaded in ${duration}ms`);
      
      // Test pagination performance for large sections
      const skillsPagination = page.locator('[data-testid="skills-pagination"]');
      if (await skillsPagination.isVisible()) {
        const { duration: paginationDuration } = await measureOperationTime(async () => {
          await page.locator('[data-testid="skills-next-page"]').click();
          await expect(page.locator('[data-testid="skills-page-2"]')).toBeVisible();
        });
        
        expect(paginationDuration).toBeLessThan(1000);
        console.log(`Skills pagination completed in ${paginationDuration}ms`);
      }
    });
  });

  test.describe('Image Upload and Processing Performance', () => {
    test('should efficiently process various image sizes', async ({ page }) => {
      console.log('Testing image upload performance...');
      
      await registerAndLoginViaBrowser(page, performanceUser);
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      const imageSizes = [
        { name: 'small-perf.jpg', size: 50 * 1024, description: '50KB' },
        { name: 'medium-perf.jpg', size: 500 * 1024, description: '500KB' },
        { name: 'large-perf.jpg', size: 2 * 1024 * 1024, description: '2MB' },
        { name: 'max-size-perf.jpg', size: 5 * 1024 * 1024, description: '5MB (max)' }
      ];
      
      const uploadResults = [];
      
      for (const imageSpec of imageSizes) {
        const imagePath = path.join(TEST_DATA_DIR, imageSpec.name);
        const imageData = generateTestImage('JPEG', imageSpec.size);
        fs.writeFileSync(imagePath, imageData);
        
        // Measure upload and processing time
        const { duration } = await measureOperationTime(async () => {
          const fileChooserPromise = page.waitForEvent('filechooser');
          await page.locator('[data-testid="upload-avatar-btn"]').click();
          const fileChooser = await fileChooserPromise;
          await fileChooser.setFiles(imagePath);
          
          // Wait for upload completion
          await expect(page.locator('[data-testid="upload-success"]'))
            .toContainText('Avatar uploaded successfully', { timeout: 15000 });
        });
        
        uploadResults.push({
          size: imageSpec.size,
          description: imageSpec.description,
          duration
        });
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.IMAGE_UPLOAD_TIME);
        console.log(`${imageSpec.description} image uploaded in ${duration}ms`);
        
        // Verify image variants were generated
        const avatarImg = page.locator('[data-testid="profile-avatar"] img');
        await expect(avatarImg).toBeVisible();
        
        const avatarSrc = await avatarImg.getAttribute('src');
        expect(avatarSrc).toBeTruthy();
      }
      
      // Verify upload performance scales reasonably with file size
      uploadResults.sort((a, b) => a.size - b.size);
      
      for (let i = 1; i < uploadResults.length; i++) {
        const ratio = uploadResults[i].duration / uploadResults[i-1].duration;
        const sizeRatio = uploadResults[i].size / uploadResults[i-1].size;
        
        // Duration increase should be reasonable compared to size increase
        expect(ratio).toBeLessThan(sizeRatio * 2); // Allow 2x factor for processing overhead
      }
    });

    test('should handle concurrent image uploads', async ({ browser }) => {
      console.log('Testing concurrent image upload performance...');
      
      // Create multiple browser contexts for concurrent uploads
      const uploadTasks = [];
      
      for (let i = 0; i < 5; i++) {
        uploadTasks.push(async () => {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          try {
            await registerAndLoginViaBrowser(page, testUsers[i]);
            
            await page.locator('[data-testid="user-menu"]').click();
            await page.locator('[data-testid="profile-link"]').click();
            
            // Create unique image for this upload
            const imagePath = path.join(TEST_DATA_DIR, `concurrent-${i}.jpg`);
            const imageData = generateTestImage('JPEG', 300 * 1024);
            fs.writeFileSync(imagePath, imageData);
            
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.locator('[data-testid="upload-avatar-btn"]').click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(imagePath);
            
            await expect(page.locator('[data-testid="upload-success"]'))
              .toContainText('Avatar uploaded successfully', { timeout: 15000 });
            
            return { success: true, user: i };
          } finally {
            await context.close();
          }
        });
      }
      
      // Execute concurrent uploads
      const { results, totalDuration, averageResponseTime } = await generateConcurrentLoad(
        () => Promise.all(uploadTasks.map(task => task())),
        1, // Don't multiply the tasks, they're already concurrent
        1
      );
      
      // All uploads should succeed
      expect(results[0].length).toBe(5);
      results[0].forEach((result: any) => {
        expect(result.success).toBe(true);
      });
      
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.IMAGE_UPLOAD_TIME * 2);
      console.log(`5 concurrent uploads completed in ${totalDuration}ms`);
    });
  });

  test.describe('Search Performance', () => {
    test('should handle profile search efficiently', async ({ page }) => {
      console.log('Testing profile search performance...');
      
      await registerAndLoginViaBrowser(page, performanceUser);
      
      // Test various search scenarios
      const searchScenarios = [
        { query: 'john', description: 'Common name search' },
        { query: 'software engineer', description: 'Job title search' },
        { query: 'javascript', description: 'Skill search' },
        { query: 'san francisco', description: 'Location search' },
        { query: 'tech corp', description: 'Company search' },
        { query: 'university california', description: 'Education search' }
      ];
      
      const searchResults = [];
      
      for (const scenario of searchScenarios) {
        const { result, duration } = await measureOperationTime(async () => {
          await page.locator('[data-testid="search-input"]').fill(scenario.query);
          await page.locator('[data-testid="search-btn"]').click();
          
          // Wait for search results to load
          await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
          
          // Get result count
          const resultElements = page.locator('[data-testid^="user-result-"]');
          const count = await resultElements.count();
          
          return { query: scenario.query, count };
        });
        
        searchResults.push({
          ...scenario,
          duration,
          resultCount: result.count
        });
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME);
        console.log(`${scenario.description}: ${result.count} results in ${duration}ms`);
        
        // Clear search for next test
        await page.locator('[data-testid="search-clear-btn"]').click();
      }
      
      // Verify search performance is consistent across different query types
      const avgDuration = searchResults.reduce((sum, r) => sum + r.duration, 0) / searchResults.length;
      const maxDeviation = Math.max(...searchResults.map(r => Math.abs(r.duration - avgDuration)));
      
      expect(maxDeviation).toBeLessThan(avgDuration * 2); // No search should be more than 2x average
    });

    test('should handle advanced search filters efficiently', async ({ page }) => {
      await registerAndLoginViaBrowser(page, performanceUser);
      
      // Navigate to advanced search
      await page.locator('[data-testid="advanced-search-btn"]').click();
      
      // Set multiple search filters
      await page.locator('select[name="location"]').selectOption('San Francisco');
      await page.locator('select[name="experience"]').selectOption('5-10');
      await page.locator('input[name="skills"]').fill('JavaScript, TypeScript');
      await page.locator('select[name="availability"]').selectOption('open_to_work');
      
      const { duration } = await measureOperationTime(async () => {
        await page.locator('[data-testid="apply-filters-btn"]').click();
        await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
      });
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME * 1.5); // Allow extra time for complex filtering
      console.log(`Advanced search with filters completed in ${duration}ms`);
      
      // Test filter modification performance
      const { duration: filterUpdateDuration } = await measureOperationTime(async () => {
        await page.locator('select[name="experience"]').selectOption('10+');
        await expect(page.locator('[data-testid="results-updated"]')).toBeVisible();
      });
      
      expect(filterUpdateDuration).toBeLessThan(1000);
      console.log(`Filter update completed in ${filterUpdateDuration}ms`);
    });
  });

  test.describe('Bulk Operations Performance', () => {
    test('should handle bulk profile updates efficiently', async () => {
      console.log('Testing bulk profile update performance...');
      
      const bulkUpdates = testUsers.slice(0, 10).map((user, index) => ({
        userId: user.id,
        updates: {
          bio: `Bulk updated bio ${index} at ${Date.now()}`,
          location: `Bulk City ${index}`,
          skills: [{ name: `BulkSkill${index}`, level: 'intermediate' }]
        }
      }));
      
      const { duration } = await measureOperationTime(async () => {
        const updatePromises = bulkUpdates.map(update => 
          axios.patch(`${TEST_CONFIG.API_URL}/profiles/${update.userId}`, update.updates, {
            headers: { 'Authorization': `Bearer ${testUsers.find(u => u.id === update.userId).authToken}` }
          })
        );
        
        const results = await Promise.allSettled(updatePromises);
        const successful = results.filter(r => r.status === 'fulfilled');
        
        expect(successful.length).toBeGreaterThanOrEqual(8); // Allow some failures
        return successful.length;
      });
      
      const perItemDuration = duration / bulkUpdates.length;
      expect(perItemDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_PER_ITEM);
      
      console.log(`Bulk update: ${bulkUpdates.length} profiles in ${duration}ms (${perItemDuration.toFixed(1)}ms per item)`);
    });

    test('should efficiently export multiple profiles', async () => {
      // Test bulk export performance
      const exportUserIds = testUsers.slice(0, 5).map(u => u.id);
      
      const { duration } = await measureOperationTime(async () => {
        const exportResponse = await axios.post(`${TEST_CONFIG.API_URL}/admin/profiles/bulk-export`, {
          userIds: exportUserIds,
          format: 'json',
          includeMedia: false
        }, {
          headers: { 'Authorization': `Bearer ${performanceUser.authToken}` }
        });
        
        expect(exportResponse.status).toBe(200);
        return exportResponse.data;
      });
      
      const perProfileDuration = duration / exportUserIds.length;
      expect(perProfileDuration).toBeLessThan(200); // 200ms per profile
      
      console.log(`Bulk export: ${exportUserIds.length} profiles in ${duration}ms`);
    });
  });

  test.describe('Concurrent User Performance', () => {
    test('should handle concurrent profile access', async ({ browser }) => {
      console.log('Testing concurrent user access performance...');
      
      const concurrentUsers = 10;
      const sessionsPerUser = 2;
      
      const concurrentTasks = [];
      
      for (let userIndex = 0; userIndex < concurrentUsers; userIndex++) {
        const user = testUsers[userIndex];
        
        for (let session = 0; session < sessionsPerUser; session++) {
          concurrentTasks.push(async () => {
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
              // Login
              await registerAndLoginViaBrowser(page, user);
              
              // Perform typical profile activities
              await page.locator('[data-testid="user-menu"]').click();
              await page.locator('[data-testid="profile-link"]').click();
              
              // Edit profile
              await page.locator('[data-testid="edit-profile-btn"]').click();
              await page.locator('input[name="firstName"]').fill(`Concurrent${userIndex}-${session}`);
              await page.locator('[data-testid="save-profile-btn"]').click();
              
              await expect(page.locator('[data-testid="success-message"]'))
                .toContainText('Profile updated');
              
              // Search for other profiles
              await page.locator('[data-testid="search-input"]').fill('test');
              await page.locator('[data-testid="search-btn"]').click();
              
              await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
              
              return { userIndex, session, success: true };
              
            } finally {
              await context.close();
            }
          });
        }
      }
      
      // Execute all concurrent tasks
      const { results, totalDuration, averageResponseTime } = await generateConcurrentLoad(
        () => Promise.all(concurrentTasks.map(task => task())),
        1,
        1
      );
      
      const allResults = results[0];
      const successfulOperations = allResults.filter((r: any) => r.success);
      
      expect(successfulOperations.length).toBeGreaterThanOrEqual(concurrentUsers * sessionsPerUser * 0.8); // 80% success rate
      expect(totalDuration).toBeLessThan(30000); // Complete within 30 seconds
      
      console.log(`Concurrent test: ${successfulOperations.length} operations in ${totalDuration}ms`);
      console.log(`Average response time: ${averageResponseTime.toFixed(1)}ms`);
    });

    test('should maintain performance under sustained load', async () => {
      console.log('Testing sustained load performance...');
      
      const loadDurationMinutes = 2;
      const requestsPerSecond = 5;
      const totalRequests = loadDurationMinutes * 60 * requestsPerSecond;
      
      const startTime = Date.now();
      let completedRequests = 0;
      let failedRequests = 0;
      const responseTimes: number[] = [];
      
      // Create sustained load
      const loadPromise = new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          const batchPromises = [];
          
          for (let i = 0; i < requestsPerSecond; i++) {
            const user = testUsers[Math.floor(Math.random() * testUsers.length)];
            
            batchPromises.push(
              measureOperationTime(() => 
                axios.get(`${TEST_CONFIG.API_URL}/profiles/${user.id}`, {
                  headers: { 'Authorization': `Bearer ${user.authToken}` }
                })
              ).then(({ duration }) => {
                responseTimes.push(duration);
                completedRequests++;
              }).catch(() => {
                failedRequests++;
              })
            );
          }
          
          await Promise.allSettled(batchPromises);
          
          if (Date.now() - startTime >= loadDurationMinutes * 60 * 1000) {
            clearInterval(interval);
            resolve();
          }
        }, 1000);
      });
      
      await loadPromise;
      
      const totalDuration = Date.now() - startTime;
      const successRate = completedRequests / (completedRequests + failedRequests);
      
      // Calculate percentile response times
      responseTimes.sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
      
      // Performance assertions
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME_P95);
      
      console.log(`Sustained load results:`);
      console.log(`  Duration: ${totalDuration}ms`);
      console.log(`  Completed: ${completedRequests} requests`);
      console.log(`  Failed: ${failedRequests} requests`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Response times - P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
    });
  });

  test.describe('Memory and Resource Performance', () => {
    test('should efficiently manage memory during large operations', async ({ page }) => {
      console.log('Testing memory efficiency during large operations...');
      
      await registerAndLoginViaBrowser(page, performanceUser);
      
      // Measure memory usage during large profile operations
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Perform memory-intensive operations
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="profile-link"]').click();
      
      // Load large profile sections
      await page.locator('[data-testid="skills-tab"]').click();
      await page.locator('[data-testid="experience-tab"]').click();
      await page.locator('[data-testid="projects-tab"]').click();
      
      // Upload multiple images
      for (let i = 0; i < 3; i++) {
        const imagePath = path.join(TEST_DATA_DIR, `memory-test-${i}.jpg`);
        const imageData = generateTestImage('JPEG', 1024 * 1024); // 1MB each
        fs.writeFileSync(imagePath, imageData);
        
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('[data-testid="upload-avatar-btn"]').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(imagePath);
        
        await expect(page.locator('[data-testid="upload-success"]'))
          .toContainText('Avatar uploaded successfully');
      }
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Memory increase should be reasonable
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      expect(memoryIncreaseMB).toBeLessThan(50); // Should not use more than 50MB additional
      console.log(`Memory usage increased by ${memoryIncreaseMB.toFixed(1)}MB during operations`);
    });

    test('should handle large dataset visualization efficiently', async ({ page }) => {
      await registerAndLoginViaBrowser(page, performanceUser);
      
      // Navigate to analytics page (if available)
      await page.locator('[data-testid="user-menu"]').click();
      
      if (await page.locator('[data-testid="analytics-link"]').isVisible()) {
        await page.locator('[data-testid="analytics-link"]').click();
        
        // Test loading large analytics datasets
        const { duration } = await measureOperationTime(async () => {
          await page.locator('select[name="timeRange"]').selectOption('1year');
          await page.locator('[data-testid="load-analytics-btn"]').click();
          
          // Wait for charts to render
          await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible();
          await expect(page.locator('[data-testid="analytics-data-loaded"]')).toBeVisible();
        });
        
        expect(duration).toBeLessThan(5000);
        console.log(`Large analytics dataset loaded in ${duration}ms`);
        
        // Test chart interaction performance
        const { duration: interactionDuration } = await measureOperationTime(async () => {
          await page.locator('[data-testid="chart-zoom-in"]').click();
          await page.locator('[data-testid="chart-filter-btn"]').click();
          await expect(page.locator('[data-testid="chart-updated"]')).toBeVisible();
        });
        
        expect(interactionDuration).toBeLessThan(1000);
        console.log(`Chart interaction completed in ${interactionDuration}ms`);
      }
    });
  });

  test.describe('API Performance Optimization', () => {
    test('should optimize database queries for profile operations', async () => {
      console.log('Testing database query performance...');
      
      // Test profile retrieval with various complexity levels
      const queryScenarios = [
        {
          name: 'basic-profile',
          endpoint: `/profiles/${performanceUser.id}`,
          expectedTime: 200
        },
        {
          name: 'profile-with-skills',
          endpoint: `/profiles/${performanceUser.id}?include=skills`,
          expectedTime: 300
        },
        {
          name: 'profile-with-experience',
          endpoint: `/profiles/${performanceUser.id}?include=workExperience`,
          expectedTime: 350
        },
        {
          name: 'complete-profile',
          endpoint: `/profiles/${performanceUser.id}?include=skills,workExperience,education,projects,socialLinks`,
          expectedTime: 500
        },
        {
          name: 'profile-with-analytics',
          endpoint: `/profiles/${performanceUser.id}/analytics?period=30d`,
          expectedTime: 800
        }
      ];
      
      for (const scenario of queryScenarios) {
        const { duration } = await measureOperationTime(async () => {
          const response = await axios.get(`${TEST_CONFIG.API_URL}${scenario.endpoint}`, {
            headers: { 'Authorization': `Bearer ${performanceUser.authToken}` }
          });
          
          expect(response.status).toBe(200);
          return response.data;
        });
        
        expect(duration).toBeLessThan(scenario.expectedTime);
        console.log(`${scenario.name}: ${duration}ms (threshold: ${scenario.expectedTime}ms)`);
      }
    });

    test('should implement efficient pagination', async () => {
      // Test pagination performance with large datasets
      const pageSize = 20;
      const maxPages = 5;
      
      const paginationResults = [];
      
      for (let page = 1; page <= maxPages; page++) {
        const { result, duration } = await measureOperationTime(async () => {
          const response = await axios.get(`${TEST_CONFIG.API_URL}/profiles/search`, {
            params: {
              q: 'test',
              page,
              limit: pageSize,
              include: 'basic'
            },
            headers: { 'Authorization': `Bearer ${performanceUser.authToken}` }
          });
          
          expect(response.status).toBe(200);
          return response.data;
        });
        
        paginationResults.push({ page, duration, count: result.profiles.length });
        
        expect(duration).toBeLessThan(1000); // Each page should load quickly
        console.log(`Page ${page}: ${result.profiles.length} profiles in ${duration}ms`);
      }
      
      // Verify pagination performance is consistent
      const durations = paginationResults.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDeviation = Math.max(...durations.map(d => Math.abs(d - avgDuration)));
      
      expect(maxDeviation).toBeLessThan(avgDuration); // No page should be more than 2x average
    });
  });

  test.describe('Performance Monitoring and Alerting', () => {
    test('should track performance metrics accurately', async () => {
      console.log('Testing performance metrics tracking...');
      
      // Generate measurable activity
      const activities = [];
      
      for (let i = 0; i < 20; i++) {
        activities.push(
          measureOperationTime(() => 
            axios.get(`${TEST_CONFIG.API_URL}/profiles/${performanceUser.id}`, {
              headers: { 'Authorization': `Bearer ${performanceUser.authToken}` }
            })
          )
        );
      }
      
      const results = await Promise.all(activities);
      const durations = results.map(r => r.duration);
      
      // Get performance metrics from API
      const metricsResponse = await axios.get(`${TEST_CONFIG.API_URL}/admin/metrics/profiles`, {
        params: {
          period: '1h',
          granularity: 'minute'
        },
        headers: { 'Authorization': `Bearer ${performanceUser.authToken}` }
      });
      
      if (metricsResponse.status === 200) {
        const metrics = metricsResponse.data;
        
        expect(metrics).toHaveProperty('requestCount');
        expect(metrics).toHaveProperty('averageResponseTime');
        expect(metrics).toHaveProperty('errorRate');
        expect(metrics).toHaveProperty('throughput');
        
        // Verify metrics are reasonable
        expect(metrics.requestCount).toBeGreaterThan(0);
        expect(metrics.averageResponseTime).toBeLessThan(1000);
        expect(metrics.errorRate).toBeLessThan(0.05); // Less than 5% error rate
        
        console.log(`Performance metrics:`);
        console.log(`  Requests: ${metrics.requestCount}`);
        console.log(`  Avg response time: ${metrics.averageResponseTime}ms`);
        console.log(`  Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
        console.log(`  Throughput: ${metrics.throughput} req/sec`);
      }
    });
  });
});

/**
 * Performance test utilities
 */

// Generate performance test report
export async function generatePerformanceReport(results: any[]): Promise<string> {
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: 'Profile Management Performance Tests',
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.status === 'passed').length,
      failedTests: results.filter(r => r.status === 'failed').length,
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    },
    thresholds: PERFORMANCE_THRESHOLDS,
    results: results.map(r => ({
      testName: r.name,
      status: r.status,
      duration: r.duration,
      throughput: r.throughput,
      memoryUsage: r.memoryUsage,
      errorRate: r.errorRate
    })),
    recommendations: generatePerformanceRecommendations(results)
  };
  
  const reportPath = path.join(TEST_DATA_DIR, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return reportPath;
}

function generatePerformanceRecommendations(results: any[]): string[] {
  const recommendations = [];
  
  const slowTests = results.filter(r => r.duration > 1000);
  if (slowTests.length > 0) {
    recommendations.push('Consider optimizing database queries for slow operations');
  }
  
  const highErrorRateTests = results.filter(r => r.errorRate > 0.05);
  if (highErrorRateTests.length > 0) {
    recommendations.push('Investigate and fix operations with high error rates');
  }
  
  const memoryIntensiveTests = results.filter(r => r.memoryUsage > 100 * 1024 * 1024);
  if (memoryIntensiveTests.length > 0) {
    recommendations.push('Optimize memory usage for resource-intensive operations');
  }
  
  return recommendations;
}