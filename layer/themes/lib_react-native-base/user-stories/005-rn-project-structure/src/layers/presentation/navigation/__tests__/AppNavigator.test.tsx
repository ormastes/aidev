/**
 * Tests for AppNavigator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from '../AppNavigator';

// Mock the navigators
jest.mock('../AuthNavigator', () => ({
  AuthNavigator: () => "AuthNavigator",
}));

jest.mock('../MainNavigator', () => ({
  MainNavigator: () => "MainNavigator",
}));

// Mock the useAuth hook
const mockUseAuth = jest.fn();
jest.mock('@hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe("AppNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render AuthNavigator when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    const { getByText } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    expect(getByText("AuthNavigator")).toBeTruthy();
  });

  it('should render MainNavigator when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    const { getByText } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    expect(getByText("MainNavigator")).toBeTruthy();
  });

  it('should show loading indicator when loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});