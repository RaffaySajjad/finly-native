/**
 * Notification Service
 * Purpose: Handle push notifications for insights
 * Features: Request permissions, register tokens, handle notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_STORAGE_KEY = '@finly_push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  insightId?: string;
  type?: string;
  screen?: string;
}

class NotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Request notification permissions
   * @returns true if permissions granted, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Permission not granted:', finalStatus);
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Get Expo push token
   * @returns Expo push token or null if unavailable
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      // Check if we already have a token stored
      const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (storedToken) {
        return storedToken;
      }

      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[NotificationService] Cannot get token without permissions');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // You may need to set this
      });

      const token = tokenData.data;

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

      return token;
    } catch (error) {
      console.error('[NotificationService] Error getting Expo push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   * @param token - Expo push token
   * @param deviceId - Optional device identifier
   */
  async registerTokenWithBackend(token: string, deviceId?: string): Promise<void> {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await apiService.registerPushToken(token, platform, deviceId);
      console.log('[NotificationService] Token registered with backend');
    } catch (error) {
      console.error('[NotificationService] Error registering token with backend:', error);
      throw error;
    }
  }

  /**
   * Register for push notifications and send token to backend
   * @param deviceId - Optional device identifier
   * @returns true if successful, false otherwise
   */
  async registerForPushNotifications(deviceId?: string): Promise<boolean> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Get Expo push token
      const token = await this.getExpoPushToken();
      if (!token) {
        console.warn('[NotificationService] Could not get push token');
        return false;
      }

      // Register token with backend
      await this.registerTokenWithBackend(token, deviceId);

      return true;
    } catch (error) {
      console.error('[NotificationService] Error registering for push notifications:', error);
      return false;
    }
  }

  /**
   * Unregister push token (remove from backend and local storage)
   * @param token - Push token to unregister
   */
  async unregisterToken(token: string): Promise<void> {
    try {
      await apiService.removePushToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
      console.log('[NotificationService] Token unregistered');
    } catch (error) {
      console.error('[NotificationService] Error unregistering token:', error);
    }
  }

  /**
   * Setup notification listeners
   * @param onNotificationReceived - Callback when notification is received
   * @param onNotificationTapped - Callback when notification is tapped
   */
  setupNotificationHandlers(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NotificationService] Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for when user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[NotificationService] Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });
  }

  /**
   * Remove notification listeners
   */
  removeNotificationHandlers(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Get notification data from notification response
   * @param response - Notification response
   * @returns Notification data or null
   */
  getNotificationData(response: Notifications.NotificationResponse): NotificationData | null {
    return (response.notification.request.content.data as NotificationData) || null;
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
