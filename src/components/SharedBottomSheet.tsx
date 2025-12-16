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
import { logger } from '../utils/logger';
import { useBottomSheetActions, useBottomSheetEditState } from '../contexts/BottomSheetContext';
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
  const { formatCurrency, getCurrencySymbol, convertToUSD, convertFromUSD, getTransactionDisplayAmount, currencyCode } = useCurrency();
  const { isPremium, getRemainingUsage, requiresUpgrade } = useSubscription();
  const [toggleWidth, setToggleWidth] = useState(0);
  const navigation = useNavigation<SharedBottomSheetNavigationProp>();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { setBottomSheetRef, onTransactionAdded, onParsedTransactionUpdate } = useBottomSheetActions();
  const { editingExpense, editingIncome, setEditingExpense, setEditingIncome } = useBottomSheetEditState();

  // Helper function to convert amount from a specific currency to USD
  const convertCurrencyToUSD = async (amount: number, fromCurrency: string): Promise<number> => {
    if (fromCurrency.toUpperCase() === 'USD') {
      return amount;
    }
    
    // If it's the active currency, use the existing conversion
    if (fromCurrency.toUpperCase() === currencyCode.toUpperCase()) {
      return convertToUSD(amount);
    }
    
    // Otherwise, fetch exchange rate for the specific currency
    const rate = await apiService.getExchangeRate(fromCurrency);
    return amount / rate;
  };

  // Determine if we're in editing mode
  const isEditingExpense = !!editingExpense?.id;
  const isEditingIncome = !!editingIncome?.id;

  // Determine if using translucent background (affects text colors)
  // const usesTranslucentBackground = shouldUseLiquidGlass();
  const usesTranslucentBackground = false;

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
      logger.debug('[SharedBottomSheet] Category picker opened but no categories, reloading...');
      loadCategoriesAndTags();
    }
  }, [showCategoryPicker]);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showCreateIncomeSourceModal, setShowCreateIncomeSourceModal] = useState(false);
  const [newIncomeSourceName, setNewIncomeSourceName] = useState('');
  const [newIncomeSourceAmount, setNewIncomeSourceAmount] = useState('');
  const [incomeSourceNameError, setIncomeSourceNameError] = useState('');
  const [incomeSourceAmountError, setIncomeSourceAmountError] = useState('');
  const [isCreatingIncomeSource, setIsCreatingIncomeSource] = useState(false);

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
  const [selectedIncomeCurrency, setSelectedIncomeCurrency] = useState<string | undefined>(undefined);
  const [selectedExpenseCurrency, setSelectedExpenseCurrency] = useState<string | undefined>(undefined);

  // Animation values
  const fabScale = useRef(new Animated.Value(1)).current;

  // Load categories, tags, and income sources
  useEffect(() => {
    loadCategoriesAndTags();
  }, []);

  // Track bottom sheet state to know when it opens
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  // Track if we've already handled the form reset/pre-fill for this open
  const hasHandledFormState = useRef(false);

  // Helper function to reset form fields
  const resetFormFields = useCallback(() => {
    setNewExpenseAmount('');
    setNewExpenseDescription('');
    setNewExpenseDate(new Date());
    setNewExpensePaymentMethod(undefined);
    setNewExpenseTags([]);
    setNewIncomeAmount('');
    setNewIncomeDescription('');
    setNewIncomeDate(new Date());
    setNewIncomeSourceId('');
    setTransactionType('expense');
    setSelectedIncomeCurrency(undefined);
    setSelectedExpenseCurrency(undefined);
    // Reset category to first available (will be set when categories load)
    if (categories.length > 0) {
      setNewExpenseCategoryId(categories[0].id);
    }
  }, [categories]);

  // Handle form state when bottom sheet opens or editing state changes
  useEffect(() => {
    // Only handle form state when bottom sheet is open
    if (!isBottomSheetOpen) {
      hasHandledFormState.current = false;
      return;
    }

    // If we've already handled this open, don't do it again
    if (hasHandledFormState.current) {
      return;
    }

    // Check if we're editing
    const isEditing = (editingExpense && isEditingExpense) || (editingIncome && isEditingIncome);

    if (isEditing) {
      // We're editing - mark as handled, pre-fill will happen in separate useEffect
      hasHandledFormState.current = true;
    } else {
      // We're not editing - reset form fields
      resetFormFields();
      hasHandledFormState.current = true;
    }
  }, [isBottomSheetOpen, editingExpense, editingIncome, isEditingExpense, isEditingIncome, resetFormFields]);

  // Pre-fill form when editing expense
  useEffect(() => {
    if (editingExpense && isEditingExpense && isBottomSheetOpen) {
      // getTransactionDisplayAmount always returns amount in user's current currency
      // (either originalAmount if originalCurrency matches, or converted from USD)
      if (editingExpense.amount) {
        const amountInDisplayCurrency = getTransactionDisplayAmount(
          editingExpense.amount,
          editingExpense.originalAmount,
          editingExpense.originalCurrency
        );
        setNewExpenseAmount(amountInDisplayCurrency.toString());
      }
      if (editingExpense.description) setNewExpenseDescription(editingExpense.description);
      if (editingExpense.date) setNewExpenseDate(new Date(editingExpense.date));
      // Set payment method (can be undefined)
      setNewExpensePaymentMethod(editingExpense.paymentMethod || undefined);
      if (editingExpense.tags && editingExpense.tags.length > 0) {
        // Handle both string IDs and tag objects
        const tagIds = editingExpense.tags.map(tag => typeof tag === 'string' ? tag : tag.id);
        setNewExpenseTags(tagIds);
      } else {
        setNewExpenseTags([]);
      }
      // IMPORTANT: The displayed amount is always in user's current currency (from getTransactionDisplayAmount)
      // So the currency selector must match - leave undefined to default to user's currencyCode
      // This ensures proper conversion on save (user's currency → USD)
      setSelectedExpenseCurrency(undefined);
      // Set transaction type to expense
      setTransactionType('expense');
      // Category will be set in loadCategoriesAndTags after categories load
      if (editingExpense.categoryId) {
        setNewExpenseCategoryId(editingExpense.categoryId);
      }
    }
  }, [editingExpense, isEditingExpense, isBottomSheetOpen, getTransactionDisplayAmount]);

  // Pre-fill form when editing income
  useEffect(() => {
    if (editingIncome && isEditingIncome && isBottomSheetOpen) {
      // getTransactionDisplayAmount always returns amount in user's current currency
      // (either originalAmount if originalCurrency matches, or converted from USD)
      if (editingIncome.amount) {
        const amountInDisplayCurrency = getTransactionDisplayAmount(
          editingIncome.amount,
          editingIncome.originalAmount,
          editingIncome.originalCurrency
        );
        setNewIncomeAmount(amountInDisplayCurrency.toString());
      }
      if (editingIncome.description) setNewIncomeDescription(editingIncome.description);
      if (editingIncome.date) setNewIncomeDate(new Date(editingIncome.date));
      if (editingIncome.incomeSourceId) {
        setNewIncomeSourceId(editingIncome.incomeSourceId);
      }
      // IMPORTANT: The displayed amount is always in user's current currency (from getTransactionDisplayAmount)
      // So the currency selector must match - leave undefined to default to user's currencyCode
      // This ensures proper conversion on save (user's currency → USD)
      setSelectedIncomeCurrency(undefined);
      // Set transaction type to income
      setTransactionType('income');
    }
  }, [editingIncome, isEditingIncome, isBottomSheetOpen, getTransactionDisplayAmount]);

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
    // Reset currency selections
    setSelectedIncomeCurrency(undefined);
    setSelectedExpenseCurrency(undefined);
    // Reset transaction type to expense
    setTransactionType('expense');
    // Clear editing state
    setEditingExpense(null);
    setEditingIncome(null);
    // Reset the handled flag
    hasHandledFormState.current = false;
    // Reset category to first available
    setCategories((prevCategories) => {
      if (prevCategories.length > 0) {
        setNewExpenseCategoryId(prevCategories[0].id);
      }
      return prevCategories;
    });
  }, [setEditingExpense, setEditingIncome]);

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
      
      // Determine which currency the amount is in
      const amountCurrency = selectedExpenseCurrency || currencyCode;
      
      // Convert amount from the selected currency to USD
      const amountInUSD = await convertCurrencyToUSD(originalAmount, amountCurrency);

      const payload: any = {
        amount: amountInUSD,
        categoryId: newExpenseCategoryId,
        description: newExpenseDescription.trim(),
        date: newExpenseDate,
        originalAmount,
        originalCurrency: amountCurrency,
      };

      // Only include optional fields if they have values
      if (newExpensePaymentMethod) {
        payload.paymentMethod = newExpensePaymentMethod;
      }
      if (newExpenseTags.length > 0) {
        payload.tags = newExpenseTags;
      }

      // Check if this is a temporary ID (from parsed transactions) or a real expense ID
      const isTempId = editingExpense?.id?.startsWith('temp-');
      
      if (isEditingExpense && editingExpense?.id && !isTempId) {
        // Update existing expense (real ID from database)
        await apiService.updateExpense(editingExpense.id, payload);
        handleCloseBottomSheet();
        showSuccess('Success', 'Expense updated successfully! 🎉');
      } else if (isTempId && editingExpense?.id) {
        // Update parsed transaction preview card instead of creating new transaction
        const indexMatch = editingExpense.id.match(/temp-expense-(\d+)/);
        if (indexMatch && onParsedTransactionUpdate) {
          const index = parseInt(indexMatch[1], 10);
          onParsedTransactionUpdate({
            index,
            type: 'expense',
            amount: originalAmount,
            description: newExpenseDescription.trim(),
            categoryId: newExpenseCategoryId,
            date: newExpenseDate.toISOString(),
          });
          handleCloseBottomSheet();
          showSuccess('Success', 'Transaction updated!');
        } else {
          // Fallback: create new expense if callback not available
          await apiService.addExpense(payload);
          handleCloseBottomSheet();
          showSuccess('Success', 'Expense added successfully! 🎉');
        }
      } else {
        // Create new expense (new transaction)
        await apiService.addExpense(payload);
        handleCloseBottomSheet();
        showSuccess('Success', 'Expense added successfully! 🎉');
      }

      // Reload categories and tags in case they changed
      await loadCategoriesAndTags();

      // Trigger dashboard refresh
      onTransactionAdded();
    } catch (error) {
      showError('Error', isEditingExpense ? 'Failed to update expense' : 'Failed to add expense');
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
      
      // Determine which currency the amount is in
      const amountCurrency = selectedIncomeCurrency || currencyCode;
      
      // Convert amount from the selected currency to USD
      const amountInUSD = await convertCurrencyToUSD(originalAmount, amountCurrency);

      const payload: any = {
        amount: amountInUSD,
        date: newIncomeDate.toISOString(),
        description: newIncomeDescription.trim(),
        originalAmount,
        // Always include originalCurrency to match the currency shown in the input
        // This is critical for edits: if we don't send it, the old value (e.g., 'USD') 
        // stays in DB while originalAmount gets the new PKR value, causing corruption
        originalCurrency: amountCurrency,
      };

      // Only include incomeSourceId if it has a value
      if (newIncomeSourceId) {
        payload.incomeSourceId = newIncomeSourceId;
      }

      logger.debug('[SharedBottomSheet] Sending income transaction:', payload);

      // Check if this is a temporary ID (from parsed transactions) or a real income ID
      const isTempIncomeId = editingIncome?.id?.startsWith('temp-');

      if (isEditingIncome && editingIncome?.id && !isTempIncomeId) {
        // Update existing income transaction (real ID from database)
        await apiService.updateIncomeTransaction(editingIncome.id, payload);
        handleCloseBottomSheet();
        showSuccess('Success', 'Income updated successfully! 💰');
      } else if (isTempIncomeId && editingIncome?.id) {
        // Update parsed transaction preview card instead of creating new transaction
        const indexMatch = editingIncome.id.match(/temp-income-(\d+)/);
        if (indexMatch && onParsedTransactionUpdate) {
          const index = parseInt(indexMatch[1], 10);
          onParsedTransactionUpdate({
            index,
            type: 'income',
            amount: originalAmount,
            description: newIncomeDescription.trim(),
            incomeSourceId: newIncomeSourceId,
            date: newIncomeDate.toISOString(),
          });
          handleCloseBottomSheet();
          showSuccess('Success', 'Transaction updated!');
        } else {
          // Fallback: create new income if callback not available
          await apiService.createIncomeTransaction(payload);
          handleCloseBottomSheet();
          showSuccess('Success', 'Income recorded successfully! 💰');
        }
      } else {
        // Create new income transaction (new transaction)
        await apiService.createIncomeTransaction(payload);
        handleCloseBottomSheet();
        showSuccess('Success', 'Income recorded successfully! 💰');
      }

      // Reload data in case it changed
      await loadCategoriesAndTags();

      // Trigger dashboard refresh
      onTransactionAdded();
    } catch (error) {
      showError('Error', isEditingIncome ? 'Failed to update income' : 'Failed to add income');
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

  const handleCreateIncomeSource = async () => {
    setIncomeSourceNameError('');
    setIncomeSourceAmountError('');

    if (!newIncomeSourceName.trim()) {
      setIncomeSourceNameError('Income source name is required');
      return;
    }

    // Amount is optional for MANUAL frequency sources
    if (newIncomeSourceAmount && parseFloat(newIncomeSourceAmount) < 0) {
      setIncomeSourceAmountError('Amount cannot be negative');
      return;
    }

    setIsCreatingIncomeSource(true);
    try {
      // For MANUAL frequency, amount can be 0 if not provided
      const amountInUSD = newIncomeSourceAmount && newIncomeSourceAmount.trim() !== ''
        ? convertToUSD(parseFloat(newIncomeSourceAmount))
        : 0;
      const newSource = await apiService.createIncomeSource({
        name: newIncomeSourceName.trim(),
        amount: amountInUSD,
        frequency: 'MANUAL',
        startDate: new Date(),
        autoAdd: false,
      });

      setIncomeSources([...incomeSources, newSource]);
      setNewIncomeSourceId(newSource.id);
      setNewIncomeSourceName('');
      setNewIncomeSourceAmount('');
      setShowCreateIncomeSourceModal(false);
      showSuccess('Success', 'Income source created successfully!');
    } catch (error) {
      showError('Error', 'Failed to create income source. Please try again.');
      console.error('Error creating income source:', error);
    } finally {
      setIsCreatingIncomeSource(false);
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
            logger.debug('[SharedBottomSheet] Ref attached, setting to context');
            setBottomSheetRef(ref);
          } else {
            logger.debug('[SharedBottomSheet] Ref detached');
          }
        }}
        index={-1}
        snapPoints={['80%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        onChange={(index) => {
          // Track when bottom sheet opens (index >= 0) or closes (index === -1)
          const isOpen = index >= 0;
          setIsBottomSheetOpen(isOpen);
          
          // Reset the handled flag and form state when closing
          if (index === -1) {
            hasHandledFormState.current = false;
            // Reset currency selections to prevent stale state affecting next edit
            setSelectedExpenseCurrency(undefined);
            setSelectedIncomeCurrency(undefined);
            // Clear editing state
            setEditingExpense(null);
            setEditingIncome(null);
            Animated.spring(fabScale, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          } else {
            // When opening, reset the flag so form state can be handled
            hasHandledFormState.current = false;
          }
        }}
        onClose={() => {
          setIsBottomSheetOpen(false);
          // Reset currency selections to prevent stale state affecting next edit
          setSelectedExpenseCurrency(undefined);
          setSelectedIncomeCurrency(undefined);
          // Clear editing state
          setEditingExpense(null);
          setEditingIncome(null);
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
          <Text style={[styles.sheetTitle, { color: theme.text }]}>
            {isEditingExpense || isEditingIncome ? 'Edit Transaction' : 'Add Transaction'}
          </Text>

          {/* Quick Add Options - Show First for Better UX */}
          {!isEditingExpense && !isEditingIncome && (
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
                    borderColor: incomeAmountError ? theme.expense : theme.border,
                  }
                ]}>
                  <CurrencyInput
                    value={newIncomeAmount}
                    onChangeText={(text) => {
                      setNewIncomeAmount(text);
                      if (incomeAmountError) setIncomeAmountError('');
                    }}
                    onCurrencyChange={(currencyCode) => {
                      setSelectedIncomeCurrency(currencyCode);
                    }}
                    selectedCurrency={selectedIncomeCurrency}
                    allowCurrencySelection={true}
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
                            Select income source (optional)
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

          {/* Manual Entry Form - Only show for expenses (income has its own form above) */}
          {transactionType === 'expense' && (
            <>
              <View style={styles.divider}>
                <View style={[
                  styles.dividerLine,
                  { backgroundColor: usesTranslucentBackground ? 'rgba(255, 255, 255, 0.3)' : theme.border }
                ]} />
                <Text style={[
                  styles.dividerText,
                  { color: usesTranslucentBackground ? theme.text : theme.textSecondary }
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
                    onCurrencyChange={(currencyCode) => {
                      setSelectedExpenseCurrency(currencyCode);
                    }}
                    selectedCurrency={selectedExpenseCurrency}
                    allowCurrencySelection={true}
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
                    logger.debug('[SharedBottomSheet] Opening category picker, categories count:', categories.length);
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
                  <Text style={styles.addButtonText}>
                    {isEditingExpense ? 'Update Expense' : 'Add Expense'}
                  </Text>
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
                    <Text style={styles.addButtonText}>
                      {isEditingIncome ? 'Update Income' : 'Add Income'}
                    </Text>
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
          logger.debug('[SharedBottomSheet] Category selected:', categoryId);
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

              {/* Default Income Sources */}
              {[
                { name: 'Salary', icon: 'briefcase' },
                { name: 'Freelance Work', icon: 'laptop' },
                { name: 'Investment Returns', icon: 'chart-line' },
                { name: 'Rental Income', icon: 'home' },
                { name: 'Business Income', icon: 'store' },
                { name: 'Side Gig', icon: 'briefcase-outline' },
                { name: 'Bonus', icon: 'gift' },
                { name: 'Other', icon: 'dots-horizontal' },
              ].map((defaultSource, index) => {
                // Check if user has a source with this name
                const userSource = incomeSources.find(s => s.name.toLowerCase() === defaultSource.name.toLowerCase());
                if (userSource) {
                  // Show user's source instead
                  return (
                    <TouchableOpacity
                      key={userSource.id}
                      style={[styles.modalOption, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setNewIncomeSourceId(userSource.id);
                        setShowIncomeSourcePicker(false);
                      }}
                    >
                      <Icon name={defaultSource.icon as any} size={20} color={theme.primary} />
                      <Text style={[styles.modalOptionText, { color: theme.text }]}>{userSource.name}</Text>
                      {newIncomeSourceId === userSource.id && (
                        <Icon name="check-circle" size={24} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }
                // Show default option (will create on selection)
                return (
                  <TouchableOpacity
                    key={`default-${index}`}
                    style={[styles.modalOption, { borderBottomColor: theme.border }]}
                    onPress={async () => {
                      // Create this income source on the fly
                      try {
                        setIsCreatingIncomeSource(true);
                        const newSource = await apiService.createIncomeSource({
                          name: defaultSource.name,
                          amount: 0, // Will be set when user adds income
                          frequency: 'MANUAL',
                          startDate: new Date(),
                          autoAdd: false,
                        });
                        setIncomeSources([...incomeSources, newSource]);
                        setNewIncomeSourceId(newSource.id);
                        setShowIncomeSourcePicker(false);
                      } catch (error) {
                        showError('Error', 'Failed to create income source. Please try again.');
                        console.error('Error creating income source:', error);
                      } finally {
                        setIsCreatingIncomeSource(false);
                      }
                    }}
                  >
                    <Icon name={defaultSource.icon as any} size={20} color={theme.textSecondary} />
                    <Text style={[styles.modalOptionText, { color: theme.text }]}>{defaultSource.name}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* User Created Sources (excluding defaults) */}
              {incomeSources
                .filter(source => {
                  const defaultNames = ['salary', 'freelance work', 'investment returns', 'rental income', 'business income', 'side gig', 'bonus', 'other'];
                  return !defaultNames.includes(source.name.toLowerCase());
                })
                .map((source) => (
                  <TouchableOpacity
                    key={source.id}
                    style={[styles.modalOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setNewIncomeSourceId(source.id);
                      setShowIncomeSourcePicker(false);
                    }}
                  >
                    <Icon name="briefcase-outline" size={20} color={theme.primary} />
                    <Text style={[styles.modalOptionText, { color: theme.text }]}>{source.name}</Text>
                    {newIncomeSourceId === source.id && (
                      <Icon name="check-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary, marginHorizontal: spacing.lg, marginTop: spacing.md }]}
              onPress={() => {
                setShowIncomeSourcePicker(false);
                setShowCreateIncomeSourceModal(true);
              }}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Create New Income Source</Text>
            </TouchableOpacity>
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

      {/* Create Income Source Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCreateIncomeSourceModal}
        onRequestClose={() => {
          setShowCreateIncomeSourceModal(false);
          setNewIncomeSourceName('');
          setNewIncomeSourceAmount('');
          setIncomeSourceNameError('');
          setIncomeSourceAmountError('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => {
            setShowCreateIncomeSourceModal(false);
            setNewIncomeSourceName('');
            setNewIncomeSourceAmount('');
            setIncomeSourceNameError('');
            setIncomeSourceAmountError('');
          }}
        >
          <View style={[styles.modalContent, styles.createTagModalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create New Income Source</Text>
              <TouchableOpacity onPress={() => {
                setShowCreateIncomeSourceModal(false);
                setNewIncomeSourceName('');
                setNewIncomeSourceAmount('');
                setIncomeSourceNameError('');
                setIncomeSourceAmountError('');
              }}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: spacing.lg }}>
              <InputGroup
                label=""
                placeholder="Income Source Name"
                value={newIncomeSourceName}
                onChangeText={(text) => {
                  setNewIncomeSourceName(text);
                  if (incomeSourceNameError) setIncomeSourceNameError('');
                }}
                error={incomeSourceNameError}
                containerStyle={styles.tagInputContainer}
              />
              <View style={{ marginTop: spacing.md }}>
                <InputGroup
                  label=""
                  placeholder="Amount (optional)"
                  value={newIncomeSourceAmount}
                  onChangeText={(text) => {
                    setNewIncomeSourceAmount(text);
                    if (incomeSourceAmountError) setIncomeSourceAmountError('');
                  }}
                  error={incomeSourceAmountError}
                  keyboardType="numeric"
                  containerStyle={styles.tagInputContainer}
                />
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateIncomeSource}
                disabled={isCreatingIncomeSource}
              >
                {isCreatingIncomeSource ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.addButtonText}>Create Income Source</Text>
                )}
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

