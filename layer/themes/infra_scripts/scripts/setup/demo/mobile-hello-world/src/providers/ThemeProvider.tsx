import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Colors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

interface Theme {
  id: string;
  name: string;
  colors: Colors;
}

interface ThemeContextType {
  theme: Theme;
  updateTheme: (newTheme: any) => void;
}

const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5AC8FA',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const updateTheme = (newTheme: any) => {
    // Convert GUI selector theme format to local theme format
    if (newTheme.colors && newTheme.colors.light) {
      setTheme({
        id: newTheme.id || 'custom',
        name: newTheme.name || 'Custom Theme',
        colors: {
          primary: newTheme.colors.light.primary,
          secondary: newTheme.colors.light.secondary,
          background: newTheme.colors.light.background,
          surface: newTheme.colors.light.surface,
          text: newTheme.colors.light.text,
          textSecondary: newTheme.colors.light.textSecondary,
          border: newTheme.colors.light.border,
          error: newTheme.colors.light.error,
          success: newTheme.colors.light.success,
          warning: newTheme.colors.light.warning,
          info: newTheme.colors.light.info,
        },
      });
    } else {
      // Direct color assignment
      setTheme({
        id: newTheme.id || 'custom',
        name: newTheme.name || 'Custom Theme',
        colors: newTheme.colors || defaultTheme.colors,
      });
    }

    // Update status in parent window if available
    if (typeof window !== 'undefined' && window.parent !== window) {
      try {
        const event = new CustomEvent('themeUpdate', {
          detail: { theme: newTheme }
        });
        window.parent.dispatchEvent(event);
      } catch (e) {
        console.log('Could not notify parent of theme update');
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};