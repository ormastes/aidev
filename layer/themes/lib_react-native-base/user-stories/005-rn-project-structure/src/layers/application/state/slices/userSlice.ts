import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  selectedUserId: string | null;
  recentUsers: string[];
}

const initialState: UserState = {
  selectedUserId: null,
  recentUsers: [],
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSelectedUser: (state, action: PayloadAction<string | null>) => {
      state.selectedUserId = action.payload;
    },
    addRecentUser: (state, action: PayloadAction<string>) => {
      state.recentUsers = [
        action.payload,
        ...state.recentUsers.filter((id) => id !== action.payload),
      ].slice(0, 10); // Keep last 10
    },
    clearRecentUsers: (state) => {
      state.recentUsers = [];
    },
  },
});

export const { setSelectedUser, addRecentUser, clearRecentUsers } = userSlice.actions;
export default userSlice.reducer;