/**
 * Auth Slice - Redux Toolkit
 * Purpose: Manages authentication state (user, token, loading)
 * Integrates with finly-core backend API for authentication
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import { apiService } from '../../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  streakCount?: number;
  streakUpdatedAt?: string;
  lastActiveAt?: string;
  financialGoal?: string;
  currentXP?: number;
  level?: number;
  originalBalanceAmount?: number | null;
  originalBalanceCurrency?: string | null;
  startingBalance?: number;
  baseCurrency?: string;
  currency?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  error: string | null;
  pendingVerificationEmail: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoringAuth: true,
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

      // Preserve error code for frontend handling
      return rejectWithValue({
        message: errorMessage,
        code: errorCode
      });
    }
  }
);

/**
 * Async thunk to refresh user data from API
 * Called on app launch to ensure local data is up to date
 */
export const refreshUser = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      return { user };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to refresh user data');
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
  async (feedback: { reasonForDeletion?: string; feedback?: string } | undefined, { getState, rejectWithValue }) => {
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

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ email, otp }: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail(email, otp);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || 
        error.message || 
        'Failed to verify email'
      );
    }
  }
);


/**
 * Auth slice with reducers and actions
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: User; tokens?: { accessToken: string; refreshToken: string } }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      // Clear data but keep onboarding flags?
      // Ideally handled by service
    },
    clearError: (state) => {
      state.error = null;
    },
    resetAuthState: (state) => {
      state.isLoading = false;
      state.error = null;
      state.pendingVerificationEmail = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Check Auth Status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isRestoringAuth = true;
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.user = action.payload?.user || null; // Access user from payload
        state.isAuthenticated = !!action.payload?.user; // Check if user exists
        state.isRestoringAuth = false;
        state.isLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isRestoringAuth = false;
        state.isLoading = false;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        state.pendingVerificationEmail = null; // Clear any pending verification
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as { message: string; code?: string })?.message || (action.payload as string); // Handle potential object payload
      });

    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        // Signup success now means email verification is pending
        state.pendingVerificationEmail = action.payload.pendingVerificationEmail;
        // Do NOT set isAuthenticated = true yet
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify Email
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true; // Log them in!
        state.isLoading = false;
        state.error = null;
        state.pendingVerificationEmail = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout (async thunk)
    builder.addCase(logout.fulfilled, state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.pendingVerificationEmail = null; // Clear pending verification on logout
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

    // Refresh User
    builder
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(refreshUser.rejected, (state, action) => {
        console.warn('Failed to refresh user:', action.payload);
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

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
