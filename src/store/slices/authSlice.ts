/**
 * Auth Slice - Redux Toolkit
 * Purpose: Manages authentication state (user, token, loading)
 * Integrates with finly-core backend API for authentication
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import { apiService } from '../../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingVerificationEmail: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pendingVerificationEmail: null,
};

/**
 * Async thunk to check authentication status on app launch
 */
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async () => {
    const isAuth = await authService.isAuthenticated();
    
    if (isAuth) {
      const cachedUser = await authService.getCachedUser();
      if (cachedUser) {
        return {
          user: cachedUser,
        };
      }
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
      if (!email || !password) {
        return rejectWithValue('Email and password are required');
      }

      const response = await authService.login({ email, password });

      return { user: response.user };
    } catch (error: any) {
      // Extract error code and message
      const errorCode = error?.code;
      const errorMessage = error?.message || 'Login failed. Please try again.';
      
      console.log('[AuthSlice] Login error:', error);
      console.log('[AuthSlice] Error code:', errorCode);
      console.log('[AuthSlice] Error message:', errorMessage);
      
      // Preserve error code for frontend handling
      return rejectWithValue({
        message: errorMessage,
        code: errorCode,
      });
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
      if (!name || !email || !password) {
        return rejectWithValue('All fields are required');
      }

      // Validate name
      if (name.trim().length < 2) {
        return rejectWithValue('Name must be at least 2 characters long');
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return rejectWithValue('Please enter a valid email address');
      }

      // Validate password
      if (password.length < 8) {
        return rejectWithValue('Password must be at least 8 characters long');
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        return rejectWithValue('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      const response = await authService.signup({ name, email, password });

      return { 
        pendingVerificationEmail: email,
        message: response.message 
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Signup failed. Please try again.');
    }
  }
);

/**
 * Async thunk to handle logout
 */
export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

/**
 * Async thunk to delete account and all user data
 */
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (feedback?: { reasonForDeletion?: string; feedback?: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const user = state.auth.user;

      if (!user) {
        throw new Error('No user logged in');
      }

      // Call backend to delete account with optional feedback
      await authService.deleteAccount(feedback);

      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete account');
    }
  }
);

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

    // TODO: Update backend
    // await apiService.updateProfile({ name, email });

    // For now, fetch fresh user data
    const updatedUser = await authService.getCurrentUser();
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
      .addCase(checkAuthStatus.pending, state => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      })
      .addCase(checkAuthStatus.rejected, state => {
        state.isLoading = false;
      });

    // Login
    builder
      .addCase(login.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.pendingVerificationEmail = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Signup - now requires email verification
    builder
      .addCase(signup.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingVerificationEmail = action.payload.pendingVerificationEmail;
        // User not authenticated yet - needs email verification
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logout.fulfilled, state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // Delete Account
    builder.addCase(deleteAccount.fulfilled, state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });
    builder.addCase(deleteAccount.rejected, state => {
      // Keep user logged in if deletion fails
    });

    // Update profile
    builder
      .addCase(updateProfile.pending, state => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, state => {
        state.isLoading = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
