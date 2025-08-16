import { ApiService } from '../../services/api';

// Mock setTimeout to avoid delays in tests
jest.useFakeTimers();

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset random to be predictable for error simulation
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // No errors
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('getProducts', () => {
    it('should return products successfully', async () => {
      const promise = ApiService.getProducts();
      jest.advanceTimersByTime(800); // Advance by mockDelay time
      const products = await promise;

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
    });

    it('should filter products by category', async () => {
      const promise = ApiService.getProducts({ category: 'yerba_mate' });
      jest.advanceTimersByTime(800);
      const products = await promise;

      products.forEach(product => {
        expect(product.category).toBe('yerba_mate');
      });
    });

    it('should filter products by search query', async () => {
      const promise = ApiService.getProducts({ searchQuery: 'taragui' });
      jest.advanceTimersByTime(800);
      const products = await promise;

      products.forEach(product => {
        const query = 'taragui';
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDescription = product.description.toLowerCase().includes(query);
        const matchesBrand = product.brand.toLowerCase().includes(query);
        
        expect(matchesName || matchesDescription || matchesBrand).toBe(true);
      });
    });

    it('should throw error when simulated', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05); // Trigger error

      const promise = ApiService.getProducts();
      jest.advanceTimersByTime(800);

      await expect(promise).rejects.toThrow('Failed to fetch products');
    });
  });

  describe('getProduct', () => {
    it('should return single product by id', async () => {
      const promise = ApiService.getProduct('1');
      jest.advanceTimersByTime(500);
      const product = await promise;

      expect(product).toHaveProperty('id', '1');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
    });

    it('should throw error for non-existent product', async () => {
      const promise = ApiService.getProduct('non-existent');
      jest.advanceTimersByTime(500);

      await expect(promise).rejects.toThrow('Product not found');
    });
  });

  describe('getFeaturedProducts', () => {
    it('should return featured products', async () => {
      const promise = ApiService.getFeaturedProducts();
      jest.advanceTimersByTime(600);
      const products = await promise;

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeLessThanOrEqual(6);
      products.forEach(product => {
        expect(product.isOnSale || product.rating > 4.5).toBe(true);
      });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const promise = ApiService.login('demo@matedealer.com', 'demo123');
      jest.advanceTimersByTime(1200);
      const result = await promise;

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).toHaveProperty('email', 'demo@matedealer.com');
      expect(result.token).toBeTruthy();
    });

    it('should throw error with invalid credentials', async () => {
      const promise = ApiService.login('wrong@email.com', 'wrongpass');
      jest.advanceTimersByTime(1200);

      await expect(promise).rejects.toThrow('Invalid credentials');
    });
  });

  describe('createOrder', () => {
    const mockOrderData = {
      userId: 'user-1',
      items: [
        {
          id: 'cart-1',
          productId: 'product-1',
          name: 'Test Product',
          price: 10.00,
          quantity: 2,
          subtotal: 20.00,
        }
      ],
      subtotal: 20.00,
      tax: 1.60,
      deliveryFee: 5.99,
      discount: 0,
      totalAmount: 27.59,
      paymentMethod: 'card',
      deliveryAddress: {
        id: 'addr-1',
        street: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        country: 'USA',
        isDefault: true,
      },
      notes: 'Test order',
    };

    it('should create order successfully', async () => {
      const promise = ApiService.createOrder(mockOrderData);
      jest.advanceTimersByTime(2000);
      const order = await promise;

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('orderNumber');
      expect(order).toHaveProperty('status', 'pending');
      expect(order.userId).toBe(mockOrderData.userId);
      expect(order.totalAmount).toBe(mockOrderData.totalAmount);
      expect(order.items).toEqual(mockOrderData.items);
    });
  });

  describe('processPayment', () => {
    const mockPaymentData = {
      orderId: 'order-1',
      amount: 27.59,
      paymentMethodId: 'pm-1',
    };

    it('should process payment successfully', async () => {
      const promise = ApiService.processPayment(mockPaymentData);
      jest.advanceTimersByTime(3000);
      const transaction = await promise;

      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('status', 'completed');
      expect(transaction.orderId).toBe(mockPaymentData.orderId);
      expect(transaction.amount).toBe(mockPaymentData.amount);
      expect(transaction).toHaveProperty('transactionId');
    });
  });
});