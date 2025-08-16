import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  customTheme?: any;
}

const initialState: ThemeState = {
  mode: 'system',
  customTheme: null,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.mode = action.payload;
    },
    setCustomTheme: (state, action: PayloadAction<any>) => {
      state.customTheme = action.payload;
    },
    clearCustomTheme: (state) => {
      state.customTheme = null;
    },
  },
});

export const { setTheme, setCustomTheme, clearCustomTheme } = themeSlice.actions;
export default themeSlice.reducer;