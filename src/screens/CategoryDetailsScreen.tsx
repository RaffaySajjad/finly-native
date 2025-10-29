/**
 * CategoryDetailsScreen - Category Detail View with Budget Editing
 * Purpose: Display category details with transactions and editable budget
 * Features: Budget editing, progress visualization, transaction list
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { ExpenseCard, BottomSheetBackground } from '../components';
import { Expense, Category } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { RootStackParamList } from '../navigation/types';

type CategoryDetailsRouteProp = RouteProp<RootStackParamList, 'CategoryDetails'>;
type CategoryDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'CategoryDetails'>;

/**
 * CategoryDetailsScreen - Detailed category view
 */
const CategoryDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<CategoryDetailsNavigationProp>();
  const route = useRoute<CategoryDetailsRouteProp>();

  const { categoryId } = route.params;

  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBudget, setNewBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [categoryId])
  );

  useEffect(() => {
    if (category) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: category.budgetLimit ? (category.totalSpent / category.budgetLimit) : 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [category]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, expensesData] = await Promise.all([
        apiService.getCategories(),
        apiService.getExpenses(),
      ]);

      const cat = categoriesData.find(c => c.id === categoryId);
      if (cat) {
        setCategory(cat);
        setNewBudget(cat.budgetLimit?.toString() || '');
      }

      // Filter expenses for this category
      const categoryExpenses = expensesData.filter(e => e.category === categoryId && e.type === 'expense');
      setExpenses(categoryExpenses);
    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBudget = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    bottomSheetRef.current?.expand();
  };

  const handleSaveBudget = async () => {
    if (!category) return;

    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid budget amount');
      return;
    }

    setSavingBudget(true);
    try {
      // Update category budget in mock data
      // In real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload data to reflect changes
      await loadData();

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      bottomSheetRef.current?.close();
      Alert.alert('Success', 'Budget updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update budget');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleExpenseTap = (expense: Expense) => {
    navigation.navigate('TransactionDetails', { expense });
  };

  if (loading || !category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const categoryColor = theme.categories[category.id as keyof typeof theme.categories] || theme.primary;
  const budgetPercentage = category.budgetLimit ? (category.totalSpent / category.budgetLimit) * 100 : 0;
  const remaining = category.budgetLimit ? category.budgetLimit - category.totalSpent : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Category Details</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditBudget}
        >
          <Icon name="pencil" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Card */}
        <Animated.View
          style={[
            styles.categoryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.md,
            { opacity: fadeAnim },
          ]}
        >
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
            <Icon name={category.icon as any} size={48} color={categoryColor} />
          </View>

          <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>

          <Text style={[styles.totalSpent, { color: categoryColor }]}>
            ${category.totalSpent.toFixed(2)}
          </Text>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Spent</Text>

          {/* Progress Ring/Bar */}
          {category.budgetLimit && (
            <View style={styles.budgetSection}>
              <View style={styles.budgetInfo}>
                <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>
                  Budget
                </Text>
                <Text style={[styles.budgetValue, { color: theme.text }]}>
                  ${category.budgetLimit.toFixed(2)}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor: budgetPercentage > 80 ? theme.expense : categoryColor,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              <View style={styles.budgetStats}>
                <Text style={[styles.budgetStat, { color: theme.textSecondary }]}>
                  {budgetPercentage.toFixed(1)}% used
                </Text>
                <Text
                  style={[
                    styles.budgetStat,
                    { color: remaining >= 0 ? theme.income : theme.expense },
                  ]}
                >
                  ${Math.abs(remaining).toFixed(2)} {remaining >= 0 ? 'remaining' : 'over'}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Transactions ({expenses.length})
          </Text>

          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onPress={() => handleExpenseTap(expense)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt-text-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No transactions in this category yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Budget Edit Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['45%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Budget</Text>

          <View style={styles.budgetInputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Monthly Budget Limit
            </Text>
            <View style={[styles.budgetInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.text }]}>$</Text>
              <TextInput
                style={[styles.budgetField, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                value={newBudget}
                onChangeText={setNewBudget}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }, elevation.sm]}
            onPress={handleSaveBudget}
            disabled={savingBudget}
          >
            {savingBudget ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Budget</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  categoryName: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  totalSpent: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  totalLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.xl,
  },
  budgetSection: {
    width: '100%',
    marginTop: spacing.md,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    ...typography.labelMedium,
  },
  budgetValue: {
    ...typography.labelMedium,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetStat: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  transactionsSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.titleLarge,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  budgetInputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.headlineMedium,
    fontWeight: '600',
  },
  budgetField: {
    ...typography.headlineMedium,
    fontWeight: '600',
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.xs,
  },
  saveButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default CategoryDetailsScreen;

