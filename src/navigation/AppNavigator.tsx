/**
 * AppNavigator component
 * Purpose: Main navigation structure with bottom tabs and stack navigation
 * Implements smooth transitions and premium navigation UI
 */

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, MainTabsParamList } from './types';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import InsightsScreen from '../screens/InsightsScreen';
import TrendsScreen from '../screens/TrendsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ReceiptUploadScreen from '../screens/ReceiptUploadScreen';

const Stack = createStackNavigator<RootStackParamList>();
// Use native tabs on iOS for liquid glass, JS tabs on Android for reliable theming
const NativeTab = createNativeBottomTabNavigator<MainTabsParamList>();
const JSTab = createBottomTabNavigator<MainTabsParamList>();

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
 * Manages stack navigation with modal presentations
 */
export const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();

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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

