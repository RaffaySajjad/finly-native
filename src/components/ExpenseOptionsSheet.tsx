/**
 * ExpenseOptionsSheet component
 * Purpose: Bottom sheet with options to edit or delete an expense
 * Features: Smooth animations, haptic feedback, and confirmation dialogs
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { Expense } from '../types';
import { BottomSheetBackground } from './BottomSheetBackground';
import { typography, spacing, borderRadius } from '../theme';

interface ExpenseOptionsSheetProps {
  expense: Expense | null;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onClose: () => void;
}

/**
 * ExpenseOptionsSheet component
 */
export const ExpenseOptionsSheet: React.FC<ExpenseOptionsSheetProps> = ({
  expense,
  onEdit,
  onDelete,
  onClose,
}) => {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleEdit = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    bottomSheetRef.current?.close();
    if (expense) {
      onEdit(expense);
    }
  }, [expense, onEdit]);

  const handleDelete = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            bottomSheetRef.current?.close();
            if (expense) {
              onDelete(expense);
            }
          },
        },
      ]
    );
  }, [expense, onDelete]);

  if (!expense) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={['30%']}
      enablePanDownToClose
      backgroundComponent={BottomSheetBackground}
      handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Transaction Options</Text>

        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseDescription, { color: theme.textSecondary }]}>
            {expense.description}
          </Text>
          <Text style={[styles.expenseAmount, { color: theme.text }]}>
            ${expense.amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Icon name="pencil" size={24} color={theme.primary} />
            <Text style={[styles.optionText, { color: theme.primary }]}>Edit Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, { backgroundColor: theme.expense + '15', borderColor: theme.expense }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Icon name="delete" size={24} color={theme.expense} />
            <Text style={[styles.optionText, { color: theme.expense }]}>Delete Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  expenseInfo: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  expenseDescription: {
    ...typography.bodyLarge,
    marginBottom: spacing.xs,
  },
  expenseAmount: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.md,
  },
  optionText: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
});

