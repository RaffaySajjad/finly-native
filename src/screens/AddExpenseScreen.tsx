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
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { PaymentMethod, Tag, Category } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { CurrencyInput, DatePickerInput, CategoryPickerModal, PullToRefreshScrollView, InputGroup } from '../components';
import { useAlert } from '../hooks/useAlert';

type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

const PAYMENT_METHODS: Array<{ id: PaymentMethod; name: string; icon: string }> = [
  { id: 'CREDIT_CARD', name: 'Credit Card', icon: 'credit-card' },
  { id: 'DEBIT_CARD', name: 'Debit Card', icon: 'card' },
  { id: 'CASH', name: 'Cash', icon: 'cash' },
  { id: 'CHECK', name: 'Check', icon: 'receipt' },
  { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: 'bank-transfer' },
  { id: 'DIGITAL_WALLET', name: 'Digital Wallet', icon: 'wallet' },
  { id: 'OTHER', name: 'Other', icon: 'dots-horizontal' },
];

/**
 * AddExpenseScreen - Modal for creating or editing transactions
 */
const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddExpenseRouteProp>();
  const { theme } = useTheme();
  const { getCurrencySymbol, convertToUSD, convertFromUSD, currencyCode } = useCurrency();

  const editingExpense = route.params?.expense;
  // Only treat as editing if the expense has an ID (receipt scanning pre-fills data without ID)
  const isEditing = !!editingExpense?.id;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(''); // Store category ID instead
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTagsPicker, setShowTagsPicker] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [saving, setSaving] = useState(false);

  // Error states for validation
  const [amountError, setAmountError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [tagNameError, setTagNameError] = useState('');

  // Alert hook for non-validation errors
  const { showError, showSuccess, AlertComponent } = useAlert();

  // Load tags and categories on mount
  useEffect(() => {
    loadTags();
    loadCategories();
  }, []);

  const loadTags = async () => {
    try {
      const loadedTags = await tagsService.getTags();
      setTags(loadedTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const loadedCategories = await apiService.getCategories();
      setCategories(loadedCategories);

      // Set default category to first one if available and no category selected
      if (loadedCategories.length > 0 && !category) {
        setCategory(loadedCategories[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      showError('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  /**
   * Handles pull-to-refresh - reloads categories and tags
   */
  const handleRefresh = async (): Promise<void> => {
    await Promise.all([loadTags(), loadCategories()]);
  };

  // Pre-fill form when editing or when data is passed from receipt scanner
  useEffect(() => {
    if (editingExpense) {
      // Convert amount from USD (base currency) to display currency for editing
      if (editingExpense.amount) {
        const amountInDisplayCurrency = convertFromUSD(editingExpense.amount);
        setAmount(amountInDisplayCurrency.toString());
      }
      if (editingExpense.categoryId) setCategory(editingExpense.categoryId); // Use categoryId
      if (editingExpense.description) setDescription(editingExpense.description);
      if (editingExpense.date) setDate(new Date(editingExpense.date));
      if (editingExpense.paymentMethod) setPaymentMethod(editingExpense.paymentMethod);
      if (editingExpense.tags) {
        setSelectedTags(editingExpense.tags.map(tag => typeof tag === 'string' ? tag : tag.id));
      }
    }
  }, [editingExpense, convertFromUSD]);

  /**
   * Handles transaction creation or update
   */
  const handleSave = async (): Promise<void> => {
    // Clear previous errors
    setAmountError('');
    setDescriptionError('');
    setCategoryError('');

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Please enter a valid amount');
      return;
    }

    // Validate description
    if (!description.trim()) {
      setDescriptionError('Please add a description');
      return;
    }

    // Validate category
    if (!category) {
      setCategoryError('Please select a category');
      return;
    }

    setSaving(true);

    try {
      if (isEditing && editingExpense?.id) {
        // Update existing expense
        const originalAmount = parseFloat(amount);
        // Convert amount from display currency to USD before sending
        const amountInUSD = convertToUSD(originalAmount);

        const payload: any = {
          amount: amountInUSD,
          categoryId: category,
          description: description.trim(),
          date,
          originalAmount,
          originalCurrency: currencyCode,
        };

        // Only include optional fields if they have values
        if (paymentMethod) {
          payload.paymentMethod = paymentMethod;
        }
        if (selectedTags.length > 0) {
          payload.tags = selectedTags;
        }

        await apiService.updateExpense(editingExpense.id, payload);

        showSuccess(
          'Success',
          'Transaction updated successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
      // Create new expense
        const originalAmount = parseFloat(amount);
        // Convert amount from display currency to USD before sending
        const amountInUSD = convertToUSD(originalAmount);

        const payload: any = {
          amount: amountInUSD,
          categoryId: category,
          description: description.trim(),
          date,
          originalAmount,
          originalCurrency: currencyCode,
        };

        // Only include optional fields if they have values
        if (paymentMethod) {
          payload.paymentMethod = paymentMethod;
        }
        if (selectedTags.length > 0) {
          payload.tags = selectedTags;
        }

        await apiService.addExpense(payload);

        showSuccess(
          'Success',
          'Expense added successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      showError('Error', 'Failed to save transaction. Please try again.');
      console.error('Error saving transaction:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handles creating a new tag
   */
  const handleCreateTag = async (): Promise<void> => {
    setTagNameError('');

    if (!newTagName.trim()) {
      setTagNameError('Please enter a tag name');
      return;
    }

    try {
      const newTag = await tagsService.createTag(newTagName.trim());
      setTags([...tags, newTag]);
      setSelectedTags([...selectedTags, newTag.id]);
      setNewTagName('');
      setShowCreateTagModal(false);
    } catch (error) {
      showError('Error', 'Failed to create tag. Please try again.');
      console.error('Error creating tag:', error);
    }
  };

  /**
   * Handles toggling tag selection
   */
  const handleToggleTag = (tagId: string): void => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  // Get selected category display info
  const selectedCategory = categories.find(cat => cat.id === category);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <PullToRefreshScrollView
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
        >
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AMOUNT</Text>
            <View style={[
              styles.amountContainer,
              {
                backgroundColor: theme.card,
                borderColor: amountError ? theme.expense : theme.border,
              }
            ]}>
              <CurrencyInput
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (amountError) setAmountError('');
                }}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                autoFocus
                large
                showSymbol={true}
                allowDecimals={true}
                inputStyle={styles.amountInputField}
              />
            </View>
            {amountError && (
              <Text style={[styles.errorText, { color: theme.expense }]}>{amountError}</Text>
            )}
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CATEGORY</Text>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading categories...
                </Text>
              </View>
            ) : categories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="alert-circle" size={24} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No categories available.
                </Text>
                  <TouchableOpacity
                    style={[styles.setupButton, { backgroundColor: theme.primary }]}
                    onPress={async () => {
                      try {
                        setLoadingCategories(true);
                        await apiService.setupDefaultCategories();
                        await loadCategories();
                      } catch (error) {
                        showError('Error', 'Failed to setup categories');
                      } finally {
                        setLoadingCategories(false);
                      }
                    }}
                  >
                    <Text style={styles.setupButtonText}>Setup Default Categories</Text>
                  </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                      style={[
                        styles.pickerButton,
                        {
                          backgroundColor: theme.card,
                          borderColor: categoryError ? theme.expense : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setShowCategoryPicker(true);
                        if (categoryError) setCategoryError('');
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
                {categoryError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{categoryError}</Text>
                )}
              </>
            )}
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <InputGroup
              label="DESCRIPTION"
              placeholder="What was it for?"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (descriptionError) setDescriptionError('');
              }}
              error={descriptionError}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              containerStyle={styles.descriptionInputContainer}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.section}>
            <DatePickerInput
              date={date}
              onDateChange={setDate}
              label="DATE"
            />
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PAYMENT METHOD (OPTIONAL)</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setShowPaymentMethodPicker(true)}
            >
              <View style={styles.pickerButtonContent}>
                {paymentMethod ? (
                  <>
                    <Icon
                      name={PAYMENT_METHODS.find(pm => pm.id === paymentMethod)?.icon as any}
                      size={20}
                      color={theme.primary}
                    />
                    <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                      {PAYMENT_METHODS.find(pm => pm.id === paymentMethod)?.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon name="credit-card-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                      Select payment method
                    </Text>
                  </>
                )}
              </View>
              <Icon name="chevron-down" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tags Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TAGS (OPTIONAL)</Text>
              <TouchableOpacity
                onPress={() => setShowCreateTagModal(true)}
                style={styles.addTagButton}
              >
                <Icon name="plus-circle" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <View style={styles.selectedTagsContainer}>
                {selectedTags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <TouchableOpacity
                      key={tagId}
                      style={[
                        styles.tagChip,
                        { backgroundColor: tag.color + '20', borderColor: tag.color },
                      ]}
                      onPress={() => setSelectedTags(selectedTags.filter(id => id !== tagId))}
                    >
                      <Text style={[styles.tagChipText, { color: tag.color }]}>{tag.name}</Text>
                      <Icon name="close" size={14} color={tag.color} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Tags Picker */}
            <TouchableOpacity
              style={[
                styles.pickerButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setShowTagsPicker(true)}
            >
              <View style={styles.pickerButtonContent}>
                <Icon name="tag-multiple-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.pickerButtonText, { color: theme.textSecondary }]}>
                  {selectedTags.length > 0 ? `Add more tags` : 'Add tags'}
                </Text>
              </View>
              <Icon name="chevron-down" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: spacing.xl }} />
        </PullToRefreshScrollView>

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

      {/* Payment Method Picker Modal */}
      <Modal
        visible={showPaymentMethodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentMethodPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentMethodPicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderBottomColor: theme.border },
                  !paymentMethod && { backgroundColor: theme.primary + '10' },
                ]}
                onPress={() => {
                  setPaymentMethod(undefined);
                  setShowPaymentMethodPicker(false);
                }}
              >
                <Icon name="close-circle" size={20} color={theme.textSecondary} />
                <Text style={[styles.modalOptionText, { color: theme.textSecondary }]}>
                  None
                </Text>
              </TouchableOpacity>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    paymentMethod === method.id && { backgroundColor: theme.primary + '10' },
                  ]}
                  onPress={() => {
                    setPaymentMethod(method.id);
                    setShowPaymentMethodPicker(false);
                  }}
                >
                  <Icon name={method.icon as any} size={20} color={theme.primary} />
                  <Text style={[styles.modalOptionText, { color: theme.text }]}>
                    {method.name}
                  </Text>
                  {paymentMethod === method.id && (
                    <Icon name="check" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        categories={categories}
        selectedCategoryId={category}
        onSelect={(categoryId) => setCategory(categoryId)}
        onClose={() => setShowCategoryPicker(false)}
        onNavigateToCategories={() => {
          setShowCategoryPicker(false);
          navigation.goBack();
          // Wait for modal to close before navigating
          setTimeout(() => {
            // @ts-ignore - navigating to nested screen
            navigation.navigate('MainTabs', { screen: 'Categories' });
          }, 300);
        }}
      />

      {/* Tags Picker Modal */}
      <Modal
        visible={showTagsPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagsPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Tags</Text>
              <TouchableOpacity onPress={() => setShowTagsPicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
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
                    onPress={() => handleToggleTag(tag.id)}
                  >
                    <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                    <Text style={[styles.modalOptionText, { color: theme.text }]}>
                      {tag.name}
                    </Text>
                    {isSelected && (
                      <Icon name="check" size={20} color={tag.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
              {tags.length === 0 && (
                <View style={styles.emptyTagsContainer}>
                  <Text style={[styles.emptyTagsText, { color: theme.textSecondary }]}>
                    No tags yet. Create one to get started!
                  </Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.createTagButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setShowTagsPicker(false);
                setShowCreateTagModal(true);
              }}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.createTagButtonText}>Create New Tag</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        visible={showCreateTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreateTagModal(false);
          setNewTagName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.createTagModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create New Tag</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                }}
              >
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <InputGroup
              label=""
              placeholder="Tag name (e.g., Business, Personal)"
              value={newTagName}
              onChangeText={(text) => {
                setNewTagName(text);
                if (tagNameError) setTagNameError('');
              }}
              error={tagNameError}
              autoFocus
              containerStyle={styles.tagInputContainer}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.border }]}
                onPress={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                onPress={handleCreateTag}
              >
                <Text style={styles.modalButtonTextPrimary}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Dialog */}
      {AlertComponent}
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
  amountInputField: {
    paddingVertical: spacing.md,
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
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodySmall,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  descriptionInputContainer: {
    marginBottom: 0,
  },
  descriptionInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 100,
  },
  tagInputContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: 0,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    color: '#EF4444',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addTagButton: {
    padding: spacing.xs,
  },
  setupButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  setupButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
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
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
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
  createTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createTagButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagInput: {
    ...typography.bodyMedium,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {
    // backgroundColor handled inline
  },
  modalButtonText: {
    ...typography.labelLarge,
  },
  modalButtonTextPrimary: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyCategoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyCategoryText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyCategorySubtext: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default AddExpenseScreen;

