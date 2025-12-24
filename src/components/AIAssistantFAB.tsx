/**
 * AIAssistantFAB Component
 * Purpose: Floating Action Button for Finly AI accessible from all screens
 * Features: Consistent positioning, premium badge, haptic feedback
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { RootStackParamList } from '../navigation/types';
import { Category } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AIAssistantFABNavigationProp = StackNavigationProp<RootStackParamList>;

interface AIAssistantFABProps {
  context?: {
    transactionId?: string;
    categoryId?: string;
    screen?: string;
  };
  initialQuery?: string;
}

const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({ context, initialQuery }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<AIAssistantFABNavigationProp>();
  const { isPremium } = useSubscription();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    navigation.navigate('AIAssistant', {
      context,
      initialQuery,
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          bottom: Math.max(insets.bottom, 12) + (Platform.select({ ios: 70, android: 10 }) ?? 70),
        },
        elevation.md,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Icon name="robot" size={22} color={theme.primary} />
      {isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: theme.primary }]}>
          <Icon name="crown" size={10} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default AIAssistantFAB;

