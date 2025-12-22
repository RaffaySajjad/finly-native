/**
 * InsightCard component
 * Purpose: Displays AI-generated financial insights with actionable recommendations
 * Features savings potential badges, action buttons, and category tags
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Insight } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { convertCurrencyAmountsInText } from '../utils/currencyFormatter';
import { getValidIcon } from '../utils/iconUtils';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onActionPress?: (insight: Insight) => void;
}

/**
 * Get action button label based on action type
 */
const getActionLabel = (actionType?: string): string => {
  switch (actionType) {
    case 'reduce_spending':
      return 'Review Spending';
    case 'cancel_subscription':
      return 'Review Subscription';
    case 'set_budget':
      return 'Set Budget';
    case 'review_merchant':
      return 'View Transactions';
    case 'change_timing':
      return 'See Pattern';
    case 'negotiate_rate':
      return 'Learn More';
    case 'switch_provider':
      return 'Compare Options';
    case 'batch_purchases':
      return 'View Tips';
    case 'automate_savings':
      return 'Get Started';
    case 'celebrate_win':
      return 'View Progress';
    default:
      return 'Take Action';
  }
};

/**
 * Get category tag label
 */
const getCategoryLabel = (category?: string): string | null => {
  switch (category) {
    case 'spending_pattern':
      return 'Pattern';
    case 'subscription':
      return 'Subscription';
    case 'budget':
      return 'Budget';
    case 'saving_opportunity':
      return 'Savings';
    case 'merchant':
      return 'Merchant';
    case 'timing':
      return 'Timing';
    case 'comparison':
      return 'Trend';
    case 'goal':
      return 'Goal';
    default:
      return null;
  }
};

/**
 * InsightCard component renders an actionable AI insight with savings potential
 */
export const InsightCard: React.FC<InsightCardProps> = ({ insight, onPress, onActionPress }) => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol, convertFromUSD } = useCurrency();
  const currencySymbol = getCurrencySymbol();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Convert USD amounts in description to user's active currency
  const convertedDescription = useMemo(() => {
    return convertCurrencyAmountsInText(insight.description, formatCurrency);
  }, [insight.description, formatCurrency]);

  // Convert USD amounts in title to user's active currency
  const convertedTitle = useMemo(() => {
    return convertCurrencyAmountsInText(insight.title, formatCurrency);
  }, [insight.title, formatCurrency]);

  // Format savings amount (convert from USD to user's currency)
  const formattedSavings = useMemo(() => {
    if (!insight.savingsAmount || insight.savingsAmount <= 0) return null;
    // Convert from USD (backend base currency) to user's display currency
    const convertedAmount = convertFromUSD(insight.savingsAmount);
    const value = Math.round(convertedAmount);
    if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(1)}K`;
    }
    return `${currencySymbol}${value}`;
  }, [insight.savingsAmount, currencySymbol, convertFromUSD]);

  const categoryLabel = getCategoryLabel(insight.insightCategory);
  const isActionable = insight.type === 'action' || insight.savingsAmount && insight.savingsAmount > 0;
  const showActionButton = isActionable && !insight.actionTaken;

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

  // Determine card accent based on type
  const getAccentColor = () => {
    if (insight.type === 'action') return '#10B981';
    if (insight.type === 'warning') return '#EF4444';
    if (insight.type === 'achievement') return '#F59E0B';
    if (insight.type === 'success') return '#10B981';
    return insight.color;
  };

  const accentColor = getAccentColor();

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
          { 
            backgroundColor: theme.card, 
            borderColor: isActionable || ['warning', 'achievement'].includes(insight.type) ? accentColor : theme.border,
            borderLeftWidth: isActionable ? 4 : 1,
            borderLeftColor: accentColor,
          },
          elevation.sm,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Top Row: Icon, Title, Savings Badge */}
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
            <Icon name={getValidIcon(insight.icon) as any} size={24} color={accentColor} />
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {convertedTitle}
            </Text>
            
            {/* Category Tag */}
            {categoryLabel && (
              <View style={[styles.categoryTag, { backgroundColor: theme.background }]}>
                <Text style={[styles.categoryText, { color: theme.textTertiary }]}>
                  {categoryLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Savings Badge */}
          {formattedSavings && (
            <View style={[styles.savingsBadge, { backgroundColor: '#10B98115' }]}>
              <Icon name="piggy-bank" size={14} color="#10B981" />
              <Text style={styles.savingsText}>{formattedSavings}</Text>
              <Text style={styles.savingsLabel}>/mo</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {convertedDescription}
        </Text>

        {/* Target Entity Tag */}
        {insight.targetEntity && (
          <View style={styles.targetRow}>
            <View style={[styles.targetTag, { backgroundColor: accentColor + '10' }]}>
              <Icon name="tag-outline" size={12} color={accentColor} />
              <Text style={[styles.targetText, { color: accentColor }]}>
                {insight.targetEntity}
              </Text>
            </View>
          </View>
        )}

        {/* Action Button */}
        {showActionButton && onActionPress && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: accentColor }]}
            onPress={() => onActionPress(insight)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              {getActionLabel(insight.actionType)}
            </Text>
            <Icon name="chevron-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Action Taken Indicator */}
        {insight.actionTaken && (
          <View style={styles.actionTakenRow}>
            <Icon name="check-circle" size={14} color="#10B981" />
            <Text style={[styles.actionTakenText, { color: '#10B981' }]}>
              Action taken
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.xs,
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '600',
    lineHeight: 20,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: 4,
  },
  categoryText: {
    ...typography.labelSmall,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 2,
  },
  savingsText: {
    ...typography.titleSmall,
    color: '#10B981',
    fontWeight: '700',
  },
  savingsLabel: {
    ...typography.labelSmall,
    color: '#10B981',
    opacity: 0.7,
  },
  description: {
    ...typography.bodySmall,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  targetRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  targetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  targetText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  actionButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionTakenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  actionTakenText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
});

