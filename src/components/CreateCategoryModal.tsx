/**
 * CreateCategoryModal Component
 * Purpose: Enterprise-grade modal for creating custom categories
 * Features: Icon picker, color picker, budget input, validation, premium checks
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { logger } from '../utils/logger';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets, SafeAreaContext } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencyInput } from './CurrencyInput';
import InputGroup from './InputGroup';
import { BottomSheetBackground, shouldUseLiquidGlass } from './BottomSheetBackground';
import { useCreateCategoryModal } from '../contexts/CreateCategoryModalContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useContext } from 'react';

// Available icons for custom categories
const AVAILABLE_ICONS = [
  'tag', 'briefcase', 'home', 'toolbox', 'book', 'music', 'camera',
  'gamepad', 'soccer', 'basketball', 'bike', 'wrench', 'hammer',
  'palette', 'coffee', 'pizza', 'glass-wine', 'tree', 'leaf',
  'gift', 'heart', 'star', 'diamond', 'airplane', 'car', 'train',
  'shopping', 'cart', 'store', 'bank', 'wallet', 'credit-card',
];

// Available colors for custom categories
const AVAILABLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280',
];

/**
 * CreateCategoryModal - Enterprise-grade category creation modal
 * Rendered at AppNavigator level to overlay navigation tabs
 */
