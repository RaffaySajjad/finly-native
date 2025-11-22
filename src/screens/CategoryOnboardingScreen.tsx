/**
 * CategoryOnboardingScreen component
 * Purpose: Interactive category setup with smart budget recommendations
 * Features: Income-based budget suggestions, customization, premium features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

type CategoryOnboardingNavigationProp = StackNavigationProp<RootStackParamList>;

interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
  suggestedBudget: number;
  percentage: number;
  description: string;
}

/**
 * Smart budget allocation based on 50/30/20 rule (modified)
 * 50% Needs, 30% Wants, 20% Savings
 */
const BUDGET_ALLOCATIONS = {
  // Needs (50%)
  food: { percentage: 20, icon: 'food', color: '#F59E0B', description: 'Groceries & Dining' },
  utilities: { percentage: 15, icon: 'lightning-bolt', color: '#6366F1', description: 'Bills & Utilities' },
  transport: { percentage: 10, icon: 'car', color: '#3B82F6', description: 'Gas & Transportation' },
  health: { percentage: 5, icon: 'heart-pulse', color: '#10B981', description: 'Medical & Fitness' },
  
  // Wants (30%)
  shopping: { percentage: 15, icon: 'shopping', color: '#EC4899', description: 'Shopping & Personal' },
  entertainment: { percentage: 10, icon: 'gamepad-variant', color: '#8B5CF6', description: 'Fun & Entertainment' },
  travel: { percentage: 5, icon: 'airplane', color: '#06B6D4', description: 'Travel & Vacations' },
  
  // Premium Categories (for premium users)
  education: { percentage: 5, icon: 'school', color: '#F97316', description: 'Learning & Development' },
  pets: { percentage: 3, icon: 'paw', color: '#84CC16', description: 'Pet Care' },
  gifts: { percentage: 2, icon: 'gift', color: '#F43F5E', description: 'Gifts & Donations' },
};

// Available icons for custom categories
const AVAILABLE_ICONS = [
  'tag', 'briefcase', 'home', 'toolbox', 'book', 'music', 'camera',
  'gamepad', 'soccer', 'basketball', 'bike', 'wrench', 'hammer',
  'palette', 'coffee', 'pizza', 'glass-wine', 'tree', 'leaf'
];

// Available colors for custom categories
const AVAILABLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280'
];

const CategoryOnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const navigation = useNavigation<CategoryOnboardingNavigationProp>();
  const subscription = useSelector((state: RootState) => state.subscription);
  const isPremium = subscription.subscription.tier === 'PREMIUM';

  const [step, setStep] = useState<'income' | 'budgets' | 'loading'>('income');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryIcon, setCustomCategoryIcon] = useState('tag');
  const [customCategoryColor, setCustomCategoryColor] = useState('#6B7280');
  const [customCategoryBudget, setCustomCategoryBudget] = useState('');

  const handleIncomeSubmit = () => {
    const income = parseFloat(monthlyIncome);
    if (!income || income <= 0) {
      Alert.alert('Invalid Income', 'Please enter a valid monthly income amount.');
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Calculate suggested budgets based on income
    const baseCategories = Object.entries(BUDGET_ALLOCATIONS)
      .filter(([key]) => {
        // Include all base categories
        if (['food', 'utilities', 'transport', 'health', 'shopping', 'entertainment', 'travel'].includes(key)) {
          return true;
        }
        // Include premium categories only for premium users
        return isPremium;
      })
      .map(([key, config]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        icon: config.icon,
        color: config.color,
        suggestedBudget: Math.round((income * config.percentage) / 100),
        percentage: config.percentage,
        description: config.description,
      }));

    setCategories(baseCategories);
    setStep('budgets');
  };

  const handleBudgetChange = (index: number, value: string) => {
    const newCategories = [...categories];
    const numValue = parseFloat(value) || 0;
    newCategories[index].suggestedBudget = numValue;
    setCategories(newCategories);
  };

  const handleAddCustomCategory = () => {
    if (!customCategoryName.trim()) {
      Alert.alert('Missing Name', 'Please enter a category name.');
      return;
    }

    const newCategory: CategoryConfig = {
      name: customCategoryName.trim(),
      icon: customCategoryIcon,
      color: customCategoryColor,
      suggestedBudget: parseFloat(customCategoryBudget) || 0,
      percentage: 0,
      description: 'Custom category',
    };

    setCategories([...categories, newCategory]);
    setShowCustomCategoryModal(false);
    
    // Reset form
    setCustomCategoryName('');
    setCustomCategoryIcon('tag');
    setCustomCategoryColor('#6B7280');
    setCustomCategoryBudget('');

    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteCategory = (index: number) => {
    const newCategories = [...categories];
    newCategories.splice(index, 1);
    setCategories(newCategories);

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSetupComplete = async () => {
    setIsSettingUp(true);
    setStep('loading');

    try {
      // First, setup default categories (which creates the system categories)
      await apiService.setupDefaultCategories();

      // Get the created categories
      const apiCategories = await apiService.getCategories();

      // Update system categories with budgets and create custom categories
      const promises = categories.map(async (cat) => {
        // Check if it's a custom category
        if (cat.description === 'Custom category') {
          // Create new custom category
          return apiService.createCategory({
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            budgetLimit: cat.suggestedBudget > 0 ? cat.suggestedBudget : undefined,
          });
        } else {
          // Update existing system category with budget
          const matchingCategory = apiCategories.find(
            (c) => c.name.toLowerCase().includes(cat.name.toLowerCase())
          );
          if (matchingCategory && cat.suggestedBudget > 0) {
            return apiService.updateCategory(matchingCategory.id, {
              budgetLimit: cat.suggestedBudget,
            });
          }
        }
      });

      await Promise.all(promises);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Navigate back to categories screen
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('[CategoryOnboarding] Setup error:', error);
      Alert.alert('Error', 'Failed to set up categories. Please try again.');
      setIsSettingUp(false);
      setStep('budgets');
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip Budget Setup?',
      'You can set budgets later, but tracking budgets helps you save money.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            setIsSettingUp(true);
            setStep('loading');
            try {
              await apiService.setupDefaultCategories();
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              setTimeout(() => navigation.goBack(), 500);
            } catch (error) {
              Alert.alert('Error', 'Failed to set up categories.');
              setIsSettingUp(false);
              setStep('income');
            }
          },
        },
      ]
    );
  };

  // Step 1: Income Input
  if (step === 'income') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
              <Icon name="wallet" size={56} color={theme.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Let's Set Up Your Budget
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            First, what's your average monthly income? This helps us suggest realistic budgets.
          </Text>

          {/* Income Input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.currencySymbol, { color: theme.textSecondary }]}>
              {getCurrencySymbol()}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              keyboardType="decimal-pad"
              placeholder="3000"
              placeholderTextColor={theme.textTertiary}
              autoFocus
            />
          </View>

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>
              Why we ask:
            </Text>
            {[
              { icon: 'chart-pie', text: 'Get personalized budget recommendations' },
              { icon: 'target', text: 'Set realistic spending limits' },
              { icon: 'shield-check', text: 'Your income stays private on your device' },
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Icon name={benefit.icon as any} size={20} color={theme.primary} />
                <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }, elevation.md]}
            onPress={handleIncomeSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Icon name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipButton]}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              Skip for Now
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2: Budget Customization
  if (step === 'budgets') {
    const totalBudget = categories.reduce((sum, cat) => sum + cat.suggestedBudget, 0);
    const income = parseFloat(monthlyIncome);
    const remaining = income - totalBudget;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('income')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>
            Customize Your Budgets
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isPremium 
              ? '✨ Premium: Adjust these budgets based on your needs. We\'ve included extra categories for you!'
              : 'Adjust these budgets based on your needs. Tap each amount to edit.'}
          </Text>

          {/* Budget Summary */}
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Monthly Income</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(income)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Budgets</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.text, fontWeight: '600' }]}>
                Remaining (Savings)
              </Text>
              <Text style={[styles.summaryValue, { 
                color: remaining >= 0 ? '#10B981' : '#EF4444',
                fontWeight: '600'
              }]}>
                {formatCurrency(remaining)}
              </Text>
            </View>
          </View>

          {/* Category Budgets */}
          <View style={styles.categoriesSection}>
            {categories.map((category, index) => (
              <View
                key={index}
                style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                    <Icon name={category.icon as any} size={24} color={category.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
                    <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
                      {category.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryActions}>
                  <View style={[styles.budgetInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.budgetCurrency, { color: theme.textSecondary }]}>
                      {getCurrencySymbol()}
                    </Text>
                    <TextInput
                      style={[styles.budgetInput, { color: theme.text }]}
                      value={category.suggestedBudget.toString()}
                      onChangeText={(value) => handleBudgetChange(index, value)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {isPremium && category.description === 'Custom category' && (
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(index)}
                      activeOpacity={0.7}
                      style={styles.deleteButton}
                    >
                      <Icon name="delete" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Add Custom Category Button (Premium Only) */}
            {isPremium && (
              <TouchableOpacity
                style={[styles.addCategoryButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
                onPress={() => setShowCustomCategoryModal(true)}
                activeOpacity={0.8}
              >
                <Icon name="plus-circle" size={24} color={theme.primary} />
                <Text style={[styles.addCategoryText, { color: theme.primary }]}>
                  Create Custom Category
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
              <Icon name="crown" size={16} color="#F59E0B" />
              <Text style={[styles.premiumText, { color: '#F59E0B' }]}>
                Premium: {categories.length} categories available
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }, elevation.md]}
            onPress={handleSetupComplete}
            activeOpacity={0.8}
            disabled={isSettingUp}
          >
            <Icon name="check-circle" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Complete Setup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setStep('income')}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3: Loading
  if (step === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Setting up your categories...
          </Text>
          <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
            This will only take a moment
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Custom Category Modal (Premium only)
  return (
    <>
      <Modal
        visible={showCustomCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Create Custom Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomCategoryModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Name */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                  Category Name *
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                  value={customCategoryName}
                  onChangeText={setCustomCategoryName}
                  placeholder="e.g., Hobbies, Subscriptions"
                  placeholderTextColor={theme.textTertiary}
                  maxLength={30}
                />
              </View>

              {/* Icon Picker */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                  Choose Icon
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
                  {AVAILABLE_ICONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconOption,
                        { backgroundColor: theme.card, borderColor: customCategoryIcon === iconName ? theme.primary : theme.border },
                        customCategoryIcon === iconName && styles.iconOptionSelected,
                      ]}
                      onPress={() => {
                        setCustomCategoryIcon(iconName);
                        if (Platform.OS === 'ios') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon name={iconName as any} size={24} color={customCategoryIcon === iconName ? theme.primary : theme.text} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Color Picker */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                  Choose Color
                </Text>
                <View style={styles.colorPicker}>
                  {AVAILABLE_COLORS.map((colorValue) => (
                    <TouchableOpacity
                      key={colorValue}
                      style={[
                        styles.colorOption,
                        { backgroundColor: colorValue },
                        customCategoryColor === colorValue && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        setCustomCategoryColor(colorValue);
                        if (Platform.OS === 'ios') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {customCategoryColor === colorValue && (
                        <Icon name="check" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Budget Input */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                  Monthly Budget (Optional)
                </Text>
                <View style={[styles.formInput, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={[styles.budgetCurrency, { color: theme.textSecondary }]}>
                    {getCurrencySymbol()}
                  </Text>
                  <TextInput
                    style={[styles.budgetInput, { color: theme.text, flex: 1 }]}
                    value={customCategoryBudget}
                    onChangeText={setCustomCategoryBudget}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </View>

              {/* Preview */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                  Preview
                </Text>
                <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.categoryIcon, { backgroundColor: customCategoryColor + '15' }]}>
                    <Icon name={customCategoryIcon as any} size={24} color={customCategoryColor} />
                  </View>
                  <Text style={[styles.categoryName, { color: theme.text }]}>
                    {customCategoryName || 'Category Name'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.border }]}
                onPress={() => setShowCustomCategoryModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }, elevation.sm]}
                onPress={handleAddCustomCategory}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  currencySymbol: {
    ...typography.headlineSmall,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  input: {
    ...typography.headlineSmall,
    fontWeight: '600',
    flex: 1,
  },
  benefitsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitsTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  benefitText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  buttonText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  skipButtonText: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodyMedium,
  },
  summaryValue: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  categoriesSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDescription: {
    ...typography.bodySmall,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 100,
  },
  budgetCurrency: {
    ...typography.bodyMedium,
    fontWeight: '500',
    marginRight: spacing.xs / 2,
  },
  budgetInput: {
    ...typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  premiumText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addCategoryText: {
    ...typography.labelMedium,
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
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.labelMedium,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  formInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconPicker: {
    marginTop: spacing.sm,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconOptionSelected: {
    borderWidth: 3,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 2,
  },
  modalButtonPrimary: {
    // backgroundColor set inline
  },
  modalButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
});

export default CategoryOnboardingScreen;
