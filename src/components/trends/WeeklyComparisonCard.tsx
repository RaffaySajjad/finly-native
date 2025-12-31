import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';
import AnimatedPercentage from '../AnimatedPercentage';

interface WeeklyComparisonData {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
}

interface WeeklyComparisonCardProps {
  data: WeeklyComparisonData;
}

export const WeeklyComparisonCard: React.FC<WeeklyComparisonCardProps> = ({ data }) => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  
  const isIncreased = data.percentChange > 0;
  // Increase in spending is usually bad (expense), unless we track income? Assuming expense analysis.
  // Use 'expense' color (red) for increase, 'income' color (green) for decrease/savings.
  const trendColor = isIncreased ? theme.expense : theme.income;
  const trendIcon = isIncreased ? 'trending-up' : 'trending-down';

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Weekly Comparison</Text>
        <AnimatedPercentage
          value={data.percentChange}
          inverted={true}
          size="md"
          badge={true}
          delay={300}
        />
      </View>

      <View style={styles.comparisonContainer}>
        <View style={styles.column}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>This Week</Text>
            <Text style={[styles.value, { color: theme.text }]}>{formatCurrency(data.thisWeek)}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.column}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Last Week</Text>
            <Text style={[styles.value, { color: theme.text }]}>{formatCurrency(data.lastWeek)}</Text>
        </View>
      </View>

      <Text style={[styles.insight, { color: theme.textSecondary }]}>
        {isIncreased
             ? `You spent ${data.percentChange}% more than last week`
             : `Great! You saved ${Math.abs(data.percentChange)}% compared to last week`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
      ...typography.titleMedium,
      fontWeight: '600',
  },
  badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
  },
  badgeText: {
      ...typography.labelSmall,
      fontWeight: '700',
  },
  comparisonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
  },
  column: {
      flex: 1,
      alignItems: 'center',
  },
  divider: {
      width: 1,
      height: 40,
  },
  label: {
      ...typography.caption,
      marginBottom: 2,
  },
  value: {
      ...typography.titleLarge,
      fontWeight: '700',
  },
  insight: {
      ...typography.bodySmall,
      textAlign: 'center',
      fontStyle: 'italic',
  }
});
