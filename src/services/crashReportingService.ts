/**
 * Crash Reporting Service
 * Purpose: Collect and send crash reports and diagnostics to backend
 * Features:
 * - Captures unhandled exceptions and promise rejections
 * - Collects device info (expo-device) and app info (expo-application)
 * - Maintains breadcrumbs (recent user actions)
 * - Queues reports offline and syncs when connected
 * - Respects user consent settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { apiService } from './api';
import logger from '../utils/logger';

// Storage keys
const STORAGE_KEYS = {
  DIAGNOSTICS_CONSENT: '@finly_diagnostics_consent',
  PENDING_REPORTS: '@finly_pending_crash_reports',
  BREADCRUMBS: '@finly_breadcrumbs',
};

// Max breadcrumbs to keep
const MAX_BREADCRUMBS = 50;

// Types
interface Breadcrumb {
  action: string;
  timestamp: string;
  data?: Record<string, any>;
}

interface CrashReport {
  errorMessage: string;
  errorStack?: string;
  errorType: 'crash' | 'exception' | 'unhandled_rejection';
  appVersion: string;
  buildNumber?: string;
  screen?: string;
  platform: 'ios' | 'android';
  osVersion: string;
  deviceModel?: string;
  deviceBrand?: string;
  metadata?: Record<string, any>;
  breadcrumbs?: Breadcrumb[];
  isConnected?: boolean;
  connectionType?: string;
}

class CrashReportingService {
  private isInitialized = false;
  private consentGiven = false;
  private breadcrumbs: Breadcrumb[] = [];
  private currentScreen: string = 'unknown';

  /**
   * Initialize crash reporting service
   * Sets up global error handlers and loads consent preference
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load consent preference - default to true if no preference saved (enabled by default)
      const consent = await AsyncStorage.getItem(STORAGE_KEYS.DIAGNOSTICS_CONSENT);
      this.consentGiven = consent === null ? true : consent === 'true';

      if (this.consentGiven) {
        // Load any pending breadcrumbs
        await this.loadBreadcrumbs();
        
        // Set up global error handlers
        this.setupErrorHandlers();
        
        // Try to sync any pending reports
        await this.syncPendingReports();
      }

      this.isInitialized = true;
      logger.info('[CrashReporting] Service initialized', { consent: this.consentGiven });
    } catch (error) {
      logger.error('[CrashReporting] Failed to initialize:', error);
    }
  }

  /**
   * Set user consent for diagnostics collection
   */
  async setConsent(enabled: boolean): Promise<void> {
    this.consentGiven = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.DIAGNOSTICS_CONSENT, enabled ? 'true' : 'false');
    
    if (enabled && !this.isInitialized) {
      this.setupErrorHandlers();
      this.isInitialized = true;
    }
    
    logger.info('[CrashReporting] Consent updated', { enabled });
  }

  /**
   * Get current consent status
   */
  async getConsent(): Promise<boolean> {
    const consent = await AsyncStorage.getItem(STORAGE_KEYS.DIAGNOSTICS_CONSENT);
    return consent === 'true';
  }

  /**
   * Add a breadcrumb (user action trail)
   * Used to understand what led to a crash
   */
  async addBreadcrumb(action: string, data?: Record<string, any>): Promise<void> {
    if (!this.consentGiven) return;

    const breadcrumb: Breadcrumb = {
      action,
      timestamp: new Date().toISOString(),
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-MAX_BREADCRUMBS);
    }

    // Persist breadcrumbs (debounced in practice via batching)
    await this.saveBreadcrumbs();
  }

  /**
   * Set current screen name (for crash context)
   */
  setCurrentScreen(screenName: string): void {
    this.currentScreen = screenName;
    
    if (this.consentGiven) {
      this.addBreadcrumb('screen_view', { screen: screenName });
    }
  }

  /**
   * Report an error/exception manually
   */
  async reportError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    if (!this.consentGiven) return;

    await this.captureError(error, 'exception', context);
  }

  /**
   * Get device and app information
   */
  private async getDeviceInfo(): Promise<Partial<CrashReport>> {
    const netInfo = await NetInfo.fetch();

    return {
      appVersion: Application.nativeApplicationVersion || 'unknown',
      buildNumber: Application.nativeBuildVersion || undefined,
      platform: Platform.OS as 'ios' | 'android',
      osVersion: `${Platform.OS} ${Platform.Version}`,
      deviceModel: Device.modelName || undefined,
      deviceBrand: Device.brand || undefined,
      isConnected: netInfo.isConnected ?? undefined,
      connectionType: netInfo.type || undefined,
    };
  }

  /**
   * Capture and report an error
   */
  private async captureError(
    error: Error,
    errorType: CrashReport['errorType'],
    extraData?: Record<string, any>
  ): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();

      const report: CrashReport = {
        ...deviceInfo,
        errorMessage: error.message || 'Unknown error',
        errorStack: error.stack,
        errorType,
        screen: this.currentScreen,
        breadcrumbs: [...this.breadcrumbs],
        metadata: extraData,
      } as CrashReport;

      // Try to send immediately
      const success = await this.sendReport(report);

      // If failed, queue for later
      if (!success) {
        await this.queueReport(report);
      }

      // Clear breadcrumbs after crash (start fresh)
      this.breadcrumbs = [];
      await this.saveBreadcrumbs();
    } catch (e) {
      logger.error('[CrashReporting] Failed to capture error:', e);
    }
  }

  /**
   * Send crash report to backend
   */
  private async sendReport(report: CrashReport): Promise<boolean> {
    try {
      await apiService.post('/diagnostics/crash', report);
      logger.debug('[CrashReporting] Report sent successfully');
      return true;
    } catch (error) {
      logger.warn('[CrashReporting] Failed to send report, will retry later');
      return false;
    }
  }

  /**
   * Queue report for later sync (when offline)
   */
  private async queueReport(report: CrashReport): Promise<void> {
    try {
      const pending = await this.getPendingReports();
      pending.push(report);
      
      // Keep only last 10 pending reports to avoid storage issues
      const trimmed = pending.slice(-10);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REPORTS, JSON.stringify(trimmed));
    } catch (error) {
      logger.error('[CrashReporting] Failed to queue report:', error);
    }
  }

  /**
   * Get pending reports from storage
   */
  private async getPendingReports(): Promise<CrashReport[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Sync any pending reports when back online
   */
  async syncPendingReports(): Promise<void> {
    if (!this.consentGiven) return;

    const pending = await this.getPendingReports();
    if (pending.length === 0) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    logger.info('[CrashReporting] Syncing pending reports', { count: pending.length });

    const successful: number[] = [];
    
    for (let i = 0; i < pending.length; i++) {
      const success = await this.sendReport(pending[i]);
      if (success) {
        successful.push(i);
      }
    }

    // Remove successfully sent reports
    if (successful.length > 0) {
      const remaining = pending.filter((_, idx) => !successful.includes(idx));
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_REPORTS, JSON.stringify(remaining));
    }
  }

  /**
   * Save breadcrumbs to storage
   */
  private async saveBreadcrumbs(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BREADCRUMBS, JSON.stringify(this.breadcrumbs));
    } catch (error) {
      // Silent fail - breadcrumbs are not critical
    }
  }

  /**
   * Load breadcrumbs from storage
   */
  private async loadBreadcrumbs(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BREADCRUMBS);
      if (stored) {
        this.breadcrumbs = JSON.parse(stored);
      }
    } catch {
      this.breadcrumbs = [];
    }
  }

  /**
   * Set up global error handlers
   */
  private setupErrorHandlers(): void {
    // Handle unhandled promise rejections
    const originalHandler = (global as any).onunhandledrejection;
    (global as any).onunhandledrejection = (event: any) => {
      if (this.consentGiven) {
        const error = event?.reason instanceof Error 
          ? event.reason 
          : new Error(String(event?.reason || 'Unhandled promise rejection'));
        this.captureError(error, 'unhandled_rejection');
      }
      
      if (originalHandler) {
        originalHandler(event);
      }
    };

    // Handle uncaught errors
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      if (this.consentGiven) {
        this.captureError(error, isFatal ? 'crash' : 'exception', { isFatal });
      }
      
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  /**
   * Clear all stored data (for account deletion or debugging)
   */
  async clearAll(): Promise<void> {
    this.breadcrumbs = [];
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.BREADCRUMBS,
      STORAGE_KEYS.PENDING_REPORTS,
    ]);
  }
}

// Export singleton instance
export const crashReportingService = new CrashReportingService();
export default crashReportingService;
