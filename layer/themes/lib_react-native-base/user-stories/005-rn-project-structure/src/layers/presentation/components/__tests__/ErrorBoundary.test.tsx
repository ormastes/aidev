/**
 * Tests for ErrorBoundary component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  // Suppress console errors during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Child component</Text>
      </ErrorBoundary>
    );

    expect(getByText('Child component')).toBeTruthy();
  });

  it('should render error UI when child throws error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('should render custom fallback when provided', () => {
    const fallback = <Text>Custom error UI</Text>;
    const { getByText } = render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error UI')).toBeTruthy();
  });

  it('should reset error state when Try Again is pressed', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    // Press Try Again
    fireEvent.press(getByText('Try Again'));

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should show normal content
    expect(getByText('No error')).toBeTruthy();
  });

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should show debug information in development mode', () => {
    // Set __DEV__ to true
    const originalDev = global.__DEV__;
    global.__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Debug Information:')).toBeTruthy();

    // Restore __DEV__
    global.__DEV__ = originalDev;
  });

  it('should not show debug information in production mode', () => {
    // Set __DEV__ to false
    const originalDev = global.__DEV__;
    global.__DEV__ = false;

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(queryByText('Debug Information:')).toBeNull();

    // Restore __DEV__
    global.__DEV__ = originalDev;
  });

  it('should handle errors without message', () => {
    const ErrorWithoutMessage: React.FC = () => {
      throw new Error();
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ErrorWithoutMessage />
      </ErrorBoundary>
    );

    expect(getByText('An unexpected error occurred')).toBeTruthy();
  });

  it('should update state through componentDidCatch', () => {
    const errorBoundaryRef = React.createRef<ErrorBoundary>();

    render(
      <ErrorBoundary ref={errorBoundaryRef}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(errorBoundaryRef.current?.state.hasError).toBe(true);
    expect(errorBoundaryRef.current?.state.error).toBeTruthy();
    expect(errorBoundaryRef.current?.state.errorInfo).toBeTruthy();
  });
});