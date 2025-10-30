/**
 * TransactionsListScreen - Full list of all transactions
 * Purpose: Display all user transactions with filtering and sorting options
 * Features: Search, filter by category/payment method/tags, sort options
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
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../contexts/ThemeContext';
import { ExpenseCard, ExpenseOptionsSheet } from '../components';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { Expense, CategoryType, PaymentMethod, Tag } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type TransactionsListNavigationProp = StackNavigationProp<RootStackParamList, 'TransactionsList'>;

/**
 * TransactionsListScreen - Full transactions list
 */
const TransactionsListScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<TransactionsListNavigationProp>();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const categories: Array<{ id: CategoryType; name: string; icon: string }> = [
    { id: 'food', name: 'Food', icon: 'food' },
    { id: 'transport', name: 'Transport', icon: 'car' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping' },
    { id: 'entertainment', name: 'Entertainment', icon: 'movie' },
    { id: 'health', name: 'Health', icon: 'heart-pulse' },
    { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  const PAYMENT_METHODS: Array<{ id: PaymentMethod; name: string; icon: string }> = [
    { id: 'credit_card', name: 'Credit Card', icon: 'credit-card' },
    { id: 'debit_card', name: 'Debit Card', icon: 'card' },
    { id: 'cash', name: 'Cash', icon: 'cash' },
    { id: 'check', name: 'Check', icon: 'receipt' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: 'bank-transfer' },
    { id: 'digital_wallet', name: 'Digital Wallet', icon: 'wallet' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
  ];

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadTags();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const expensesData = await apiService.getExpenses();
      setExpenses(expensesData);
      setFilteredExpenses(expensesData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tagsData = await tagsService.getTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  // Filter and sort expenses
  useEffect(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(query) ||
          expense.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((expense) => selectedCategories.includes(expense.category));
    }

    // Payment method filter
    if (selectedPaymentMethods.length > 0) {
      filtered = filtered.filter((expense) => expense.paymentMethod && selectedPaymentMethods.includes(expense.paymentMethod));
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(
        (expense) => expense.tags && expense.tags.some(tagId => selectedTags.includes(tagId))
      );
    }

    // Date range filter
    if (selectedDateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (selectedDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            filtered = filtered.filter((expense) => {
              const expenseDate = new Date(expense.date);
              return expenseDate >= customStartDate && expenseDate <= customEndDate;
            });
          }
          break;
        default:
          break;
      }

      if (selectedDateRange !== 'custom') {
        filtered = filtered.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startDate!;
        });
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, selectedCategories, selectedPaymentMethods, selectedTags, selectedDateRange, customStartDate, customEndDate, sortBy, sortOrder]);

  const handleExpenseLongPress = (expense: Expense) => {
    setSelectedExpense(expense);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(null);
    navigation.navigate('AddExpense', { expense });
  };

  const handleDeleteExpense = async (expense: Expense) => {
    setSelectedExpense(null);
    try {
      await apiService.deleteExpense(expense.id);
      await loadData();
      Alert.alert('Deleted', 'Transaction deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete transaction');
      console.error(error);
    }
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPaymentMethods([]);
    setSelectedTags([]);
    setSelectedDateRange('all');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedPaymentMethods.length > 0 || selectedTags.length > 0 || selectedDateRange !== 'all' || searchQuery.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>All Transactions</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFiltersModal(true)}
        >
          <Icon name="filter-variant" size={24} color={hasActiveFilters ? theme.primary : theme.textSecondary} />
          {hasActiveFilters && (
            <View style={[styles.filterBadge, { backgroundColor: theme.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Icon name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      {(hasActiveFilters || selectedCategories.length > 0 || selectedPaymentMethods.length > 0 || selectedTags.length > 0 || selectedDateRange !== 'all') && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {/* Date Range Filter */}
          {selectedDateRange !== 'all' && (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: theme.primary + '20',
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setShowFiltersModal(true)}
            >
              <Icon name="calendar-range" size={14} color={theme.primary} />
              <Text style={[styles.filterChipText, { color: theme.primary }]}>
                {selectedDateRange === 'today' ? 'Today' :
                 selectedDateRange === 'week' ? 'Last 7 Days' :
                 selectedDateRange === 'month' ? 'This Month' :
                 selectedDateRange === '3months' ? 'Last 3 Months' :
                 selectedDateRange === '6months' ? 'Last 6 Months' :
                 selectedDateRange === 'year' ? 'This Year' :
                 'Custom Range'}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedDateRange('all')}
                style={styles.chipCloseButton}
              >
                <Icon name="close" size={12} color={theme.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Category Filters */}
          {selectedCategories.map((catId) => {
            const cat = categories.find(c => c.id === catId);
            if (!cat) return null;
            return (
              <TouchableOpacity
                key={catId}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: theme.categories[catId as keyof typeof theme.categories] + '20',
                    borderColor: theme.categories[catId as keyof typeof theme.categories],
                  },
                ]}
                onPress={() => setSelectedCategories(selectedCategories.filter(id => id !== catId))}
              >
                <Icon
                  name={cat.icon as any}
                  size={14}
                  color={theme.categories[catId as keyof typeof theme.categories]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: theme.categories[catId as keyof typeof theme.categories],
                    },
                  ]}
                >
                  {cat.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedCategories(selectedCategories.filter(id => id !== catId))}
                  style={styles.chipCloseButton}
                >
                  <Icon name="close" size={12} color={theme.categories[catId as keyof typeof theme.categories]} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Payment Method Filters */}
          {selectedPaymentMethods.map((methodId) => {
            const method = PAYMENT_METHODS.find(m => m.id === methodId);
            if (!method) return null;
            return (
              <TouchableOpacity
                key={methodId}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: theme.primary + '20',
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setSelectedPaymentMethods(selectedPaymentMethods.filter(id => id !== methodId))}
              >
                <Icon
                  name={method.icon as any}
                  size={14}
                  color={theme.primary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: theme.primary,
                    },
                  ]}
                >
                  {method.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedPaymentMethods(selectedPaymentMethods.filter(id => id !== methodId))}
                  style={styles.chipCloseButton}
                >
                  <Icon name="close" size={12} color={theme.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Tag Filters */}
          {selectedTags.map((tagId) => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <TouchableOpacity
                key={tagId}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: tag.color + '20',
                    borderColor: tag.color,
                  },
                ]}
                onPress={() => setSelectedTags(selectedTags.filter(id => id !== tagId))}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: tag.color,
                    },
                  ]}
                >
                  {tag.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedTags(selectedTags.filter(id => id !== tagId))}
                  style={styles.chipCloseButton}
                >
                  <Icon name="close" size={12} color={tag.color} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Sort Options */}
      <View style={[styles.sortContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sortLabel, { color: theme.textSecondary }]}>Sort by:</Text>
        <TouchableOpacity
          style={[
            styles.sortButton,
            {
              backgroundColor: sortBy === 'date' ? theme.primary + '20' : 'transparent',
              borderColor: sortBy === 'date' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            if (sortBy === 'date') {
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
            } else {
              setSortBy('date');
              setSortOrder('desc');
            }
          }}
        >
          <Icon
            name={sortBy === 'date' && sortOrder === 'desc' ? 'sort-calendar-descending' : 'sort-calendar-ascending'}
            size={16}
            color={sortBy === 'date' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.sortButtonText,
              {
                color: sortBy === 'date' ? theme.primary : theme.textSecondary,
              },
            ]}
          >
            Date
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortButton,
            {
              backgroundColor: sortBy === 'amount' ? theme.primary + '20' : 'transparent',
              borderColor: sortBy === 'amount' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => {
            if (sortBy === 'amount') {
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
            } else {
              setSortBy('amount');
              setSortOrder('desc');
            }
          }}
        >
          <Icon
            name={sortBy === 'amount' && sortOrder === 'desc' ? 'sort-numeric-descending' : 'sort-numeric-ascending'}
            size={16}
            color={sortBy === 'amount' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.sortButtonText,
              {
                color: sortBy === 'amount' ? theme.primary : theme.textSecondary,
              },
            ]}
          >
            Amount
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      {hasActiveFilters && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'transaction' : 'transactions'} found
          </Text>
        </View>
      )}

      {/* Transactions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filteredExpenses.length > 0 ? (
          filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onPress={() => navigation.navigate('TransactionDetails', { expense })}
              onLongPress={() => handleExpenseLongPress(expense)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="receipt-text-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

          {/* Expense Options Sheet */}
          {selectedExpense && (
            <ExpenseOptionsSheet
              expense={selectedExpense}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onClose={() => setSelectedExpense(null)}
            />
          )}

          {/* Filters Modal */}
          <Modal
            visible={showFiltersModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowFiltersModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Filters</Text>
                  <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                    <Icon name="close" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                  {/* Date Range Filter */}
                  <View style={[styles.modalSection, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Time Period</Text>
                    <View style={styles.dateRangeGrid}>
                      {(['all', 'today', 'week', 'month', '3months', '6months', 'year'] as const).map((range) => (
                        <TouchableOpacity
                          key={range}
                          style={[
                            styles.dateRangeButton,
                            {
                              backgroundColor: selectedDateRange === range ? theme.primary + '20' : theme.background,
                              borderColor: selectedDateRange === range ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedDateRange(range)}
                        >
                          <Text
                            style={[
                              styles.dateRangeButtonText,
                              {
                                color: selectedDateRange === range ? theme.primary : theme.textSecondary,
                                fontWeight: selectedDateRange === range ? '600' : '400',
                              },
                            ]}
                          >
                            {range === 'all' ? 'All Time' :
                             range === 'today' ? 'Today' :
                             range === 'week' ? 'Last 7 Days' :
                             range === 'month' ? 'This Month' :
                             range === '3months' ? 'Last 3 Months' :
                             range === '6months' ? 'Last 6 Months' :
                             'This Year'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Category Filter */}
                  <View style={[styles.modalSection, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Category</Text>
                    <View style={styles.categoryGrid}>
                      {categories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryFilterButton,
                              {
                                backgroundColor: isSelected ? theme.categories[cat.id as keyof typeof theme.categories] + '20' : theme.background,
                                borderColor: isSelected ? theme.categories[cat.id as keyof typeof theme.categories] : theme.border,
                              },
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                              } else {
                                setSelectedCategories([...selectedCategories, cat.id]);
                              }
                            }}
                          >
                            <Icon
                              name={cat.icon as any}
                              size={18}
                              color={isSelected ? theme.categories[cat.id as keyof typeof theme.categories] : theme.textSecondary}
                            />
                            <Text
                              style={[
                                styles.categoryFilterButtonText,
                                {
                                  color: isSelected ? theme.categories[cat.id as keyof typeof theme.categories] : theme.textSecondary,
                                },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Payment Method Filter */}
                  <View style={[styles.modalSection, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Payment Method</Text>
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = selectedPaymentMethods.includes(method.id);
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.modalOption,
                            { borderBottomColor: theme.border },
                            isSelected && { backgroundColor: theme.primary + '10' },
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedPaymentMethods(selectedPaymentMethods.filter(id => id !== method.id));
                            } else {
                              setSelectedPaymentMethods([...selectedPaymentMethods, method.id]);
                            }
                          }}
                        >
                          <Icon name={method.icon as any} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
                          <Text style={[styles.modalOptionText, { color: isSelected ? theme.primary : theme.text }]}>
                            {method.name}
                          </Text>
                          {isSelected && (
                            <Icon name="check" size={20} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Tags Filter */}
                  <View style={[styles.modalSection, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Tags</Text>
                    {tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[
                            styles.modalOption,
                            { borderBottomColor: theme.border },
                            isSelected && { backgroundColor: tag.color + '10' },
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter(id => id !== tag.id));
                            } else {
                              setSelectedTags([...selectedTags, tag.id]);
                            }
                          }}
                        >
                          <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                          <Text style={[styles.modalOptionText, { color: isSelected ? tag.color : theme.text }]}>
                            {tag.name}
                          </Text>
                          {isSelected && (
                            <Icon name="check" size={20} color={tag.color} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    {tags.length === 0 && (
                      <Text style={[styles.emptyTagsText, { color: theme.textSecondary }]}>
                        No tags available
                      </Text>
                    )}
                  </View>
                </ScrollView>
                <View style={[styles.modalActions, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.border }]}
                    onPress={clearFilters}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Clear All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                    onPress={() => setShowFiltersModal(false)}
                  >
                    <Text style={styles.modalButtonTextPrimary}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipCloseButton: {
    marginLeft: spacing.xs / 2,
    padding: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    ...typography.bodyMedium,
    flex: 1,
  },
  filtersContainer: {
    marginBottom: spacing.sm,
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs / 2,
    height: 28,
  },
  filterChipText: {
    ...typography.labelSmall,
    fontWeight: '600',
    fontSize: 11,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  sortLabel: {
    ...typography.labelMedium,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  sortButtonText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  resultsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  resultsText: {
    ...typography.bodySmall,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    ...typography.bodyLarge,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  clearFiltersText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalSectionTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  dateRangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateRangeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  dateRangeButtonText: {
    ...typography.labelSmall,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  categoryFilterButtonText: {
    ...typography.labelSmall,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  modalOptionText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {
    // backgroundColor is set inline
  },
  modalButtonText: {
    ...typography.labelMedium,
  },
  modalButtonTextPrimary: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyTagsText: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});

export default TransactionsListScreen;

