/**
 * AI Development Platform Mobile App
 * Main Application Entry Point
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store } from '@state/store';
import { AppNavigator } from '@navigation/AppNavigator';
import { ThemeProvider } from '@hooks/useTheme';
import { AuthProvider } from '@hooks/useAuth';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { navigationRef } from '@navigation/navigationRef';
import { linking } from '@navigation/linking';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <SafeAreaProvider>
            <ThemeProvider>
              <AuthProvider>
                <NavigationContainer ref={navigationRef} linking={linking}>
                  <StatusBar
                    barStyle="dark-content"
                    backgroundColor="transparent"
                    translucent
                  />
                  <AppNavigator />
                </NavigationContainer>
              </AuthProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;