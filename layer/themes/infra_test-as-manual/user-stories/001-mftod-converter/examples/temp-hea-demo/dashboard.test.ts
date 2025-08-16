
describe('User Dashboard', () => {
  describe('Dashboard Loading', () => {
    beforeEach(async () => {
      await login("testuser", "password123");
    });

    it('should display user profile information', async () => {
      const profileSection = await page.find('.profile-section');
      expect(profileSection).toBeVisible();
      expect(await profileSection.getText()).toContain('Test User');
    });

    it('should show recent activity', async () => {
      const activityList = await page.find('.activity-list');
      const items = await activityList.findAll('.activity-item');
      expect(items).toHaveLength(5);
      expect(await items[0].getText()).toMatch(/logged in/i);
    });
  });

  describe('Dashboard Actions', () => {
    it('should allow user to update profile', async () => {
      await page.click('.edit-profile-btn');
      await page.fill('#name', 'Updated Name');
      await page.click('.save-btn');
      
      const notification = await page.waitFor('.success-notification');
      expect(notification).toHaveText('Profile updated successfully');
    });

    it('@critical should handle API errors gracefully', async () => {
      // Simulate API failure
      await page.route('/api/profile', route => {
        route.fulfill({ status: 500 });
      });
      
      await page.click('.refresh-btn');
      const errorMsg = await page.waitFor('.error-message');
      expect(errorMsg).toHaveText('Failed to load data. Please try again.');
    });
  });
});
