/**
 * Tests for App.tsx
 * Main Application Entry Point
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock all the dependencies
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@state/store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
  },
}));

jest.mock('@navigation/AppNavigator', () => ({
  AppNavigator: () => "AppNavigator",
}));

jest.mock('@hooks/useTheme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@navigation/navigationRef', () => ({
  navigationRef: { current: null },
}));

jest.mock('@navigation/linking', () => ({
  linking: {
    prefixes: [],
    config: {},
  },
}));

jest.mock('react-native', () => ({
  StatusBar: () => "StatusBar",
}));

describe('App', () => {
  it('should render without crashing', () => {
    const { getByText } = render(<App />);
    expect(getByText("AppNavigator")).toBeTruthy();
  });

  it('should render StatusBar component', () => {
    const { getByText } = render(<App />);
    expect(getByText("StatusBar")).toBeTruthy();
  });

  it('should have correct component hierarchy', () => {
    const tree = render(<App />).toJSON();
    expect(tree).toBeTruthy();
  });
});