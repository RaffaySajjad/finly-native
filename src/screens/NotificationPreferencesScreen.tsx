/**
 * NotificationPreferencesScreen Component
 * Purpose: Manage notification preferences per category
 * Syncs with backend API and auto-detects timezone
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useAlert } from '../hooks/useAlert';
import { api } from '../services/apiClient';
import { notificationService } from '../services/notificationService';
import { typography, spacing, borderRadius, elevation } from '../theme';
import * as Haptics from 'expo-haptics';
import { Header } from '../components';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface NotificationPreferences {
  insightsEnabled: boolean;
  budgetAlertsEnabled: boolean;
  engagementNudgesEnabled: boolean;
  achievementsEnabled: boolean;
  subscriptionAlertsEnabled: boolean;
  aiTipsEnabled: boolean;
  subscriptionStateEnabled: boolean;
  systemEnabled: boolean;
  dailySummaryEnabled: boolean;
  timezone: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  dailyNudgeTime: string;
}

const defaultPreferences: NotificationPreferences = {
  insightsEnabled: true,
  budgetAlertsEnabled: true,
  engagementNudgesEnabled: true,
  achievementsEnabled: true,
  subscriptionAlertsEnabled: true,
  aiTipsEnabled: true,
  subscriptionStateEnabled: true,
  systemEnabled: true,
  dailySummaryEnabled: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  quietHoursStart: null,
  quietHoursEnd: null,
  dailyNudgeTime: '18:00',
};

const NotificationPreferencesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { showError, showSuccess, AlertComponent } = useAlert();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(false);

  // Load preferences from API
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check system notification permission
      const enabled = await notificationService.areNotificationsEnabled();
      setSystemNotificationsEnabled(enabled);
      
      // Load from API
      const response = await api.get<NotificationPreferences>('/notifications/preferences');
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      // Use defaults if API fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync timezone on mount
  const syncTimezone = useCallback(async () => {
    try {
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (deviceTimezone && deviceTimezone !== preferences.timezone) {
        await api.post('/notifications/timezone', { timezone: deviceTimezone });
        setPreferences(prev => ({ ...prev, timezone: deviceTimezone }));
      }
    } catch (error) {
      console.error('Failed to sync timezone:', error);
    }
  }, [preferences.timezone]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  useEffect(() => {
    if (!isLoading) {
      syncTimezone();
    }
  }, [isLoading, syncTimezone]);

  // Update preference and save to API
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const previousValue = preferences[key];
    
    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));
    Haptics.selectionAsync();
    
    try {
      setIsSaving(true);
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api.put('/notifications/preferences', {
        ...preferences,
        [key]: value,
        timezone: deviceTimezone,
      });
    } catch (error) {
      // Rollback on error
      setPreferences(prev => ({ ...prev, [key]: previousValue }));
      showError('Error', 'Failed to save preference. Please try again.');
      console.error('Failed to update preference:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSystemSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await notificationService.openAppSettings();
  };

  const NotificationToggle: React.FC<{
    icon: string;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }> = ({ icon, title, subtitle, value, onValueChange, disabled }) => (
    <View
      style={[
        styles.settingItem,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.sm,
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
        <Icon name={icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary + '60' }}
        thumbColor={value ? theme.primary : theme.surface}
        disabled={disabled || !systemNotificationsEnabled}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Header
          title="Notification Preferences"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Header
        title="Notification Preferences"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* System Notifications Banner */}
        {!systemNotificationsEnabled && (
          <View style={[styles.warningBanner, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
            <Icon name="bell-off" size={24} color={theme.warning} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: theme.text }]}>
                Notifications Disabled
              </Text>
              <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                Enable notifications in your device settings to receive alerts.
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={24}
              color={theme.warning}
              onPress={handleOpenSystemSettings}
            />
          </View>
        )}

        {/* Timezone Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon name="earth" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Notifications are scheduled for your timezone: {preferences.timezone}
          </Text>
        </View>

        {/* Financial Alerts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>FINANCIAL ALERTS</Text>
          
          <NotificationToggle
            icon="lightbulb-outline"
            title="Daily Insights"
            subtitle="Spending patterns and savings opportunities"
            value={preferences.insightsEnabled}
            onValueChange={(v) => updatePreference('insightsEnabled', v)}
          />
          
          <NotificationToggle
            icon="alert-circle"
            title="Budget Alerts"
            subtitle="Warnings when you're close to budget limits"
            value={preferences.budgetAlertsEnabled}
            onValueChange={(v) => updatePreference('budgetAlertsEnabled', v)}
          />
          
          <NotificationToggle
            icon="credit-card-clock"
            title="Subscription Reminders"
            subtitle="Alerts before your subscriptions renew"
            value={preferences.subscriptionAlertsEnabled}
            onValueChange={(v) => updatePreference('subscriptionAlertsEnabled', v)}
          />
        </View>

        {/* Engagement */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ENGAGEMENT</Text>
          
          <NotificationToggle
            icon="chart-line"
            title="Daily Summary"
            subtitle="AI-generated end-of-day spending recap at 9PM"
            value={preferences.dailySummaryEnabled}
            onValueChange={(v) => updatePreference('dailySummaryEnabled', v)}
          />

          <NotificationToggle
            icon="pencil"
            title="Daily Nudge"
            subtitle="Reminder to log your expenses"
            value={preferences.engagementNudgesEnabled}
            onValueChange={(v) => updatePreference('engagementNudgesEnabled', v)}
          />
          
          <NotificationToggle
            icon="trophy"
            title="Achievements"
            subtitle="Streak celebrations and milestones"
            value={preferences.achievementsEnabled}
            onValueChange={(v) => updatePreference('achievementsEnabled', v)}
          />
          
          <NotificationToggle
            icon="robot"
            title="AI Tips"
            subtitle="Weekly personalized financial advice"
            value={preferences.aiTipsEnabled}
            onValueChange={(v) => updatePreference('aiTipsEnabled', v)}
          />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
          
          <NotificationToggle
            icon="star"
            title="Subscription Status"
            subtitle="Pro plan changes, renewals, expirations"
            value={preferences.subscriptionStateEnabled}
            onValueChange={(v) => updatePreference('subscriptionStateEnabled', v)}
          />
          
          <NotificationToggle
            icon="shield-check"
            title="Security Alerts"
            subtitle="Important account notifications (always on)"
            value={preferences.systemEnabled}
            onValueChange={(v) => updatePreference('systemEnabled', v)}
            disabled
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
      {AlertComponent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingVertical: spacing.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  warningContent: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  warningTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
  },
  warningText: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelSmall,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.titleMedium,
  },
  settingSubtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});

export default NotificationPreferencesScreen;
