/**
 * Redux Store Configuration
 * Purpose: Configures the Redux store with all slices
 * Combines auth, expenses, categories, and insights reducers
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import reducers
import authReducer from './slices/authSlice';
import expensesReducer from './slices/expensesSlice';
import categoriesReducer from './slices/categoriesSlice';
import insightsReducer from './slices/insightsSlice';

/**
 * Configure Redux store with all reducers
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expensesReducer,
    categories: categoriesReducer,
    insights: insightsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['auth/login/fulfilled', 'auth/signup/fulfilled'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks for use throughout the app
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

