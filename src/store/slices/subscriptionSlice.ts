/**
 * Subscription Slice - Redux Toolkit
 * Purpose: Manages subscription state, tier, and usage limits
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subscription, SubscriptionTier, UsageLimits } from '../../types';

const SUBSCRIPTION_KEY = '@finly_subscription';
const USAGE_LIMITS_KEY = '@finly_usage_limits';

interface SubscriptionState {
  subscription: Subscription;
  usageLimits: UsageLimits;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  subscription: {
    tier: 'free',
    isActive: true,
    isTrial: false,
  },
  usageLimits: {
    receiptScans: {
      used: 0,
      limit: 3, // Free tier: 3 scans/month
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    insights: {
      used: 0,
      limit: 3, // Free tier: 3 insights/week
      resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    categories: {
      used: 5, // Default categories count
      limit: 5, // Free tier: 5 categories max
    },
  },
  isLoading: true,
  error: null,
};

/**
 * Async thunk to check subscription status on app launch
 */
export const checkSubscriptionStatus = createAsyncThunk(
  'subscription/checkStatus',
  async () => {
    const [subscriptionData, usageData] = await Promise.all([
      AsyncStorage.getItem(SUBSCRIPTION_KEY),
      AsyncStorage.getItem(USAGE_LIMITS_KEY),
    ]);

    const subscription: Subscription = subscriptionData
      ? JSON.parse(subscriptionData)
      : initialState.subscription;

    const usageLimits: UsageLimits = usageData
      ? JSON.parse(usageData)
      : initialState.usageLimits;

    // Check if subscription is expired
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return {
        subscription: { ...subscription, tier: 'free' as SubscriptionTier, isActive: false },
        usageLimits,
      };
    }

    return { subscription, usageLimits };
  }
);

/**
 * Async thunk to subscribe to premium tier
 */
export const subscribeToPremium = createAsyncThunk(
  'subscription/subscribe',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock subscription data
      const now = new Date();
      const subscription: Subscription = {
        tier: 'premium',
        isActive: true,
        startDate: now.toISOString(),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        isTrial: false,
      };

      // Update usage limits for premium
      const usageLimits: UsageLimits = {
        receiptScans: {
          used: 0,
          limit: Infinity, // Unlimited for premium
          resetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        insights: {
          used: 0,
          limit: Infinity, // Unlimited for premium
          resetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        categories: {
          used: 5,
          limit: Infinity, // Unlimited for premium
        },
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription, usageLimits };
    } catch (error) {
      return rejectWithValue('Subscription failed');
    }
  }
);

/**
 * Async thunk to start free trial
 */
export const startFreeTrial = createAsyncThunk(
  'subscription/startTrial',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const now = new Date();
      const subscription: Subscription = {
        tier: 'premium',
        isActive: true,
        startDate: now.toISOString(),
        trialEndDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7-day trial
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: true,
      };

      const usageLimits: UsageLimits = {
        receiptScans: {
          used: 0,
          limit: Infinity,
          resetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        insights: {
          used: 0,
          limit: Infinity,
          resetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        categories: {
          used: 5,
          limit: Infinity,
        },
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription, usageLimits };
    } catch (error) {
      return rejectWithValue('Trial start failed');
    }
  }
);

/**
 * Async thunk to cancel subscription
 */
export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async () => {
    const subscription: Subscription = {
      tier: 'free',
      isActive: true,
      isTrial: false,
    };

    const usageLimits: UsageLimits = {
      receiptScans: {
        used: 0,
        limit: 3,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      insights: {
        used: 0,
        limit: 3,
        resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      categories: {
        used: 5,
        limit: 5,
      },
    };

    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

    return { subscription, usageLimits };
  }
);

/**
 * Subscription slice with reducers and actions
 */
const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    incrementReceiptScans: (state) => {
      if (state.subscription.tier === 'free') {
        state.usageLimits.receiptScans.used += 1;
        AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(state.usageLimits));
      }
    },
    incrementInsights: (state) => {
      if (state.subscription.tier === 'free') {
        state.usageLimits.insights.used += 1;
        AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(state.usageLimits));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Check subscription status
    builder
      .addCase(checkSubscriptionStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkSubscriptionStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload.subscription;
        state.usageLimits = action.payload.usageLimits;
      })
      .addCase(checkSubscriptionStatus.rejected, (state) => {
        state.isLoading = false;
      });

    // Subscribe to premium
    builder
      .addCase(subscribeToPremium.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(subscribeToPremium.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload.subscription;
        state.usageLimits = action.payload.usageLimits;
      })
      .addCase(subscribeToPremium.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Start free trial
    builder
      .addCase(startFreeTrial.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startFreeTrial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload.subscription;
        state.usageLimits = action.payload.usageLimits;
      })
      .addCase(startFreeTrial.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel subscription
    builder.addCase(cancelSubscription.fulfilled, (state, action) => {
      state.subscription = action.payload.subscription;
      state.usageLimits = action.payload.usageLimits;
    });
  },
});

export const { incrementReceiptScans, incrementInsights, clearError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