export const CreateCategoryModal: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { getCurrencySymbol, convertToUSD } = useCurrency();
  
  // Safe access to insets to prevent crashes if context is missing
  const insetsContext = useContext(SafeAreaContext);
  const insets = insetsContext ?? { top: 0, bottom: 0, left: 0, right: 0 };

  if (!insetsContext) {
    logger.warn('[CreateCategoryModal] SafeAreaContext is missing! Defaulting to 0 insets.');
  }
  
  // Get context
  const { setBottomSheetRef, closeCreateCategoryModal, config } = useCreateCategoryModal();
  
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Register bottom sheet ref with context immediately
  useEffect(() => {
    logger.debug('[CreateCategoryModal] mounted');
    if (bottomSheetRef.current) {
      logger.debug('[CreateCategoryModal] Registering bottom sheet ref');
      setBottomSheetRef(bottomSheetRef.current);
    }
    return () => {
      logger.debug('[CreateCategoryModal] unmounted');
      setBottomSheetRef(null);
    };
  }, [setBottomSheetRef]);

  // Open bottom sheet when config is set
  useEffect(() => {
    if (config && bottomSheetRef.current) {
      logger.debug('[CreateCategoryModal] Config received, opening bottom sheet', config);
      bottomSheetRef.current.snapToIndex(0);
    } else if (!config && bottomSheetRef.current) {
      bottomSheetRef.current.close();
    }
  }, [config]);
  
  // Always render BottomSheet to ensure ref is registered
  const { onCreate, isPremium, existingCategoryNames = [] } = config || {};
  
  // Determine if using translucent background (affects text colors)
  const usesTranslucentBackground = shouldUseLiquidGlass();
  
  // In light mode with translucent background, use darker text for better visibility
  // In dark mode with translucent background, use white text
  const getTextColor = (defaultColor: string) => {
    if (usesTranslucentBackground) {
      return isDark ? '#FFFFFF' : '#000000'; // White for dark mode, black for light mode
    }
    return defaultColor;
  };
  
  const getSecondaryTextColor = (defaultColor: string) => {
    if (usesTranslucentBackground) {
      return isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)';
    }
    return defaultColor;
  };
  
  const getBorderColor = (defaultColor: string) => {
    if (usesTranslucentBackground) {
      return isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
    }
    return defaultColor;
  };

  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [selectedColor, setSelectedColor] = useState('#6B7280');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    budget?: string;
  }>({});

  // Register bottom sheet ref with context
  useEffect(() => {
    if (bottomSheetRef.current) {
      logger.debug('[CreateCategoryModal] Registering bottom sheet ref');
      setBottomSheetRef(bottomSheetRef.current);
    }
    return () => {
      setBottomSheetRef(null);
    };
  }, [setBottomSheetRef]);

  // Log when config changes
  useEffect(() => {
    if (config) {
      logger.debug('[CreateCategoryModal] Config received, modal should open', config);
    }
  }, [config]);

  /**
   * Validates form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate name
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      newErrors.name = 'Category name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (trimmedName.length > 30) {
      newErrors.name = 'Category name must be 30 characters or less';
    } else if (existingCategoryNames.some(name => name.toLowerCase() === trimmedName.toLowerCase())) {
      newErrors.name = 'A category with this name already exists';
    }

    // Validate budget (optional)
    if (budgetAmount) {
      const budgetValue = parseFloat(budgetAmount);
      if (isNaN(budgetValue) || budgetValue < 0) {
        newErrors.budget = 'Budget must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles category creation
   */
  const handleCreate = async (): Promise<void> => {
    if (!validateForm()) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsCreating(true);

    try {
      const budgetInUSD = budgetAmount 
        ? convertToUSD(parseFloat(budgetAmount))
        : undefined;

      if (onCreate) {
        await onCreate({
          name: categoryName.trim(),
          icon: selectedIcon,
          color: selectedColor,
          budgetLimit: budgetInUSD,
        });
      }

      // Reset form
      setCategoryName('');
      setSelectedIcon('tag');
      setSelectedColor('#6B7280');
      setBudgetAmount('');
      setErrors({});

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      closeCreateCategoryModal();
    } catch (error: any) {
      console.error('[CreateCategoryModal] Creation error:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to create category. Please try again.',
        [{ text: 'OK' }]
      );
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handles modal close with confirmation if form has data
   */
  const handleClose = (): void => {
    if (categoryName.trim() || budgetAmount) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setCategoryName('');
              setSelectedIcon('tag');
              setSelectedColor('#6B7280');
              setBudgetAmount('');
              setErrors({});
              closeCreateCategoryModal();
            },
          },
        ]
      );
    } else {
      closeCreateCategoryModal();
    }
  };

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: usesTranslucentBackground ? (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)') : 'rgba(0, 0, 0, 0.3)' }}
        onClose={handleClose}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={[styles.bottomSheetContentContainer, { paddingTop: spacing.md, paddingBottom: 100 }]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: getBorderColor(theme.border) }]}>
            <View style={styles.headerLeft}>
              <View>
                <Text style={[styles.modalTitle, { color: getTextColor(theme.text) }]}>
                  Create Category
                </Text>
              </View>
            </View>
          </View>

          {/* Category Name */}
          <View style={styles.inputGroup}>
              <InputGroup
                label="Category Name"
                placeholder="e.g., Subscriptions, Hobbies"
                value={categoryName}
                onChangeText={(text) => {
                  setCategoryName(text);
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined });
                  }
                }}
                error={errors.name}
              helperText={`${categoryName.length}/30 characters`}
                maxLength={30}
              />
          </View>

          {/* Icon Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: getSecondaryTextColor(theme.textSecondary) }]}>
              Choose Icon
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.background,
                  borderColor: getBorderColor(theme.border),
                },
              ]}
              onPress={() => setShowIconPicker(true)}
            >
              <View style={styles.pickerButtonContent}>
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: selectedColor + '20' },
                  ]}
                >
                  <Icon name={selectedIcon as any} size={20} color={selectedColor} />
                </View>
                <Text style={[styles.pickerButtonText, { color: getTextColor(theme.text) }]}>
                  {AVAILABLE_ICONS.findIndex(i => i === selectedIcon) >= 0
                    ? selectedIcon.charAt(0).toUpperCase() + selectedIcon.slice(1).replace(/-/g, ' ')
                    : 'Select icon'}
                </Text>
              </View>
              <Icon name="chevron-down" size={20} color={getSecondaryTextColor(theme.textTertiary)} />
            </TouchableOpacity>
          </View>

          {/* Color Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: getSecondaryTextColor(theme.textSecondary) }]}>
              Choose Color
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.background,
                  borderColor: getBorderColor(theme.border),
                },
              ]}
              onPress={() => setShowColorPicker(true)}
            >
              <View style={styles.pickerButtonContent}>
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: selectedColor },
                  ]}
                />
                <Text style={[styles.pickerButtonText, { color: getTextColor(theme.text) }]}>
                  {selectedColor}
                </Text>
              </View>
              <Icon name="chevron-down" size={20} color={getSecondaryTextColor(theme.textTertiary)} />
            </TouchableOpacity>
          </View>

          {/* Budget Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: getSecondaryTextColor(theme.textSecondary) }]}>
              Monthly Budget (Optional)
            </Text>
            <View
              style={[
                styles.amountInput,
                {
                  backgroundColor: theme.background,
                  borderColor: errors.budget ? theme.expense : getBorderColor(theme.border),
                },
              ]}
            >
              <CurrencyInput
                value={budgetAmount}
                onChangeText={(text) => {
                  setBudgetAmount(text);
                  if (errors.budget) {
                    setErrors({ ...errors, budget: undefined });
                  }
                }}
                placeholder="0.00"
                placeholderTextColor={getSecondaryTextColor(theme.textTertiary)}
                showSymbol={true}
                allowDecimals={true}
                inputStyle={styles.currencyInputField}
              />
            </View>
            {errors.budget && (
              <Text style={[styles.errorText, { color: theme.expense }]}>
                {errors.budget}
              </Text>
            )}
          </View>
        </BottomSheetScrollView>

        {/* Fixed Footer with Action Buttons */}
        <View style={[
          styles.modalActions, 
          { 
            borderTopColor: getBorderColor(theme.border), 
            backgroundColor: 'transparent',
            paddingBottom: Math.max(insets.bottom, spacing.lg)
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.modalButton,
              styles.modalButtonSecondary,
              {
                borderColor: getBorderColor(theme.border),
                backgroundColor: 'transparent',
              },
            ]}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isCreating}
          >
            <Text style={[styles.modalButtonText, { color: getTextColor(theme.text) }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalButton,
              styles.modalButtonPrimary,
              { backgroundColor: theme.primary },
              (!isPremium || isCreating) && styles.modalButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleCreate}
            disabled={!isPremium || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#FFFFFF" />
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Create
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!isPremium && (
          <View style={[styles.premiumBanner, { backgroundColor: usesTranslucentBackground ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)') : '#F59E0B15' }]}>
            <Icon name="crown" size={16} color="#F59E0B" />
            <Text style={[styles.premiumBannerText, { color: '#F59E0B' }]}>
              Custom categories are available for Premium users
            </Text>
          </View>
        )}
      </BottomSheet>

      {/* Icon Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showIconPicker}
        onRequestClose={() => setShowIconPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowIconPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, paddingHorizontal: spacing.xl }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Icon</Text>
              <TouchableOpacity onPress={() => setShowIconPicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconGridItem,
                      {
                        backgroundColor: theme.background,
                        borderColor:
                          selectedIcon === iconName ? theme.primary : theme.border,
                      },
                      selectedIcon === iconName && styles.iconGridItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedIcon(iconName);
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowIconPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={iconName as any}
                      size={24}
                      color={selectedIcon === iconName ? theme.primary : theme.text}
                    />
                    {selectedIcon === iconName && (
                      <View style={[styles.selectedIndicator, { backgroundColor: theme.background }]}>
                        <Icon name="check-circle" size={20} color={theme.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showColorPicker}
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowColorPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border, paddingHorizontal: spacing.xl }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Color</Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.map((colorValue) => (
                  <TouchableOpacity
                    key={colorValue}
                    style={[
                      styles.colorGridItem,
                      { backgroundColor: colorValue },
                      selectedColor === colorValue && styles.colorGridItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedColor(colorValue);
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowColorPicker(false);
                    }}
                    activeOpacity={0.8}
                  >
                    {selectedColor === colorValue && (
                      <Icon name="check" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    minHeight: 400,
    paddingBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  premiumHint: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  iconGridItem: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGridItemSelected: {
    borderWidth: 3,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: borderRadius.full,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  colorGridItem: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGridItemSelected: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...elevation.sm,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewBudget: {
    ...typography.bodySmall,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    position: 'relative',
    zIndex: 10,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {
    // backgroundColor set inline
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  premiumBannerText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
});

