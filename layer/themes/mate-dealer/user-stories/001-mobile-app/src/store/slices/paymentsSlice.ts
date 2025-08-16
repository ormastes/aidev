import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay';
  displayName: string;
  lastFourDigits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cardholderName?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isDefault: boolean;
  isExpired: boolean;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  currency: 'USD' | 'ARS' | 'EUR';
  paymentMethodId: string;
  status: 'pending' | "processing" | "completed" | 'failed' | "cancelled" | "refunded";
  transactionId?: string;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentIntent {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | "processing" | "succeeded" | "canceled";
}

interface PaymentsState {
  paymentMethods: PaymentMethod[];
  transactions: PaymentTransaction[];
  currentPaymentIntent: PaymentIntent | null;
  processing: boolean;
  error: string | null;
  supportedPaymentTypes: string[];
}

const initialState: PaymentsState = {
  paymentMethods: [],
  transactions: [],
  currentPaymentIntent: null,
  processing: false,
  error: null,
  supportedPaymentTypes: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'],
};

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    // Payment Methods
    fetchPaymentMethodsStart: (state) => {
      state.processing = true;
      state.error = null;
    },
    fetchPaymentMethodsSuccess: (state, action: PayloadAction<PaymentMethod[]>) => {
      state.paymentMethods = action.payload;
      state.processing = false;
      state.error = null;
    },
    fetchPaymentMethodsFailure: (state, action: PayloadAction<string>) => {
      state.processing = false;
      state.error = action.payload;
    },
    addPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      // If this is set as default, remove default from others
      if (action.payload.isDefault) {
        state.paymentMethods.forEach(method => {
          method.isDefault = false;
        });
      }
      state.paymentMethods.push(action.payload);
    },
    updatePaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      const index = state.paymentMethods.findIndex(method => method.id === action.payload.id);
      if (index !== -1) {
        // If this is set as default, remove default from others
        if (action.payload.isDefault) {
          state.paymentMethods.forEach(method => {
            method.isDefault = false;
          });
        }
        state.paymentMethods[index] = action.payload;
      }
    },
    removePaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethods = state.paymentMethods.filter(method => method.id !== action.payload);
    },
    setDefaultPaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethods.forEach(method => {
        method.isDefault = method.id === action.payload;
      });
    },
    
    // Payment Processing
    createPaymentIntentStart: (state) => {
      state.processing = true;
      state.error = null;
    },
    createPaymentIntentSuccess: (state, action: PayloadAction<PaymentIntent>) => {
      state.currentPaymentIntent = action.payload;
      state.processing = false;
      state.error = null;
    },
    createPaymentIntentFailure: (state, action: PayloadAction<string>) => {
      state.processing = false;
      state.error = action.payload;
    },
    updatePaymentIntent: (state, action: PayloadAction<Partial<PaymentIntent>>) => {
      if (state.currentPaymentIntent) {
        state.currentPaymentIntent = { ...state.currentPaymentIntent, ...action.payload };
      }
    },
    clearPaymentIntent: (state) => {
      state.currentPaymentIntent = null;
    },
    
    // Transaction Management
    processPaymentStart: (state) => {
      state.processing = true;
      state.error = null;
    },
    processPaymentSuccess: (state, action: PayloadAction<PaymentTransaction>) => {
      state.transactions.unshift(action.payload);
      state.processing = false;
      state.error = null;
      // Clear payment intent on successful payment
      if (state.currentPaymentIntent?.orderId === action.payload.orderId) {
        state.currentPaymentIntent = null;
      }
    },
    processPaymentFailure: (state, action: PayloadAction<string>) => {
      state.processing = false;
      state.error = action.payload;
    },
    updateTransactionStatus: (state, action: PayloadAction<{ id: string; status: PaymentTransaction['status']; failureReason?: string }>) => {
      const transaction = state.transactions.find(t => t.id === action.payload.id);
      if (transaction) {
        transaction.status = action.payload.status;
        if (action.payload.failureReason) {
          transaction.failureReason = action.payload.failureReason;
        }
        if (action.payload.status === "completed") {
          transaction.completedAt = new Date().toISOString();
        }
      }
    },
    
    // Refunds
    processRefundStart: (state) => {
      state.processing = true;
      state.error = null;
    },
    processRefundSuccess: (state, action: PayloadAction<{ transactionId: string; refundAmount: number; refundReason: string }>) => {
      const transaction = state.transactions.find(t => t.id === action.payload.transactionId);
      if (transaction) {
        transaction.status = "refunded";
        transaction.refundAmount = action.payload.refundAmount;
        transaction.refundReason = action.payload.refundReason;
      }
      state.processing = false;
      state.error = null;
    },
    processRefundFailure: (state, action: PayloadAction<string>) => {
      state.processing = false;
      state.error = action.payload;
    },
    
    // Error handling
    clearPaymentError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchPaymentMethodsStart,
  fetchPaymentMethodsSuccess,
  fetchPaymentMethodsFailure,
  addPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  createPaymentIntentStart,
  createPaymentIntentSuccess,
  createPaymentIntentFailure,
  updatePaymentIntent,
  clearPaymentIntent,
  processPaymentStart,
  processPaymentSuccess,
  processPaymentFailure,
  updateTransactionStatus,
  processRefundStart,
  processRefundSuccess,
  processRefundFailure,
  clearPaymentError,
} = paymentsSlice.actions;

export default paymentsSlice.reducer;