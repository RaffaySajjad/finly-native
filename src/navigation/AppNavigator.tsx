/**
 * AppNavigator component
 * Purpose: Main navigation structure with auth, bottom tabs, and stack navigation
 * Implements smooth transitions, premium navigation UI, and authentication flow
 */

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, Linking, View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, NavigationContainerRef, Theme as NavigationTheme } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { useAppFlow } from '../contexts/AppFlowContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAppDispatch, useAppSelector } from '../store';
import { checkAuthStatus, refreshUser } from '../store/slices/authSlice';
import { checkSubscriptionStatus } from '../store/slices/subscriptionSlice';
import { fetchUnreadCount } from '../store/slices/insightsSlice';
import { RootStackParamList, MainTabsParamList, AuthStackParamList } from './types';
import CustomTabBar from '../components/CustomTabBar';
import SharedBottomSheet from '../components/SharedBottomSheet';
import { CreateCategoryModalProvider } from '../contexts/CreateCategoryModalContext';
import { CreateCategoryModal } from '../components/CreateCategoryModal';
import { useQuickActions } from '../hooks/useQuickActions';
import { prefetchAllScreenData } from '../services/prefetch';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import InsightsScreen from '../screens/InsightsScreen';
import TrendsScreen from '../screens/TrendsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddIncomeScreen from '../screens/AddIncomeScreen';
import ReceiptUploadScreen from '../screens/ReceiptUploadScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';
import CategoryDetailsScreen from '../screens/CategoryDetailsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import VoiceTransactionScreen from '../screens/VoiceTransactionScreen';
import BulkTransactionScreen from '../screens/BulkTransactionScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import ReceiptGalleryScreen from '../screens/ReceiptGalleryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import BalanceHistoryScreen from '../screens/BalanceHistoryScreen';
import TransactionsListScreen from '../screens/TransactionsListScreen';
import CategoryOnboardingScreen from '../screens/CategoryOnboardingScreen';
import IncomeManagementScreen from '../screens/IncomeManagementScreen';
import CSVImportScreen from '../screens/CSVImportScreen';
import ExportTransactionsScreen from '../screens/ExportTransactionsScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import DevMenuScreen from '../screens/DevMenuScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';

import IncomeSetupScreen from '../screens/IncomeSetupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PaywallScreen from '../screens/PaywallScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerificationScreen from '../screens/VerificationScreen';

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
// Use native tabs on iOS for liquid glass, JS tabs on Android for reliable theming
const NativeTab = createNativeBottomTabNavigator<MainTabsParamList>();
const JSTab = createBottomTabNavigator<MainTabsParamList>();

/**
 * QuickActionsHandler component
 * Purpose: Initializes and handles home screen quick actions (3D Touch iOS / Long Press Android)
 * Must be rendered inside NavigationContainer to access navigation context
 */
interface QuickActionsHandlerProps {
  isReady: boolean;
}

const QuickActionsHandler: React.FC<QuickActionsHandlerProps> = ({ isReady }) => {
  useQuickActions({ isReady });
  return null; // This component doesn't render anything
};

/**
 * AuthNavigator component - Authentication flow
 * Handles welcome, login, signup, and password recovery
 */
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="Verification" component={VerificationScreen} />
      <AuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <AuthStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * MainTabs component - Bottom tab navigation
 * Order: Home, Categories, FAB (center), Finly AI, Settings
 */
