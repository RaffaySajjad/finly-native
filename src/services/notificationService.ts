import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';
import { getCurrentUserId } from './userService';
import logger from '../utils/logger';

const PERMISSION_BANNER_SHOWN_KEY = '@finly:notification_permission_banner_shown';

const PROJECT_ID = 'dfa0ffd0-4dca-4765-b6dd-1ca535a8e731';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

class NotificationService {
  private notificationReceivedListener: Notifications.Subscription | null =
    null;
  private notificationResponseListener: Notifications.Subscription | null =
    null;

  async initialize(): Promise<void> {
    try {
      await this.setupAndroidChannel();
      await this.requestPermissions();
    } catch (error) {
      logger.error('[NotificationService] Initialization failed:', error);
    }
  }

  private async setupAndroidChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      });
    }
  }

  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    const existingPermissions = await Notifications.getPermissionsAsync();

    if (existingPermissions.status === 'granted') {
      return existingPermissions;
    }

    return await Notifications.requestPermissionsAsync();
  }

  async getPushToken(): Promise<string | null> {
    try {
      const permissions = await this.requestPermissions();

      if (!permissions.granted) {
        logger.warn('[NotificationService] Permissions not granted');
        return null;
      }

      const projectId =
        PROJECT_ID ||
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      if (!projectId) {
        throw new Error('Project ID not found');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      return tokenData.data;
    } catch (error) {
      logger.error('[NotificationService] Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Get a unique device identifier
   * Uses installation ID which persists across app restarts but changes on reinstall
   */
  private async getDeviceId(): Promise<string | null> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Use installation ID (unique per app installation)
        return await Application.getIosIdForVendorAsync();
      } else {
        // Android: Use Android ID
        return Application.getAndroidId();
      }
    } catch (error) {
      logger.error('[NotificationService] Failed to get device ID:', error);
      return null;
    }
  }

  async registerTokenWithBackend(token: string): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        logger.warn(
          '[NotificationService] Cannot register token: user not authenticated'
        );
        return false;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const deviceId = await this.getDeviceId();
      
      await apiService.registerPushToken(token, platform, deviceId || undefined);

      logger.info(
        `[NotificationService] Push token registered successfully (deviceId: ${deviceId || 'unknown'})`
      );
      return true;
    } catch (error) {
      logger.error(
        '[NotificationService] Failed to register token with backend:',
        error
      );
      return false;
    }
  }

  async requestAndRegister(): Promise<string | null> {
    const token = await this.getPushToken();

    if (token) {
      await this.registerTokenWithBackend(token);
    }

    return token;
  }

  setupNotificationListeners(
    onReceived?: (notification: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    this.removeNotificationListeners();

    if (onReceived) {
      this.notificationReceivedListener =
        Notifications.addNotificationReceivedListener(onReceived);
    }

    if (onResponse) {
      this.notificationResponseListener =
        Notifications.addNotificationResponseReceivedListener(onResponse);
    }
  }

  removeNotificationListeners(): void {
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener.remove();
      this.notificationReceivedListener = null;
    }

    if (this.notificationResponseListener) {
      this.notificationResponseListener.remove();
      this.notificationResponseListener = null;
    }
  }

  async removeToken(token: string): Promise<void> {
    try {
      await apiService.removePushToken(token);
      logger.info('[NotificationService] Push token removed');
    } catch (error) {
      logger.error('[NotificationService] Failed to remove token:', error);
      throw error;
    }
  }

  async sendTestNotification(options?: {
    title?: string;
    body?: string;
    data?: object;
    priority?: 'default' | 'normal' | 'high';
  }): Promise<boolean> {
    try {
      const token = await this.getPushToken();

      if (!token) {
        throw new Error(
          'No push token available. Please ensure notifications are enabled.'
        );
      }

      await apiService.sendTestNotificationToDevice(token, {
        title: options?.title || 'Test Notification',
        body:
          options?.body ||
          'This is a test notification from Finly developer mode',
        data: options?.data || { test: true, timestamp: Date.now() },
        priority: options?.priority || 'high'
      });

      logger.info(
        '[NotificationService] Test notification sent successfully via backend'
      );
      return true;
    } catch (error) {
      logger.error(
        '[NotificationService] Failed to send test notification:',
        error
      );
      throw error;
    }
  }

  /**
   * Check if permission banner has been shown before
   */
  async hasPermissionBannerBeenShown(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PERMISSION_BANNER_SHOWN_KEY);
      return value === 'true';
    } catch (error) {
      logger.error('[NotificationService] Failed to check banner shown state:', error);
      return false;
    }
  }

  /**
   * Mark permission banner as shown
   */
  async markPermissionBannerShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_BANNER_SHOWN_KEY, 'true');
      logger.info('[NotificationService] Permission banner marked as shown');
    } catch (error) {
      logger.error('[NotificationService] Failed to mark banner as shown:', error);
    }
  }

  /**
   * Register for push notifications (alias for requestAndRegister)
   */
  async registerForPushNotifications(): Promise<string | null> {
    return this.requestAndRegister();
  }

  /**
   * Check current permission status without requesting
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      logger.error('[NotificationService] Failed to get permission status:', error);
      return 'undetermined';
    }
  }

  /**
   * Check if notifications are enabled (permission granted)
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const status = await this.getPermissionStatus();
    return status === 'granted';
  }

  /**
   * Open device settings for the app (to enable notifications manually)
   */
  async openAppSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      logger.error('[NotificationService] Failed to open settings:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
