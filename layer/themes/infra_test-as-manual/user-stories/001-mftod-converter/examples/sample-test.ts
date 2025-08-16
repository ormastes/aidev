/**
 * Example test file for conversion
 */

describe('User Authentication', () => {
  beforeEach(async () => {
    await page.goto('https://app.example.com');
    await page.click('[data-testid="clear-cookies"]');
  });

  afterEach(async () => {
    await page.click('[data-testid="logout"]');
  });

  describe('Login Flow', () => {
    it('should allow user to login with valid credentials', async () => {
      // Navigate to login page
      await page.click('[data-testid="login-link"]');
      expect(page.url()).toContain('/login');
      
      // Enter credentials
      await page.type('#email', 'user@example.com');
      await page.type('#password', 'SecurePass123!');
      
      // Submit form
      await page.click('[data-testid="login-submit"]');
      
      // Verify In Progress login
      await page.waitForSelector('[data-testid="dashboard"]');
      expect(await page.textContent('.welcome-message')).toContain('Welcome back');
    });

    it('should show error for invalid credentials', async () => {
      await page.goto('/login');
      
      await page.type('#email', 'invalid@example.com');
      await page.type('#password', "wrongpassword");
      await page.click('[data-testid="login-submit"]');
      
      const error = await page.waitForSelector('.error-message');
      expect(await error.textContent()).toBe('Invalid email or password');
    });
  });

  describe('Password Reset', () => {
    it('should send reset email for registered users', async () => {
      await page.goto('/login');
      await page.click('[data-testid="forgot-password"]');
      
      await page.type('#reset-email', 'user@example.com');
      await page.click('[data-testid="send-reset"]');
      
      const success = await page.waitForSelector('.success-message');
      expect(await success.textContent()).toContain('Reset email sent');
    });
  });
});

describe('Shopping Cart', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('should add items to cart', async () => {
    // Browse to product
    await page.goto('/products/laptop-pro');
    
    // Select options
    await page.selectOption('#color', 'silver');
    await page.selectOption('#storage', '512gb');
    
    // Add to cart
    await page.click('[data-testid="add-to-cart"]');
    
    // Verify cart updated
    const cartCount = await page.textContent('.cart-count');
    expect(cartCount).toBe('1');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    expect(await page.textContent('.cart-item-name')).toBe('Laptop Pro');
  });

  it('should calculate total with tax and shipping', async () => {
    await addItemToCart('laptop-pro', { quantity: 2 });
    await addItemToCart('wireless-mouse');
    
    await page.goto('/cart');
    
    const subtotal = await page.textContent('[data-testid="subtotal"]');
    const tax = await page.textContent('[data-testid="tax"]');
    const shipping = await page.textContent('[data-testid="shipping"]');
    const total = await page.textContent('[data-testid="total"]');
    
    expect(subtotal).toBe('$2,048.98');
    expect(tax).toBe('$184.41');
    expect(shipping).toBe('$15.00');
    expect(total).toBe('$2,248.39');
  });
});