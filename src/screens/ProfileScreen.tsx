/**
 * ProfileScreen component
 * Purpose: User profile and settings screen
 * Includes theme toggle, user info, and app settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { User } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';

/**
 * ProfileScreen - User settings and preferences
 */
const ProfileScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Loads user data from API
   */
  const loadUser = async (): Promise<void> => {
    try {
      const data = await apiService.getUser();
      setUser(data);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  /**
   * SettingItem component for consistent setting rows
   */
  const SettingItem: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }> = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: theme.primary + '20' }]}>
        <Icon name={icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {rightComponent || <Icon name="chevron-right" size={24} color={theme.textTertiary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* User Profile Card */}
        {user && (
          <View style={styles.profileCard}>
            <View
              style={[
                styles.profileCardInner,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation.md,
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {user.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
            </View>
          </View>
        )}

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
          <SettingItem
            icon="theme-light-dark"
            title="Dark Mode"
            subtitle={isDark ? 'Enabled' : 'Disabled'}
            rightComponent={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary + '60' }}
                thumbColor={isDark ? theme.primary : theme.surface}
              />
            }
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
          <SettingItem
            icon="currency-usd"
            title="Currency"
            subtitle="USD - US Dollar"
            onPress={() => {}}
          />
          <SettingItem
            icon="bell-outline"
            title="Notifications"
            subtitle="Manage your notification preferences"
            onPress={() => {}}
          />
          <SettingItem
            icon="calendar-month"
            title="Budget Period"
            subtitle="Monthly"
            onPress={() => {}}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</Text>
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => {}}
          />
          <SettingItem
            icon="information-outline"
            title="About Finly"
            subtitle="Version 1.0.0"
            onPress={() => {}}
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
  },
  profileCard: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  profileCardInner: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.headlineMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  userName: {
    ...typography.titleLarge,
    marginBottom: 4,
  },
  userEmail: {
    ...typography.bodyMedium,
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

export default ProfileScreen;

