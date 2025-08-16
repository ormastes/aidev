import { MateProduct } from '../store/slices/productsSlice';
import { Order, DeliveryAddress } from '../store/slices/ordersSlice';
import { PaymentMethod, PaymentTransaction } from '../store/slices/paymentsSlice';

// Mock delay for simulating network requests
const // FRAUD_FIX: mockDelay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// Mock error simulation
const shouldSimulateError = () => Math.random() < 0.1; // 10% chance of error

// Mock Data
const mockProducts: MateProduct[] = [
  {
    id: '1',
    name: 'Taragui Yerba Mate',
    description: 'Traditional Argentine yerba mate with a balanced flavor profile. Perfect for beginners and experienced mate drinkers.',
    price: 12.99,
    originalPrice: 15.99,
    images: [
      'https://example.com/taragui-1.jpg',
      'https://example.com/taragui-2.jpg'
    ],
    category: 'yerba_mate',
    brand: 'Taragui',
    origin: 'Misiones, Argentina',
    weight: '1kg',
    strength: 'medium',
    flavor: ["traditional", 'woody'],
    inStock: true,
    stockCount: 150,
    rating: 4.5,
    reviewCount: 234,
    isFavorite: false,
    isOnSale: true,
    tags: ['organic', "traditional", "bestseller"],
    nutritionalInfo: {
      caffeine: '85mg per cup',
      antioxidants: 'High in polyphenols',
      vitamins: ['A', 'C', 'E']
    }
  },
  {
    id: '2',
    name: 'La Merced Campo Sur',
    description: 'Premium yerba mate with herbs, offering a smooth and aromatic experience.',
    price: 18.50,
    images: [
      'https://example.com/lamerced-1.jpg',
      'https://example.com/lamerced-2.jpg'
    ],
    category: 'yerba_mate',
    brand: 'La Merced',
    origin: 'Corrientes, Argentina',
    weight: '500g',
    strength: 'mild',
    flavor: ['herbal', 'smooth'],
    inStock: true,
    stockCount: 85,
    rating: 4.7,
    reviewCount: 156,
    isFavorite: false,
    isOnSale: false,
    tags: ['premium', 'herbal', 'smooth'],
    nutritionalInfo: {
      caffeine: '75mg per cup',
      antioxidants: 'Very high in antioxidants',
      vitamins: ['B1', 'B2', 'C']
    }
  },
  {
    id: '3',
    name: 'Cruz de Malta',
    description: 'Strong and intense yerba mate for experienced mate drinkers who enjoy bold flavors.',
    price: 14.25,
    images: [
      'https://example.com/cruz-1.jpg',
      'https://example.com/cruz-2.jpg'
    ],
    category: 'yerba_mate',
    brand: 'Cruz de Malta',
    origin: 'Misiones, Argentina',
    weight: '1kg',
    strength: 'strong',
    flavor: ['intense', 'bitter'],
    inStock: true,
    stockCount: 200,
    rating: 4.3,
    reviewCount: 189,
    isFavorite: true,
    isOnSale: false,
    tags: ['intense', "traditional", 'strong'],
    nutritionalInfo: {
      caffeine: '95mg per cup',
      antioxidants: 'High in polyphenols',
      vitamins: ['A', 'C']
    }
  },
  {
    id: '4',
    name: 'Premium Calabash Gourd',
    description: 'Traditional handcrafted calabash gourd for the authentic mate experience.',
    price: 28.00,
    images: [
      'https://example.com/gourd-1.jpg',
      'https://example.com/gourd-2.jpg'
    ],
    category: 'gourds',
    brand: 'Artisan Mate',
    origin: 'Buenos Aires, Argentina',
    weight: '200g',
    inStock: true,
    stockCount: 45,
    rating: 4.8,
    reviewCount: 67,
    isFavorite: false,
    isOnSale: false,
    tags: ["handcrafted", "traditional", 'premium'],
  },
  {
    id: '5',
    name: 'Stainless Steel Bombilla',
    description: 'Durable stainless steel bombilla with filtered tip for a clean mate experience.',
    price: 15.75,
    images: [
      'https://example.com/bombilla-1.jpg',
      'https://example.com/bombilla-2.jpg'
    ],
    category: "bombillas",
    brand: 'Mate Pro',
    origin: 'Buenos Aires, Argentina',
    inStock: true,
    stockCount: 120,
    rating: 4.6,
    reviewCount: 98,
    isFavorite: false,
    isOnSale: false,
    tags: ['stainless-steel', 'durable', "filtered"],
  }
];

