/**
 * CustomTabBar Component
 * Purpose: Custom tab bar with center FAB button
 * Features: Prominent center button, consistent styling, quick actions on long press
 */

import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { RootStackParamList } from '../navigation/types';
import FABQuickActions from './FABQuickActions';
import * as Haptics from 'expo-haptics';

interface CustomTabBarProps extends BottomTabBarProps {
  onFabPress: () => void;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation, onFabPress }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { openBottomSheet } = useBottomSheetActions();
  const stackNavigation = useNavigation<NavigationProp>();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const fabRef = useRef<View>(null);
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });

  // Handle FAB press
  const handleFABPress = () => {
    if (__DEV__) console.log('[CustomTabBar] FAB pressed');
    openBottomSheet();
    if (onFabPress) {
      onFabPress();
    }
  };

  // Handle FAB long press - show quick actions
  const handleFABLongPress = () => {
    if (fabRef.current) {
      fabRef.current.measure((x, y, width, height, pageX, pageY) => {
        setFabPosition({
          x: pageX + width / 2,
          y: pageY,
        });
        setShowQuickActions(true);
      });
    }
  };

  // Quick actions configuration
  const quickActions = [
    {
      id: 'voice-entry',
      label: 'Record Transaction',
      icon: 'microphone',
      onPress: () => {
        stackNavigation.navigate('VoiceTransaction');
      },
    },
    {
      id: 'scan-receipt',
      label: 'Scan Receipt',
      icon: 'camera',
      onPress: () => {
        stackNavigation.navigate('ReceiptUpload');
      },
    },
  ];

  // Create a dummy route for the FAB button position (at index 2)
  const routes = [...state.routes];
  routes.splice(2, 0, { key: 'fab', name: 'fab', params: undefined });

  return (
    <>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 12),
            height: 70 + Math.max(insets.bottom, 12),
          },
        ]}
      >
        {routes.map((route, index) => {
          // FAB button at index 2
          if (route.name === 'fab') {
            return (
              <View
                key={route.key}
                ref={fabRef}
                style={styles.fabContainer}
                collapsable={false}
              >
                <TouchableOpacity
                  style={[styles.fab, { backgroundColor: theme.primary }, elevation.lg]}
                  onPress={handleFABPress}
                  onLongPress={handleFABLongPress}
                  activeOpacity={0.9}
                  delayLongPress={300}
                >
                  <Icon name="plus" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          }

        // Regular tab buttons
        const { options } = descriptors[route.key];
        const actualIndex = index > 2 ? index - 1 : index; // Adjust for FAB position
        const isFocused = state.index === actualIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName = route.name === 'Dashboard' ? 'home' : route.name === 'Categories' ? 'tag-multiple' : route.name === 'AIAssistant' ? 'robot' : 'cog';
        
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            {options.tabBarIcon ? (
              options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? theme.primary : theme.textTertiary,
                size: 24,
              })
            ) : (
              <Icon name={iconName} size={24} color={isFocused ? theme.primary : theme.textTertiary} />
            )}
          </TouchableOpacity>
        );
      })}
      </View>

      {/* Quick Actions Menu */}
      <FABQuickActions
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        actions={quickActions}
        fabPosition={fabPosition}
      />
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 4,
    ...elevation.md,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  fabContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: 2,
  },
});

export default CustomTabBar;
