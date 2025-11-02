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
  Alert,
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
import { BottomSheetBackground, PremiumBadge, UpgradePrompt, CurrencyInput, DatePickerInput } from '../components';
import { shouldUseLiquidGlass } from './BottomSheetBackground';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { Expense, CategoryType, PaymentMethod, Tag } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Animated } from 'react-native';

const PAYMENT_METHODS = [
  { id: 'credit-card' as PaymentMethod, name: 'Credit Card', icon: 'credit-card' },
  { id: 'debit-card' as PaymentMethod, name: 'Debit Card', icon: 'credit-card-outline' },
  { id: 'cash' as PaymentMethod, name: 'Cash', icon: 'cash' },
  { id: 'bank-transfer' as PaymentMethod, name: 'Bank Transfer', icon: 'bank-transfer' },
  { id: 'check' as PaymentMethod, name: 'Check', icon: 'file-document-outline' },
  { id: 'other' as PaymentMethod, name: 'Other', icon: 'dots-horizontal' },
];

type SharedBottomSheetNavigationProp = StackNavigationProp<RootStackParamList>;

const SharedBottomSheet: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const { isPremium, getRemainingUsage, requiresUpgrade } = useSubscription();
  const navigation = useNavigation<SharedBottomSheetNavigationProp>();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { setBottomSheetRef } = useBottomSheet();
  
  // Determine if using translucent background (affects text colors)
  const usesTranslucentBackground = shouldUseLiquidGlass();

  const [categories, setCategories] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  // Bottom sheet state for adding expenses
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<CategoryType>('food');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date());
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [newExpenseTags, setNewExpenseTags] = useState<string[]>([]);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  const [showTagsPicker, setShowTagsPicker] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Animation values
  const fabScale = useRef(new Animated.Value(1)).current;

  // Load categories and tags
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
      const [categoriesData, tagsData] = await Promise.all([
        apiService.getCategories(),
        tagsService.getTags(),
      ]);
      setCategories(categoriesData);
      setAvailableTags(tagsData);
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
    // Reset form
    setNewExpenseAmount('');
    setNewExpenseCategory('food');
    setNewExpenseDescription('');
    setNewExpenseDate(new Date());
    setNewExpensePaymentMethod(undefined);
    setNewExpenseTags([]);
  }, []);

  const handleAddExpense = async (): Promise<void> => {
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (!newExpenseDescription.trim()) {
      Alert.alert('Missing Description', 'Please add a description');
      return;
    }

    setIsAddingExpense(true);

    try {
      await apiService.createExpense({
        amount: parseFloat(newExpenseAmount),
        category: newExpenseCategory,
        description: newExpenseDescription.trim(),
        date: newExpenseDate.toISOString(),
        paymentMethod: newExpensePaymentMethod || undefined,
        tags: newExpenseTags.length > 0 ? newExpenseTags : undefined,
      });

      handleCloseBottomSheet();
      Alert.alert('Success', 'Expense added successfully! 🎉');
      
      // Reload categories and tags in case they changed
      await loadCategoriesAndTags();
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
      console.error(error);
    } finally {
      setIsAddingExpense(false);
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
    if (!newTagName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a tag name');
      return;
    }

    try {
      const defaultColors = ['#4A90E2', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#6366F6'];
      const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];
      const newTag = await tagsService.createTag({
        name: newTagName.trim(),
        color: randomColor,
      });
      setAvailableTags([...availableTags, newTag]);
      setNewExpenseTags([...newExpenseTags, newTag.id]);
      setNewTagName('');
      setShowCreateTagModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag');
      console.error(error);
    }
  };

  const categoriesList = categories.length > 0 ? categories : [
    { id: 'food' as CategoryType, name: 'Food', icon: 'food' },
    { id: 'transport' as CategoryType, name: 'Transport', icon: 'car' },
    { id: 'shopping' as CategoryType, name: 'Shopping', icon: 'shopping' },
    { id: 'bills' as CategoryType, name: 'Bills', icon: 'file-document' },
    { id: 'entertainment' as CategoryType, name: 'Entertainment', icon: 'movie' },
    { id: 'health' as CategoryType, name: 'Health', icon: 'heart' },
    { id: 'other' as CategoryType, name: 'Other', icon: 'dots-horizontal' },
  ];

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
        snapPoints={['85%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        onClose={() => {
          Animated.spring(fabScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Transaction</Text>

          {/* Quick Add Options */}
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
                  🎤 Voice Entry
                </Text>
              </TouchableOpacity>
              {!isPremium && (
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

            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: theme.income }]}
              onPress={() => {
                bottomSheetRef.current?.close();
                setTimeout(() => navigation.navigate('ReceiptUpload'), 300);
              }}
            >
              <Icon name="camera-outline" size={22} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>
                📸 Scan Receipt
              </Text>
              {!isPremium && (
                <View style={styles.scanButtonBadge}>
                  <Text style={styles.scanButtonBadgeText}>
                    {getRemainingUsage('receiptScanning')} left
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Bulk Add Option */}
          <TouchableOpacity
            style={[styles.bulkButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              bottomSheetRef.current?.close();
              setTimeout(() => {
                if (requiresUpgrade('bulkEntry')) {
                  setShowUpgradePrompt(true);
                  return;
                }
                navigation.navigate('BulkTransaction');
              }, 300);
            }}
          >
            <Icon name="file-multiple" size={20} color={theme.primary} />
            <Text style={[styles.bulkButtonText, { color: theme.text }]}>
              📋 Bulk Add
            </Text>
            {!isPremium && (
              <View style={styles.bulkBadge}>
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
          </TouchableOpacity>

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
            <View style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <CurrencyInput
                value={newExpenseAmount}
                onChangeText={setNewExpenseAmount}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                showSymbol={true}
                allowDecimals={true}
                inputStyle={styles.currencyInputField}
              />
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.categoryGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {categoriesList.map((cat) => {
                const isSelected = newExpenseCategory === cat.id;
                const categoryColor = theme.categories[cat.id as keyof typeof theme.categories];

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: isSelected ? categoryColor + '20' : theme.background,
                        borderColor: isSelected ? categoryColor : theme.border,
                      },
                    ]}
                    onPress={() => setNewExpenseCategory(cat.id)}
                  >
                    <Icon name={cat.icon as any} size={24} color={isSelected ? categoryColor : theme.textSecondary} />
                    <Text style={[styles.categoryLabel, { color: isSelected ? categoryColor : theme.textSecondary }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="What did you spend on?"
              placeholderTextColor={theme.textTertiary}
              value={newExpenseDescription}
              onChangeText={setNewExpenseDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
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

          {/* Add Expense Button */}
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

          {/* Upgrade Prompt */}
          <UpgradePrompt
            visible={showUpgradePrompt}
            onClose={() => setShowUpgradePrompt(false)}
            feature="AI Features"
            message="Unlock unlimited AI features with Finly Premium!"
          />
        </BottomSheetScrollView>
      </BottomSheet>

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
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Tag Name"
                placeholderTextColor={theme.textTertiary}
                value={newTagName}
                onChangeText={setNewTagName}
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
  quickAddButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  aiButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  aiButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
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
    height: 290
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
  addButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
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

