/**
 * Theme Configuration
 * Central configuration for all available themes in the system
 */

export interface ThemeColors {
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

export interface WebTheme {
  id: string;
  name: string;
  description: string;
  category: 'modern' | "professional" | "creative" | "accessible";
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReactNativeTheme {
  id: string;
  name: string;
  type: 'react-native';
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
  createdAt: string;
  updatedAt: string;
}

// Theme definitions
export const themes: WebTheme[] = [
  {
    id: 'modern',
    name: 'Modern Dashboard',
    description: 'Clean and contemporary design with vibrant accents',
    category: 'modern',
    colors: {
      light: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
      dark: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155',
        error: '#f87171',
        success: '#34d399',
        warning: '#fbbf24',
        info: '#60a5fa',
      }
    },
    fonts: {
      primary: 'Inter, system-ui, -apple-system, sans-serif',
      secondary: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'Menlo, Monaco, Consolas, monospace'
    },
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: "professional",
    name: 'Corporate Portal',
    description: 'Professional and trustworthy design for business applications',
    category: "professional",
    colors: {
      light: {
        primary: '#059669',
        secondary: '#0d9488',
        background: '#ffffff',
        surface: '#f0fdf4',
        text: '#064e3b',
        textSecondary: '#047857',
        border: '#d1fae5',
        error: '#dc2626',
        success: '#059669',
        warning: '#d97706',
        info: '#0891b2',
      },
      dark: {
        primary: '#10b981',
        secondary: '#14b8a6',
        background: '#022c22',
        surface: '#064e3b',
        text: '#d1fae5',
        textSecondary: '#6ee7b7',
        border: '#047857',
        error: '#f87171',
        success: '#34d399',
        warning: '#fbbf24',
        info: '#22d3ee',
      }
    },
    fonts: {
      primary: 'Roboto, system-ui, -apple-system, sans-serif',
      secondary: 'Roboto, system-ui, -apple-system, sans-serif',
      mono: 'Source Code Pro, Consolas, monospace'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: "creative",
    name: 'Artistic Showcase',
    description: 'Bold and expressive design for creative projects',
    category: "creative",
    colors: {
      light: {
        primary: '#dc2626',
        secondary: '#ea580c',
        background: '#ffffff',
        surface: '#fef2f2',
        text: '#7f1d1d',
        textSecondary: '#991b1b',
        border: '#fecaca',
        error: '#b91c1c',
        success: '#15803d',
        warning: '#ea580c',
        info: '#2563eb',
      },
      dark: {
        primary: '#ef4444',
        secondary: '#f97316',
        background: '#450a0a',
        surface: '#7f1d1d',
        text: '#fee2e2',
        textSecondary: '#fca5a5',
        border: '#991b1b',
        error: '#f87171',
        success: '#4ade80',
        warning: '#fb923c',
        info: '#60a5fa',
      }
    },
    fonts: {
      primary: 'Poppins, system-ui, -apple-system, sans-serif',
      secondary: 'Playfair Display, serif',
      mono: 'Fira Code, Monaco, monospace'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: "accessible",
    name: 'Universal Access',
    description: 'High contrast design optimized for accessibility',
    category: "accessible",
    colors: {
      light: {
        primary: '#1f2937',
        secondary: '#374151',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        textSecondary: '#374151',
        border: '#d1d5db',
        error: '#991b1b',
        success: '#166534',
        warning: '#92400e',
        info: '#1e40af',
      },
      dark: {
        primary: '#f9fafb',
        secondary: '#e5e7eb',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#4b5563',
        error: '#fca5a5',
        success: '#86efac',
        warning: '#fde047',
        info: '#93c5fd',
      }
    },
    fonts: {
      primary: 'Arial, system-ui, -apple-system, sans-serif',
      secondary: 'Georgia, serif',
      mono: 'Courier New, monospace'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Helper function to get theme by ID
export function getThemeById(id: string): WebTheme | undefined {
  return themes.find(theme => theme.id === id);
}

// Helper function to get default theme
export function getDefaultTheme(): WebTheme {
  return themes.find(theme => theme.isDefault) || themes[0];
}

// Helper function to get themes by category
export function getThemesByCategory(category: string): WebTheme[] {
  if (category === 'all') return themes;
  return themes.filter(theme => theme.category === category);
}

// Convert web theme to React Native theme format
export function convertToReactNativeTheme(webTheme: WebTheme): ReactNativeTheme {
  return {
    id: webTheme.id,
    name: webTheme.name,
    type: 'react-native',
    colors: webTheme.colors,
    fonts: {
      regular: webTheme.fonts.primary || 'System',
      medium: webTheme.fonts.primary ? `${webTheme.fonts.primary}-Medium` : 'System-Medium',
      bold: webTheme.fonts.primary ? `${webTheme.fonts.primary}-Bold` : 'System-Bold',
      mono: webTheme.fonts.mono || 'Menlo',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    shadows: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
      },
      lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 10,
      },
    },
    createdAt: webTheme.createdAt,
    updatedAt: webTheme.updatedAt,
  };
}

// Export theme as CSS variables
export function exportThemeAsCSS(theme: WebTheme, colorMode: 'light' | 'dark' = 'light'): string {
  const colors = theme.colors[colorMode];
  return `
/* ${theme.name} - ${colorMode} mode */
:root {
  /* Primary Colors */
  --primary-color: ${colors.primary};
  --secondary-color: ${colors.secondary};
  
  /* Background Colors */
  --background-color: ${colors.background};
  --surface-color: ${colors.surface};
  
  /* Text Colors */
  --text-primary: ${colors.text};
  --text-secondary: ${colors.textSecondary};
  
  /* UI Colors */
  --border-color: ${colors.border};
  --error-color: ${colors.error};
  --success-color: ${colors.success};
  --warning-color: ${colors.warning};
  --info-color: ${colors.info};
  
  /* Typography */
  --font-primary: ${theme.fonts.primary};
  --font-secondary: ${theme.fonts.secondary};
  --font-mono: ${theme.fonts.mono};
}`;
}

// Export theme as TypeScript
export function exportThemeAsTypeScript(theme: WebTheme): string {
  return `// ${theme.name} Theme Configuration
export const ${theme.id}Theme = ${JSON.stringify(theme, null, 2)} as const;

export type ${theme.id.charAt(0).toUpperCase() + theme.id.slice(1)}Theme = typeof ${theme.id}Theme;
`;
}