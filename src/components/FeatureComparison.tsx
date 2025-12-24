/**
 * FeatureComparison Component
 * Purpose: Display side-by-side comparison of Free vs Premium features
 * Used in subscription screen and upgrade prompts
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { PremiumBadge } from './PremiumBadge';
import { typography, spacing, borderRadius } from '../theme';

interface Feature {
  name: string;
  free: string | boolean;
  premium: string | boolean;
}

interface FeatureComparisonProps {
  features: Feature[];
}

const FeatureComparison: React.FC<FeatureComparisonProps> = ({ features }) => {
  const { theme } = useTheme();

  const renderValue = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Icon name="check-circle" size={20} color={theme.success} />
      ) : (
        <Icon name="close-circle" size={20} color={theme.textTertiary} />
      );
    }
    return (
      <Text style={[styles.valueText, { color: theme.text }]}>{value}</Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerColumn}>
          <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>
            Feature
          </Text>
        </View>
        <View style={styles.headerColumn}>
          <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>
            Free
          </Text>
        </View>
        <View style={styles.headerColumn}>
          <PremiumBadge size="small" />
        </View>
      </View>

      {/* Features */}
      {features.map((feature, index) => (
        <View
          key={index}
          style={[
            styles.featureRow,
            index % 2 === 0 && { backgroundColor: theme.card },
          ]}
        >
          <View style={styles.featureColumn}>
            <Text style={[styles.featureName, { color: theme.text }]}>
              {feature.name}
            </Text>
          </View>
          <View style={styles.featureColumn}>
            {renderValue(feature.free)}
          </View>
          <View style={styles.featureColumn}>
            {renderValue(feature.premium)}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerColumn: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureName: {
    ...typography.bodyMedium,
    textAlign: 'left',
    width: '100%',
  },
  valueText: {
    ...typography.bodySmall,
  },
});

export default FeatureComparison;

