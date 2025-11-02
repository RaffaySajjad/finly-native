/**
 * SpendingBreakdown Component
 * Purpose: Interactive pie chart with tappable slices and tooltips
 * Features: Slice highlighting, budget comparison, mobile-friendly tooltips
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Category } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

const { width } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface SpendingBreakdownProps {
  categories: Category[];
}

interface SelectedSlice {
  category: Category;
  percentage: number;
  index: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  food: 'food',
  transport: 'car',
  shopping: 'shopping',
  bills: 'file-document',
  entertainment: 'movie',
  health: 'heart-pulse',
  utilities: 'lightning-bolt',
  other: 'dots-horizontal',
};

/**
 * SpendingBreakdown - Interactive pie chart with slice selection
 */
export const SpendingBreakdown: React.FC<SpendingBreakdownProps> = ({
  categories,
}) => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const [selectedSlice, setSelectedSlice] = useState<SelectedSlice | null>(null);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate total spending
  const totalSpent = categories.reduce((sum, cat) => sum + cat.totalSpent, 0);

  // Sort categories by spending (descending)
  const sortedCategories = [...categories]
    .filter(cat => cat.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);

  /**
   * Handle slice selection - show tooltip with details
   */
  const handleSlicePress = (index: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const category = sortedCategories[index];
    if (!category) return;

    const percentage = totalSpent > 0 ? (category.totalSpent / totalSpent) * 100 : 0;

    // If clicking the same slice, deselect it
    if (selectedSlice?.index === index) {
      setSelectedSlice(null);
      Animated.spring(tooltipAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      // Select new slice
      setSelectedSlice({ category, percentage, index });
      Animated.spring(tooltipAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  };

  /**
   * Handle tooltip navigation to category details
   */
  const handleNavigateToCategory = () => {
    if (!selectedSlice) return;
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    navigation.navigate('CategoryDetails', { categoryId: selectedSlice.category.id });
  };

  // Prepare chart data with highlighting for selected slice
  const chartData = sortedCategories.map((cat, index) => {
    const isSelected = selectedSlice?.index === index;
    const baseColor = theme.categories[cat.id as keyof typeof theme.categories] || theme.primary;
    
    return {
      value: cat.totalSpent,
      color: baseColor,
      text: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
      focused: isSelected,
      onPress: () => handleSlicePress(index),
    };
  });

  // Empty state
  if (sortedCategories.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
        <Icon name="chart-pie" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
          No spending data yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
          Add expenses to see your breakdown
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Spending Breakdown</Text>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.navigate('MainTabs', { screen: 'Categories' } as any);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Spending</Text>
          <Text style={[styles.totalAmount, { color: theme.primary }]}>
            {formatCurrency(totalSpent)}
          </Text>
        </View>

        {/* Interactive Pie Chart */}
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            donut
            radius={100}
            innerRadius={60}
            focusOnPress
            sectionAutoFocus
            centerLabelComponent={() => null}
          />
          
          <Text style={[styles.chartHint, { color: theme.textTertiary }]}>
            Tap on a slice to see details
          </Text>
        </View>

        {/* Legend - Color indicators only */}
        <View style={styles.legendContainer}>
          {sortedCategories.map((category, index) => {
            const categoryColor = theme.categories[category.id as keyof typeof theme.categories] || theme.primary;
            const isSelected = selectedSlice?.index === index;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.legendItem,
                  isSelected && { backgroundColor: categoryColor + '15' },
                ]}
                onPress={() => handleSlicePress(index)}
                activeOpacity={0.7}
              >
                <View style={[styles.legendDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.legendText, { color: theme.text }]}>
                  {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tooltip - Shows on slice selection */}
      {selectedSlice && (
        <Animated.View
          style={[
            styles.tooltip,
            { 
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: tooltipAnim,
              transform: [{
                translateY: tooltipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
            elevation.lg,
          ]}
        >
          <TouchableOpacity
            style={styles.tooltipContent}
            onPress={handleNavigateToCategory}
            activeOpacity={0.8}
          >
            <View style={styles.tooltipHeader}>
              <View style={styles.tooltipLeft}>
                <View style={[
                  styles.tooltipIcon,
                  { backgroundColor: theme.categories[selectedSlice.category.id as keyof typeof theme.categories] + '20' }
                ]}>
                  <Icon
                    name={CATEGORY_ICONS[selectedSlice.category.id] as any}
                    size={24}
                    color={theme.categories[selectedSlice.category.id as keyof typeof theme.categories]}
                  />
                </View>
                <View>
                  <Text style={[styles.tooltipCategoryName, { color: theme.text }]}>
                    {selectedSlice.category.name.charAt(0).toUpperCase() + selectedSlice.category.name.slice(1)}
                  </Text>
                  <Text style={[styles.tooltipPercentage, { color: theme.textSecondary }]}>
                    {selectedSlice.percentage.toFixed(1)}% of total
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSlice(null);
                  Animated.spring(tooltipAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                  }).start();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.tooltipStats}>
              <View style={styles.tooltipStat}>
                <Text style={[styles.tooltipStatLabel, { color: theme.textSecondary }]}>Spent</Text>
                <Text style={[styles.tooltipStatValue, { color: theme.expense }]}>
                  {formatCurrency(selectedSlice.category.totalSpent)}
                </Text>
              </View>
              <View style={[styles.tooltipDivider, { backgroundColor: theme.border }]} />
              <View style={styles.tooltipStat}>
                <Text style={[styles.tooltipStatLabel, { color: theme.textSecondary }]}>Budget</Text>
                <Text style={[styles.tooltipStatValue, { color: selectedSlice.category.budgetLimit ? theme.text : theme.textTertiary }]}>
                  {selectedSlice.category.budgetLimit 
                    ? formatCurrency(selectedSlice.category.budgetLimit)
                    : 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.tooltipFooter}>
              <Text style={[styles.tooltipFooterText, { color: theme.primary }]}>
                Tap to view details
              </Text>
              <Icon name="chevron-right" size={16} color={theme.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
  },
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  viewAllText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    ...typography.headlineLarge,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    justifyContent: 'center'
  },
  chartHint: {
    ...typography.caption,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  tooltip: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tooltipContent: {
    padding: spacing.md,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tooltipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  tooltipIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipCategoryName: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  tooltipPercentage: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  tooltipStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tooltipStat: {
    flex: 1,
    alignItems: 'center',
  },
  tooltipStatLabel: {
    ...typography.labelSmall,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tooltipStatValue: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  tooltipDivider: {
    width: 1,
    height: '100%',
  },
  tooltipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  tooltipFooterText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  emptyContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  emptyTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});

export default SpendingBreakdown;


