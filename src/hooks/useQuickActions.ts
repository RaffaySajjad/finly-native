/**
 * useQuickActions - Quick Actions handler hook
 * Purpose: Sets up home screen quick actions (3D Touch on iOS / Long Press on Android)
 * Features: Voice transaction, receipt scanning, manual entry, Finly AI assistant
 *
 * Quick Actions appear when user long-presses/3D-touches the app icon on home screen
 */

import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';

/**
 * Quick Action IDs - used for routing when action is triggered
 * Follows enterprise naming conventions for consistency
 */
export enum QuickActionId {
  VOICE_TRANSACTION = 'finly.action.voice_transaction',
  SCAN_RECEIPT = 'finly.action.scan_receipt',
  ADD_TRANSACTION = 'finly.action.add_transaction',
  AI_ASSISTANT = 'finly.action.ai_assistant',
}

/**
 * Quick Action configuration
 * iOS uses SF Symbols, Android uses custom icons configured via plugin
 */
const QUICK_ACTION_ITEMS: QuickActions.Action[] = [
  {
    id: QuickActionId.VOICE_TRANSACTION,
    title: 'Voice Entry',
    subtitle: 'Add with voice',
    icon: Platform.select({
      ios: 'symbol:mic.fill',
      android: 'shortcut_voice',
    }),
  },
  {
    id: QuickActionId.SCAN_RECEIPT,
    title: 'Scan Receipt',
    subtitle: 'Capture expense',
    icon: Platform.select({
      ios: 'symbol:camera.fill',
      android: 'shortcut_camera',
    }),
  },
  {
    id: QuickActionId.ADD_TRANSACTION,
    title: 'New Transaction',
    subtitle: 'Manual entry',
    icon: Platform.select({
      ios: 'symbol:plus.circle.fill',
      android: 'shortcut_add',
    }),
  },
  {
    id: QuickActionId.AI_ASSISTANT,
    title: 'Finly AI',
    subtitle: 'Ask anything',
    icon: Platform.select({
      ios: 'symbol:brain.fill', // Matches iOS tab bar icon
      android: 'shortcut_robot', // Matches Android tab bar icon (robot)
    }),
  },
];

interface UseQuickActionsOptions {
  /** Whether the user is authenticated and ready to handle actions */
  isReady: boolean;
}

/**
 * useQuickActions hook
 *
 * Sets up quick actions on the home screen and handles action selection.
 * Must be called within a NavigationContainer.
 *
 * @param options.isReady - Only processes actions when true (user authenticated)
 */
export function useQuickActions({ isReady }: UseQuickActionsOptions): void {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { openBottomSheet } = useBottomSheetActions();

  // Track if we've processed the initial action to prevent duplicate handling
  const initialActionProcessed = useRef(false);

  /**
   * Handle a quick action selection
   * Routes to appropriate screen based on action ID
   */
  const handleQuickAction = useCallback(
    (action: QuickActions.Action | null) => {
      if (!action || !isReady) {
        return;
      }

      console.log('[QuickActions] Handling action:', action.id);

      switch (action.id) {
        case QuickActionId.VOICE_TRANSACTION:
          navigation.navigate('VoiceTransaction');
          break;

        case QuickActionId.SCAN_RECEIPT:
          navigation.navigate('ReceiptUpload');
          break;

        case QuickActionId.ADD_TRANSACTION:
          // Open the SharedBottomSheet for manual transaction entry
          openBottomSheet();
          break;

        case QuickActionId.AI_ASSISTANT:
          navigation.navigate('AIAssistant');
          break;

        default:
          console.warn('[QuickActions] Unknown action:', action.id);
      }
    },
    [isReady, navigation, openBottomSheet]
  );

  /**
   * Initialize quick action items on mount
   * Only needs to be done once per app lifecycle
   */
  useEffect(() => {
    const setupQuickActions = async () => {
      try {
        await QuickActions.setItems(QUICK_ACTION_ITEMS);
        console.log('[QuickActions] Quick actions configured successfully');
      } catch (error) {
        console.error('[QuickActions] Failed to set quick actions:', error);
      }
    };

    setupQuickActions();
  }, []);

  /**
   * Handle quick action when app is launched from background/cold start
   * Uses expo-quick-actions hook for real-time callback
   */
  useQuickActionCallback((action) => {
    if (action && isReady) {
      handleQuickAction(action);
    }
  });

  /**
   * Check for initial quick action on mount (cold start scenario)
   * The app may have been launched via a quick action before the hook was set up
   * Uses QuickActions.initial which contains the action that launched the app
   */
  useEffect(() => {
    if (!isReady || initialActionProcessed.current) {
      return;
    }

    // QuickActions.initial contains the action if app was launched via quick action
    const initialAction = QuickActions.initial;
    if (initialAction) {
      console.log('[QuickActions] Initial action detected:', initialAction.id);
      initialActionProcessed.current = true;
      handleQuickAction(initialAction);
    }
  }, [isReady, handleQuickAction]);
}

/**
 * Clear all quick actions
 * Useful for cleanup or when user logs out
 */
export async function clearQuickActions(): Promise<void> {
  try {
    await QuickActions.setItems([]);
    console.log('[QuickActions] Quick actions cleared');
  } catch (error) {
    console.error('[QuickActions] Failed to clear quick actions:', error);
  }
}

export default useQuickActions;