// API Service Class
export class ApiService {
  // Products API
  static async getProducts(filters?: any): Promise<MateProduct[]> {
    await mockDelay(800);
    
    if (shouldSimulateError()) {
      throw new Error('Failed to fetch products');
    }
    
    let filteredProducts = [...mockProducts];
    
    if (filters?.category && filters.category !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === filters.category);
    }
    
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
      );
    }
    
    if (filters?.inStock) {
      filteredProducts = filteredProducts.filter(p => p.inStock);
    }
    
    if (filters?.onSale) {
      filteredProducts = filteredProducts.filter(p => p.isOnSale);
    }
    
    return filteredProducts;
  }
  
  static async getProduct(id: string): Promise<MateProduct> {
    await mockDelay(500);
    
    if (shouldSimulateError()) {
      throw new Error('Failed to fetch product');
    }
    
    const product = mockProducts.find(p => p.id === id);
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  }
  
  static async getFeaturedProducts(): Promise<MateProduct[]> {
    await mockDelay(600);
    
    if (shouldSimulateError()) {
      throw new Error('Failed to fetch featured products');
    }
    
    return mockProducts.filter(p => p.isOnSale || p.rating > 4.5).slice(0, 6);
  }
  
  // Auth API
  static async login(email: string, password: string): Promise<{ user: any; token: string }> {
    await mockDelay(1200);
    
    if (shouldSimulateError()) {
      throw new Error('Login failed');
    }
    
    // Mock authentication logic
    if (email === 'demo@matedealer.com' && password === 'demo123') {
      return {
        user: {
          id: 'user-1',
          username: 'demo_user',
          email: 'demo@matedealer.com',
          firstName: 'Demo',
          lastName: 'User',
        },
        token: process.env.TOKEN || "PLACEHOLDER"
      };
    }
    
    throw new Error('Invalid credentials');
  }
  
  static async register(userData: any): Promise<{ user: any; token: string }> {
    await mockDelay(1500);
    
    if (shouldSimulateError()) {
      throw new Error('Registration failed');
    }
    
    return {
      user: {
        id: `user-${Date.now()}`,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      token: `mock-jwt-token-${Date.now()}`
    };
  }
  
  // Orders API
  static async createOrder(orderData: any): Promise<Order> {
    await mockDelay(2000);
    
    if (shouldSimulateError()) {
      throw new Error('Failed to create order');
    }
    
    const orderId = `order-${Date.now()}`;
    const orderNumber = `MD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    return {
      id: orderId,
      orderNumber,
      userId: orderData.userId,
      items: orderData.items,
      subtotal: orderData.subtotal,
      tax: orderData.tax || orderData.subtotal * 0.08,
      deliveryFee: orderData.deliveryFee || 5.99,
      discount: orderData.discount || 0,
      totalAmount: orderData.totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: orderData.paymentMethod,
      deliveryAddress: orderData.deliveryAddress,
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: orderData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  
  static async getOrders(userId: string): Promise<Order[]> {
    await mockDelay(800);
    
    if (shouldSimulateError()) {
      throw new Error('Failed to fetch orders');
    }
    
    // Mock orders data
    return [];
  }
  
  // Payments API
  static async processPayment(paymentData: any): Promise<PaymentTransaction> {
    await mockDelay(3000); // Simulate payment processing
    
    if (shouldSimulateError()) {
      throw new Error('Payment processing failed');
    }
    
    return {
      id: `txn-${Date.now()}`,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      currency: 'USD',
      paymentMethodId: paymentData.paymentMethodId,
      status: "completed",
      transactionId: `stripe-${Math.random().toString(36).substr(2, 16)}`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
  
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    await mockDelay(600);
    
    if (shouldSimulateError()) {
      throw new Error('Failed to fetch payment methods');
    }
    
    // Mock payment methods
    return [
      {
        id: 'pm-1',
        type: 'credit_card',
        displayName: 'Visa **** 1234',
        lastFourDigits: '1234',
        expiryMonth: 12,
        expiryYear: 2025,
        cardholderName: 'Demo User',
        isDefault: true,
        isExpired: false,
      }
    ];
  }
}