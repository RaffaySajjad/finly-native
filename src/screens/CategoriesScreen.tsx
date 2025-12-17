/**
 * CategoriesScreen component
 * Purpose: Displays all expense categories with budget tracking
 * Shows spending breakdown and progress towards budget limits
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { useTheme } from '../contexts/ThemeContext';
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { useCurrency } from '../contexts/CurrencyContext';
import { CategoryCard, AIAssistantFAB } from '../components';
import { useCreateCategoryModal } from '../contexts/CreateCategoryModalContext';
import { apiService } from '../services/api';
import { Category } from '../types';
import { RootStackParamList } from '../navigation/types';
import { RootState } from '../store';
import { typography, spacing, borderRadius, elevation } from '../theme';

type CategoriesNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * CategoriesScreen - Shows all spending categories
 */
const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<CategoriesNavigationProp>();
  const subscription = useSelector((state: RootState) => state.subscription);
  const isPremium = subscription.subscription.tier === 'PREMIUM';

  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const { openCreateCategoryModal } = useCreateCategoryModal();
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      // Use cache when screen is focused - cache will handle stale-while-revalidate
      loadCategories(false);
    }, [])
  );

  // Scroll to top when tab is pressed while already on this screen
  useScrollToTopOnTabPress(scrollViewRef);

  useEffect(() => {
    // Load categories on mount - use cache for faster initial load
    loadCategories(false);
  }, []);

  /**
   * Loads categories from API
   * @param skipCache - Whether to skip cache and fetch fresh data
   */
  const loadCategories = async (skipCache: boolean = false): Promise<void> => {
    try {
      const [data, completed] = await Promise.all([
        apiService.getCategories(skipCache),
        apiService.hasCategorySetupCompleted(),
      ]);
      setCategories(data || []);
      setSetupCompleted(completed);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
      setSetupCompleted(false);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  /**
   * Handles pull-to-refresh
   */
  const onRefresh = (): void => {
    setRefreshing(true);
    loadCategories(true); // Skip cache on manual refresh only
  };

  /**
   * Handles creating a new category
   */
  const handleCreateCategory = async (data: {
    name: string;
    icon: string;
    color: string;
    budgetLimit?: number;
    originalAmount?: number;
    originalCurrency?: string;
  }): Promise<void> => {
    try {
      const newCategory = await apiService.createCategory(data);
      setCategories([...categories, newCategory]);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('[CategoriesScreen] Create category error:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  /**
   * Handles opening create modal with premium check
   */
  const handleOpenCreateModal = (): void => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Custom categories are available for Premium users. Upgrade to create unlimited custom categories.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Learn More',
            onPress: () => {
              // Navigate to subscription/premium screen if available
              // navigation.navigate('Subscription');
            },
          },
        ]
      );
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    openCreateCategoryModal({
      onCreate: handleCreateCategory,
      isPremium,
      existingCategoryNames,
    });
  };

  const totalSpent = categories.reduce((sum, cat) => sum + (cat.totalSpent || 0), 0);
  const existingCategoryNames = categories.map(cat => cat.name);

  // Group categories by system vs custom
  const systemCategories = categories.filter(cat => cat.isSystemCategory === true);
  const customCategories = categories.filter(cat => cat.isSystemCategory !== true);

  // Show onboarding if setup not completed and not loading
  if (!setupCompleted && !refreshing && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Categories</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.onboardingContent}
        >
          <View style={styles.onboardingContainer}>
            {/* Icon */}
            <View style={[styles.onboardingIconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Icon name="shape" size={64} color={theme.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.onboardingTitle, { color: theme.text }]}>
              Set Up Your Categories
            </Text>
            <Text style={[styles.onboardingDescription, { color: theme.textSecondary }]}>
              Categories help you organize and track your spending. Let's get you started!
            </Text>

            {/* Setup Button */}
            <TouchableOpacity
              style={[styles.setupButton, { backgroundColor: theme.primary }, elevation.md]}
              onPress={() => navigation.navigate('CategoryOnboarding')}
              activeOpacity={0.8}
            >
              <Icon name="rocket-launch" size={20} color="#FFFFFF" />
              <Text style={styles.setupButtonText}>Get Started</Text>
            </TouchableOpacity>

            {/* Benefits List */}
            <View style={styles.benefitsContainer}>
              {[
                { icon: 'chart-pie', text: 'Track spending patterns' },
                { icon: 'target', text: 'Set budget limits' },
                { icon: 'lightbulb-on', text: 'Get smart insights' },
              ].map((benefit, index) => (
                <View key={index} style={styles.benefitRow}>
                  <Icon name={benefit.icon as any} size={18} color={theme.primary} />
                  <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
                    {benefit.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
        <Text style={[styles.title, { color: theme.text }]}>Categories</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Spent this month: {formatCurrency(totalSpent)}
        </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }, elevation.sm]}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.content}>
          {/* System Categories (Default) */}
          {systemCategories.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Default Categories
              </Text>
              {systemCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onPress={() => navigation.navigate('CategoryDetails', { categoryId: category.id })}
                />
              ))}
            </View>
          )}

          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Custom Categories
              </Text>
              {customCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onPress={() => navigation.navigate('CategoryDetails', { categoryId: category.id })}
                />
              ))}
            </View>
          )}

          {/* Show message if no categories */}
          {categories.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Icon name="folder-off-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No categories found
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: Platform.OS === 'ios' ? spacing.xl : 0 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  content: {
    paddingTop: spacing.sm,
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  onboardingContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  onboardingContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  onboardingIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  onboardingTitle: {
    ...typography.headlineMedium,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  onboardingDescription: {
    ...typography.bodyLarge,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    minWidth: 200,
  },
  setupButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  benefitsContainer: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitText: {
    ...typography.bodyMedium,
  },
});

export default CategoriesScreen;

