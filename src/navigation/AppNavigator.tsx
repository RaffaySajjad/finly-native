/**
 * AppNavigator component
 * Purpose: Main navigation structure with auth, bottom tabs, and stack navigation
 * Implements smooth transitions, premium navigation UI, and authentication flow
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../store';
import { checkAuthStatus } from '../store/slices/authSlice';
import { checkSubscriptionStatus } from '../store/slices/subscriptionSlice';
import { RootStackParamList, MainTabsParamList, AuthStackParamList } from './types';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import InsightsScreen from '../screens/InsightsScreen';
import TrendsScreen from '../screens/TrendsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
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
import IncomeSetupScreen, { hasCompletedIncomeSetup } from '../screens/IncomeSetupScreen';
import OnboardingScreen, { hasCompletedOnboarding } from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IMPORT_SHOWN_KEY = '@finly_import_shown';

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
// Use native tabs on iOS for liquid glass, JS tabs on Android for reliable theming
const NativeTab = createNativeBottomTabNavigator<MainTabsParamList>();
const JSTab = createBottomTabNavigator<MainTabsParamList>();

/**
 * AuthNavigator component - Authentication flow
 * Handles login, signup, and password recovery
 */
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
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
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * MainTabs component - Bottom tab navigation
 * Provides access to main app sections
 * Uses native tabs on iOS (liquid glass) and JS tabs on Android (reliable theming)
 */
const MainTabs: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // iOS version with native tabs and SF Symbols
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
          name="Insights"
          component={InsightsScreen}
          options={{
            title: 'Insights',
            tabBarIcon: () => ({ sfSymbol: 'lightbulb.fill' }),
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
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            tabBarIcon: () => ({ sfSymbol: 'person.fill' }),
          }}
        />
      </NativeTab.Navigator>
    );
  }

  // Android version with JS tabs and Material Icons
  return (
    <JSTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          elevation: 8,
          height: 60 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
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
            <Icon name="shape" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Icon name="lightbulb-on" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
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
const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [incomeSetupComplete, setIncomeSetupComplete] = useState<boolean | null>(null);
  const [importShown, setImportShown] = useState<boolean | null>(null);

  // Check onboarding status
  const checkOnboarding = useCallback(async () => {
    const completed = await hasCompletedOnboarding();
    setOnboardingComplete(completed);
  }, []);

  // Check income setup status
  const checkIncomeSetup = useCallback(async () => {
    const completed = await hasCompletedIncomeSetup();
    setIncomeSetupComplete(completed);
  }, []);

  // Check if import modal has been shown
  const checkImportShown = useCallback(async () => {
    try {
      const shown = await AsyncStorage.getItem(IMPORT_SHOWN_KEY);
      setImportShown(shown === 'true');
    } catch {
      setImportShown(false);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    dispatch(checkAuthStatus());
    dispatch(checkSubscriptionStatus());
    checkOnboarding();
  }, [dispatch, checkOnboarding]);

  // Check income setup after onboarding completes
  useEffect(() => {
    if (onboardingComplete) {
      checkIncomeSetup();
    }
  }, [onboardingComplete, checkIncomeSetup]);

  // Check import shown status after income setup completes
  useEffect(() => {
    if (incomeSetupComplete) {
      checkImportShown();
    }
  }, [incomeSetupComplete, checkImportShown]);

  // Re-check onboarding and income setup periodically to catch completion
  useEffect(() => {
    // Check immediately first
    if (!onboardingComplete) {
      checkOnboarding();
    } else if (!incomeSetupComplete) {
      checkIncomeSetup();
    } else if (incomeSetupComplete && importShown === null) {
      checkImportShown();
    }

    const interval = setInterval(() => {
      if (!onboardingComplete) {
        checkOnboarding();
      } else if (!incomeSetupComplete) {
        checkIncomeSetup();
      } else if (incomeSetupComplete && importShown === null) {
        checkImportShown();
      }
    }, 200); // Check every 200ms for faster response

    return () => clearInterval(interval);
  }, [checkOnboarding, checkIncomeSetup, checkImportShown, onboardingComplete, incomeSetupComplete, importShown]);

  // Show loading screen while checking auth state and onboarding
  if (isLoading || onboardingComplete === null || (onboardingComplete && incomeSetupComplete === null) || (incomeSetupComplete && importShown === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
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
      }}
    >
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
          </>
        ) : !incomeSetupComplete ? (
          // Income Setup - shown after onboarding for first-time users
          <Stack.Screen
            name="IncomeSetup"
            component={IncomeSetupScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
        ) : !importShown ? (
          // Import Modal - shown after income setup completes (first time only)
          <Stack.Screen
            name="CSVImport"
            component={(props: any) => <CSVImportScreen {...props} route={{ ...props.route, params: { firstTime: true } }} />}
            options={{
              title: 'Import Transactions',
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        ) : (
                  // Main App Stack - shown when user is authenticated, onboarded, and income setup is complete
          <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddExpense"
                component={AddExpenseScreen}
                options={{
                  title: 'Add Transaction',
                  presentation: 'modal',
                  headerShown: true,
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
                        title: 'AI Transaction Entry',
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
                      name="BalanceHistory"
                      component={BalanceHistoryScreen}
                      options={{
                        title: 'Balance History',
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

