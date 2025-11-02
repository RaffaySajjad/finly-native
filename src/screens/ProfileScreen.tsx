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
import { useCurrency } from '../contexts/CurrencyContext';
import { useAppDispatch, useAppSelector } from '../store';
import { logout as logoutAction, updateProfile as updateProfileAction, deleteAccount as deleteAccountAction } from '../store/slices/authSlice';
import { useSubscription } from '../hooks/useSubscription';
import { BottomSheetBackground } from '../components';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import {
  getCurrencies,
  getUserCurrency,
  saveUserCurrency,
  getLastUsedCurrency,
  Currency,
} from '../services/currencyService';
import {
  isBiometricAvailable,
  authenticateForAccountDeletion,
  getBiometricName,
} from '../services/biometricService';

/**
 * ProfileScreen - User settings and preferences
 */
const ProfileScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { currency: currencyState, setCurrency: setCurrencyGlobal, showDecimals, setShowDecimals } = useCurrency();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const { isPremium, subscription } = useSubscription();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [currency, setCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [lastUsedCurrency, setLastUsedCurrency] = useState<string | null>(null);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [budgetPeriod, setBudgetPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const editProfileSheetRef = useRef<BottomSheet>(null);
  const currencySheetRef = useRef<BottomSheet>(null);
  const budgetPeriodSheetRef = useRef<BottomSheet>(null);
  const helpSheetRef = useRef<BottomSheet>(null);
  const aboutSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
    }
    loadCurrency();
  }, [user]);

  const loadCurrency = async () => {
    try {
      const savedCurrency = await getUserCurrency();
      setCurrency(savedCurrency);
      const lastUsed = await getLastUsedCurrency();
      setLastUsedCurrency(lastUsed);
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  };

  const loadCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const currencyList = await getCurrencies();
      const lastUsed = await getLastUsedCurrency();

      // Sort currencies: last used at top, then alphabetical
      if (lastUsed) {
        const lastUsedIndex = currencyList.findIndex(c => c.code === lastUsed);
        if (lastUsedIndex > 0) {
          const [lastUsedCurrency] = currencyList.splice(lastUsedIndex, 1);
          currencyList.unshift(lastUsedCurrency);
        }
      }

      setCurrencies(currencyList);
      setLastUsedCurrency(lastUsed);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

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

  const handleCurrencySelect = async (curr: string) => {
    setCurrency(curr);
    await saveUserCurrency(curr);
    await setCurrencyGlobal(curr); // Update global currency context
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    currencySheetRef.current?.close();
  };

  const handleOpenCurrencySheet = () => {
    loadCurrencies();
    currencySheetRef.current?.expand();
  };

  const handleBudgetPeriodSelect = (period: 'weekly' | 'monthly' | 'yearly') => {
    setBudgetPeriod(period);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    budgetPeriodSheetRef.current?.close();
  };

  const handleOpenHelp = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    helpSheetRef.current?.expand();
  };

  const handleOpenAbout = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    aboutSheetRef.current?.expand();
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

  const handleDeleteAccount = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // First warning
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data including:\n\n• All transactions\n• All categories and budgets\n• All income sources\n• All receipts\n• All tags\n• All preferences\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This will permanently delete your account and all data. You will be signed out immediately.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Check if biometric authentication is available
                      const biometricAvailable = await isBiometricAvailable();

                      if (biometricAvailable) {
                        // Trigger biometric authentication
                        if (Platform.OS === 'ios') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }

                        const biometricName = await getBiometricName();
                        const authenticated = await authenticateForAccountDeletion();

                        if (!authenticated) {
                          // Biometric authentication failed or was cancelled
                          Alert.alert(
                            'Authentication Required',
                            `${biometricName} authentication is required to delete your account. Please try again.`
                          );
                          return;
                        }
                      }

                      // Proceed with account deletion after successful authentication (or if biometric not available)
                      await dispatch(deleteAccountAction()).unwrap();
                      if (Platform.OS === 'ios') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
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
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
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
            subtitle={`${currency} - ${currencies.find(c => c.code === currency)?.name || 'US Dollar'}`}
            onPress={handleOpenCurrencySheet}
          />
          <SettingItem
            icon="cash-multiple"
            title="Income Management"
            subtitle="Manage your income sources and auto-scheduling"
            onPress={() => navigation.navigate('IncomeManagement')}
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
            icon="decimal"
            title="Show Decimals"
            subtitle={showDecimals ? 'Decimal points enabled' : 'Whole numbers only'}
            rightComponent={
              <Switch
                value={showDecimals}
                onValueChange={setShowDecimals}
                trackColor={{ false: theme.border, true: theme.primary + '60' }}
                thumbColor={showDecimals ? theme.primary : theme.surface}
              />
            }
          />
          <SettingItem
            icon="calendar-month"
            title="Budget Period"
            subtitle={budgetPeriod.charAt(0).toUpperCase() + budgetPeriod.slice(1)}
            onPress={() => budgetPeriodSheetRef.current?.expand()}
          />
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUBSCRIPTION</Text>
          <SettingItem
            icon="crown"
            title={isPremium ? 'Premium' : 'Free Plan'}
            subtitle={
              isPremium
                ? subscription.trialEndDate
                  ? `Trial ends ${new Date(subscription.trialEndDate).toLocaleDateString()}`
                  : subscription.endDate
                    ? `Renews ${new Date(subscription.endDate).toLocaleDateString()}`
                    : 'Active'
                : 'Upgrade to unlock Premium features'
            }
            onPress={() => navigation.navigate('Subscription')}
            rightComponent={
              isPremium ? (
                <Icon name="check-circle" size={24} color={theme.success} />
              ) : (
                <Icon name="chevron-right" size={24} color={theme.textTertiary} />
              )
            }
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</Text>
          <SettingItem
            icon="file-import"
            title="Import Transactions"
            subtitle="Import from Wallet by BudgetBakers CSV"
            onPress={() => navigation.navigate('CSVImport')}
          />
          <SettingItem
            icon="shield-check"
            title="Privacy & Data"
            subtitle="Export or delete your data"
            onPress={() => navigation.navigate('PrivacySettings')}
          />
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={handleOpenHelp}
          />
          <SettingItem
            icon="information-outline"
            title="About Finly"
            subtitle="Version 1.0.0"
            onPress={handleOpenAbout}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={[styles.logoutIcon, { backgroundColor: theme.primary + '20' }]}>
              <Icon name="logout" size={24} color={theme.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.logoutText, { color: theme.text }]}>Logout</Text>
            </View>
            <Icon name="chevron-right" size={24} color={theme.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.expense + '20', borderColor: theme.expense }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <View style={[styles.logoutIcon, { backgroundColor: theme.expense + '20' }]}>
              <Icon name="delete-forever" size={24} color={theme.expense} />
            </View>
            <Text style={[styles.logoutText, { color: theme.expense }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* <View style={{ height: spacing.xl }} /> */}
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
        snapPoints={['70%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Select Currency</Text>

          {loadingCurrencies ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              {lastUsedCurrency && lastUsedCurrency !== currency && (
                <>
                  <Text style={[styles.currencySectionTitle, { color: theme.textSecondary }]}>Recently Used</Text>
                  {currencies
                    .filter(c => c.code === lastUsedCurrency)
                    .map((curr) => (
                      <TouchableOpacity
                        key={curr.code}
                        style={[
                          styles.currencyOption,
                          {
                            backgroundColor: currency === curr.code ? theme.primary + '20' : theme.card,
                            borderColor: currency === curr.code ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => handleCurrencySelect(curr.code)}
                      >
                        <View style={styles.currencyInfo}>
                          <View style={styles.currencyHeader}>
                            <Text style={styles.currencyFlag}>{curr.flag}</Text>
                            <Text style={[styles.currencyCode, { color: theme.text }]}>{curr.code}</Text>
                          </View>
                          <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                            {curr.name}
                          </Text>
                        </View>
                        {currency === curr.code && (
                          <Icon name="check-circle" size={24} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  <Text style={[styles.currencySectionTitle, { color: theme.textSecondary, marginTop: spacing.md }]}>All Currencies</Text>
                </>
              )}
              {currencies
                .filter(c => !lastUsedCurrency || c.code !== lastUsedCurrency || c.code === currency)
                .map((curr) => (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.currencyOption,
                      {
                        backgroundColor: currency === curr.code ? theme.primary + '20' : theme.card,
                        borderColor: currency === curr.code ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => handleCurrencySelect(curr.code)}
                  >
                    <View style={styles.currencyInfo}>
                      <View style={styles.currencyHeader}>
                        <Text style={styles.currencyFlag}>{curr.flag}</Text>
                        <Text style={[styles.currencyCode, { color: theme.text }]}>{curr.code}</Text>
                      </View>
                      <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                        {curr.name}
                      </Text>
                    </View>
                    {currency === curr.code && (
                      <Icon name="check-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Budget Period Selection Bottom Sheet */}
      <BottomSheet
        ref={budgetPeriodSheetRef}
        index={-1}
        snapPoints={['35%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Budget Period</Text>
          <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
            Choose how often your budget resets
          </Text>

          {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.budgetPeriodOption,
                {
                  backgroundColor: budgetPeriod === period ? theme.primary + '20' : theme.card,
                  borderColor: budgetPeriod === period ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleBudgetPeriodSelect(period)}
            >
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyCode, { color: theme.text }]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
                <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                  {period === 'weekly' ? 'Budget resets every week' :
                    period === 'monthly' ? 'Budget resets every month' :
                      'Budget resets every year'}
                </Text>
              </View>
              {budgetPeriod === period && (
                <Icon name="check-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Help & Support Bottom Sheet */}
      <BottomSheet
        ref={helpSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Help & Support</Text>

          <View style={styles.helpSection}>
            <Text style={[styles.helpSectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              • How do I add an expense?{'\n'}
              Tap the + button on the Dashboard and choose your preferred method.
            </Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              • How do I set a budget?{'\n'}
              Go to Categories, select a category, and set your monthly budget limit.
            </Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              • Can I export my data?{'\n'}
              Yes! Go to Privacy & Data to export your transaction history.
            </Text>
          </View>

          <View style={styles.helpSection}>
            <Text style={[styles.helpSectionTitle, { color: theme.text }]}>Contact Support</Text>
            <TouchableOpacity
              style={[styles.helpContactButton, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
              onPress={() => {
                Alert.alert('Contact Support', 'Email: support@finly.app\n\nWe typically respond within 24 hours.');
              }}
            >
              <Icon name="email-outline" size={20} color={theme.primary} />
              <Text style={[styles.helpContactText, { color: theme.primary }]}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* About Finly Bottom Sheet */}
      <BottomSheet
        ref={aboutSheetRef}
        index={-1}
        snapPoints={['45%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <View style={styles.aboutHeader}>
            <View style={[styles.aboutIcon, { backgroundColor: theme.primary + '20' }]}>
              <Icon name="wallet" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.aboutTitle, { color: theme.text }]}>Finly</Text>
            <Text style={[styles.aboutVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
          </View>

          <Text style={[styles.aboutDescription, { color: theme.textSecondary }]}>
            Finly is your personal expense tracking companion. Track your spending, manage budgets, and gain insights into your financial habits—all while keeping your data private and secure.
          </Text>

          <View style={styles.aboutLinks}>
            <TouchableOpacity
              style={[styles.aboutLink, { borderColor: theme.border }]}
              onPress={() => {
                Alert.alert('Privacy Policy', 'Our privacy policy is available at finly.app/privacy');
              }}
            >
              <Icon name="shield-check-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.aboutLinkText, { color: theme.textSecondary }]}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aboutLink, { borderColor: theme.border }]}
              onPress={() => {
                Alert.alert('Terms of Service', 'Our terms of service are available at finly.app/terms');
              }}
            >
              <Icon name="file-document-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.aboutLinkText, { color: theme.textSecondary }]}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.aboutCopyright, { color: theme.textTertiary }]}>
            © {new Date().getFullYear()} Finly. All rights reserved.
          </Text>
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
    borderWidth: 1,
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
    paddingHorizontal: spacing.md,
    minHeight: Platform.OS === 'ios' ? 52 : undefined,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.md,
    textAlignVertical: 'center',
    includeFontPadding: Platform.OS === 'android' ? false : undefined,
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
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  currencyFlag: {
    fontSize: 24,
  },
  currencySectionTitle: {
    ...typography.labelMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  currencyBadge: {
    ...typography.caption,
    fontSize: 10,
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSubtitle: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
  },
  budgetPeriodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  helpSection: {
    marginBottom: spacing.xl,
  },
  helpSectionTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  helpText: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  helpContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.sm,
  },
  helpContactText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  aboutHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  aboutIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  aboutTitle: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  aboutVersion: {
    ...typography.bodySmall,
  },
  aboutDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  aboutLinks: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  aboutLinkText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  aboutCopyright: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default ProfileScreen;

