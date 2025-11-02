/**
 * Subscription Slice - Redux Toolkit
 * Purpose: Manages subscription state, tier, and usage limits
 * 
 * Integrated with native IAP service for real purchases
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subscription, SubscriptionTier, UsageLimits } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';

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
 * Fetches from backend and updates local cache
 */
export const checkSubscriptionStatus = createAsyncThunk(
  'subscription/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      // First, try to get from backend
      const subscription = await subscriptionService.getSubscriptionStatus();
      
      // Generate usage limits based on tier
      const usageLimits: UsageLimits = subscription.tier === 'premium' 
        ? {
            receiptScans: {
              used: 0,
              limit: Infinity,
              resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            insights: {
              used: 0,
              limit: Infinity,
              resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
            categories: {
              used: 5,
              limit: Infinity,
            },
          }
        : {
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

      // Cache locally
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription, usageLimits };
    } catch (error: any) {
      console.error('[SubscriptionSlice] Failed to check status:', error);
      
      // Fallback to local cache
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

      return { subscription, usageLimits };
    }
  }
);

/**
 * Async thunk to subscribe to premium tier
 * Uses native IAP and backend validation
 */
export const subscribeToPremium = createAsyncThunk(
  'subscription/subscribe',
  async (productType: 'monthly' | 'yearly' = 'monthly', { rejectWithValue }) => {
    try {
      // Purchase via IAP service
      const result = await subscriptionService.purchasePremium(productType);
      
      if (!result.success) {
        return rejectWithValue('Purchase failed');
      }

      const subscription = result.subscription;

      // Update usage limits for premium
      const usageLimits: UsageLimits = {
        receiptScans: {
          used: 0,
          limit: Infinity, // Unlimited for premium
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        insights: {
          used: 0,
          limit: Infinity, // Unlimited for premium
          resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        categories: {
          used: 5,
          limit: Infinity, // Unlimited for premium
        },
      };

      // Cache locally
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription, usageLimits };
    } catch (error: any) {
      console.error('[SubscriptionSlice] Purchase failed:', error);
      return rejectWithValue(error.message || 'Subscription failed');
    }
  }
);

/**
 * Async thunk to start free trial
 * Activates trial via backend (no IAP required)
 */
export const startFreeTrial = createAsyncThunk(
  'subscription/startTrial',
  async (_, { rejectWithValue }) => {
    try {
      // Start trial via service
      const result = await subscriptionService.startFreeTrial();
      
      if (!result.success) {
        return rejectWithValue('Trial start failed');
      }

      const subscription = result.subscription;

      // Update usage limits for trial (same as premium)
      const usageLimits: UsageLimits = {
        receiptScans: {
          used: 0,
          limit: Infinity,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        insights: {
          used: 0,
          limit: Infinity,
          resetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        categories: {
          used: 5,
          limit: Infinity,
        },
      };

      // Cache locally
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription, usageLimits };
    } catch (error: any) {
      console.error('[SubscriptionSlice] Trial failed:', error);
      return rejectWithValue(error.message || 'Trial start failed');
    }
  }
);

/**
 * Async thunk to cancel subscription
 * Note: Actual cancellation happens via App Store/Play Store
 * This marks the cancellation in our backend
 */
export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async (_, { rejectWithValue }) => {
    try {
      // Cancel via service
      await subscriptionService.cancelSubscription();

      // Revert to free tier
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

      // Cache locally
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription, usageLimits };
    } catch (error: any) {
      console.error('[SubscriptionSlice] Cancel failed:', error);
      return rejectWithValue(error.message || 'Cancellation failed');
    }
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

