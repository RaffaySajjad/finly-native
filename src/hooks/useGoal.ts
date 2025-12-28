/**
 * useGoal Hook
 * Purpose: Centralized hook for managing user's financial goal
 * Features: Load from AsyncStorage, sync with backend, update goal
 * Uses event-based reactivity for cross-component updates
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import { USER_GOAL_KEY } from '../constants/storageKeys';
import { DeviceEventEmitter } from 'react-native';

export type UserGoal = 'budget' | 'save' | 'track' | 'debt';

// Event name for goal changes
const GOAL_CHANGED_EVENT = 'finly:goal-changed';

interface GoalInfo {
  id: UserGoal;
  icon: string;
  title: string;
  description: string;
  color: string;
}

export const GOAL_INFO: Record<UserGoal, GoalInfo> = {
  budget: {
    id: 'budget',
    icon: 'chart-pie',
    title: 'Budget Better',
    description: 'Control monthly spending',
    color: '#6366F1',
  },
  save: {
    id: 'save',
    icon: 'piggy-bank',
    title: 'Save More',
    description: 'Build an emergency fund',
    color: '#10B981',
  },
  track: {
    id: 'track',
    icon: 'magnify',
    title: 'Track Everything',
    description: 'Know where money goes',
    color: '#F59E0B',
  },
  debt: {
    id: 'debt',
    icon: 'credit-card-off',
    title: 'Pay Off Debt',
    description: 'Become debt-free',
    color: '#EF4444',
  },
};

interface UseGoalResult {
  goal: UserGoal | null;
  goalInfo: GoalInfo | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
  updateGoal: (newGoal: UserGoal) => Promise<boolean>;
  refreshGoal: () => Promise<void>;
}

export const useGoal = (): UseGoalResult => {
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load goal from AsyncStorage
  const loadGoal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const storedGoal = await AsyncStorage.getItem(USER_GOAL_KEY);
      if (storedGoal && ['budget', 'save', 'track', 'debt'].includes(storedGoal)) {
        setGoal(storedGoal as UserGoal);
      } else {
        setGoal(null);
      }
    } catch (err) {
      console.error('[useGoal] Failed to load goal:', err);
      setError('Failed to load goal');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  // Listen for goal changes from other hooks/components
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      GOAL_CHANGED_EVENT,
      (newGoal: UserGoal) => {
        console.log('[useGoal] Received goal change event:', newGoal);
        setGoal(newGoal);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Update goal both locally and on backend
  const updateGoal = useCallback(async (newGoal: UserGoal): Promise<boolean> => {
    try {
      setUpdating(true);
      setError(null);

      // Save locally first for immediate feedback
      await AsyncStorage.setItem(USER_GOAL_KEY, newGoal);
      
      // Update local state
      setGoal(newGoal);
      
      // Emit event to notify all other useGoal instances
      DeviceEventEmitter.emit(GOAL_CHANGED_EVENT, newGoal);

      // Sync with backend
      try {
        await apiService.updateGoal(newGoal);
        console.log('[useGoal] Goal synced to backend:', newGoal);
      } catch (backendError) {
        console.warn('[useGoal] Backend sync failed, will retry later:', backendError);
        // Don't fail the update, goal is saved locally
      }

      return true;
    } catch (err) {
      console.error('[useGoal] Failed to update goal:', err);
      setError('Failed to update goal');
      return false;
    } finally {
      setUpdating(false);
    }
  }, []);

  // Refresh goal from storage
  const refreshGoal = useCallback(async () => {
    await loadGoal();
  }, [loadGoal]);

  return {
    goal,
    goalInfo: goal ? GOAL_INFO[goal] : null,
    loading,
    updating,
    error,
    updateGoal,
    refreshGoal,
  };
};

export default useGoal;
