/**
 * DateRangeFilter Component
 * Purpose: Date range filter with period presets and custom range picker
 * Features: Period presets, custom date range
 * Styled for Finly's premium aesthetic
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab names
const TABS = ['Period', 'Custom'] as const;
const TAB_COUNT = TABS.length;

// Period preset types
export type PeriodPreset = '7d' | '30d' | '12w' | '6m' | '1y' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  periodPreset?: PeriodPreset;
  quickPreset?: string; // Kept for backward compatibility but not used
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onApply?: () => void;
  compact?: boolean; // For use inside bottom sheets
}

// Period presets configuration
const PERIOD_PRESETS: { id: PeriodPreset; label: string; days: number }[] = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '12w', label: '12 weeks', days: 84 },
  { id: '6m', label: '6 months', days: 180 },
  { id: '1y', label: '1 year', days: 365 },
];

/**
 * Calculate date range from period preset
 */
const getDateRangeFromPeriod = (preset: PeriodPreset): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  const presetConfig = PERIOD_PRESETS.find(p => p.id === preset);
  
  if (presetConfig) {
    startDate.setDate(startDate.getDate() - presetConfig.days + 1);
  }
  startDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
};

/**
 * Format date for display
 */
const formatDateShort = (date: Date): string => {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * DateRangeFilter Component
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  onApply,
  compact = false,
}) => {
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<number>(
    value.periodPreset === 'custom' ? 1 : 0
  );
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabIndicatorPosition = useSharedValue(activeTab);

  // Handle period preset selection
  const handlePeriodSelect = useCallback((preset: PeriodPreset) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const range = getDateRangeFromPeriod(preset);
    onChange({
      ...range,
      periodPreset: preset,
      quickPreset: undefined,
    });
  }, [onChange]);

  // Handle tab change
  const handleTabChange = useCallback((index: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(index);
    tabIndicatorPosition.value = withTiming(index, { duration: 200 });
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  }, [tabIndicatorPosition]);

  // Handle date picker confirm
  const handleDateConfirm = useCallback((date: Date) => {
    if (pickerTarget === 'start') {
      onChange({
        startDate: date,
        endDate: value.endDate,
        periodPreset: 'custom',
        quickPreset: undefined,
      });
    } else {
      onChange({
        startDate: value.startDate,
        endDate: date,
        periodPreset: 'custom',
        quickPreset: undefined,
      });
    }
    setPickerTarget(null);
  }, [pickerTarget, value, onChange]);

  // Animated indicator style
  const indicatorStyle = useAnimatedStyle(() => {
    const TAB_WIDTH = (SCREEN_WIDTH - spacing.md * 2) / TAB_COUNT;
    return {
      transform: [
        {
          translateX: interpolate(
            tabIndicatorPosition.value,
            [0, 1],
            [0, TAB_WIDTH]
          ),
        },
      ],
    };
  });

  return (
    <View style={[
      styles.container,
      { backgroundColor: compact ? 'transparent' : theme.card },
      compact && styles.compactContainer,
    ]}>
      {/* Tab Header */}
      <View style={[styles.tabHeader, { backgroundColor: compact ? 'transparent' : theme.surface }]}>
        <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
          <Animated.View
            style={[
              styles.tabIndicator,
              styles.tabIndicatorTwoTabs,
              { backgroundColor: theme.primary },
              indicatorStyle,
            ]}
          />
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => handleTabChange(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === index ? '#FFFFFF' : theme.textSecondary,
                    fontWeight: activeTab === index ? '600' : '400',
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.tabContent}
      >
        {/* Page 1: Period Presets */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.periodContainer}>
            {PERIOD_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.periodChip,
                  {
                    backgroundColor:
                      value.periodPreset === preset.id
                        ? theme.primary
                        : theme.background,
                    borderColor:
                      value.periodPreset === preset.id
                        ? theme.primary
                        : theme.border,
                  },
                ]}
                onPress={() => handlePeriodSelect(preset.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    {
                      color:
                        value.periodPreset === preset.id
                          ? '#FFFFFF'
                          : theme.text,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Page 2: Custom Date Range */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.customRangeContainer}>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setPickerTarget('start')}
              activeOpacity={0.7}
            >
              <Text style={styles.dateButtonText}>
                {formatDateShort(value.startDate)}
              </Text>
              <Icon name="chevron-down" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>
              –
            </Text>
            
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setPickerTarget('end')}
              activeOpacity={0.7}
            >
              <Text style={styles.dateButtonText}>
                {formatDateShort(value.endDate)}
              </Text>
              <Icon name="chevron-down" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={pickerTarget !== null}
        mode="date"
        date={pickerTarget === 'start' ? value.startDate : value.endDate}
        onConfirm={handleDateConfirm}
        onCancel={() => setPickerTarget(null)}
        maximumDate={pickerTarget === 'start' ? value.endDate : new Date()}
        minimumDate={pickerTarget === 'end' ? value.startDate : undefined}
        isDarkModeEnabled={isDark}
        accentColor={theme.primary}
        buttonTextColorIOS={theme.primary}
        display={Platform.OS === 'android' ? 'spinner' : 'inline'}
        themeVariant={isDark ? 'dark' : 'light'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...elevation.sm,
  },
  compactContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tabHeader: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: `${100 / 3 - 2}%`,
    borderRadius: borderRadius.full,
  },
  tabIndicatorTwoTabs: {
    width: `${100 / 2 - 2}%`,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    ...typography.labelMedium,
    fontSize: 13,
  },
  tabContent: {
    flexDirection: 'row',
  },
  page: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  periodChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  periodChipText: {
    ...typography.labelMedium,
    fontWeight: '500',
  },
  customRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  dateButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateSeparator: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
});

export default DateRangeFilter;

