import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem } from './cartSlice';

export interface DeliveryAddress {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  instructions?: string;
}

export interface OrderItem extends CartItem {
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  deliveryAddress: DeliveryAddress;
  estimatedDelivery: string;
  actualDelivery?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: Order['status'];
  timestamp: string;
  message?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  orderHistory: Order[];
  deliveryAddresses: DeliveryAddress[];
  statusUpdates: { [orderId: string]: OrderStatusUpdate[] };
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  orderHistory: [],
  deliveryAddresses: [],
  statusUpdates: {},
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    createOrderStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    createOrderSuccess: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
      state.currentOrder = action.payload;
      state.loading = false;
      state.error = null;
    },
    createOrderFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchOrdersStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchOrdersSuccess: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
      state.orderHistory = action.payload.filter(order => 
        ['delivered', 'cancelled'].includes(order.status)
      );
      state.loading = false;
      state.error = null;
    },
    fetchOrdersFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateOrderStatus: (state, action: PayloadAction<{ orderId: string; status: Order['status'] }>) => {
      const order = state.orders.find(o => o.id === action.payload.orderId);
      if (order) {
        order.status = action.payload.status;
        order.updatedAt = new Date().toISOString();
        
        if (action.payload.status === 'delivered') {
          order.actualDelivery = new Date().toISOString();
          // Move to history if not already there
          if (!state.orderHistory.find(o => o.id === order.id)) {
            state.orderHistory.unshift(order);
          }
        }
      }
    },
    addStatusUpdate: (state, action: PayloadAction<OrderStatusUpdate>) => {
      const { orderId } = action.payload;
      if (!state.statusUpdates[orderId]) {
        state.statusUpdates[orderId] = [];
      }
      state.statusUpdates[orderId].unshift(action.payload);
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    cancelOrder: (state, action: PayloadAction<string>) => {
      const order = state.orders.find(o => o.id === action.payload);
      if (order && ['pending', 'confirmed'].includes(order.status)) {
        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
      }
    },
    addDeliveryAddress: (state, action: PayloadAction<DeliveryAddress>) => {
      // If this is set as default, remove default from others
      if (action.payload.isDefault) {
        state.deliveryAddresses.forEach(addr => {
          addr.isDefault = false;
        });
      }
      state.deliveryAddresses.push(action.payload);
    },
    updateDeliveryAddress: (state, action: PayloadAction<DeliveryAddress>) => {
      const index = state.deliveryAddresses.findIndex(addr => addr.id === action.payload.id);
      if (index !== -1) {
        // If this is set as default, remove default from others
        if (action.payload.isDefault) {
          state.deliveryAddresses.forEach(addr => {
            addr.isDefault = false;
          });
        }
        state.deliveryAddresses[index] = action.payload;
      }
    },
    removeDeliveryAddress: (state, action: PayloadAction<string>) => {
      state.deliveryAddresses = state.deliveryAddresses.filter(addr => addr.id !== action.payload);
    },
    setDefaultAddress: (state, action: PayloadAction<string>) => {
      state.deliveryAddresses.forEach(addr => {
        addr.isDefault = addr.id === action.payload;
      });
    },
  },
});

export const {
  createOrderStart,
  createOrderSuccess,
  createOrderFailure,
  fetchOrdersStart,
  fetchOrdersSuccess,
  fetchOrdersFailure,
  updateOrderStatus,
  addStatusUpdate,
  setCurrentOrder,
  cancelOrder,
  addDeliveryAddress,
  updateDeliveryAddress,
  removeDeliveryAddress,
  setDefaultAddress,
} = ordersSlice.actions;

export default ordersSlice.reducer;