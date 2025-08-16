import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { MMKV } from 'react-native-mmkv';
import Config from 'react-native-config';
import type { RootState } from '../store';

const storage = new MMKV();

const baseQuery = fetchBaseQuery({
  baseUrl: Config.API_URL || 'https://api.aidev.app',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token || storage.getString('auth.token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Project', 'Task'],
  endpoints: () => ({}),
});