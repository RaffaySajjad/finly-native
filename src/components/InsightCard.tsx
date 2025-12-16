/**
 * InsightCard component
 * Purpose: Displays AI-generated financial insights with icons and recommendations
 * Provides actionable tips and warnings to help users save money
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Insight } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
}

/**
 * Convert USD amounts in text to user's active currency
 * @param text - Text containing USD amounts (e.g., "$150", "$1,234.56")
 * @param formatCurrency - Function to format currency amounts (already converts from USD internally)
 * @returns Text with converted amounts
 */
const convertCurrencyAmountsInText = (
  text: string,
  formatCurrency: (amount: number) => string
): string => {
  // Regex to match USD amounts: $123, $1,234.56, $123.45, etc.
  // Matches: $ followed by digits, optional commas, optional decimal point and digits
  const usdAmountRegex = /\$([\d,]+(?:\.\d{1,2})?)/g;

  return text.replace(usdAmountRegex, (match, amountStr) => {
    try {
      // Remove commas and parse the amount
      const usdAmount = parseFloat(amountStr.replace(/,/g, ''));

      if (isNaN(usdAmount)) {
        return match; // Return original if parsing fails
      }

      // formatCurrency already converts from USD to user's currency internally
      // So we just pass the USD amount directly
      return formatCurrency(usdAmount);
    } catch (error) {
      console.warn('[InsightCard] Error converting currency amount:', error);
      return match; // Return original if conversion fails
    }
  });
};

/**
 * InsightCard component renders an AI insight with icon and description
 * @param insight - The insight object to display
 * @param onPress - Optional callback when card is pressed
 */
export const InsightCard: React.FC<InsightCardProps> = ({ insight, onPress }) => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Convert USD amounts in description to user's active currency
  const convertedDescription = useMemo(() => {
    return convertCurrencyAmountsInText(
      insight.description,
      formatCurrency
    );
  }, [insight.description, formatCurrency]);

  // Convert USD amounts in title to user's active currency
  const convertedTitle = useMemo(() => {
    return convertCurrencyAmountsInText(
      insight.title,
      formatCurrency
    );
  }, [insight.title, formatCurrency]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={onPress ? 0.9 : 1}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.card, borderColor: ['warning', 'achievement'].includes(insight.type) ? insight.color : theme.border },
          elevation.sm,
          { transform: [{ scale: scaleAnim }] },
          ['warning', 'achievement'].includes(insight.type) && { borderWidth: 1.5 },
        ]}
      >
      <View style={[styles.iconContainer, { backgroundColor: insight.color + '20' }]}>
        <Icon name={insight.icon as any} size={28} color={insight.color} />
      </View>

      <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>{convertedTitle}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
            {convertedDescription}
        </Text>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
});

