import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { typography, spacing, borderRadius } from '../../theme';

interface ForecastData {
  predictedAmount: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  rateLimit?: {
    remaining: number;
    resetAt: number;
  };
}

interface ForecastCardProps {
  data: ForecastData;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ data }) => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();

  const getConfidenceColor = (level: string) => {
      switch(level) {
          case 'high': return theme.success;
          case 'medium': return theme.warning;
          case 'low': return theme.expense;
          default: return theme.primary;
      }
  };

  const confidenceColor = getConfidenceColor(data.confidence);

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="crystal-ball" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Next Week Forecast</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: confidenceColor + '20' }]}>
            <Text style={[styles.badgeText, { color: confidenceColor }]}>
                {data.confidence.toUpperCase()} CONFIDENCE
            </Text>
        </View>
      </View>

      <Text style={[styles.amount, { color: theme.text }]}>
          ~{formatCurrency(data.predictedAmount)}
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Predicted spending based on your recent habits
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
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm 
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.labelSmall,
    fontWeight: '700',
    fontSize: 10,
  },
  amount: {
    ...typography.displaySmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
  }
});
