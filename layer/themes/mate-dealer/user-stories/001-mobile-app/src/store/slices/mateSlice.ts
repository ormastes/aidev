import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MateDeal {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  status: 'active' | 'pending' | "completed" | "cancelled";
  createdBy: {
    id: string;
    username: string;
    avatar: string | null;
  };
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  images: string[];
}

interface MateState {
  deals: MateDeal[];
  currentDeal: MateDeal | null;
  filters: {
    category: string | null;
    priceRange: [number, number] | null;
    status: string | null;
  };
  loading: boolean;
  error: string | null;
}

const initialState: MateState = {
  deals: [],
  currentDeal: null,
  filters: {
    category: null,
    priceRange: null,
    status: null,
  },
  loading: false,
  error: null,
};

const mateSlice = createSlice({
  name: 'mate',
  initialState,
  reducers: {
    fetchDealsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDealsSuccess: (state, action: PayloadAction<MateDeal[]>) => {
      state.deals = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchDealsFailure: (state, action: PayloadAction<string>) => {
      state.deals = [];
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentDeal: (state, action: PayloadAction<MateDeal>) => {
      state.currentDeal = action.payload;
    },
    clearCurrentDeal: (state) => {
      state.currentDeal = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<MateState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addDeal: (state, action: PayloadAction<MateDeal>) => {
      state.deals.unshift(action.payload);
    },
    updateDeal: (state, action: PayloadAction<{ id: string; updates: Partial<MateDeal> }>) => {
      const index = state.deals.findIndex(deal => deal.id === action.payload.id);
      if (index !== -1) {
        state.deals[index] = { ...state.deals[index], ...action.payload.updates };
      }
    },
    removeDeal: (state, action: PayloadAction<string>) => {
      state.deals = state.deals.filter(deal => deal.id !== action.payload);
    },
  },
});

export const {
  fetchDealsStart,
  fetchDealsSuccess,
  fetchDealsFailure,
  setCurrentDeal,
  clearCurrentDeal,
  updateFilters,
  addDeal,
  updateDeal,
  removeDeal,
} = mateSlice.actions;

export default mateSlice.reducer;