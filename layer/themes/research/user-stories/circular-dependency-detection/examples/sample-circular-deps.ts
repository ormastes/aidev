/**
 * Example of circular dependencies for testing
 */

// File 1: moduleA.ts
export const moduleAContent = `
import { functionB, ClassB } from './moduleB';

export function functionA(): string {
  return \`A calls \${functionB()}\`;
}

export class ClassA {
  private b: ClassB;
  
  constructor() {
    this.b = new ClassB();
  }
  
  methodA(): string {
    return this.b.methodB();
  }
}
`;

// File 2: moduleB.ts  
export const moduleBContent = `
import { functionA, ClassA } from './moduleA';

export function functionB(): string {
  return \`B calls \${functionA()}\`;
}

export class ClassB {
  private a: ClassA;
  
  constructor() {
    this.a = new ClassA(); // This creates infinite recursion
  }
  
  methodB(): string {
    return this.a.methodA();
  }
}
`;

// File 3: Complex circular dependency through utils
export const moduleC = `
import { functionA } from './moduleA';
import { utilD } from './utils/moduleD';

export function functionC(): string {
  return \`C uses \${functionA()} and \${utilD()}\`;
}
`;

export const moduleD = `
import { functionC } from '../moduleC';

export function utilD(): string {
  return \`D indirectly calls \${functionC()}\`;
}
`;

// File 4: Service layer circular dependency
export const userService = `
import { OrderService } from './orderService';

export class UserService {
  private orderService: OrderService;
  
  constructor() {
    this.orderService = new OrderService();
  }
  
  getUserOrders(userId: string) {
    return this.orderService.getOrdersByUser(userId);
  }
}
`;

export const orderService = `
import { UserService } from './userService';

export class OrderService {
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService(); // Circular dependency!
  }
  
  getOrdersByUser(userId: string) {
    // This would cause infinite recursion
    const user = this.userService.getUserOrders(userId);
    return [];
  }
}
`;

// Solutions to break circular dependencies:

// Solution 1: Dependency Injection
export const userServiceSolution1 = `
import { OrderService } from './orderService';

export class UserService {
  constructor(private orderService: OrderService) {}
  
  getUserOrders(userId: string) {
    return this.orderService.getOrdersByUser(userId);
  }
}
`;

// Solution 2: Interface segregation
export const interfaces = `
export interface IUserRepository {
  findById(id: string): User;
}

export interface IOrderRepository {
  findByUserId(userId: string): Order[];
}
`;

// Solution 3: Event-driven architecture
export const eventBus = `
export class EventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
}
`;

// Solution 4: Lazy loading
export const lazyLoadingSolution = `
export class UserService {
  private _orderService: OrderService | null = null;
  
  private get orderService(): OrderService {
    if (!this._orderService) {
      const { OrderService } = require('./orderService');
      this._orderService = new OrderService();
    }
    return this._orderService;
  }
  
  getUserOrders(userId: string) {
    return this.orderService.getOrdersByUser(userId);
  }
}
`;