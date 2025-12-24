/**
 * CategoryPickerModal Component
 * Purpose: Reusable category picker modal with search functionality
 * Features: Search, grouped categories (system/custom), selection indicator
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { logger } from '../utils/logger';
import { Category } from '../types';
import { typography, spacing, borderRadius } from '../theme';

import { useNavigation } from '@react-navigation/native';

interface CategoryPickerModalProps {
  visible: boolean;
  categories: Category[];
  selectedCategoryId?: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  onNavigateToCategories?: () => void;
}

/**
 * CategoryPickerModal - Reusable category selection modal
 */
export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  categories = [],
  selectedCategoryId,
  onSelect,
  onClose,
  onNavigateToCategories,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and group categories
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const categoriesList = Array.isArray(categories) ? categories : [];
    
    // Debug log
    logger.debug('[CategoryPickerModal] Categories received:', {
      isArray: Array.isArray(categories),
      length: categoriesList.length,
      categories: categoriesList.slice(0, 3).map(c => ({ id: c?.id, name: c?.name, isSystemCategory: c?.isSystemCategory }))
    });

    if (categoriesList.length === 0) {
      logger.warn('[CategoryPickerModal] No categories provided!', { 
        categories, 
        categoriesLength: categories?.length,
        categoriesType: typeof categories 
      });
      return { systemCategories: [], customCategories: [] };
    }

    let filtered = categoriesList.filter(cat => cat && cat.id && cat.name); // Filter out invalid entries

    if (query && filtered.length > 0) {
      filtered = filtered.filter(
        cat => cat.name?.toLowerCase().includes(query) || cat.icon?.toLowerCase().includes(query)
      );
    }

    // Group by system vs custom
    // Handle undefined/null isSystemCategory - treat undefined/null as custom category
    const systemCategories = filtered.filter(cat => cat.isSystemCategory === true);
    const customCategories = filtered.filter(cat => cat.isSystemCategory !== true); // This includes false, undefined, and null

    logger.debug('[CategoryPickerModal] Filtered categories:', {
      total: categoriesList.length,
      valid: filtered.length,
      system: systemCategories.length,
      custom: customCategories.length,
      query
    });

    return { systemCategories, customCategories };
  }, [categories, searchQuery]);

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Debug: Log when modal opens and categories are available
  useEffect(() => {
    if (visible) {
      logger.debug('[CategoryPickerModal] Modal opened with categories:', categories?.length || 0);
      logger.debug('[CategoryPickerModal] Filtered - System:', filteredCategories.systemCategories.length, 'Custom:', filteredCategories.customCategories.length);
    }
  }, [visible, categories, filteredCategories]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={handleClose}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="magnify" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search categories..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            style={styles.modalScrollView} 
            keyboardShouldPersistTaps="handled" 
            contentContainerStyle={{ paddingBottom: spacing.lg, flexGrow: 1 }}
            showsVerticalScrollIndicator={true}
          >
            {/* Show all categories if no grouping works - fallback */}
            {filteredCategories.systemCategories.length === 0 && 
             filteredCategories.customCategories.length === 0 && 
             (categories || []).length > 0 && (
              <View style={styles.categorySection}>
                <Text style={[styles.categorySectionTitle, { color: theme.textSecondary }]}>
                  All Categories
                </Text>
                <View style={styles.categoryGridModal}>
                  {(categories || []).filter(cat => {
                    if (!cat) return false;
                    const query = searchQuery.toLowerCase().trim();
                    if (query) {
                      return cat.name?.toLowerCase().includes(query) || cat.icon?.toLowerCase().includes(query);
                    }
                    return true;
                  }).map((cat) => {
                    if (!cat) return null;
                    const isSelected = selectedCategoryId === cat.id;
                    const categoryColor = cat.color || theme.primary;

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryButtonModal,
                          {
                            backgroundColor: isSelected ? categoryColor + '20' : theme.card,
                            borderColor: isSelected ? categoryColor : theme.border,
                          },
                        ]}
                        onPress={() => handleSelect(cat.id)}
                      >
                        <View style={[styles.categoryIconContainerModal, { backgroundColor: categoryColor + '15' }]}>
                          <Icon name={cat.icon as any} size={22} color={categoryColor} />
                        </View>
                        <Text
                          style={[
                            styles.categoryLabelModal,
                            { color: isSelected ? categoryColor : theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]}>
                            <Icon name="check" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* System Categories */}
            {filteredCategories.systemCategories.length > 0 && (
              <View style={styles.categorySection} key="system-categories">
                <Text style={[styles.categorySectionTitle, { color: theme.textSecondary }]}>
                  System Categories
                </Text>
                <View style={styles.categoryGridModal}>
                  {filteredCategories.systemCategories.map((cat, index) => {
                    if (index === 0) {
                      logger.debug('[CategoryPickerModal] Rendering system category:', cat.name, cat.id);
                    }
                    const isSelected = selectedCategoryId === cat.id;
                    const categoryColor = cat.color || theme.primary;

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryButtonModal,
                          {
                            backgroundColor: isSelected ? categoryColor + '20' : theme.card,
                            borderColor: isSelected ? categoryColor : theme.border,
                          },
                        ]}
                        onPress={() => handleSelect(cat.id)}
                      >
                        <View style={[styles.categoryIconContainerModal, { backgroundColor: categoryColor + '15' }]}>
                          <Icon name={cat.icon as any} size={22} color={categoryColor} />
                        </View>
                        <Text
                          style={[
                            styles.categoryLabelModal,
                            { color: isSelected ? categoryColor : theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]}>
                            <Icon name="check" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Custom Categories */}
            {filteredCategories.customCategories.length > 0 && (
              <View style={styles.categorySection} key="custom-categories">
                <Text style={[styles.categorySectionTitle, { color: theme.textSecondary }]}>
                  Custom Categories
                </Text>
                <View style={styles.categoryGridModal}>
                  {filteredCategories.customCategories.map((cat, index) => {
                    if (index === 0) {
                      logger.debug('[CategoryPickerModal] Rendering custom category:', cat.name, cat.id);
                    }
                    const isSelected = selectedCategoryId === cat.id;
                    const categoryColor = cat.color || theme.primary;

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryButtonModal,
                          {
                            backgroundColor: isSelected ? categoryColor + '20' : theme.card,
                            borderColor: isSelected ? categoryColor : theme.border,
                          },
                        ]}
                        onPress={() => handleSelect(cat.id)}
                      >
                        <View style={[styles.categoryIconContainerModal, { backgroundColor: categoryColor + '15' }]}>
                          <Icon name={cat.icon as any} size={22} color={categoryColor} />
                        </View>
                        <Text
                          style={[
                            styles.categoryLabelModal,
                            { color: isSelected ? categoryColor : theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]}>
                            <Icon name="check" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Empty State */}
            {filteredCategories.systemCategories.length === 0 &&
              filteredCategories.customCategories.length === 0 && (
                <View style={styles.emptyCategoryContainer}>
                  <Icon name="folder-off-outline" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyCategoryText, { color: theme.textSecondary }]}>
                    {searchQuery
                      ? `No categories found for "${searchQuery}"`
                      : 'No categories available'}
                  </Text>
                <TouchableOpacity
                  style={[styles.goToCategoriesButton, { backgroundColor: theme.primary + '15' }]}
                  onPress={() => {
                    onClose();
                    if (onNavigateToCategories) {
                      onNavigateToCategories();
                    } else {
                      // @ts-ignore - navigating to nested screen
                      navigation.navigate('MainTabs', { screen: 'Categories' });
                    }
                  }}
                >
                  <Text style={[styles.goToCategoriesText, { color: theme.primary }]}>
                    Go to Categories
                  </Text>
                  <Icon name="arrow-right" size={16} color={theme.primary} />
                </TouchableOpacity>
                </View>
              )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
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
  modalScrollView: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
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
  goToCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  goToCategoriesText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
});

export default CategoryPickerModal;

