/**
 * User Service Utilities
 * Purpose: Shared user-related utilities to avoid circular dependencies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = '@finly_user_data';
const STARTING_BALANCE_KEY = '@finly_starting_balance';

/**
 * Gets current user ID from AsyncStorage
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    if (userData) {
      const user = JSON.parse(userData);
      return user.id;
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }
  return null;
};

/**
 * Get starting balance for the current user
 */
export const getStartingBalance = async (): Promise<number> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return 0;
    }

    const key = `${STARTING_BALANCE_KEY}_${userId}`;
    const balance = await AsyncStorage.getItem(key);
    const balanceValue = balance ? parseFloat(balance) : 0;
    return balanceValue;
  } catch (error) {
    console.error('Error getting starting balance:', error);
    return 0;
  }
};

/**
 * Set starting balance for the current user
 */
export const setStartingBalance = async (balance: number): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('[setStartingBalance] No user ID found');
      return;
    }

    const key = `${STARTING_BALANCE_KEY}_${userId}`;
    await AsyncStorage.setItem(key, balance.toString());
    console.log(`[setStartingBalance] User ID: ${userId}, Key: ${key}, Balance: ${balance}`);
  } catch (error) {
    console.error('Error setting starting balance:', error);
  }
};


