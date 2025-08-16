import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MateProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: 'yerba_mate' | 'bombillas' | 'gourds' | 'accessories' | 'sets';
  brand: string;
  origin: string;
  weight?: string;
  strength?: 'mild' | 'medium' | 'strong';
  flavor?: string[];
  inStock: boolean;
  stockCount: number;
  rating: number;
  reviewCount: number;
  isFavorite: boolean;
  isOnSale: boolean;
  tags: string[];
  nutritionalInfo?: {
    caffeine: string;
    antioxidants: string;
    vitamins: string[];
  };
}

export interface ProductFilters {
  category: string | null;
  priceRange: [number, number] | null;
  brand: string | null;
  strength: string | null;
  inStock: boolean;
  onSale: boolean;
  searchQuery: string;
}

interface ProductsState {
  products: MateProduct[];
  featuredProducts: MateProduct[];
  categories: string[];
  brands: string[];
  filters: ProductFilters;
  sortBy: 'name' | 'price' | 'rating' | 'popularity';
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error: string | null;
  currentProduct: MateProduct | null;
}

const initialState: ProductsState = {
  products: [],
  featuredProducts: [],
  categories: ['yerba_mate', 'bombillas', 'gourds', 'accessories', 'sets'],
  brands: [],
  filters: {
    category: null,
    priceRange: null,
    brand: null,
    strength: null,
    inStock: true,
    onSale: false,
    searchQuery: '',
  },
  sortBy: 'popularity',
  sortOrder: 'desc',
  loading: false,
  error: null,
  currentProduct: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    fetchProductsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProductsSuccess: (state, action: PayloadAction<MateProduct[]>) => {
      state.products = action.payload;
      state.brands = [...new Set(action.payload.map(p => p.brand))];
      state.loading = false;
      state.error = null;
    },
    fetchProductsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchFeaturedProductsSuccess: (state, action: PayloadAction<MateProduct[]>) => {
      state.featuredProducts = action.payload;
    },
    setCurrentProduct: (state, action: PayloadAction<MateProduct | null>) => {
      state.currentProduct = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<ProductFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSorting: (state, action: PayloadAction<{ sortBy: ProductsState['sortBy']; sortOrder: ProductsState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const product = state.products.find(p => p.id === action.payload);
      if (product) {
        product.isFavorite = !product.isFavorite;
      }
      const featuredProduct = state.featuredProducts.find(p => p.id === action.payload);
      if (featuredProduct) {
        featuredProduct.isFavorite = !featuredProduct.isFavorite;
      }
    },
    updateProductRating: (state, action: PayloadAction<{ productId: string; rating: number }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product) {
        // Simple rating update - in real app, this would be calculated from all reviews
        product.rating = action.payload.rating;
        product.reviewCount += 1;
      }
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

export const {
  fetchProductsStart,
  fetchProductsSuccess,
  fetchProductsFailure,
  fetchFeaturedProductsSuccess,
  setCurrentProduct,
  updateFilters,
  setSorting,
  toggleFavorite,
  updateProductRating,
  clearFilters,
} = productsSlice.actions;

export default productsSlice.reducer;