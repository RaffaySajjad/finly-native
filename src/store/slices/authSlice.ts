/**
 * Auth Slice - Redux Toolkit
 * Purpose: Manages authentication state (user, token, loading)
 * Replaces AuthContext for centralized state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@finly_user_token';
const USER_DATA_KEY = '@finly_user_data';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

/**
 * Async thunk to check authentication status on app launch
 */
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const [token, userData] = await Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
      AsyncStorage.getItem(USER_DATA_KEY),
    ]);

    if (token && userData) {
      return {
        token,
        user: JSON.parse(userData) as User,
      };
    }

    return null;
  }
);

/**
 * Async thunk to handle user login
 */
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!email || !password) {
        return rejectWithValue('Email and password are required');
      }

      // Generate mock token and user data
      const mockToken = `mock_token_${Date.now()}`;
      const mockUser: User = {
        id: Date.now().toString(),
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email,
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, mockToken);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));

      return { token: mockToken, user: mockUser };
    } catch (error) {
      return rejectWithValue('Login failed');
    }
  }
);

/**
 * Async thunk to handle user signup
 */
export const signup = createAsyncThunk(
  'auth/signup',
  async (
    { name, email, password }: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!name || !email || !password) {
        return rejectWithValue('All fields are required');
      }

      // Generate mock token and user data
      const mockToken = `mock_token_${Date.now()}`;
      const mockUser: User = {
        id: Date.now().toString(),
        name,
        email,
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, mockToken);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));

      return { token: mockToken, user: mockUser };
    } catch (error) {
      return rejectWithValue('Signup failed');
    }
  }
);

/**
 * Async thunk to handle logout
 */
export const logout = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
});

/**
 * Async thunk to update user profile
 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ name, email }: { name: string; email: string }, { getState }) => {
    const state = getState() as { auth: AuthState };
    const currentUser = state.auth.user;

    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const updatedUser: User = {
      ...currentUser,
      name,
      email,
    };

    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  }
);

/**
 * Auth slice with reducers and actions
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

