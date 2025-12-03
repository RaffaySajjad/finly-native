/**
 * Insights Slice - Redux Toolkit
 * Purpose: Manages AI-generated financial insights
 * Handles fetching and managing personalized financial recommendations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Insight, MonthlyStats } from '../../types';

interface InsightsState {
  insights: Insight[];
  monthlyStats: MonthlyStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: InsightsState = {
  insights: [],
  monthlyStats: null,
  isLoading: false,
  error: null,
};

/**
 * Async thunk to fetch AI insights
 */
export const fetchInsights = createAsyncThunk(
  'insights/fetchAll',
  async () => {
    const response = await apiService.getInsights({ limit: 20 });
    // Extract insights array from paginated response
    return Array.isArray(response) ? response : response.insights;
  }
);

/**
 * Async thunk to fetch monthly statistics
 */
export const fetchMonthlyStats = createAsyncThunk(
  'insights/fetchStats',
  async () => {
    const stats = await apiService.getMonthlyStats();
    return stats;
  }
);

/**
 * Async thunk to fetch spending trends
 */
export const fetchSpendingTrends = createAsyncThunk(
  'insights/fetchTrends',
  async () => {
    const trends = await apiService.getSpendingTrends();
    return trends;
  }
);

/**
 * Insights slice with reducers and actions
 */
const insightsSlice = createSlice({
  name: 'insights',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch insights
    builder
      .addCase(fetchInsights.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.isLoading = false;
        state.insights = action.payload;
      })
      .addCase(fetchInsights.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch insights';
      });

    // Fetch monthly stats
    builder
      .addCase(fetchMonthlyStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.monthlyStats = action.payload;
      })
      .addCase(fetchMonthlyStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch stats';
      });

    // Fetch spending trends (doesn't modify state directly, handled in components)
    builder
      .addCase(fetchSpendingTrends.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSpendingTrends.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchSpendingTrends.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch trends';
      });
  },
});

export const { clearError } = insightsSlice.actions;
export default insightsSlice.reducer;

