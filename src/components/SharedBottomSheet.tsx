/**
 * SharedBottomSheet Component
 * Purpose: Bottom sheet for adding expenses that's visible across all tabs
 * Features: Manual entry, scan receipt, voice entry, bulk add
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { BottomSheetBackground, PremiumBadge, UpgradePrompt, CurrencyInput, DatePickerInput, CategoryPickerModal, InputGroup } from '../components';
import { useAlert } from '../hooks/useAlert';
import { shouldUseLiquidGlass } from './BottomSheetBackground';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { Expense, PaymentMethod, Tag, Category } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Animated } from 'react-native';

const PAYMENT_METHODS = [
  { id: 'CREDIT_CARD' as PaymentMethod, name: 'Credit Card', icon: 'credit-card' },
  { id: 'DEBIT_CARD' as PaymentMethod, name: 'Debit Card', icon: 'credit-card-outline' },
  { id: 'CASH' as PaymentMethod, name: 'Cash', icon: 'cash' },
  { id: 'BANK_TRANSFER' as PaymentMethod, name: 'Bank Transfer', icon: 'bank-transfer' },
  { id: 'CHECK' as PaymentMethod, name: 'Check', icon: 'file-document-outline' },
  { id: 'OTHER' as PaymentMethod, name: 'Other', icon: 'dots-horizontal' },
];

type SharedBottomSheetNavigationProp = StackNavigationProp<RootStackParamList>;

const SharedBottomSheet: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol, convertToUSD, currencyCode } = useCurrency();
  const { isPremium, getRemainingUsage, requiresUpgrade } = useSubscription();
  const [toggleWidth, setToggleWidth] = useState(0);
  const navigation = useNavigation<SharedBottomSheetNavigationProp>();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { setBottomSheetRef, onTransactionAdded } = useBottomSheet();

  // Determine if using translucent background (affects text colors)
  const usesTranslucentBackground = shouldUseLiquidGlass();

  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);

  // Transaction type state (Expense or Income)
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const pillPosition = useRef(new Animated.Value(0)).current;

  // Bottom sheet state for adding expenses
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState<string>('');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date());
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [newExpenseTags, setNewExpenseTags] = useState<string[]>([]);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTagsPicker, setShowTagsPicker] = useState(false);

  // Animate pill position when transaction type changes
  useEffect(() => {
    Animated.spring(pillPosition, {
      toValue: transactionType === 'expense' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 8,
    }).start();
  }, [transactionType, pillPosition]);

  // Reload categories when category picker opens to ensure fresh data
  useEffect(() => {
    if (showCategoryPicker && categories.length === 0) {
      console.log('[SharedBottomSheet] Category picker opened but no categories, reloading...');
      loadCategoriesAndTags();
    }
  }, [showCategoryPicker]);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Error states for validation
  const [expenseAmountError, setExpenseAmountError] = useState('');
  const [expenseDescriptionError, setExpenseDescriptionError] = useState('');
  const [expenseCategoryError, setExpenseCategoryError] = useState('');
  const [incomeAmountError, setIncomeAmountError] = useState('');
  const [incomeDescriptionError, setIncomeDescriptionError] = useState('');
  const [tagNameError, setTagNameError] = useState('');

  // Alert hook for non-validation errors
  const { showError, showSuccess, AlertComponent } = useAlert();

  // Income state
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeSourceId, setNewIncomeSourceId] = useState<string>('');
  const [newIncomeDescription, setNewIncomeDescription] = useState('');
  const [newIncomeDate, setNewIncomeDate] = useState(new Date());
  const [showIncomeSourcePicker, setShowIncomeSourcePicker] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);

  // Animation values
  const fabScale = useRef(new Animated.Value(1)).current;

  // Load categories, tags, and income sources
  useEffect(() => {
    loadCategoriesAndTags();
  }, []);

  // Register bottom sheet ref with context - cleanup on unmount
  useEffect(() => {
    return () => {
      setBottomSheetRef(null);
    };
  }, [setBottomSheetRef]);

  const loadCategoriesAndTags = async () => {
    try {
      const [categoriesData, tagsData, incomeSourcesData] = await Promise.all([
        apiService.getCategories(),
        tagsService.getTags(),
        apiService.getIncomeSources(),
      ]);
      setCategories(categoriesData);
      setAvailableTags(tagsData);
      setIncomeSources(incomeSourcesData);
      // Set initial category if none selected
      if (categoriesData.length > 0 && !newExpenseCategoryId) {
        setNewExpenseCategoryId(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error loading categories and tags:', error);
    }
  };

  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0); // Open at 85%
    Animated.spring(fabScale, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    Animated.spring(fabScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    // Reset expense form
    setNewExpenseAmount('');
    setNewExpenseDescription('');
    setNewExpenseDate(new Date());
    setNewExpensePaymentMethod(undefined);
    setNewExpenseTags([]);
    // Reset income form
    setNewIncomeAmount('');
    setNewIncomeDescription('');
    setNewIncomeDate(new Date());
    setNewIncomeSourceId('');
    // Reset transaction type to expense
    setTransactionType('expense');
    // Reset category to first available
    setCategories((prevCategories) => {
      if (prevCategories.length > 0) {
        setNewExpenseCategoryId(prevCategories[0].id);
      }
      return prevCategories;
    });
  }, []);

  const handleAddExpense = async (): Promise<void> => {
    // Clear previous errors
    setExpenseAmountError('');
    setExpenseDescriptionError('');
    setExpenseCategoryError('');

    // Validate amount
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      setExpenseAmountError('Please enter a valid amount');
      return;
    }

    // Validate description
    if (!newExpenseDescription.trim()) {
      setExpenseDescriptionError('Please add a description');
      return;
    }

    // Validate category
    if (!newExpenseCategoryId) {
      setExpenseCategoryError('Please select a category');
      return;
    }

    setIsAddingExpense(true);

    try {
      const originalAmount = parseFloat(newExpenseAmount);
      // Convert amount from display currency to USD before sending
      const amountInUSD = convertToUSD(originalAmount);

      const payload: any = {
        amount: amountInUSD,
        categoryId: newExpenseCategoryId,
        description: newExpenseDescription.trim(),
        date: newExpenseDate,
        originalAmount,
        originalCurrency: currencyCode,
      };

      // Only include optional fields if they have values
      if (newExpensePaymentMethod) {
        payload.paymentMethod = newExpensePaymentMethod;
      }
      if (newExpenseTags.length > 0) {
        payload.tags = newExpenseTags;
      }

      await apiService.addExpense(payload);

      handleCloseBottomSheet();
      showSuccess('Success', 'Expense added successfully! 🎉');

      // Reload categories and tags in case they changed
      await loadCategoriesAndTags();

      // Trigger dashboard refresh
      onTransactionAdded();
    } catch (error) {
      showError('Error', 'Failed to add expense');
      console.error(error);
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleAddIncome = async (): Promise<void> => {
    // Clear previous errors
    setIncomeAmountError('');
    setIncomeDescriptionError('');

    // Validate amount
    if (!newIncomeAmount || parseFloat(newIncomeAmount) <= 0) {
      setIncomeAmountError('Please enter a valid amount');
      return;
    }

    // Validate description
    if (!newIncomeDescription.trim()) {
      setIncomeDescriptionError('Please add a description');
      return;
    }

    setIsAddingIncome(true);

    try {
      const originalAmount = parseFloat(newIncomeAmount);
      // Convert amount from display currency to USD before sending
      const amountInUSD = convertToUSD(originalAmount);

      const payload: any = {
        amount: amountInUSD,
        date: newIncomeDate.toISOString(),
        description: newIncomeDescription.trim(),
        originalAmount,
        originalCurrency: currencyCode,
      };

      // Only include incomeSourceId if it has a value
      if (newIncomeSourceId) {
        payload.incomeSourceId = newIncomeSourceId;
      }

      console.log('[DEBUG FE] Sending income transaction:', payload);

      await apiService.createIncomeTransaction(payload);

      handleCloseBottomSheet();
      showSuccess('Success', 'Income recorded successfully! 💰');

      // Reload data in case it changed
      await loadCategoriesAndTags();

      // Trigger dashboard refresh
      onTransactionAdded();
    } catch (error) {
      showError('Error', 'Failed to add income');
      console.error(error);
    } finally {
      setIsAddingIncome(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (newExpenseTags.includes(tagId)) {
      setNewExpenseTags(newExpenseTags.filter(id => id !== tagId));
    } else {
      setNewExpenseTags([...newExpenseTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setNewExpenseTags(newExpenseTags.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    setTagNameError('');

    if (!newTagName.trim()) {
      setTagNameError('Please enter a tag name');
      return;
    }

    try {
      const defaultColors = ['#4A90E2', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#6366F6'];
      const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
      const newTag = await tagsService.createTag(newTagName.trim(), randomColor);
      setAvailableTags([...availableTags, newTag]);
      setNewExpenseTags([...newExpenseTags, newTag.id]);
      setNewTagName('');
      setShowCreateTagModal(false);
    } catch (error) {
      showError('Error', 'Failed to create tag');
      console.error(error);
    }
  };

  // Get selected category display info
  const selectedCategory = categories.find(cat => cat.id === newExpenseCategoryId);

  return (
    <>
      <BottomSheet
        ref={(ref) => {
          bottomSheetRef.current = ref;
          if (ref) {
            console.log('[SharedBottomSheet] Ref attached, setting to context');
            setBottomSheetRef(ref);
          } else {
            console.log('[SharedBottomSheet] Ref detached');
          }
        }}
        index={-1}
        snapPoints={['80%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        onClose={() => {
          Animated.spring(fabScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
        topInset={Platform.OS === 'ios' ? 46 : 0}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={[styles.bottomSheetContentContainer, { paddingTop: spacing.md, paddingBottom: 100 }]}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Transaction</Text>

          {/* Transaction Type Toggle - Pill Style */}
          <View
            style={[styles.transactionTypeToggle, { backgroundColor: theme.card, borderColor: theme.border }]}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setToggleWidth(width);
            }}
          >
            {/* Sliding Pill Indicator */}
            {toggleWidth > 0 && (
              <Animated.View
                style={[
                  styles.pillIndicator,
                  {
                    backgroundColor: transactionType === 'expense' ? theme.expense : theme.income,
                    width: (toggleWidth - 8) / 2, // Container width minus padding (4*2) divided by 2
                    transform: [
                      {
                        translateX: pillPosition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (toggleWidth - 8) / 2], // Move by half the container width
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            {/* Expense Option */}
            <TouchableOpacity
              style={styles.pillOption}
              onPress={() => setTransactionType('expense')}
              activeOpacity={0.7}
            >
              <Icon
                name="arrow-up"
                size={18}
                color={transactionType === 'expense' ? '#FFFFFF' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.pillOptionText,
                  { color: transactionType === 'expense' ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            {/* Income Option */}
            <TouchableOpacity
              style={styles.pillOption}
              onPress={() => setTransactionType('income')}
              activeOpacity={0.7}
            >
              <Icon
                name="arrow-down"
                size={18}
                color={transactionType === 'income' ? '#FFFFFF' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.pillOptionText,
                  { color: transactionType === 'income' ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Add Options - Only for Expenses */}
          {transactionType === 'expense' && (
            <View style={styles.quickAddButtons}>
              <View style={styles.aiButtonContainer}>
                <TouchableOpacity
                  style={[styles.aiButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (requiresUpgrade('voiceEntry')) {
                      setShowUpgradePrompt(true);
                      return;
                    }
                    bottomSheetRef.current?.close();
                    setTimeout(() => navigation.navigate('VoiceTransaction'), 300);
                  }}
                >
                  <Icon name="microphone" size={22} color="#FFFFFF" />
                  <Text style={styles.aiButtonText}>
                    Speak
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scanButtonContainer}>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: theme.income }]}
                  onPress={() => {
                    bottomSheetRef.current?.close();
                    setTimeout(() => navigation.navigate('ReceiptUpload'), 300);
                  }}
                >
                  <Icon name="camera-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.scanButtonText}>
                    Scan
                  </Text>
                  {!isPremium && (() => {
                    const remaining = getRemainingUsage('receiptScanning');
                    // Only show badge if remaining is a finite number (not Infinity)
                    if (remaining !== Infinity && remaining > 0) {
                      return (
                        <View style={styles.scanButtonBadge}>
                          <Text style={styles.scanButtonBadgeText}>
                            {remaining} left
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                </TouchableOpacity>
                {isPremium && (
                  <View style={styles.premiumBadgeOverlay}>
                    <View style={[
                      styles.premiumIconBadge,
                      {
                        backgroundColor: theme.warning,
                      }
                    ]}>
                      <Icon name="crown" size={12} color="#1A1A1A" />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Income Form */}
          {transactionType === 'income' && (
            <>
              <View style={styles.divider}>
                <View style={[
                  styles.dividerLine,
                  { backgroundColor: usesTranslucentBackground ? 'rgba(255, 255, 255, 0.3)' : theme.border }
                ]} />
                <Text style={[
                  styles.dividerText,
                  { color: usesTranslucentBackground ? '#FFFFFF' : theme.textSecondary }
                ]}>
                  INCOME DETAILS
                </Text>
                <View style={[
                  styles.dividerLine,
                  { backgroundColor: usesTranslucentBackground ? 'rgba(255, 255, 255, 0.3)' : theme.border }
                ]} />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
                <View style={[
                  styles.amountInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: incomeAmountError ? theme.expense : theme.border,
                  }
                ]}>
                  <CurrencyInput
                    value={newIncomeAmount}
                    onChangeText={(text) => {
                      setNewIncomeAmount(text);
                      if (incomeAmountError) setIncomeAmountError('');
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.textTertiary}
                    showSymbol={true}
                    allowDecimals={true}
                    inputStyle={styles.currencyInputField}
                  />
                </View>
                {incomeAmountError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{incomeAmountError}</Text>
                )}
              </View>

              {/* Income Source Selection (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Income Source (Optional)</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                  onPress={() => setShowIncomeSourcePicker(true)}
                >
                  <View style={styles.pickerButtonContent}>
                    {newIncomeSourceId ? (
                      <>
                        <Icon name="cash" size={18} color={theme.income} />
                        <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                          {incomeSources.find(s => s.id === newIncomeSourceId)?.name || 'Select source'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Icon name="briefcase-outline" size={18} color={theme.textSecondary} />
                        <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                          Select income source
                        </Text>
                      </>
                    )}
                  </View>
                  <Icon name="chevron-down" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <InputGroup
                  label="Description"
                  placeholder="What is this income for?"
                  value={newIncomeDescription}
                  onChangeText={(text) => {
                    setNewIncomeDescription(text);
                    if (incomeDescriptionError) setIncomeDescriptionError('');
                  }}
                  error={incomeDescriptionError}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  containerStyle={styles.descriptionInputContainer}
                />
              </View>

              {/* Date Picker */}
              <View style={styles.inputGroup}>
                <DatePickerInput
                  date={newIncomeDate}
                  onDateChange={setNewIncomeDate}
                  label="Date"
                />
              </View>

            </>
          )}

          {/* Expense-only Options */}
          {transactionType === 'expense' && (
            <>
              <View style={styles.divider}>
                <View style={[
                  styles.dividerLine,
                  { backgroundColor: usesTranslucentBackground ? 'rgba(255, 255, 255, 0.3)' : theme.border }
                ]} />
                <Text style={[
                  styles.dividerText,
                  { color: usesTranslucentBackground ? '#FFFFFF' : theme.textSecondary }
                ]}>
                  OR ADD MANUALLY
                </Text>
                <View style={[
                  styles.dividerLine,
                  { backgroundColor: usesTranslucentBackground ? 'rgba(255, 255, 255, 0.3)' : theme.border }
                ]} />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
                <View style={[
                  styles.amountInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: expenseAmountError ? theme.expense : theme.border,
                  }
                ]}>
                  <CurrencyInput
                    value={newExpenseAmount}
                    onChangeText={(text) => {
                      setNewExpenseAmount(text);
                      if (expenseAmountError) setExpenseAmountError('');
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.textTertiary}
                    showSymbol={true}
                    allowDecimals={true}
                    inputStyle={styles.currencyInputField}
                  />
                </View>
                {expenseAmountError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{expenseAmountError}</Text>
                )}
              </View>

              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: expenseCategoryError ? theme.expense : theme.border,
                    },
                  ]}
                  onPress={() => {
                    console.log('[SharedBottomSheet] Opening category picker, categories count:', categories.length);
                    setShowCategoryPicker(true);
                    if (expenseCategoryError) setExpenseCategoryError('');
                  }}
                >
                  <View style={styles.pickerButtonContent}>
                    {selectedCategory ? (
                      <>
                        <View style={[styles.categoryIconContainer, { backgroundColor: selectedCategory.color + '20' }]}>
                          <Icon name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
                        </View>
                        <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                          {selectedCategory.name}
                        </Text>
                      </>
                    ) : (
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
                {expenseCategoryError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{expenseCategoryError}</Text>
                )}
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <InputGroup
                  label="Description"
                  placeholder="What did you spend on?"
                  value={newExpenseDescription}
                  onChangeText={(text) => {
                    setNewExpenseDescription(text);
                    if (expenseDescriptionError) setExpenseDescriptionError('');
                  }}
                  error={expenseDescriptionError}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  containerStyle={styles.descriptionInputContainer}
                />
              </View>

              {/* Date Picker */}
              <View style={styles.inputGroup}>
                <DatePickerInput
                  date={newExpenseDate}
                  onDateChange={setNewExpenseDate}
                  label="Date"
                />
              </View>

              {/* Payment Method Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Payment Method (Optional)</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                  onPress={() => setShowPaymentMethodPicker(true)}
                >
                  <View style={styles.pickerButtonContent}>
                    {newExpensePaymentMethod ? (
                      <>
                        <Icon
                          name={PAYMENT_METHODS.find(pm => pm.id === newExpensePaymentMethod)?.icon as any}
                          size={18}
                          color={theme.primary}
                        />
                        <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                          {PAYMENT_METHODS.find(pm => pm.id === newExpensePaymentMethod)?.name}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Icon name="credit-card-outline" size={18} color={theme.textSecondary} />
                        <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                          Select payment method
                        </Text>
                      </>
                    )}
                  </View>
                  <Icon name="chevron-down" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Tags */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tags (Optional)</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => setShowTagsPicker(true)}
                >
                  <View style={styles.pickerButtonContent}>
                    <Icon name="tag-multiple-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.pickerButtonText, { color: newExpenseTags.length > 0 ? theme.text : theme.textTertiary }]}>
                      {newExpenseTags.length > 0
                        ? newExpenseTags.map(tagId => availableTags.find(t => t.id === tagId)?.name || tagId).join(', ')
                        : 'Add Tags'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
                {newExpenseTags.length > 0 && (
                  <View style={styles.selectedTagsContainer}>
                    {newExpenseTags.map(tagId => {
                      const tag = availableTags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color + '20', borderColor: tag.color }]}>
                          <Text style={[styles.tagChipText, { color: tag.color }]}>{tag.name}</Text>
                          <TouchableOpacity onPress={() => handleRemoveTag(tag.id)}>
                            <Icon name="close-circle" size={16} color={tag.color} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

            </>
          )}

          {/* Upgrade Prompt */}
          <UpgradePrompt
            visible={showUpgradePrompt}
            onClose={() => setShowUpgradePrompt(false)}
            feature="AI Features"
            message="Unlock unlimited AI features with Finly Premium!"
          />
        </BottomSheetScrollView>

        {/* Fixed Footer with Add Buttons */}
        <View style={[styles.fixedFooter, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          {transactionType === 'expense' ? (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }, elevation.sm]}
              onPress={handleAddExpense}
              disabled={isAddingExpense}
            >
              {isAddingExpense ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Expense</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.income }, elevation.sm]}
              onPress={handleAddIncome}
              disabled={isAddingIncome}
            >
              {isAddingIncome ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>Add Income</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        categories={categories || []}
        selectedCategoryId={newExpenseCategoryId}
        onSelect={(categoryId) => {
          console.log('[SharedBottomSheet] Category selected:', categoryId);
          setNewExpenseCategoryId(categoryId);
        }}
        onClose={() => setShowCategoryPicker(false)}
      />

      {/* Payment Method Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPaymentMethodPicker}
        onRequestClose={() => setShowPaymentMethodPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowPaymentMethodPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentMethodPicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.modalOption, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setNewExpensePaymentMethod(method.id);
                    setShowPaymentMethodPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: theme.text }]}>{method.name}</Text>
                  {newExpensePaymentMethod === method.id && (
                    <Icon name="check-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tags Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTagsPicker}
        onRequestClose={() => setShowTagsPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowTagsPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Tags</Text>
              <TouchableOpacity onPress={() => setShowTagsPicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {availableTags.length === 0 ? (
                <View style={styles.emptyTagsContainer}>
                  <Icon name="tag-off-outline" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyTagsText, { color: theme.textSecondary }]}>
                    No tags created yet. Go to Settings to create some!
                  </Text>
                </View>
              ) : (
                availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.modalOption, { borderBottomColor: theme.border }]}
                    onPress={() => handleToggleTag(tag.id)}
                  >
                    <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                    <Text style={[styles.modalOptionText, { color: theme.text }]}>{tag.name}</Text>
                    {newExpenseTags.includes(tag.id) && (
                      <Icon name="check-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.addTagButton, { backgroundColor: theme.primary, margin: spacing.md, padding: spacing.md, borderRadius: borderRadius.md }]}
              onPress={() => {
                setShowTagsPicker(false);
                setShowCreateTagModal(true);
              }}
            >
              <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>Create New Tag</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Income Source Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showIncomeSourcePicker}
        onRequestClose={() => setShowIncomeSourcePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowIncomeSourcePicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Income Source</Text>
              <TouchableOpacity onPress={() => setShowIncomeSourcePicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[styles.modalOption, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setNewIncomeSourceId('');
                  setShowIncomeSourcePicker(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.textSecondary }]}>No source</Text>
                {!newIncomeSourceId && (
                  <Icon name="check-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
              {incomeSources.map((source) => (
                <TouchableOpacity
                  key={source.id}
                  style={[styles.modalOption, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setNewIncomeSourceId(source.id);
                    setShowIncomeSourcePicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: theme.text }]}>{source.name}</Text>
                  {newIncomeSourceId === source.id && (
                    <Icon name="check-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCreateTagModal}
        onRequestClose={() => setShowCreateTagModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowCreateTagModal(false)}
        >
          <View style={[styles.modalContent, styles.createTagModalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create New Tag</Text>
              <TouchableOpacity onPress={() => setShowCreateTagModal(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: spacing.lg }}>
              <InputGroup
                label=""
                placeholder="Tag Name"
                value={newTagName}
                onChangeText={(text) => {
                  setNewTagName(text);
                  if (tagNameError) setTagNameError('');
                }}
                error={tagNameError}
                containerStyle={styles.tagInputContainer}
              />
              <View style={styles.colorPickerContainer}>
                {['#4A90E2', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#6366F6'].map((colorValue) => (
                  <TouchableOpacity
                    key={colorValue}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorValue },
                    ]}
                    onPress={() => {
                      // Color selection can be added later
                    }}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateTag}
              >
                <Text style={styles.addButtonText}>Create Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Alert Dialog */}
      {AlertComponent}
    </>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  transactionTypeToggle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  pillIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: borderRadius.full,
  },
  pillOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    zIndex: 1,
  },
  pillOptionText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  quickAddButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'stretch',
  },
  aiButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  aiButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 56,
  },
  aiButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  scanButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 56,
  },
  scanButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanButtonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  scanButtonBadgeText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  premiumBadgeOverlay: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  premiumIconBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    position: 'relative',
    gap: spacing.xs,
  },
  bulkButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  bulkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    // Color is set dynamically based on background type (see JSX)
  },
  inputGroup: {
    marginBottom: spacing.md
  },
  categoryGroup: {
    marginBottom: spacing.md,
    minHeight: 290
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencyInputField: {
    paddingVertical: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs / 2,
  },
  categoryButton: {
    width: '31%',
    aspectRatio: 1,
    margin: spacing.xs / 2,
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pickerButtonText: {
    ...typography.bodyMedium,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  tagChipText: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '600',
  },
  fixedFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  addButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.labelLarge,
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
    maxHeight: '80%',
    paddingBottom: spacing.md,
  },
  createTagModalContent: {
    maxHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    paddingVertical: spacing.xs,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categorySectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    fontWeight: '600',
  },
  categoryGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryButtonModal: {
    width: '30%',
    aspectRatio: 0.9,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    position: 'relative',
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
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
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
    paddingHorizontal: spacing.lg,
  },
  emptyCategoriesText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  modalOptionText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  tagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyTagsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTagsText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  addTagButton: {
    padding: spacing.xs,
  },
  input: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    color: '#EF4444',
  },
  descriptionInputContainer: {
    marginBottom: 0,
  },
  tagInputContainer: {
    marginBottom: 0,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
});

export default SharedBottomSheet;

