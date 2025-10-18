import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  walletBalance: 0,
  initialized: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserDetails: (state, action) => {
      state.user = action.payload;
      state.walletBalance = action.payload?.walletBalance || 0;
      state.initialized = true;
    },
    updateWalletBalance: (state, action) => {
      state.walletBalance = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.walletBalance = 0;
      state.initialized = true;
    },
    initializeState: (state) => {
      state.initialized = true;
    },
    updateUserRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
      }
    },
  },
});

export const { setUserDetails, updateWalletBalance, logout, initializeState, updateUserRole } =
  userSlice.actions;
export default userSlice.reducer;