const MainTabs: React.FC = () => {
  const { theme } = useTheme();
  const { openBottomSheet } = useBottomSheetActions();
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector((state) => state.insights.unreadCount);

  // Fetch unread count on mount
  useEffect(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const handleFabPress = React.useCallback(() => {
    openBottomSheet();
  }, [openBottomSheet]);

  /**
   * Notification badge component for tab icons
   */
  const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
    if (count === 0) return null;
    return (
      <View style={tabStyles.badge}>
        <View style={[tabStyles.badgeDot, { backgroundColor: theme.primary }]} />
      </View>
    );
  };

  // iOS version - use native tabs (FAB will be floating for iOS)
  if (Platform.OS === 'ios') {
    return (
      <NativeTab.Navigator
        tabBarActiveTintColor={theme.primary}
        tabBarInactiveTintColor={theme.textTertiary}
      >
        <NativeTab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Home',
            tabBarIcon: () => ({ sfSymbol: 'house.fill' }),
          }}
        />
        <NativeTab.Screen
          name="Categories"
          component={CategoriesScreen}
          options={{
            title: 'Categories',
            tabBarIcon: () => ({ sfSymbol: 'square.grid.2x2.fill' }),
          }}
        />
        <NativeTab.Screen
          name="Trends"
          component={TrendsScreen}
          options={{
            title: 'Trends',
            tabBarIcon: () => ({ sfSymbol: 'chart.line.uptrend.xyaxis' }),
          }}
        />
        <NativeTab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            title: 'Insights',
            tabBarIcon: () => ({ sfSymbol: 'lightbulb.fill' }),
            tabBarBadge: unreadCount > 0 ? '' : undefined, // Empty string shows dot badge on iOS
          }}
        />
        <NativeTab.Screen
          name="AIAssistant"
          component={AIAssistantScreen}
          options={{
            title: 'Finly AI',
            tabBarIcon: () => ({ sfSymbol: 'brain.fill' }),
          }}
        />
      </NativeTab.Navigator>
    );
  }

  // Android version with custom tab bar (center FAB)
  return (
    <JSTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        lazy: true, // Load screens only when navigated to
        animation: 'fade', // Smooth fade transition between tabs
      }}
      tabBar={(props) => <CustomTabBar {...props} onFabPress={handleFabPress} />}
    >
      <JSTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size }) => (
            <Icon name="tag-multiple" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-timeline-variant" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => (
            <Icon name="robot" size={size} color={color} />
          ),
        }}
      />
    </JSTab.Navigator>
  );
};

/**
 * AppNavigator component - Root navigation structure
 * Manages authentication state and navigation flow
 */
import { useNotificationObserver } from '../hooks/useNotificationObserver';

// ... 

