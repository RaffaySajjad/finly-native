/**
 * CustomTabBar Component
 * Purpose: Custom tab bar with center FAB button
 * Features: Prominent center button, consistent styling, quick actions on long press
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Animated, TouchableWithoutFeedback } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../utils/logger';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { RootStackParamList } from '../navigation/types';
import FABQuickActions from './FABQuickActions';
import ScaleButton from './ScaleButton';
import { useHaptics } from '../hooks/useHaptics';

interface CustomTabBarProps extends BottomTabBarProps {
  onFabPress: () => void;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const TabButton = ({
  isFocused,
  onPress,
  onLongPress,
  iconName,
  theme,
  label
}: {
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  iconName: string;
  theme: any;
  label: string;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const haptics = useHaptics();

  useEffect(() => {
    if (isFocused) {
      // Pop animation when focused
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.2,
          speed: 50,
          bounciness: 12,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 50,
          bounciness: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused]);

  return (
    <ScaleButton
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      scaleTo={0.9}
      hapticArgs="light"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name={iconName as any}
          size={26}
          color={isFocused ? theme.primary : theme.textTertiary}
        />
      </Animated.View>
      {isFocused && (
        <Animated.View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
      )}
    </ScaleButton>
  );
};

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation, onFabPress }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openBottomSheet } = useBottomSheetActions();
  const stackNavigation = useNavigation<NavigationProp>();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const fabRef = useRef<View>(null);
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const haptics = useHaptics();

  // Handle FAB press
  const handleFABPress = () => {
    logger.debug('[CustomTabBar] FAB pressed');
    haptics.medium();
    openBottomSheet();
    if (onFabPress) {
      onFabPress();
    }
  };

  // Handle FAB long press - show quick actions
  const handleFABLongPress = () => {
    haptics.selection();
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
                <ScaleButton
                  style={[styles.fab, elevation.lg]}
                  onPress={handleFABPress}
                  onLongPress={handleFABLongPress}
                  scaleTo={0.9}
                  hapticArgs="medium"
                >
                  <LinearGradient
                    colors={isDark ? ['#1A3A52', '#0D2438', '#1E4A6F'] : ['#4F46E5', '#4A90E2', '#0EA5E9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="plus" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </ScaleButton>
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

          const iconName = route.name === 'Dashboard' ? 'home-variant'
            : route.name === 'Categories' ? 'shape'
              : route.name === 'Trends' ? 'chart-line'
                : route.name === 'AIAssistant' ? 'robot'
                  : 'view-dashboard';

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              iconName={iconName}
              theme={theme}
              label={options.title || route.name}
            />
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
    height: 50,
  },
  fabContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 20, // Squircle-ish
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: '0deg' }], // Ready for rotation animation if needed
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    position: 'absolute',
    bottom: 2,
  },
});

export default CustomTabBar;
