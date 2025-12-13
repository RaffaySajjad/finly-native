/**
 * FABQuickActions Component
 * Purpose: Quick actions menu that appears when FAB is long-pressed
 * Features: Smooth animations, enterprise-grade UI, accessible actions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import * as Haptics from 'expo-haptics';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}

interface FABQuickActionsProps {
  visible: boolean;
  onClose: () => void;
  actions: QuickAction[];
  fabPosition: { x: number; y: number };
}

const FABQuickActions: React.FC<FABQuickActionsProps> = ({
  visible,
  onClose,
  actions,
  fabPosition,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  // Create animations for each action
  const actionAnimationsRef = useRef<Array<{ opacity: Animated.Value; translateY: Animated.Value }>>([]);
  
  // Initialize animations once - actions should be stable
  if (actionAnimationsRef.current.length === 0) {
    actionAnimationsRef.current = actions.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }));
  }
  
  const actionAnimations = actionAnimationsRef.current;

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Animate backdrop and menu container
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Stagger action items animation
      const staggerDelay = 50;
      actionAnimations.forEach((anim, index) => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            delay: index * staggerDelay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 200,
            delay: index * staggerDelay,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      actionAnimations.forEach((anim) => {
        anim.opacity.setValue(0);
        anim.translateY.setValue(20);
      });
    }
  }, [visible]);

  const handleActionPress = (action: QuickAction) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    action.onPress();
    onClose();
  };

  if (!visible) return null;

  // Calculate menu position - appear above the FAB
  // Menu width is 280, so center it on the FAB (which is at fabPosition.x)
  const { width: screenWidth } = Dimensions.get('window');
  const menuWidth = 280;
  const menuTop = fabPosition.y - 180; // Position above FAB with some spacing
  let menuLeft = fabPosition.x - menuWidth / 2; // Center align with FAB
  
  // Ensure menu doesn't go off-screen
  const minLeft = spacing.md;
  const maxLeft = screenWidth - menuWidth - spacing.md;
  menuLeft = Math.max(minLeft, Math.min(menuLeft, maxLeft));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.backdropOverlay,
              {
                opacity: fadeAnim,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              },
            ]}
          />
        </View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.menuContainer,
          {
            top: menuTop,
            left: menuLeft,
            backgroundColor: theme.card,
            borderColor: theme.border,
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          },
          elevation.lg,
        ]}
      >
        {actions.map((action, index) => {
          const anim = actionAnimations[index];
          return (
            <Animated.View
              key={action.id}
              style={{
                opacity: anim.opacity,
                transform: [{ translateY: anim.translateY }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.actionItem,
                  {
                    backgroundColor: theme.surface,
                    borderBottomColor: theme.border,
                  },
                  index === actions.length - 1 && styles.lastActionItem,
                ]}
                onPress={() => handleActionPress(action)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: theme.primary + '15' },
                  ]}
                >
                  <Icon name={action.icon} size={22} color={theme.primary} />
                </View>
                <Text
                  style={[styles.actionLabel, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {action.label}
                </Text>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    width: 280,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...elevation.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.labelLarge,
    flex: 1,
    fontWeight: '600',
  },
});

export default FABQuickActions;

