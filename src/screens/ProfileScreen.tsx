/**
 * ProfileScreen component
 * Purpose: User profile and settings screen
 * Includes theme toggle, user info, app settings, and logout
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store';
import { logout as logoutAction, updateProfile as updateProfileAction } from '../store/slices/authSlice';
import { BottomSheetBackground } from '../components';
import { typography, spacing, borderRadius, elevation } from '../theme';

/**
 * ProfileScreen - User settings and preferences
 */
const ProfileScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const editProfileSheetRef = useRef<BottomSheet>(null);
  const currencySheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
    }
  }, [user]);

  const handleEditProfile = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    editProfileSheetRef.current?.expand();
  };

  const handleSaveProfile = async () => {
    if (!editName || !editEmail) {
      Alert.alert('Missing Fields', 'Please fill in both name and email');
      return;
    }

    try {
      await dispatch(updateProfileAction({ name: editName, email: editEmail })).unwrap();
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      editProfileSheetRef.current?.close();
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCurrencySelect = (curr: string) => {
    setCurrency(curr);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    currencySheetRef.current?.close();
  };

  const handleLogout = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(logoutAction()).unwrap();
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
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

              {/* Edit Profile Button */}
              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: theme.primary }]}
                onPress={handleEditProfile}
              >
                <Icon name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </TouchableOpacity>
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
            subtitle={`${currency} - ${currency === 'USD' ? 'US Dollar' : currency === 'EUR' ? 'Euro' : 'Pakistani Rupee'}`}
            onPress={() => currencySheetRef.current?.expand()}
          />
          <SettingItem
            icon="bell-outline"
            title="Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.border, true: theme.primary + '60' }}
                thumbColor={notificationsEnabled ? theme.primary : theme.surface}
              />
            }
          />
          <SettingItem
            icon="calendar-month"
            title="Budget Period"
            subtitle="Monthly"
            onPress={() => {}}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.expense + '20', borderColor: theme.expense }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={[styles.logoutIcon, { backgroundColor: theme.expense + '20' }]}>
              <Icon name="logout" size={24} color={theme.expense} />
            </View>
            <Text style={[styles.logoutText, { color: theme.expense }]}>Logout</Text>
          </TouchableOpacity>
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

      {/* Edit Profile Bottom Sheet */}
      <BottomSheet
        ref={editProfileSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Profile</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.profileInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              value={editName}
              onChangeText={setEditName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.profileInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.textTertiary}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveProfileButton, { backgroundColor: theme.primary }, elevation.sm]}
            onPress={handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveProfileButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Currency Selection Bottom Sheet */}
      <BottomSheet
        ref={currencySheetRef}
        index={-1}
        snapPoints={['40%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Select Currency</Text>

          {['USD', 'EUR', 'PKR'].map((curr) => (
            <TouchableOpacity
              key={curr}
              style={[
                styles.currencyOption,
                {
                  backgroundColor: currency === curr ? theme.primary + '20' : theme.card,
                  borderColor: currency === curr ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleCurrencySelect(curr)}
            >
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyCode, { color: theme.text }]}>{curr}</Text>
                <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                  {curr === 'USD' ? 'US Dollar' : curr === 'EUR' ? 'Euro' : 'Pakistani Rupee'}
                </Text>
              </View>
              {currency === curr && (
                <Icon name="check-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
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
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editProfileButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  logoutIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoutText: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  profileInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  saveProfileButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveProfileButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: 2,
  },
  currencyName: {
    ...typography.bodySmall,
  },
});

export default ProfileScreen;

