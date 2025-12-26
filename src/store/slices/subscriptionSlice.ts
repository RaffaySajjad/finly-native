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
    tier: 'FREE',
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
    voiceEntries: {
      used: 0,
      limit: 3, // Free tier: 3 voice entries/month
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    categories: {
      used: 0, // Will be updated when categories are loaded
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
      // Fetch subscription status and usage limits from backend in parallel
      const [subscription, usageData] = await Promise.all([
        subscriptionService.getSubscriptionStatus(),
        subscriptionService.getUsageLimits(),
      ]);
      
      // Use actual usage counts from backend for proper feature gating
      const isPremiumActive = subscription.tier === 'PREMIUM' && subscription.isActive !== false;
      
      // Map backend limits format to frontend UsageLimits format
      const usageLimits: UsageLimits = isPremiumActive 
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
            voiceEntries: {
              used: 0,
              limit: Infinity,
              resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            categories: {
              used: 0,
              limit: Infinity,
            },
          }
        : {
            receiptScans: {
              used: usageData.limits.receiptScanning?.used ?? 0,
              limit: usageData.limits.receiptScanning?.limit ?? 3,
              resetDate: usageData.limits.receiptScanning?.resetAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            insights: {
              used: usageData.limits.aiInsights?.used ?? 0,
              limit: usageData.limits.aiInsights?.limit ?? 3,
              resetDate: usageData.limits.aiInsights?.resetAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
            voiceEntries: {
              used: usageData.limits.voiceEntry?.used ?? 0,
              limit: usageData.limits.voiceEntry?.limit ?? 3,
              resetDate: usageData.limits.voiceEntry?.resetAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            categories: {
              used: usageData.limits.categories?.used ?? 0,
              limit: usageData.limits.categories?.limit ?? 5,
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
  async (productType: 'monthly' | 'yearly' = 'monthly', { rejectWithValue, dispatch }) => {
    try {
      // Purchase via IAP service
      const result = await subscriptionService.purchasePremium(productType);
      
      if (!result.success) {
        return rejectWithValue('Purchase failed');
      }

      // Use tier directly from backend (UPPERCASE)
      const subscription = {
        ...result.subscription,
        tier: (result.subscription.tier as string).toUpperCase() as SubscriptionTier,
      };

      // After successful purchase, refetch subscription status from backend to ensure we have latest
      try {
        const latestStatus = await subscriptionService.getSubscriptionStatus();
        const normalizedLatest = {
          ...latestStatus,
          tier: (latestStatus.tier as string).toUpperCase() as SubscriptionTier,
        };
        
        // Use the latest status from backend
        const finalSubscription = normalizedLatest.tier === 'PREMIUM' ? normalizedLatest : subscription;
        
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
          voiceEntries: {
            used: 0,
            limit: Infinity, // Unlimited for premium
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          categories: {
            used: 0,
            limit: Infinity, // Unlimited for premium
          },
        };

        // Cache locally
        await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(finalSubscription));
        await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

        return { subscription: finalSubscription, usageLimits };
      } catch (refetchError) {
        // If refetch fails, use the purchase result
        console.warn('[SubscriptionSlice] Failed to refetch status, using purchase result:', refetchError);
        
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
          voiceEntries: {
            used: 0,
            limit: Infinity,
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          categories: {
            used: 0,
            limit: Infinity,
          },
        };

        await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
        await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

        return { subscription, usageLimits };
      }
    } catch (error: any) {
      // Check if this was a user cancellation - don't show as error
      if (error.message === 'USER_CANCELLED' || error.isCancellation) {
        console.log('[SubscriptionSlice] Purchase cancelled by user');
        return rejectWithValue('CANCELLED'); // Special value to indicate cancellation
      }
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
        voiceEntries: {
          used: 0,
          limit: Infinity,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        categories: {
          used: 0,
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
 * Async thunk to restore subscription
 * Checks for past purchases and reactivates subscription if found
 */
export const restoreSubscription = createAsyncThunk(
  'subscription/restore',
  async (_, { rejectWithValue }) => {
    try {
      const result = await subscriptionService.restorePurchases();
      
      if (result.success && result.subscription) {
        const subscription = result.subscription;
        
        // Use premium limits if restored subscription is premium
        const usageLimits: UsageLimits = {
          receiptScans: { used: 0, limit: Infinity, resetDate: new Date().toISOString() },
          insights: { used: 0, limit: Infinity, resetDate: new Date().toISOString() },
          voiceEntries: { used: 0, limit: Infinity, resetDate: new Date().toISOString() },
          categories: { used: 0, limit: Infinity },
        };

        // Cache locally
        await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
        await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

        return { subscription, usageLimits };
      }
      
      return rejectWithValue('No subscription found to restore');
    } catch (error: any) {
      console.error('[SubscriptionSlice] Restore failed:', error);
      return rejectWithValue(error.message || 'Restore failed');
    }
  }
);

/**
 * Async thunk to cancel subscription
 * Note: Actual cancellation happens via App Store/Play Store
 * This marks the cancellation in our backend
 * User keeps premium access until subscription expiry
 */
export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async (_, { rejectWithValue }) => {
    try {
      // Cancel via service (marks as canceled in backend)
      await subscriptionService.cancelSubscription();

      // Clear local cache to force fresh fetch
      await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
      await AsyncStorage.removeItem(USAGE_LIMITS_KEY);

      // Fetch fresh subscription status from backend
      // This will get the updated status with canceledAt and expiresAt
      const subscription = await subscriptionService.getSubscriptionStatus();
      
      // Normalize tier
      const normalizedSubscription: Subscription = {
        ...subscription,
        tier: (subscription.tier as string).toUpperCase() as SubscriptionTier,
        status: 'CANCELED',
      };

      // If still premium (until expiry), keep premium limits
      // If already expired, use free tier limits
      const isPremiumActive = normalizedSubscription.tier === 'PREMIUM' && normalizedSubscription.isActive;
      
      const usageLimits: UsageLimits = isPremiumActive
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
            voiceEntries: {
              used: 0,
              limit: Infinity,
              resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            categories: {
              used: 0,
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
            voiceEntries: {
              used: 0,
              limit: 3,
              resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            categories: {
              used: 0,
              limit: 5,
            },
          };

      // Cache updated state
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(normalizedSubscription));
      await AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(usageLimits));

      return { subscription: normalizedSubscription, usageLimits };
    } catch (error: any) {
      console.error('[SubscriptionSlice] Cancel failed:', error);
      return rejectWithValue(error.message || 'Cancellation failed');
    }
  }
);

/**
 * Async thunk to change subscription plan (Upgrade/Downgrade)
 */
export const changeSubscriptionPlan = createAsyncThunk(
  'subscription/changePlan',
  async (newPlan: 'monthly' | 'yearly', { rejectWithValue }) => {
    try {
      const result = await subscriptionService.changePlan(newPlan);
      
      if (!result.success) {
        return rejectWithValue('Plan change failed');
      }

      const subscription = {
        ...result.subscription,
        tier: (result.subscription.tier as string).toUpperCase() as SubscriptionTier,
      };

      // Update local storage
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));

      return { subscription };
    } catch (error: any) {
      console.error('[SubscriptionSlice] Change plan failed:', error);
      return rejectWithValue(error.message || 'Plan change failed');
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
      if (state.subscription.tier === 'FREE') {
        state.usageLimits.receiptScans.used += 1;
        AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(state.usageLimits));
      }
    },
    incrementInsights: (state) => {
      if (state.subscription.tier === 'FREE') {
        state.usageLimits.insights.used += 1;
        AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(state.usageLimits));
      }
    },
    incrementVoiceEntries: (state) => {
      if (state.subscription.tier === 'FREE') {
        state.usageLimits.voiceEntries.used += 1;
        AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(state.usageLimits));
      }
    },
    updateCategoryCount: (state, action: PayloadAction<number>) => {
      state.usageLimits.categories.used = action.payload;
      AsyncStorage.setItem(USAGE_LIMITS_KEY, JSON.stringify(state.usageLimits));
    },
    clearError: (state) => {
      state.error = null;
    },
    // Clear subscription cache to force fresh fetch from API
    clearSubscriptionCache: (state) => {
      // Reset to loading state, forcing a fresh API fetch
      state.isLoading = true;
      // Remove cached data from AsyncStorage
      AsyncStorage.removeItem(SUBSCRIPTION_KEY);
      AsyncStorage.removeItem(USAGE_LIMITS_KEY);
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
        // Use tier directly (UPPERCASE)
        const normalizedSubscription = {
          ...action.payload.subscription,
          tier: (action.payload.subscription.tier as string).toUpperCase() as SubscriptionTier,
        };
        state.subscription = normalizedSubscription;
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
        // Use tier directly (UPPERCASE)
        const normalizedSubscription = {
          ...action.payload.subscription,
          tier: (action.payload.subscription.tier as string).toUpperCase() as SubscriptionTier,
          isActive: action.payload.subscription.isActive !== undefined 
            ? action.payload.subscription.isActive 
            : true,
        };
        state.subscription = normalizedSubscription;
        state.usageLimits = action.payload.usageLimits;
      })
      .addCase(subscribeToPremium.rejected, (state, action) => {
        state.isLoading = false;
        // Don't show error for user cancellation
        if (action.payload !== 'CANCELLED') {
          state.error = action.payload as string;
        }
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

    // Restore subscription
    builder
      .addCase(restoreSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        const subscription = action.payload.subscription;
        
        const normalizedSubscription = {
          ...subscription,
          tier: (subscription.tier as string).toUpperCase() as SubscriptionTier,
          isActive: subscription.isActive !== undefined ? subscription.isActive : true,
        };
        
        state.subscription = normalizedSubscription;
        state.usageLimits = action.payload.usageLimits;
      })
      .addCase(restoreSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel subscription
    builder.addCase(cancelSubscription.fulfilled, (state, action) => {
      state.subscription = action.payload.subscription;
      state.usageLimits = action.payload.usageLimits;
    });

    // Change plan
    builder
      .addCase(changeSubscriptionPlan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changeSubscriptionPlan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscription = action.payload.subscription;
      })
      .addCase(changeSubscriptionPlan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { incrementReceiptScans, incrementInsights, incrementVoiceEntries, updateCategoryCount, clearError, clearSubscriptionCache } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

