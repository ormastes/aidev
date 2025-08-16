import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@state/store';
import { setTheme, setCustomTheme } from '@state/slices/themeSlice';

interface Colors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  In Progress: string;
  warning: string;
  info: string;
}

interface Theme {
  dark: boolean;
  colors: Colors;
}

const lightColors: Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  error: '#FF3B30',
  In Progress: '#34C759',
  warning: '#FF9500',
  info: '#5AC8FA',
};

const darkColors: Colors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  error: '#FF453A',
  In Progress: '#32D74B',
  warning: '#FF9F0A',
  info: '#64D2FF',
};

interface ThemeContextType extends Theme {
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  applyCustomTheme: (theme: any) => void;
  syncThemeFromSelector: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const themeState = useSelector((state: RootState) => state.theme);
  const systemColorScheme = useColorScheme();

  const isDark = themeState.mode === 'system' ? systemColorScheme === 'dark' : themeState.mode === 'dark';

  // Use custom theme colors if available, otherwise fall back to default
  const currentColors = themeState.customTheme 
    ? (isDark ? themeState.customTheme.colors.dark : themeState.customTheme.colors.light)
    : (isDark ? darkColors : lightColors);

  useEffect(() => {
    // Apply theme changes to native components if needed
  }, [isDark, themeState.customTheme]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(mode));
  };

  const applyCustomTheme = (theme: any) => {
    dispatch(setCustomTheme(theme));
  };

  const syncThemeFromSelector = async (): Promise<void> => {
    try {
      // Fetch theme from GUI selector API
      const response = await fetch('http://localhost:3456/api/themes?platform=react-native');
      const data = await response.json();
      
      if (data.success && data.themes.length > 0) {
        // Apply the first theme for demo purposes
        // In production, you'd let user select or use stored preference
        applyCustomTheme(data.themes[0]);
      }
    } catch (error) {
      console.warn('Failed to sync theme from GUI selector:', error);
    }
  };

  const theme: ThemeContextType = {
    dark: isDark,
    colors: currentColors,
    setThemeMode,
    applyCustomTheme,
    syncThemeFromSelector,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};