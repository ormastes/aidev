/**
 * Theme Context and Provider
 * Manages theme state and provides theme values to components
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  border: string;
}

export interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
    light: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface Theme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  primary: '#007AFF',
  secondary: '#5AC8FA',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#5AC8FA',
  border: '#E0E0E0',
};

const darkColors: ThemeColors = {
  primary: '#0A84FF',
  secondary: '#64D2FF',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#999999',
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FF9F0A',
  info: '#64D2FF',
  border: '#38383A',
};

const defaultTypography: ThemeTypography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

const defaultSpacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const defaultBorderRadius: ThemeBorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorSchemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  mode?: ColorSchemeName;
  customTheme?: Partial<Theme>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  mode,
  customTheme,
}) => {
  const [colorScheme, setColorScheme] = React.useState<ColorSchemeName>(
    mode || Appearance.getColorScheme() || 'light'
  );

  React.useEffect(() => {
    if (!mode) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setColorScheme(colorScheme);
      });
      return () => subscription?.remove();
    }
  }, [mode]);

  const theme = useMemo<Theme>(() => {
    const isDark = colorScheme === 'dark';
    const colors = isDark ? darkColors : lightColors;

    return {
      colors: customTheme?.colors || colors,
      typography: customTheme?.typography || defaultTypography,
      spacing: customTheme?.spacing || defaultSpacing,
      borderRadius: customTheme?.borderRadius || defaultBorderRadius,
      isDark,
    };
  }, [colorScheme, customTheme]);

  const toggleTheme = () => {
    setColorScheme(current => (current === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setColorScheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export const useColorScheme = () => {
  const { theme, toggleTheme } = useThemeContext();
  return {
    colorScheme: theme.isDark ? 'dark' : 'light',
    toggleColorScheme: toggleTheme,
    isDark: theme.isDark,
  };
};

export const createTheme = (customTheme: Partial<Theme>): Partial<Theme> => {
  return customTheme;
};

export default ThemeProvider;