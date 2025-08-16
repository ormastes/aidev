import { Middleware } from '@reduxjs/toolkit';
import { MMKV } from 'react-native-mmkv';
import type { RootState } from '../store';

const storage = new MMKV();

const PERSIST_KEYS = ['theme', 'user.recentUsers'];

export const persistMiddleware: Middleware<{}, RootState> = 
  (store) => (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    // Persist specific parts of state
    if (action.type.startsWith('theme/')) {
      storage.set('persist:theme', JSON.stringify(state.theme));
    }

    if (action.type.startsWith('user/')) {
      storage.set('persist:user.recentUsers', JSON.stringify(state.user.recentUsers));
    }

    return result;
  };

// Helper to rehydrate state on app start
export const rehydrateState = (): Partial<RootState> => {
  const persistedState: Partial<RootState> = {};

  try {
    const themeData = storage.getString('persist:theme');
    if (themeData) {
      persistedState.theme = JSON.parse(themeData);
    }

    const recentUsersData = storage.getString('persist:user.recentUsers');
    if (recentUsersData) {
      persistedState.user = {
        selectedUserId: null,
        recentUsers: JSON.parse(recentUsersData),
      };
    }
  } catch (error) {
    console.error('Failed to rehydrate state:', error);
  }

  return persistedState;
};