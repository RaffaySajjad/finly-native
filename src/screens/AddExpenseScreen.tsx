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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { CategoryType, PaymentMethod, Tag } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

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

const PAYMENT_METHODS: Array<{ id: PaymentMethod; name: string; icon: string }> = [
  { id: 'credit_card', name: 'Credit Card', icon: 'credit-card' },
  { id: 'debit_card', name: 'Debit Card', icon: 'card' },
  { id: 'cash', name: 'Cash', icon: 'cash' },
  { id: 'check', name: 'Check', icon: 'receipt' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'bank-transfer' },
  { id: 'digital_wallet', name: 'Digital Wallet', icon: 'wallet' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal' },
];

/**
 * AddExpenseScreen - Modal for creating or editing transactions
 */
const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddExpenseRouteProp>();
  const { theme } = useTheme();
  const { getCurrencySymbol } = useCurrency();

  const editingExpense = route.params?.expense;
  // Only treat as editing if the expense has an ID (receipt scanning pre-fills data without ID)
  const isEditing = !!editingExpense?.id;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>('food');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  const [showTagsPicker, setShowTagsPicker] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [saving, setSaving] = useState(false);

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const loadedTags = await tagsService.getTags();
      setTags(loadedTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  // Pre-fill form when editing or when data is passed from receipt scanner
  useEffect(() => {
    if (editingExpense) {
      if (editingExpense.amount) setAmount(editingExpense.amount.toString());
      if (editingExpense.category) setCategory(editingExpense.category);
      if (editingExpense.description) setDescription(editingExpense.description);
      if (editingExpense.paymentMethod) setPaymentMethod(editingExpense.paymentMethod);
      if (editingExpense.tags) setSelectedTags(editingExpense.tags);
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
      if (isEditing && editingExpense?.id) {
        // Update existing expense
        await apiService.editExpense(editingExpense.id, {
          amount: parseFloat(amount),
          category,
          description: description.trim(),
          paymentMethod: paymentMethod || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
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
          paymentMethod: paymentMethod || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        });

        Alert.alert(
          'Success',
          'Expense added successfully!',
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
   * Handles creating a new tag
   */
  const handleCreateTag = async (): Promise<void> => {
    if (!newTagName.trim()) {
      Alert.alert('Invalid Tag', 'Please enter a tag name');
      return;
    }

    try {
      const newTag = await tagsService.createTag(newTagName.trim());
      setTags([...tags, newTag]);
      setSelectedTags([...selectedTags, newTag.id]);
      setNewTagName('');
      setShowCreateTagModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag. Please try again.');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AMOUNT</Text>
            <View style={[styles.amountContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.text }]}>{getCurrencySymbol()}</Text>
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
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: category === cat.id ? theme.primary + '20' : theme.card,
                      borderColor: category === cat.id ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Icon name={cat.icon as any} size={24} color={category === cat.id ? theme.primary : theme.textSecondary} />
                  <Text
                    style={[
                      styles.categoryLabel,
                      {
                        color: category === cat.id ? theme.primary : theme.textSecondary,
                        fontWeight: category === cat.id ? '600' : '400',
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
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
            <TextInput
              style={[
                styles.tagInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Tag name (e.g., Business, Personal)"
              placeholderTextColor={theme.textTertiary}
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addTagButton: {
    padding: spacing.xs,
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
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 400,
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
});

export default AddExpenseScreen;

