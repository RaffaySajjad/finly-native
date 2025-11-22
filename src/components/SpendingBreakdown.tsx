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
  ScrollView,
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

const SORTED_CATEGORIES_LIMIT = 5;

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
 * Generate a color from a string (for fallback when category color is missing)
 */
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Get category color, with fallback to generated color or theme primary
 */
const getCategoryColor = (category: Category, theme: any): string => {
  if (category.color) {
    return category.color;
  }
  // Generate a color from category name if color is missing
  return generateColorFromString(category.name);
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
  const [showAllCategories, setShowAllCategories] = useState(false);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate total spending
  const totalSpent = categories.reduce((sum, cat) => sum + (cat.totalSpent || 0), 0);

  // Sort categories by spending (descending)
  const sortedCategories = [...categories]
    .filter(cat => (cat.totalSpent || 0) > 0)
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));

  // Limit legend to top 12 categories initially, show all if toggled
  const displayedCategories = showAllCategories
    ? sortedCategories
    : sortedCategories.slice(0, SORTED_CATEGORIES_LIMIT);

  /**
   * Handle slice selection - show tooltip with details
   */
  const handleSlicePress = (index: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const category = sortedCategories[index];
    if (!category) return;

    const categorySpent = category.totalSpent || 0;
    const percentage = totalSpent > 0 ? (categorySpent / totalSpent) * 100 : 0;

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
    const categoryColor = getCategoryColor(cat, theme);
    
    return {
      value: cat.totalSpent || 0,
      color: categoryColor,
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
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>This Month</Text>
          <Text style={[styles.totalAmount, { color: theme.primary }]}>
            {formatCurrency(totalSpent)}
          </Text>
        </View>

        {/* Interactive Pie Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartWrapper}>
            <PieChart
              data={chartData}
              donut
              radius={100}
              innerRadius={60}
              focusOnPress
              sectionAutoFocus
              centerLabelComponent={() => null}
            />
            {/* Inner circle overlay to match theme */}
            <View style={[styles.innerCircle, { backgroundColor: theme.card }]} />
          </View>
          
          <Text style={[styles.chartHint, { color: theme.textTertiary }]}>
            Tap on a slice to see details
          </Text>
        </View>

        {/* Legend - Color indicators only */}
        <View style={styles.legendContainer}>
          <ScrollView
            style={styles.legendScrollView}
            contentContainerStyle={styles.legendScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {displayedCategories.map((category, displayIndex) => {
              // Find the actual index in sortedCategories for proper slice selection
              const actualIndex = sortedCategories.findIndex(cat => cat.id === category.id);
              const categoryColor = getCategoryColor(category, theme);
              const isSelected = selectedSlice?.index === actualIndex;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.legendItem,
                    isSelected && { backgroundColor: categoryColor + '15' },
                  ]}
                  onPress={() => handleSlicePress(actualIndex)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.legendDot, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>
                    {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {sortedCategories.length > SORTED_CATEGORIES_LIMIT && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllCategories(!showAllCategories)}
              activeOpacity={0.7}
            >
              <Text style={[styles.showMoreText, { color: theme.primary }]}>
                {showAllCategories
                  ? `Show Less (${sortedCategories.length - SORTED_CATEGORIES_LIMIT} hidden)`
                  : `Show All (${sortedCategories.length - SORTED_CATEGORIES_LIMIT} more)`}
              </Text>
            </TouchableOpacity>
          )}
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
                  { backgroundColor: getCategoryColor(selectedSlice.category, theme) + '20' }
                ]}>
                  <Icon
                    name={(selectedSlice.category.icon || CATEGORY_ICONS[selectedSlice.category.id] || 'dots-horizontal') as any}
                    size={24}
                    color={getCategoryColor(selectedSlice.category, theme)}
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
                <Text style={[styles.tooltipStatLabel, { color: theme.textSecondary }]}>This Month</Text>
                <Text style={[styles.tooltipStatValue, { color: theme.expense }]}>
                  {formatCurrency(selectedSlice.category.totalSpent || 0)}
                </Text>
              </View>
              <View style={[styles.tooltipDivider, { backgroundColor: theme.border }]} />
              <View style={styles.tooltipStat}>
                <Text style={[styles.tooltipStatLabel, { color: theme.textSecondary }]}>Monthly Budget</Text>
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
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    position: 'absolute',
    width: 120, // innerRadius * 2 = 60 * 2
    height: 120,
    borderRadius: 60,
    zIndex: 1,
  },
  chartHint: {
    ...typography.caption,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  legendContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    maxHeight: 200, // Limit height to prevent taking too much space
  },
  legendScrollView: {
    maxHeight: 180,
  },
  legendScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    maxWidth: '48%', // Limit width to fit 2 per row
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.bodySmall,
    fontWeight: '500',
    flexShrink: 1,
  },
  showMoreButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  showMoreText: {
    ...typography.labelMedium,
    fontWeight: '600',
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


