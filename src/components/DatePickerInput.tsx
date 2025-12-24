/**
 * DatePickerInput Component
 * Purpose: Themed date picker for transaction dates
 * Features: Native iOS/Android pickers, custom button design, formatting
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface DatePickerInputProps {
  date: Date;
  onDateChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}

/**
 * DatePickerInput - Native date picker with themed button
 * @param date - Current selected date
 * @param onDateChange - Callback when date changes
 * @param label - Optional label text
 * @param minimumDate - Optional minimum selectable date
 * @param maximumDate - Optional maximum selectable date
 * @param mode - Picker mode (default: 'date')
 */
export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  date,
  onDateChange,
  label = 'Date',
  minimumDate,
  maximumDate = new Date(),
  mode = 'date',
}) => {
  const { theme, isDark } = useTheme();
  const [isPickerVisible, setPickerVisible] = useState(false);

  /**
   * Format date for display
   */
  const formatDate = (dateObj: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (dateObj.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if it's yesterday
    if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Format as "Mon, Jan 15, 2024"
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Handle date selection
   */
  const handleConfirm = (selectedDate: Date) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDateChange(selectedDate);
    setPickerVisible(false);
  };

  /**
   * Handle picker cancel
   */
  const handleCancel = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPickerVisible(false);
  };

  /**
   * Handle picker open
   */
  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPickerVisible(true);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.button,
          { 
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Icon name="calendar" size={20} color={theme.primary} />
          </View>
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: theme.text }]}>
              {formatDate(date)}
            </Text>
            {date.toDateString() !== new Date().toDateString() && (
              <Text style={[styles.dateSubtext, { color: theme.textSecondary }]}>
                {date.toLocaleDateString('en-US', { 
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            )}
          </View>
        </View>
        <Icon name="chevron-down" size={20} color={theme.textTertiary} />
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode={mode}
        date={date}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        isDarkModeEnabled={isDark}
        accentColor={theme.primary}
        buttonTextColorIOS={theme.primary}
        display={Platform.OS === 'android' ? 'spinner' : 'inline'}
        themeVariant={isDark ? 'dark' : 'light'}
        pickerContainerStyleIOS={{
          alignItems: 'center',
        }}
        customCancelButtonIOS={({ onPress, label }) => (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={{
              borderRadius: 14,
              height: 57,
              marginBottom: 8,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7',
            }}
          >
            <Text style={{ color: theme.primary, fontSize: 17, fontWeight: '400' }}>
              {label}
            </Text>
          </TouchableOpacity>
        )}
        customConfirmButtonIOS={({ onPress, label }) => (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={{
              borderTopWidth: 0.5,
              borderTopColor: isDark ? '#3A3A3C' : '#C6C6C8',
              height: 57,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <Text style={{ color: theme.primary, fontSize: 17, fontWeight: '600' }}>
              {label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  dateSubtext: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});

export default DatePickerInput;

