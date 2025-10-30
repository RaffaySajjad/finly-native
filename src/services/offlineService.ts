/**
 * Offline Service
 * Purpose: Handle offline mode and sync conflicts
 * Manages data synchronization when connection is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock NetInfo for now - install @react-native-community/netinfo if needed
const NetInfo = {
  fetch: async () => ({ isConnected: true }),
  addEventListener: (callback: (state: { isConnected: boolean | null }) => void) => {
    // Mock: immediately call with connected state
    callback({ isConnected: true });
    // Return unsubscribe function
    return () => {};
  },
};

const OFFLINE_QUEUE_KEY = '@finly_offline_queue';
const SYNC_CONFLICTS_KEY = '@finly_sync_conflicts';

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'receipt';
  data: any;
  timestamp: string;
}

export interface SyncConflict {
  id: string;
  entityId: string;
  entityType: string;
  localData: any;
  remoteData: any;
  timestamp: string;
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    return false;
  }
}

/**
 * Add operation to offline queue
 */
export async function queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const newOperation: OfflineOperation = {
      ...operation,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    queue.push(newOperation);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error queueing operation:', error);
  }
}

/**
 * Get offline queue
 */
export async function getOfflineQueue(): Promise<OfflineOperation[]> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Process offline queue when connection is restored
 */
export async function processOfflineQueue(): Promise<{ success: number; failed: number }> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  const online = await isOnline();
  if (!online) {
    console.log('Still offline, cannot process queue');
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const operation of queue) {
    try {
      // Mock API call - in production, call actual API
      await new Promise(resolve => setTimeout(resolve, 100));
      success++;
    } catch (error) {
      console.error('Failed to process operation:', error);
      failed++;
    }
  }

  // Clear queue after processing
  if (success > 0) {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  return { success, failed };
}

/**
 * Add sync conflict
 */
export async function addSyncConflict(conflict: Omit<SyncConflict, 'id' | 'timestamp'>): Promise<void> {
  try {
    const conflicts = await getSyncConflicts();
    const newConflict: SyncConflict = {
      ...conflict,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    conflicts.push(newConflict);
    await AsyncStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(conflicts));
  } catch (error) {
    console.error('Error adding sync conflict:', error);
  }
}

/**
 * Get sync conflicts
 */
export async function getSyncConflicts(): Promise<SyncConflict[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_CONFLICTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Resolve sync conflict
 */
export async function resolveSyncConflict(conflictId: string, useLocal: boolean): Promise<void> {
  try {
    const conflicts = await getSyncConflicts();
    const filtered = conflicts.filter(c => c.id !== conflictId);
    await AsyncStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(filtered));

    // In production, sync resolution with server
    console.log(`Resolved conflict ${conflictId} using ${useLocal ? 'local' : 'remote'} data`);
  } catch (error) {
    console.error('Error resolving sync conflict:', error);
  }
}

/**
 * Monitor connection status
 */
export function subscribeToConnectionStatus(callback: (isConnected: boolean) => void): () => void {
  return NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
    callback(state.isConnected ?? false);
  });
}

export default {
  isOnline,
  queueOperation,
  getOfflineQueue,
  processOfflineQueue,
  addSyncConflict,
  getSyncConflicts,
  resolveSyncConflict,
  subscribeToConnectionStatus,
};

