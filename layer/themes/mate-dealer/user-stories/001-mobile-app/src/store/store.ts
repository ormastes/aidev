import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import mateReducer from './slices/mateSlice';
import cartReducer from './slices/cartSlice';
import productsReducer from './slices/productsSlice';
import ordersReducer from './slices/ordersSlice';
import paymentsReducer from './slices/paymentsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    mate: mateReducer,
    cart: cartReducer,
    products: productsReducer,
    orders: ordersReducer,
    payments: paymentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;