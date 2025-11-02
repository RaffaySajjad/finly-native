/**
 * Bulk Transaction Screen
 * Purpose: Add multiple transactions at once via form or CSV import
 * Premium feature
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt, PremiumBadge, CurrencyInput } from '../components';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Expense, CategoryType } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface BulkTransaction {
  amount: string;
  category: CategoryType;
  description: string;
  date: Date;
}

const BulkTransactionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { getCurrencySymbol } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();

  const [transactions, setTransactions] = useState<BulkTransaction[]>([
    { amount: '', category: 'food', description: '', date: new Date() },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const categories: CategoryType[] = [
    'food',
    'transport',
    'shopping',
    'entertainment',
    'health',
    'utilities',
    'other',
  ];

  const categoryNames: Record<CategoryType, string> = {
    food: 'Food',
    transport: 'Transport',
    shopping: 'Shopping',
    entertainment: 'Entertainment',
    health: 'Health',
    utilities: 'Utilities',
    other: 'Other',
  };

  const handleAddRow = () => {
    setTransactions([...transactions, { amount: '', category: 'food', description: '', date: new Date() }]);
  };

  const handleRemoveRow = (index: number) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter((_, i) => i !== index));
    }
  };

  const handleUpdateTransaction = (
    index: number,
    field: keyof BulkTransaction,
    value: string | CategoryType | Date
  ) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
  };

  const handleSaveAll = async () => {
    if (requiresUpgrade('bulkEntry')) {
      setShowUpgradePrompt(true);
      return;
    }

    // Validate all transactions
    const validTransactions: Array<Omit<Expense, 'id' | 'date'>> = [];
    const errors: string[] = [];

    transactions.forEach((tx, index) => {
      if (!tx.amount || parseFloat(tx.amount) <= 0) {
        errors.push(`Row ${index + 1}: Invalid amount`);
        return;
      }
      if (!tx.description.trim()) {
        errors.push(`Row ${index + 1}: Missing description`);
        return;
      }

      validTransactions.push({
        amount: parseFloat(tx.amount),
        category: tx.category,
        description: tx.description.trim(),
        date: tx.date.toISOString(),
      });
    });

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    if (validTransactions.length === 0) {
      Alert.alert('No Transactions', 'Please add at least one transaction');
      return;
    }

    setIsProcessing(true);

    try {
      const promises = validTransactions.map(tx =>
        apiService.createExpense(tx)
      );

      await Promise.all(promises);

      Alert.alert(
        'Success!',
        `Added ${validTransactions.length} transaction${validTransactions.length > 1 ? 's' : ''} successfully! 🎉`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save transactions');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Bulk Add
          </Text>
          {!isPremium && <PremiumBadge size="small" />}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Icon name="file-multiple" size={24} color={theme.primary} />
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              Add Multiple Transactions
            </Text>
            <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
              Fill in multiple transactions at once. Each row will be saved as a separate transaction.
            </Text>
          </View>
        </View>

        {/* Transaction Rows */}
        <View style={styles.transactionsList}>
          {transactions.map((tx, index) => (
            <View
              key={index}
              style={[
                styles.transactionRow,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation.sm,
              ]}
            >
              <View style={styles.rowHeader}>
                <Text style={[styles.rowNumber, { color: theme.textSecondary }]}>
                  #{index + 1}
                </Text>
                {transactions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveRow(index)}
                    style={styles.removeButton}
                  >
                    <Icon name="close-circle" size={24} color={theme.expense} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.rowContent}>
                {/* Amount Input */}
                <View style={styles.amountInput}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Amount
                  </Text>
                  <View style={[styles.amountInputContainer, { borderColor: theme.border }]}>
                    <CurrencyInput
                      value={tx.amount}
                      onChangeText={(value) => handleUpdateTransaction(index, 'amount', value)}
                      placeholder="0.00"
                      placeholderTextColor={theme.textTertiary}
                      showSymbol={true}
                      allowDecimals={true}
                      inputStyle={styles.currencyInputField}
                    />
                  </View>
                </View>

                <View style={styles.categoryInput}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Category
                  </Text>
                  <View style={styles.categoryButtons}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          {
                            backgroundColor:
                              tx.category === cat ? theme.primary + '20' : theme.background,
                            borderColor: tx.category === cat ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => handleUpdateTransaction(index, 'category', cat)}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            {
                              color: tx.category === cat ? theme.primary : theme.textSecondary,
                              fontWeight: tx.category === cat ? '600' : '400',
                            },
                          ]}
                        >
                          {categoryNames[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.descriptionInput}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Description
                  </Text>
                  <TextInput
                    style={[
                      styles.descriptionField,
                      { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                    ]}
                    placeholder="What did you spend on?"
                    placeholderTextColor={theme.textTertiary}
                    value={tx.description}
                    onChangeText={(value) => handleUpdateTransaction(index, 'description', value)}
                  />
                </View>

                <View style={styles.dateInput}>
                  <DatePickerInput
                    date={tx.date}
                    onDateChange={(date) => handleUpdateTransaction(index, 'date', date)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Add Row Button */}
        <TouchableOpacity
          style={[styles.addRowButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={handleAddRow}
        >
          <Icon name="plus-circle" size={24} color={theme.primary} />
          <Text style={[styles.addRowButtonText, { color: theme.primary }]}>
            Add Another Transaction
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.success }, elevation.md]}
          onPress={handleSaveAll}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check-circle" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                Save All ({transactions.length} transaction{transactions.length > 1 ? 's' : ''})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Bulk Transaction Entry"
        message="This premium feature allows you to add multiple transactions at once using a convenient form interface."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  instructionsCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  instructionsText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  transactionsList: {
    marginBottom: spacing.lg,
  },
  transactionRow: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rowNumber: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  removeButton: {
    padding: spacing.xs,
  },
  rowContent: {
    gap: spacing.md,
  },
  typeInput: {
    marginBottom: spacing.sm,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  typeToggleText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  amountInput: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.labelSmall,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  currencyInputField: {
    paddingVertical: spacing.sm,
  },
  categoryInput: {
    marginBottom: spacing.sm,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  categoryButtonText: {
    ...typography.labelSmall,
  },
  descriptionInput: {
    marginBottom: spacing.sm,
  },
  descriptionField: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  dateInput: {
    marginBottom: spacing.sm,
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addRowButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default BulkTransactionScreen;

