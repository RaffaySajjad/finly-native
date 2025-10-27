/**
 * AppNavigator component
 * Purpose: Main navigation structure with bottom tabs and stack navigation
 * Implements smooth transitions and premium navigation UI
 */

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
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
const Tab = createNativeBottomTabNavigator<MainTabsParamList>();

/**
 * MainTabs component - Bottom tab navigation
 * Provides access to main app sections
 */
const MainTabs: React.FC = () => {
  const { theme } = useTheme();

  // Platform-specific icon configuration
  const getTabIcon = (iosSymbol: string, androidIcon: string) => {
    if (Platform.OS === 'ios') {
      return { sfSymbol: iosSymbol };
    }
    // For Android, return the Material Community Icon name
    return { androidIcon };
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        ...(Platform.OS === 'android' && {
          tabBarStyle: {
            backgroundColor: theme.isDark ? theme.surface : '#FFFFFF',
            borderTopColor: theme.border,
            borderTopWidth: 1,
            elevation: 8,
          },
        }),
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: () => getTabIcon('house.fill', 'home') as any,
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categories',
          tabBarIcon: () => getTabIcon('square.grid.2x2.fill', 'shape') as any,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          title: 'Insights',
          tabBarIcon: () => getTabIcon('lightbulb.fill', 'lightbulb-on') as any,
        }}
      />
      <Tab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{
          title: 'Trends',
          tabBarIcon: () => getTabIcon('chart.line.uptrend.xyaxis', 'chart-line') as any,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: () => getTabIcon('person.fill', 'account') as any,
        }}
      />
    </Tab.Navigator>
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

