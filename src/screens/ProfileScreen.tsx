/**
 * ProfileScreen component
 * Purpose: User profile and settings screen
 * Includes theme toggle, user info, app settings, and logout
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  TextInput,
  Platform,
  Animated,
  Easing,
  LayoutAnimation,
} from 'react-native';
import { useAlert } from '../hooks/useAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '../components/GradientHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { logger } from '../utils/logger';
import { useAppDispatch, useAppSelector } from '../store';
import { logout as logoutAction, updateProfile as updateProfileAction, deleteAccount as deleteAccountAction } from '../store/slices/authSlice';
import { toggleMockIAP, loadDevSettings } from '../store/slices/devSettingsSlice';
import { iapService } from '../services/iap.service';
import { useSubscription } from '../hooks/useSubscription';
import { BottomSheetBackground, SettingItem, Header, InputGroup, PrimaryButton, SecondaryButton, CurrencySelector, DeleteAccountSheet, FAQItem } from '../components';
import StreakCard from '../components/StreakCard';
import { DeleteAccountSheetRef } from '../components/DeleteAccountSheet';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import {
  getUserCurrency,
  saveUserCurrency,
} from '../services/currencyService';
import {
  isBiometricAvailable,
  disableBiometricLogin,
  isBiometricLoginEnabled,
  enableBiometricLogin,
} from '../services/biometricService';
import { usePreferences } from '../contexts/PreferencesContext';
import { apiService } from '../services/api';
import { notificationService } from '../services/notificationService';
import { useGoal, GOAL_INFO } from '../hooks/useGoal';
import GoalSelectorSheet, { GoalSelectorSheetRef } from '../components/GoalSelectorSheet';

/**
 * ProfileScreen - User settings and preferences
 */
const ProfileScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { currency: currencyState, setCurrency: setCurrencyGlobal, showDecimals, setShowDecimals } = useCurrency();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const { enableMockIAP } = useAppSelector((state) => state.devSettings || { enableMockIAP: false });
  const { isPremium, subscription } = useSubscription();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { animateBalancePill, setAnimateBalancePill, diagnosticsEnabled, setDiagnosticsEnabled } = usePreferences();
  const { showError, showSuccess, showWarning, showInfo, AlertComponent } = useAlert();
  const { goal, goalInfo } = useGoal();
  const goalSelectorRef = useRef<GoalSelectorSheetRef>(null);



  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [expandedFAQIndex, setExpandedFAQIndex] = useState<number | null>(null);

  const editProfileSheetRef = useRef<BottomSheet>(null);
  const currencySheetRef = useRef<BottomSheet>(null);
  const helpSheetRef = useRef<BottomSheet>(null);
  const aboutSheetRef = useRef<BottomSheet>(null);
  const deleteAccountSheetRef = useRef<DeleteAccountSheetRef>(null);



  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
    }
    loadCurrency();
    checkNotificationStatus();
    dispatch(loadDevSettings());
    checkBiometricSupport();
  }, [user]);

  // Reload notification status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkNotificationStatus();
    }, [])
  );

  const checkBiometricSupport = async () => {
    const supported = await isBiometricAvailable();
    setBiometricSupported(supported);
    if (supported) {
      const enabled = await isBiometricLoginEnabled();
      setBiometricEnabled(enabled);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await enableBiometricLogin();
      if (success) {
        setBiometricEnabled(true);
        // Haptic feedback on iOS and Android
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showError('Error', 'Failed to enable biometric login');
      }
    } else {
      await disableBiometricLogin();
      setBiometricEnabled(false);
      // Haptic feedback on iOS and Android
      Haptics.selectionAsync();
    }
  };

  // Sync IAP service with redux state
  useEffect(() => {
    iapService.setMockMode(enableMockIAP);
  }, [enableMockIAP]);

  const loadCurrency = async () => {
    try {
      const savedCurrency = await getUserCurrency();
      setCurrency(savedCurrency);
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const enabled = await notificationService.areNotificationsEnabled();
      logger.debug('[ProfileScreen] Notification permission status:', enabled);
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Error checking notification status:', error);
      setNotificationsEnabled(false);
    }
  };

  const handleOpenNotificationSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await notificationService.openAppSettings();
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    editProfileSheetRef.current?.expand();
  };

  const handleSaveProfile = async () => {
    if (!editName || !editEmail) {
      showInfo('Missing Fields', 'Please fill in both name and email');
      return;
    }

    try {
      await dispatch(updateProfileAction({ name: editName, email: editEmail })).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      editProfileSheetRef.current?.close();
      showSuccess('Success', 'Profile updated successfully!');
    } catch (error) {
      showError('Error', 'Failed to update profile');
    }
  };

  const handleCurrencySelect = async (curr: string) => {
    setCurrency(curr);
    await saveUserCurrency(curr); // This already calls saveLastUsedCurrency
    await setCurrencyGlobal(curr); // Update global currency context
    Haptics.selectionAsync();
    currencySheetRef.current?.close();
  };

  const handleOpenCurrencySheet = () => {
    currencySheetRef.current?.expand();
  };

  const handleOpenHelp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    helpSheetRef.current?.expand();
  };

  const handleOpenAbout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    aboutSheetRef.current?.expand();
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    showWarning(
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showError('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Open delete account sheet
    deleteAccountSheetRef.current?.open();
  };



  const handleToggleMockIAP = (value: boolean) => {
    dispatch(toggleMockIAP(value));
    Haptics.selectionAsync();
  };

  const handleSendTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await notificationService.sendTestNotification();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      showError(
        'Error',
        error.message || 'Failed to send test notification. Make sure notifications are enabled.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      <View style={{ marginTop: insets.top }}>
        <Header
          title="Settings"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Streak Hero Section - Prominently displayed */}
        {user?.streakCount !== undefined && user.streakCount > 0 && (
          <View style={styles.streakHeroContainer}>
            <StreakCard
              streakCount={user.streakCount}
              currentXP={user.currentXP}
              level={user.level}
            />
          </View>
        )}

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
          <SettingItem
            icon="animation-play"
            title="Floating Balance Indicator"
            subtitle={animateBalancePill ? 'Displays balance while scrolling' : 'Hidden while scrolling'}
            rightComponent={
              <Switch
                value={animateBalancePill}
                onValueChange={setAnimateBalancePill}
                trackColor={{ false: theme.border, true: theme.primary + '60' }}
                thumbColor={animateBalancePill ? theme.primary : theme.surface}
              />
            }
          />
        </View>

        {/* Security Section */}
        {biometricSupported && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SECURITY</Text>
            <SettingItem
              icon="shield-check"
              title="Biometric Login"
              subtitle="Require face or fingerprint to open app"
              rightComponent={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: theme.border, true: theme.primary + '60' }}
                  thumbColor={biometricEnabled ? theme.primary : theme.surface}
                />
              }
            />
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
          <SettingItem
            icon="currency-usd"
            title="Currency"
            subtitle={`${currencyState.code} - ${currencyState.name}`}
            onPress={handleOpenCurrencySheet}
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
            icon="bell-outline"
            title="Notifications"
            subtitle={notificationsEnabled ? 'Manage notification categories' : 'Disabled - Enable in device settings'}
            onPress={() => notificationsEnabled ? navigation.navigate('NotificationPreferences') : handleOpenNotificationSettings()}
            rightComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: notificationsEnabled ? theme.success : theme.textTertiary,
                  }}
                />
                <Icon name="chevron-right" size={24} color={theme.textTertiary} />
              </View>
            }
          />
          <SettingItem
            icon="bug-outline"
            title="Share Crash Reports"
            subtitle={diagnosticsEnabled ? 'Help improve Finly AI by sharing anonymous crash data' : 'Disabled - crash data stays on device'}
            rightComponent={
              <Switch
                value={diagnosticsEnabled}
                onValueChange={setDiagnosticsEnabled}
                trackColor={{ false: theme.border, true: theme.primary + '60' }}
                thumbColor={diagnosticsEnabled ? theme.primary : theme.surface}
              />
            }
          />
        </View>

        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>YOUR GOAL</Text>
          <SettingItem
            icon={goalInfo?.icon || 'target'}
            title="Financial Goal"
            subtitle={goalInfo ? goalInfo.description : 'Set your primary focus'}
            onPress={() => goalSelectorRef.current?.open()}
            rightComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                {goalInfo && (
                  <View
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.sm,
                      backgroundColor: goalInfo.color + '20',
                    }}
                  >
                    <Text style={{ color: goalInfo.color, fontSize: 12, fontWeight: '600' }}>
                      {goalInfo.title}
                    </Text>
                  </View>
                )}
                <Icon name="chevron-right" size={24} color={theme.textTertiary} />
              </View>
            }
          />
        </View>

        {/* Data & Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA & MANAGEMENT</Text>
          <SettingItem
            icon="cash-multiple"
            title="Income Management"
            subtitle="Manage your income sources and auto-scheduling"
            onPress={() => navigation.navigate('IncomeManagement')}
          />
          <SettingItem
            icon="shield-check"
            title="Privacy & Data"
            subtitle="Manage data imports, exports, and deletion"
            onPress={() => navigation.navigate('PrivacySettings')}
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
                  ? `Trial ends ${new Date(subscription.trialEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : subscription.endDate
                    ? `Renews ${new Date(subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
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

        {/* Developer Settings Section */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DEVELOPER SETTINGS</Text>
            <SettingItem
              icon="test-tube"
              title="Mock IAP Mode"
              subtitle={enableMockIAP ? 'Enabled - Purchases will be simulated' : 'Disabled - Real IAP'}
              rightComponent={
                <Switch
                  value={enableMockIAP}
                  onValueChange={handleToggleMockIAP}
                  trackColor={{ false: theme.border, true: theme.warning + '60' }}
                  thumbColor={enableMockIAP ? theme.warning : theme.surface}
                />
              }
            />
            <SettingItem
              icon="flask"
              title="IAP Testing Lab"
              subtitle="Test all in-app purchase scenarios"
              onPress={() => navigation.navigate('DevMenu')}
            />
            <SettingItem
              icon="bell-ring-outline"
              title="Send Test Notification"
              subtitle="Send a test push notification to this device"
              onPress={handleSendTestNotification}
            />
          </View>
        )}

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
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Profile</Text>

          <InputGroup
            label="Full Name"
            placeholder="Your name"
            value={editName}
            onChangeText={setEditName}
            required
            TextInputComponent={BottomSheetTextInput}
          />

          <InputGroup
            label="Email"
            placeholder="you@email.com"
            value={editEmail}
            onChangeText={setEditEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            required
            TextInputComponent={BottomSheetTextInput}
          />

          <PrimaryButton
            label="Save Changes"
            onPress={handleSaveProfile}
            loading={isLoading}
            fullWidth
          />
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Currency Selection Bottom Sheet */}
      <BottomSheet
        ref={currencySheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
        enableDynamicSizing={false}
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <CurrencySelector
          selectedCurrency={currency}
          onCurrencySelect={handleCurrencySelect}
          renderContainer={(children) => (
            <BottomSheetScrollView
              style={styles.bottomSheetContent}
              contentContainerStyle={styles.bottomSheetContentContainer}
            >
              {children}
            </BottomSheetScrollView>
          )}
        />
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

            {[
              {
                question: "Is my financial data secure?",
                answer: "Yes. Your data is securely stored in our encrypted database, ensuring it's backed up and accessible across your devices. We use bank-grade encryption to protect your information."
              },
              {
                question: "Who can see my transactions?",
                answer: "Only you. While your data is stored in our secure cloud to enable sync, strictly no one else has access to your personal financial records."
              },
              {
                question: "Can I export data for accounting?",
                answer: "Yes. You can export your full transaction history securely as a CSV file from the Privacy & Data settings, making it easy to share with your accountant."
              },
              {
                question: "How do I backup my data?",
                answer: "Your data is automatically backed up to our secure cloud servers in real-time. You don't need to do anything manually; it's always safe."
              },
              {
                question: "How are exchange rates calculated?",
                answer: "We use real-time, bank-grade exchange rate data to ensure your multi-currency transactions are converted accurately for your analytics."
              },
              {
                question: "Does the AI share my private data?",
                answer: "No. All AI analysis is completely anonymized and cannot be linked back to you. We strictly process data only to provide insights and never retain personal information."
              },
              {
                question: "How do I manage my subscription?",
                answer: "Your subscription is managed directly through your Apple ID or Google Play Store account. You can view status or cancel anytime from your device settings."
              }
            ].map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isExpanded={expandedFAQIndex === index}
                onToggle={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedFAQIndex(expandedFAQIndex === index ? null : index);
                }}
              />
            ))}
          </View>

          <View style={styles.helpSection}>
            <Text style={[styles.helpSectionTitle, { color: theme.text }]}>Contact Support</Text>
            <TouchableOpacity
              style={[styles.helpContactButton, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
              onPress={() => {
                showInfo('Contact Support', 'Email: hello@heyfinly.ai\n\nWe typically respond within 24 hours.');
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
            Finly AI is your personal expense tracking companion. Track your spending, manage budgets, and gain insights into your financial habits—all while keeping your data private and secure.
          </Text>

          <View style={styles.aboutLinks}>
            <TouchableOpacity
              style={[styles.aboutLink, { borderColor: theme.border }]}
              onPress={() => {
                aboutSheetRef.current?.close();
                navigation.navigate('TermsOfService');
              }}
            >
              <Icon name="file-document-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.aboutLinkText, { color: theme.textSecondary }]}>Terms of Service</Text>
              <Icon name="chevron-right" size={20} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aboutLink, { borderColor: theme.border }]}
              onPress={() => {
                aboutSheetRef.current?.close();
                navigation.navigate('PrivacyPolicy');
              }}
            >
              <Icon name="shield-check-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.aboutLinkText, { color: theme.textSecondary }]}>Privacy Policy</Text>
              <Icon name="chevron-right" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.aboutCopyright, { color: theme.textTertiary }]}>
            © {new Date().getFullYear()} Finly. All rights reserved.
          </Text>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Goal Selector Bottom Sheet */}
      <GoalSelectorSheet
        ref={goalSelectorRef}
        onGoalChanged={(newGoal) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccess('Goal Updated', `Your focus is now "${GOAL_INFO[newGoal].title}"`);
        }}
      />

      {/* Delete Account Feedback Bottom Sheet */}
      <DeleteAccountSheet
        ref={deleteAccountSheetRef}
      />
      {AlertComponent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
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
  streakHeroContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  streakText: {
    ...typography.labelLarge,
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
  deleteAccountHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  deleteAccountIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  deleteAccountTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  deleteAccountSubtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  feedbackSection: {
    marginBottom: spacing.lg,
  },
  feedbackLabel: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  feedbackHint: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  feedbackInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 80,
    maxHeight: 120,
  },
  deleteAccountWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  deleteAccountWarningText: {
    flex: 1,
    ...typography.bodySmall,
    lineHeight: 20,
  },
  deleteAccountActions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  deleteAccountButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ProfileScreen;