const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isRestoringAuth } = useAppSelector((state) => state.auth);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { onboardingComplete, paywallComplete, incomeSetupComplete, categorySetupComplete, refreshFlowState, markPaywallComplete } = useAppFlow();
  const { reloadCurrency } = useCurrency();

  // Access subscription state from Redux to sync paywall completion across platforms
  const { subscription, isLoading: subscriptionLoading } = useAppSelector((state) => state.subscription);

  // Register global notification observer
  useNotificationObserver(navigationRef);

  // Cross-platform subscription sync: If user has active Premium subscription from backend,
  // auto-mark paywall as complete. This ensures users who subscribed on one platform (e.g., Android)
  // can access the app on another platform (e.g., iOS) without being blocked by the paywall.
  useEffect(() => {
    const isPremiumActive = subscription.tier === 'PREMIUM' && subscription.isActive;
    const shouldAutoCompletePaywall = isAuthenticated && isPremiumActive && !paywallComplete && !subscriptionLoading;

    if (shouldAutoCompletePaywall) {
      console.log('[AppNavigator] User has active Premium subscription from backend, auto-marking paywall complete');
      markPaywallComplete();
    }
  }, [isAuthenticated, subscription.tier, subscription.isActive, paywallComplete, subscriptionLoading, markPaywallComplete]);

  // HARD PAYWALL ENFORCEMENT: If subscription has expired (status=EXPIRED), force user back to paywall.
  // This ensures users cannot continue using the app after their subscription expires.
  const { markSubscriptionExpired } = useAppFlow();
  useEffect(() => {
    const isExpired = subscription.status === 'EXPIRED';
    const shouldEnforcePaywall = isAuthenticated && isExpired && paywallComplete && !subscriptionLoading;

    if (shouldEnforcePaywall) {
      console.log('[AppNavigator] Subscription EXPIRED, enforcing hard paywall');
      markSubscriptionExpired();
    }
  }, [isAuthenticated, subscription.status, paywallComplete, subscriptionLoading, markSubscriptionExpired]);

  // Auth status and subscription are now checked in App.tsx during splash screen
  // This effect only handles re-checking when auth state changes (e.g., after login/logout)
  // to refresh onboarding flags for returning users or after account deletion
  const previousAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    // Only refresh flow state when authentication status changes
    // Skip initial mount since App.tsx handles that during splash
    if (isAuthenticated && !previousAuthRef.current) {
    // User just logged in - refresh subscription and flow state
      dispatch(checkSubscriptionStatus());
      dispatch(refreshUser()); // Refresh user profile (streaks, goals, etc.)
      refreshFlowState();

      // Reload currency and exchange rate to ensure correct values after login
      // This fixes the bug where currency symbol is correct but value shows in USD
      reloadCurrency();

      // Prefetch data for frequently visited screens in the background
      // This improves perceived performance when navigating to these screens
      prefetchAllScreenData();
    }
    previousAuthRef.current = isAuthenticated;
  }, [isAuthenticated, dispatch, refreshFlowState, reloadCurrency]);

  // Initial user refresh on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(refreshUser());
    }
  }, [isAuthenticated, dispatch]);

  // CHECK SUBSCRIPTION ON APP FOREGROUND
  // This ensures we catch expired subscriptions even if push notification wasn't received
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground from background
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isAuthenticated) {
          console.log('[AppNavigator] App foregrounded, checking subscription and user status...');
          dispatch(checkSubscriptionStatus());
          dispatch(refreshUser());
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, dispatch]);

  // Prefetch data when app loads with existing auth session
  // This runs once when user opens the app already logged in
  const hasPrefetchedRef = useRef(false);
  useEffect(() => {
    const isUserReady = isAuthenticated && onboardingComplete === true && paywallComplete === true && incomeSetupComplete === true && categorySetupComplete === true;

    if (isUserReady && !hasPrefetchedRef.current) {
      hasPrefetchedRef.current = true;
      // Small delay to let the main navigation render first
      const timer = setTimeout(() => {
        prefetchAllScreenData();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, onboardingComplete, paywallComplete, incomeSetupComplete]);

  // Handle deep linking from widgets
  const { openBottomSheet } = useBottomSheetActions();

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      // Ensure user is ready to receive deep links
      const isUserReady = isAuthenticated && onboardingComplete && paywallComplete && incomeSetupComplete && categorySetupComplete;

      if (url.startsWith('finly://add-transaction')) {
        // Open SharedBottomSheet for manual transaction entry
        if (isUserReady) {
          openBottomSheet();
        }
      } else if (url.startsWith('finly://voice-transaction')) {
        // Navigate to VoiceTransaction screen for voice entry
        if (isUserReady && navigationRef.current) {
          navigationRef.current.navigate('VoiceTransaction');
        }
      } else if (url.startsWith('finly://scan-receipt')) {
        // Navigate to ReceiptUpload screen for receipt scanning
        if (isUserReady && navigationRef.current) {
          navigationRef.current.navigate('ReceiptUpload');
        }
      } else if (url.startsWith('finly://ai-assistant')) {
        // Navigate to AI Assistant screen
        if (isUserReady && navigationRef.current) {
          navigationRef.current.navigate('AIAssistant');
        }
      }
    };

    // Handle initial URL (app opened from widget)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL changes (app already running)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, onboardingComplete, paywallComplete, incomeSetupComplete, openBottomSheet]);


  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      dark: isDark,
      colors: {
        primary: theme.primary,
        background: theme.background,
        card: theme.surface,
        text: theme.text,
        border: theme.border,
        notification: theme.primary,
      },
      fonts: {
        regular: {
          fontFamily: 'System',
          fontWeight: '400',
        },
        medium: {
          fontFamily: 'System',
          fontWeight: '500',
        },
        bold: {
          fontFamily: 'System',
          fontWeight: '700',
        },
        heavy: {
          fontFamily: 'System',
          fontWeight: '900',
        },
      },
    }),
    [isDark, theme]
  );

  // Note: Loading state is now handled by AnimatedSplashScreen in App.tsx
  // The splash screen waits for auth restoration and flow state loading
  // before allowing AppNavigator to render, so this check is no longer needed

  // Quick actions are ready when user is authenticated and all setup is complete
  const isQuickActionsReady = isAuthenticated && onboardingComplete === true && paywallComplete === true && incomeSetupComplete === true && categorySetupComplete === true;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
    >
      {/* Initialize home screen quick actions (3D Touch iOS / Long Press Android) */}
      <QuickActionsHandler isReady={isQuickActionsReady} />
      <CreateCategoryModalProvider>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.surface,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
            headerTintColor: theme.text,
            headerTitleStyle: {
              fontSize: 20,
              fontWeight: '600',
            },
            cardStyle: {
              backgroundColor: theme.background,
            },
            ...TransitionPresets.SlideFromRightIOS, // Apply standard iOS slide transition globally
          }}
        >
          {!isAuthenticated ? (
            // Auth Stack - shown when user is not authenticated
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ headerShown: false }}
            />
          ) : !onboardingComplete ? (
            // Onboarding - shown for first-time users
            <>
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="CSVImport"
                component={CSVImportScreen}
                options={{
                  title: 'Import Transactions',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ExportTransactions"
                component={ExportTransactionsScreen}
                options={{
                  title: 'Export Transactions',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              </>
            ) : !incomeSetupComplete ? (
              // Income Setup - shown after onboarding for first-time users
              <Stack.Screen
                name="IncomeSetup"
                component={IncomeSetupScreen}
                options={{ headerShown: false, gestureEnabled: false }}
              />
            ) : !categorySetupComplete ? (
                  // Category Setup - shown after income setup for first-time users
              <Stack.Screen
                name="CategoryOnboarding"
                component={CategoryOnboardingScreen}
                options={{ headerShown: false, gestureEnabled: false }}
                  />
                ) : !paywallComplete ? (
                    // Paywall - shown after setup, MUST subscribe or restore to continue
                    <>
                      <Stack.Screen
                        name="Paywall"
                        component={PaywallScreen}
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="TermsOfService"
                        component={TermsOfServiceScreen}
                        options={{
                          title: 'Terms of Service',
                          presentation: 'modal',
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="PrivacyPolicy"
                        component={PrivacyPolicyScreen}
                        options={{
                          title: 'Privacy Policy',
                          presentation: 'modal',
                          headerShown: false,
                        }}
                      />
                    </>
                  ) : (
                      // Main App Stack - shown when user is authenticated, onboarded, setup complete, and paywall passed (or free tier)
                      <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />
                    <Stack.Screen
                      name="AddIncome"
                      component={AddIncomeScreen}
                      options={{
                        title: 'Add Income',
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                name="ReceiptUpload"
                component={ReceiptUploadScreen}
                options={{
                  title: 'Scan Receipt',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="TransactionDetails"
                component={TransactionDetailsScreen}
                options={{
                  title: 'Transaction Details',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="CategoryDetails"
                component={CategoryDetailsScreen}
                options={{
                  title: 'Category Details',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Subscription"
                component={SubscriptionScreen}
                options={{
                  title: 'Subscription',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="VoiceTransaction"
                component={VoiceTransactionScreen}
                options={{
                  title: 'Smart Entry',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="BulkTransaction"
                component={BulkTransactionScreen}
                options={{
                  title: 'Bulk Transaction Entry',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="PrivacySettings"
                component={PrivacySettingsScreen}
                options={{
                  title: 'Privacy & Data',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{
                  title: 'Privacy Policy',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="TermsOfService"
                component={TermsOfServiceScreen}
                options={{
                  title: 'Terms of Service',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ReceiptGallery"
                component={ReceiptGalleryScreen}
                options={{
                  title: 'Receipt Gallery',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Analytics"
                component={AnalyticsScreen}
                options={{
                  title: 'Analytics',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Insights"
                component={InsightsScreen}
                options={{
                  title: 'Insights',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Trends"
                component={TrendsScreen}
                options={{
                  title: 'Trends',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="BalanceHistory"
                component={BalanceHistoryScreen}
                options={{
                  title: 'Balance Analytics',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="TransactionsList"
                component={TransactionsListScreen}
                options={{
                  title: 'All Transactions',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="CategoryOnboarding"
                component={CategoryOnboardingScreen}
                options={{
                  title: 'Set Up Categories',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="IncomeManagement"
                component={IncomeManagementScreen}
                options={{
                  title: 'Income Management',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="CSVImport"
                component={CSVImportScreen}
                options={{
                  title: 'Import Transactions',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ExportTransactions"
                component={ExportTransactionsScreen}
                options={{
                  title: 'Export Transactions',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="AIAssistant"
                component={AIAssistantScreen}
                options={{
                  title: 'Finly AI',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Settings"
                component={ProfileScreen}
                options={{
                  title: 'Settings',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="DevMenu"
                component={DevMenuScreen}
                options={{
                  title: 'Dev Menu',
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
                    <Stack.Screen
                      name="NotificationPreferences"
                      component={NotificationPreferencesScreen}
                      options={{
                        title: 'Notification Preferences',
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
            </>
          )}
        </Stack.Navigator>
        {/* SharedBottomSheet - rendered outside Stack to be always accessible */}
        {isAuthenticated && (
          <>
            {onboardingComplete && paywallComplete && incomeSetupComplete && categorySetupComplete && (
              <SharedBottomSheet />
            )}
            <CreateCategoryModal />
          </>
        )}
      </CreateCategoryModalProvider>

    </NavigationContainer>
  );
};

/**
 * Styles for tab bar badges
 */
const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 8,
    height: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default AppNavigator;

