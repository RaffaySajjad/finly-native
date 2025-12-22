/**
 * Bulk Transaction Screen
 * Purpose: Add multiple transactions at once via form or CSV import
 * Premium feature
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useAlert } from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt, PremiumBadge, CurrencyInput, DatePickerInput } from '../components';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Expense, Category } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface BulkTransaction {
  amount: string;
  categoryId: string;
  description: string;
  date: Date;
}

const BulkTransactionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { getCurrencySymbol, convertToUSD } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();
  const { showError, showSuccess, showInfo, AlertComponent } = useAlert();

  const [transactions, setTransactions] = useState<BulkTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryPickerIndex, setCategoryPickerIndex] = useState<number | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await apiService.getCategories();
      setCategories(categoriesData);
      if (categoriesData.length > 0 && transactions.length === 0) {
        setTransactions([
          { amount: '', categoryId: categoriesData[0].id, description: '', date: new Date() },
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
    setTransactions([...transactions, { amount: '', categoryId: defaultCategoryId, description: '', date: new Date() }]);
  };

  const handleRemoveRow = (index: number) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter((_, i) => i !== index));
    }
  };

  const handleUpdateTransaction = (index: number, field: keyof BulkTransaction, value: any) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      [field]: value,
    };
    setTransactions(updatedTransactions);
  };

  // Filter and group categories for the picker
  const filteredCategories = useMemo(() => {
    const query = categorySearchQuery.toLowerCase().trim();
    let filtered = categories;

    if (query) {
      filtered = categories.filter(
        cat => cat.name.toLowerCase().includes(query) || cat.icon.toLowerCase().includes(query)
      );
    }

    // Group by system vs custom
    const systemCategories = filtered.filter(cat => cat.isSystemCategory);
    const customCategories = filtered.filter(cat => !cat.isSystemCategory);

    return { systemCategories, customCategories };
  }, [categories, categorySearchQuery]);

  const openCategoryPicker = (index: number) => {
    setCategoryPickerIndex(index);
    setCategorySearchQuery('');
  };

  const closeCategoryPicker = () => {
    setCategoryPickerIndex(null);
    setCategorySearchQuery('');
  };

  const selectCategory = (categoryId: string) => {
    if (categoryPickerIndex !== null) {
      handleUpdateTransaction(categoryPickerIndex, 'categoryId', categoryId);
      closeCategoryPicker();
    }
  };

  const handleSaveAll = async () => {
    if (requiresUpgrade('bulkEntry')) {
      setShowUpgradePrompt(true);
      return;
    }

    // Validate all transactions
    const validTransactions: Array<{ amount: number; categoryId: string; description: string; date: Date }> = [];
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
        categoryId: tx.categoryId,
        description: tx.description.trim(),
        date: tx.date,
      });
    });

    if (errors.length > 0) {
      showError('Validation Error', errors.join('\n'));
      return;
    }

    if (validTransactions.length === 0) {
      showInfo('No Transactions', 'Please add at least one transaction');
      return;
    }

    setIsProcessing(true);

    try {
      // Convert amounts from display currency to USD before sending
      const expenseData = validTransactions.map(tx => ({
        amount: convertToUSD(tx.amount),
        categoryId: tx.categoryId,
        description: tx.description,
        date: tx.date,
      }));

      await apiService.addExpensesBatch({ expenses: expenseData });

      showSuccess(
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
      showError('Error', 'Failed to save transactions');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            No categories available. Please set up categories first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                    onPress={() => openCategoryPicker(index)}
                  >
                    <View style={styles.pickerButtonContent}>
                      {tx.categoryId ? (() => {
                        const selectedCat = categories.find(c => c.id === tx.categoryId);
                        return selectedCat ? (
                          <>
                            <View style={[styles.categoryIconContainer, { backgroundColor: selectedCat.color + '20' }]}>
                              <Icon name={selectedCat.icon as any} size={20} color={selectedCat.color} />
                            </View>
                            <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                              {selectedCat.name}
                            </Text>
                          </>
                        ) : null;
                      })() : (
                        <>
                          <Icon name="folder-outline" size={18} color={theme.textSecondary} />
                          <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                            Select category
                          </Text>
                        </>
                      )}
                    </View>
                    <Icon name="chevron-down" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
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

      {/* Category Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryPickerIndex !== null}
        onRequestClose={closeCategoryPicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={closeCategoryPicker}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
              <TouchableOpacity onPress={closeCategoryPicker}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Icon name="magnify" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search categories..."
                placeholderTextColor={theme.textTertiary}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                autoFocus={false}
              />
              {categorySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Icon name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.lg }}>
              {filteredCategories.systemCategories.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={[styles.categorySectionTitle, { color: theme.textSecondary }]}>
                    System Categories
                  </Text>
                  <View style={styles.categoryGridModal}>
                    {filteredCategories.systemCategories.map((cat) => {
                      const isSelected = categoryPickerIndex !== null && transactions[categoryPickerIndex]?.categoryId === cat.id;
                      const categoryColor = cat.color || theme.primary;

                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryButtonModal,
                            {
                              backgroundColor: isSelected ? categoryColor + '20' : theme.card,
                              borderColor: isSelected ? categoryColor : theme.border,
                            },
                          ]}
                          onPress={() => selectCategory(cat.id)}
                        >
                          <View style={[styles.categoryIconContainerModal, { backgroundColor: categoryColor + '15' }]}>
                            <Icon name={cat.icon as any} size={22} color={categoryColor} />
                          </View>
                          <Text
                            style={[
                              styles.categoryLabelModal,
                              { color: isSelected ? categoryColor : theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                          {isSelected && (
                            <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]}>
                              <Icon name="check" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {filteredCategories.customCategories.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={[styles.categorySectionTitle, { color: theme.textSecondary }]}>
                    Custom Categories
                  </Text>
                  <View style={styles.categoryGridModal}>
                    {filteredCategories.customCategories.map((cat) => {
                      const isSelected = categoryPickerIndex !== null && transactions[categoryPickerIndex]?.categoryId === cat.id;
                      const categoryColor = cat.color || theme.primary;

                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryButtonModal,
                            {
                              backgroundColor: isSelected ? categoryColor + '20' : theme.card,
                              borderColor: isSelected ? categoryColor : theme.border,
                            },
                          ]}
                          onPress={() => selectCategory(cat.id)}
                        >
                          <View style={[styles.categoryIconContainerModal, { backgroundColor: categoryColor + '15' }]}>
                            <Icon name={cat.icon as any} size={22} color={categoryColor} />
                          </View>
                          <Text
                            style={[
                              styles.categoryLabelModal,
                              { color: isSelected ? categoryColor : theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                          {isSelected && (
                            <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]}>
                              <Icon name="check" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {filteredCategories.systemCategories.length === 0 &&
                filteredCategories.customCategories.length === 0 && (
                  <View style={styles.emptyCategoriesContainer}>
                    <Icon name="folder-off-outline" size={48} color={theme.textTertiary} />
                    <Text style={[styles.emptyCategoriesText, { color: theme.textSecondary }]}>
                      {categorySearchQuery
                        ? `No categories found for "${categorySearchQuery}"`
                        : 'No categories available'}
                    </Text>
                  </View>
                )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Bulk Transaction Entry"
        message="Bulk entry is a Premium feature. Upgrade to add multiple transactions at once using a convenient form interface!"
      />
      {AlertComponent}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  // Category Picker Modal Styles
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pickerButtonText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    paddingVertical: spacing.xs,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categorySectionTitle: {
    ...typography.labelSmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButtonModal: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    position: 'relative',
    minHeight: 90,
    justifyContent: 'center',
  },
  categoryIconContainerModal: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryLabelModal: {
    ...typography.labelSmall,
    textAlign: 'center',
    fontSize: 11,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCategoriesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyCategoriesText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default BulkTransactionScreen;

