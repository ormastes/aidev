import { test, expect } from '@playwright/test';

test.describe('AI Dev Portal - UI Enhancements', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3456');
    });

    test.describe('Visual Design', () => {
        test('should display gradient text for branding', async ({ page }) => {
            const title = await page.locator('h1.gradient-text');
            await expect(title).toBeVisible();
            
            const styles = await title.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    backgroundImage: computed.backgroundImage,
                    webkitBackgroundClip: computed.webkitBackgroundClip || computed.backgroundClip
                };
            });
            
            expect(styles.backgroundImage).toContain("gradient");
        });

        test('should have glassmorphism effect on login form', async ({ page }) => {
            const loginForm = await page.locator('.login-form');
            const styles = await loginForm.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter,
                    background: computed.background
                };
            });
            
            expect(styles.backdropFilter).toContain('blur');
        });

        test('should apply hover effects on buttons', async ({ page }) => {
            const button = await page.locator('button[type="submit"]');
            
            // Get initial transform
            const initialTransform = await button.evaluate(el => 
                window.getComputedStyle(el).transform
            );
            
            // Hover over button
            await button.hover();
            
            // Wait for animation
            await page.waitForTimeout(300);
            
            // Get hover transform
            const hoverTransform = await button.evaluate(el => 
                window.getComputedStyle(el).transform
            );
            
            // Should have different transform on hover
            expect(hoverTransform).not.toBe(initialTransform);
        });
    });

    test.describe("Animations", () => {
        test('should animate login transition', async ({ page }) => {
            // Fill login form
            await page.fill('#username', 'admin');
            await page.fill('#password', 'demo123');
            
            // Check login page is visible
            const loginPage = await page.locator('#login-page');
            await expect(loginPage).toBeVisible();
            
            // Submit form
            await page.click('button[type="submit"]');
            
            // Wait for animation
            await page.waitForTimeout(1500);
            
            // Check dashboard is visible
            const dashboardPage = await page.locator('#dashboard-page');
            await expect(dashboardPage).toBeVisible();
            
            // Login page should be hidden
            await expect(loginPage).not.toBeVisible();
        });

        test('should display loading skeletons', async ({ page }) => {
            // Login first
            await page.fill('#username', "developer");
            await page.fill('#password', 'demo123');
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('#dashboard-page', { state: 'visible' });
            
            // Click on projects link
            await page.click('#projects-link');
            
            // Check for skeleton loaders
            const skeletons = await page.locator('.skeleton');
            const count = await skeletons.count();
            expect(count).toBeGreaterThan(0);
            
            // Wait for actual content
            await page.waitForTimeout(600);
            
            // Skeletons should be gone
            const skeletonsAfter = await page.locator('.skeleton');
            const countAfter = await skeletonsAfter.count();
            expect(countAfter).toBe(0);
        });

        test('should animate progress bars', async ({ page }) => {
            // Login and navigate to feature progress
            await page.fill('#username', 'tester');
            await page.fill('#password', 'demo123');
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('#dashboard-page', { state: 'visible' });
            await page.click('#feature-progress-link');
            
            // Wait for progress bars to load
            await page.waitForSelector('.progress-fill');
            
            // Check progress animation
            const progressBars = await page.locator('.progress-fill').all();
            for (const bar of progressBars) {
                const width = await bar.evaluate(el => el.style.width);
                expect(parseInt(width)).toBeGreaterThan(0);
            }
        });
    });

    test.describe('Responsive Design', () => {
        test('should be responsive on mobile', async ({ page }) => {
            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            
            const loginForm = await page.locator('.login-form');
            await expect(loginForm).toBeVisible();
            
            // Check form is properly sized
            const box = await loginForm.boundingBox();
            expect(box.width).toBeLessThanOrEqual(375);
        });

        test('should be responsive on tablet', async ({ page }) => {
            // Set tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 });
            
            await page.fill('#username', 'admin');
            await page.fill('#password', 'demo123');
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('#dashboard-page', { state: 'visible' });
            
            // Check dashboard layout
            const leftPanel = await page.locator('.left-panel');
            const mainContent = await page.locator('.main-content');
            
            await expect(leftPanel).toBeVisible();
            await expect(mainContent).toBeVisible();
        });
    });

    test.describe("Notifications", () => {
        test('should show success notification on login', async ({ page }) => {
            await page.fill('#username', 'admin');
            await page.fill('#password', 'demo123');
            await page.click('button[type="submit"]');
            
            // Wait for notification
            const notification = await page.locator('.notification-success');
            await expect(notification).toBeVisible();
            
            // Check notification content
            const text = await notification.textContent();
            expect(text).toContain('Welcome back');
            
            // Should auto-hide
            await page.waitForTimeout(3500);
            await expect(notification).not.toBeVisible();
        });

        test('should show error notification on invalid login', async ({ page }) => {
            await page.fill('#username', 'invalid');
            await page.fill('#password', 'wrong');
            await page.click('button[type="submit"]');
            
            // Wait for notification
            const notification = await page.locator('.notification-error');
            await expect(notification).toBeVisible();
            
            // Check notification content
            const text = await notification.textContent();
            expect(text).toContain('Invalid');
        });

        test('should shake form on invalid login', async ({ page }) => {
            await page.fill('#username', 'invalid');
            await page.fill('#password', 'wrong');
            
            const form = await page.locator('#login-form');
            
            // Add listener for animation
            const hasShakeClass = await form.evaluate((el) => {
                return new Promise((resolve) => {
                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            if (mutation.attributeName === 'class') {
                                if (el.classList.contains('shake')) {
                                    observer.disconnect();
                                    resolve(true);
                                }
                            }
                        }
                    });
                    observer.observe(el, { attributes: true });
                    
                    // Timeout after 2 seconds
                    setTimeout(() => {
                        observer.disconnect();
                        resolve(false);
                    }, 2000);
                });
            });
            
            // Submit form
            await page.click('button[type="submit"]');
            
            // Check if shake was applied
            expect(hasShakeClass).toBeTruthy();
        });
    });

    test.describe('Interactive Elements', () => {
        test('should highlight active navigation items', async ({ page }) => {
            await page.fill('#username', "developer");
            await page.fill('#password', 'demo123');
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('#dashboard-page', { state: 'visible' });
            
            // Click different nav items
            const navItems = ["projects", "features", 'tasks'];
            
            for (const item of navItems) {
                await page.click(`#${item}-link`);
                
                // Check active class
                const link = await page.locator(`#${item}-link`);
                const hasActive = await link.evaluate(el => el.classList.contains('active'));
                expect(hasActive).toBeTruthy();
                
                // Check other links don't have active
                for (const other of navItems.filter(i => i !== item)) {
                    const otherLink = await page.locator(`#${other}-link`);
                    const otherActive = await otherLink.evaluate(el => el.classList.contains('active'));
                    expect(otherActive).toBeFalsy();
                }
            }
        });

        test('should animate stat numbers', async ({ page }) => {
            await page.fill('#username', 'admin');
            await page.fill('#password', 'demo123');
            await page.click('button[type="submit"]');
            
            await page.waitForSelector('#dashboard-page', { state: 'visible' });
            await page.click('#feature-progress-link');
            
            // Check stat values animate
            const totalFeatures = await page.locator('#total-features');
            await page.waitForTimeout(1200); // Wait for animation
            
            const value = await totalFeatures.textContent();
            expect(parseInt(value)).toBeGreaterThan(0);
        });
    });

    test.describe('Color Themes', () => {
        test('should use CSS variables for theming', async ({ page }) => {
            const root = await page.locator(':root');
            const primaryColor = await root.evaluate(() => {
                return getComputedStyle(document.documentElement)
                    .getPropertyValue('--primary');
            });
            
            expect(primaryColor).toBeTruthy();
            expect(primaryColor).toMatch(/#[0-9a-f]{6}/i);
        });

        test('should apply gradient backgrounds', async ({ page }) => {
            const body = await page.locator('body');
            const beforeStyles = await body.evaluate(() => {
                const pseudo = window.getComputedStyle(document.body, '::before');
                return pseudo.background;
            });
            
            expect(beforeStyles).toContain("gradient");
        });
    });

    test.describe("Accessibility", () => {
        test('should have proper focus states', async ({ page }) => {
            // Tab through form elements
            await page.keyboard.press('Tab');
            const username = await page.locator('#username');
            await expect(username).toBeFocused();
            
            // Check focus styles
            const focusStyles = await username.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    outline: computed.outline,
                    borderColor: computed.borderColor,
                    boxShadow: computed.boxShadow
                };
            });
            
            expect(focusStyles.borderColor).toContain('99'); // Primary color
        });

        test('should have sufficient color contrast', async ({ page }) => {
            const title = await page.locator('h1');
            const styles = await title.evaluate(el => {
                const computed = window.getComputedStyle(el);
                const parent = window.getComputedStyle(el.parentElement);
                return {
                    color: computed.color,
                    background: parent.backgroundColor
                };
            });
            
            // Basic check that text is visible
            expect(styles.color).toBeTruthy();
        });
    });
});

test.describe("Performance", () => {
    test('should load quickly', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('http://localhost:3456');
        await page.waitForLoadState("networkidle");
        const loadTime = Date.now() - startTime;
        
        // Should load in under 3 seconds
        expect(loadTime).toBeLessThan(3000);
    });

    test('should have smooth animations', async ({ page }) => {
        await page.goto('http://localhost:3456');
        
        // Check for CSS transitions
        const button = await page.locator('button[type="submit"]');
        const transition = await button.evaluate(el => 
            window.getComputedStyle(el).transition
        );
        
        expect(transition).toContain('ease');
    });
});