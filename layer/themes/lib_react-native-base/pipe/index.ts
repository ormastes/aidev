/**
 * React Native Base Library - Main Export
 * Gateway for all external access following HEA pattern
 */

// Components
export { Button } from '../components/Button';
export type { ButtonProps } from '../components/Button';

export { Input } from '../components/Input';
export type { InputProps } from '../components/Input';

export { Card } from '../components/Card';
export type { CardProps } from '../components/Card';

// Theme System
export {
  ThemeProvider,
  useTheme,
  useThemeContext,
  useColorScheme,
  createTheme,
} from '../styles/ThemeContext';

export type {
  Theme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBorderRadius,
  ThemeProviderProps,
} from '../styles/ThemeContext';

// Hooks
export { useForm } from '../hooks/useForm';
export type { FormConfig, FormState, FormHelpers } from '../hooks/useForm';

// Version
export const VERSION = '1.0.0';

// Default export for convenience
const ReactNativeBase = {
  Button,
  Input,
  Card,
  ThemeProvider,
  useTheme,
  useForm,
  VERSION,
};

export default ReactNativeBase;
