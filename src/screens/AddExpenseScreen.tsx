/**
 * AddExpenseScreen component
 * Purpose: Modal screen for adding new expenses or income, or editing existing ones
 * Features category selection, amount input, and smooth animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { CategoryType } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type TransactionType = 'expense' | 'income';
type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

const CATEGORIES: Array<{ id: CategoryType; name: string; icon: string }> = [
  { id: 'food', name: 'Food', icon: 'food' },
  { id: 'transport', name: 'Transport', icon: 'car' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping' },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie' },
  { id: 'health', name: 'Health', icon: 'heart-pulse' },
  { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal' },
];

/**
 * AddExpenseScreen - Modal for creating or editing transactions
 */
const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddExpenseRouteProp>();
  const { theme } = useTheme();

  const editingExpense = route.params?.expense;
  const isEditing = !!editingExpense;

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>('food');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingExpense) {
      setType(editingExpense.type);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
    }
  }, [editingExpense]);

  /**
   * Handles transaction creation or update
   */
  const handleSave = async (): Promise<void> => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please add a description');
      return;
    }

    setSaving(true);

    try {
      if (isEditing && editingExpense) {
        // Update existing expense
        await apiService.editExpense(editingExpense.id, {
          amount: parseFloat(amount),
          category,
          description: description.trim(),
          type,
        });

        Alert.alert(
          'Success',
          'Transaction updated successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
      // Create new expense
        await apiService.createExpense({
          amount: parseFloat(amount),
          category,
          description: description.trim(),
          date: new Date().toISOString(),
          type,
        });

        Alert.alert(
          'Success',
          `${type === 'expense' ? 'Expense' : 'Income'} added successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
      console.error('Error saving transaction:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * CategoryButton component for category selection
   */
  const CategoryButton: React.FC<{ cat: typeof CATEGORIES[0] }> = ({ cat }) => {
    const isSelected = category === cat.id;
    const categoryColor = theme.categories[cat.id as keyof typeof theme.categories];

    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          {
            backgroundColor: isSelected ? categoryColor + '20' : theme.card,
            borderColor: isSelected ? categoryColor : theme.border,
          },
        ]}
        onPress={() => setCategory(cat.id)}
      >
        <Icon
          name={cat.icon as any}
          size={28}
          color={isSelected ? categoryColor : theme.textSecondary}
        />
        <Text
          style={[
            styles.categoryLabel,
            { color: isSelected ? categoryColor : theme.textSecondary },
          ]}
        >
          {cat.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Transaction Type Toggle */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TYPE</Text>
            <View style={[styles.typeToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'expense' && { backgroundColor: theme.expense + '20' },
                ]}
                onPress={() => setType('expense')}
              >
                <Icon
                  name="arrow-up"
                  size={20}
                  color={type === 'expense' ? theme.expense : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.typeText,
                    { color: type === 'expense' ? theme.expense : theme.textSecondary },
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'income' && { backgroundColor: theme.income + '20' },
                ]}
                onPress={() => setType('income')}
              >
                <Icon
                  name="arrow-down"
                  size={20}
                  color={type === 'income' ? theme.income : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.typeText,
                    { color: type === 'income' ? theme.income : theme.textSecondary },
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AMOUNT</Text>
            <View style={[styles.amountContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.text }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CATEGORY</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <CategoryButton key={cat.id} cat={cat} />
              ))}
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="What was it for?"
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.primary },
              elevation.md,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isEditing ? 'Update Transaction' : 'Save Transaction'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.labelSmall,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xs,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    ...typography.labelLarge,
    marginLeft: spacing.xs,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.displayMedium,
    fontWeight: '700',
  },
  amountInput: {
    ...typography.displayMedium,
    fontWeight: '700',
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  categoryButton: {
    width: '31%',
    aspectRatio: 1,
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...typography.labelSmall,
    marginTop: spacing.xs,
  },
  descriptionInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 100,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  saveButton: {
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AddExpenseScreen;

