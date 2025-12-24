/**
 * Insights Slice - Redux Toolkit
 * Purpose: Manages AI-generated financial insights
 * Handles fetching and managing personalized financial recommendations
 * Tracks unread count for notification badge
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Insight, MonthlyStats } from '../../types';

interface InsightsState {
  insights: Insight[];
  monthlyStats: MonthlyStats | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: InsightsState = {
  insights: [],
  monthlyStats: null,
  unreadCount: 0,
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
 * Async thunk to fetch unread insights count
 */
export const fetchUnreadCount = createAsyncThunk(
  'insights/fetchUnreadCount',
  async () => {
    const count = await apiService.getUnreadInsightsCount();
    return count;
  }
);

/**
 * Async thunk to mark all insights as read
 */
export const markAllInsightsRead = createAsyncThunk(
  'insights/markAllRead',
  async () => {
    await apiService.markAllInsightsRead();
    return true;
  }
);

/**
 * Async thunk to mark a single insight as read
 */
export const markInsightRead = createAsyncThunk(
  'insights/markRead',
  async (insightId: string) => {
    await apiService.markInsightRead(insightId);
    return insightId;
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
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    decrementUnreadCount: (state) => {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    clearUnreadCount: (state) => {
      state.unreadCount = 0;
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

    // Fetch unread count
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });

    // Mark all as read
    builder
      .addCase(markAllInsightsRead.fulfilled, (state) => {
        state.unreadCount = 0;
        // Mark all local insights as read
        state.insights = state.insights.map(insight => ({
          ...insight,
          isRead: true
        }));
      });

    // Mark single insight as read
    builder
      .addCase(markInsightRead.fulfilled, (state, action) => {
        const insightId = action.payload;
        const insight = state.insights.find(i => i.id === insightId);
        if (insight && !insight.isRead) {
          insight.isRead = true;
          if (state.unreadCount > 0) {
            state.unreadCount -= 1;
          }
        }
      });
  },
});

export const { clearError, setUnreadCount, decrementUnreadCount, clearUnreadCount } = insightsSlice.actions;
export default insightsSlice.reducer;
