
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAppDispatch } from '../store';
import { checkSubscriptionStatus } from '../store/slices/subscriptionSlice';
import { useAppFlow } from '../contexts/AppFlowContext';
import { notificationService } from '../services/notificationService';
import logger from '../utils/logger';
import { RootStackParamList } from '../navigation/types';

/**
 * useNotificationObserver
 * 
 * Purpose: Global notification listener that handles:
 * 1. Incoming notifications (foreground/background)
 * 2. User tapping on notifications
 * 3. Subscription state updates triggered by notifications
 */
export const useNotificationObserver = (navigationRef?: React.RefObject<NavigationContainerRef<RootStackParamList> | null>) => {
  const dispatch = useAppDispatch();
  const { markSubscriptionExpired } = useAppFlow();
  // Removed useNavigation call to avoid crash when used in AppNavigator (outside NavigationContainer)
  // const navigation = useNavigation();

  // We use a ref to track if listeners are set up to avoid duplicate listeners
  const listenersSetRef = useRef(false);

  useEffect(() => {
    if (listenersSetRef.current) return;

    const setupListeners = async () => {
      try {
        // Initialize service (channels, permissions check)
        await notificationService.initialize();

        // 1. Handle notification RECEIVED (foreground)
        const handleNotificationReceived = async (notification: Notifications.Notification) => {
          logger.debug('[NotificationObserver] Received:', notification);
          
          const data = notification.request.content.data;
          
          // Check for subscription state changes
          if (data?.type === 'SUBSCRIPTION_STATE' || data?.category === 'SUBSCRIPTION_STATE') {
            logger.info('[NotificationObserver] Subscription state update received, refreshing...');
            
            // Refresh redux state
            const result = await dispatch(checkSubscriptionStatus()).unwrap();
            
            // If expired, enforce hard paywall
            if (result.subscription.status === 'EXPIRED') {
              logger.info('[NotificationObserver] Subscription expired, triggering hard paywall');
              if (markSubscriptionExpired) { // Check if method exists (will be added to context)
                 await markSubscriptionExpired();
                 // Navigation will be handled by AppNavigator's flow state effect
              }
            }
          }
        };

        // 2. Handle notification TAPPED (response)
        const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
          logger.debug('[NotificationObserver] Response (Tapped):', response);
          
          const data = response.notification.request.content.data;
          const screen = data?.screen;
          
          if (screen) {
            logger.info(`[NotificationObserver] Navigating to ${screen}`);
            
            // Use provided ref
            const nav = navigationRef?.current;
            
            if (nav) {
              // Handle special screens with params
              if (screen === 'CategoryDetail' && data.entityId) {
                // @ts-ignore - dynamic navigation
                nav.navigate('CategoryDetails', { categoryId: data.entityId });
              } else if (screen === 'Subscription') {
                 // @ts-ignore
                nav.navigate('Subscription');
              } else if (screen === 'Paywall' && data.reason === 'expired') {
                 // If the notification explicitly says expired, go to paywall
                 // @ts-ignore
                 nav.navigate('Paywall', { reason: 'expired' });
              } else {
                 // Generic navigation
                 // @ts-ignore
                 nav.navigate(screen, data);
              }
            }
          }
        };

        // Register listeners via service wrapper
        notificationService.setupNotificationListeners(
          handleNotificationReceived,
          handleNotificationResponse
        );
        
        listenersSetRef.current = true;
        logger.info('[NotificationObserver] Listeners active');

      } catch (error) {
        logger.error('[NotificationObserver] Failed to setup listeners:', error);
      }
    };

    setupListeners();

    // Cleanup
    return () => {
      notificationService.removeNotificationListeners();
      listenersSetRef.current = false;
    };
  }, [dispatch, markSubscriptionExpired, navigationRef]);
};
