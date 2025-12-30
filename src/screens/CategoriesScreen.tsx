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
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '../components/GradientHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { useCurrency } from '../contexts/CurrencyContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { useSubscription } from '../hooks/useSubscription';
import { CategoryCard, AIAssistantFAB, UpgradePrompt, EmptyState } from '../components';
import { GlowButton } from '../components/PremiumComponents';
import { useCreateCategoryModal } from '../contexts/CreateCategoryModalContext';
import { apiService } from '../services/api';
import { Category } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { springPresets } from '../theme/AnimationConfig';

type CategoriesNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * CategoriesScreen - Shows all spending categories
 */
const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const navigation = useNavigation<CategoriesNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPremium, requiresUpgrade, setCategoryCount, getRemainingUsage } = useSubscription();

  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { openCreateCategoryModal } = useCreateCategoryModal();
  const scrollViewRef = useRef<ScrollView>(null);

  // Entry animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

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

      // Track category count for free tier limits (only count custom categories)
      const customCategoryCount = (data || []).filter(cat => !cat.isSystemCategory).length;
      setCategoryCount(customCategoryCount);
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
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);

      // Update category count for free tier limits
      const customCategoryCount = updatedCategories.filter(cat => !cat.isSystemCategory).length;
      setCategoryCount(customCategoryCount);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[CategoriesScreen] Create category error:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  /**
   * Handles opening create modal with premium check
   */
  const handleOpenCreateModal = (): void => {
    // Check if user has hit category limit (free tier: 5 custom categories)
    if (requiresUpgrade('unlimitedCategories')) {
      setShowUpgradePrompt(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCreateCategoryModal({
      onCreate: handleCreateCategory,
      isPremium,
      existingCategoryNames,
    });
  };

  const totalSpent = categories.reduce((sum, cat) => sum + (cat.totalSpent || 0), 0);
  const existingCategoryNames = categories.map(cat => cat.name);

  // Calculate overspent categories
  const overspentCategories = categories.filter(
    cat => cat.budgetLimit && (cat.totalSpent || 0) > cat.budgetLimit
  );
  const totalOverspent = overspentCategories.reduce((sum, cat) => {
    return sum + ((cat.totalSpent || 0) - (cat.budgetLimit || 0));
  }, 0);

  // Group categories by system vs custom
  const systemCategories = categories.filter(cat => cat.isSystemCategory === true);
  const customCategories = categories.filter(cat => cat.isSystemCategory !== true);

  // Show onboarding if setup not completed and not loading
  if (!setupCompleted && !refreshing && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <GradientHeader />
        <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

        {/* Header */}
        <View style={[styles.header, { marginTop: insets.top }]}>
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
              onPress={() => navigation.navigate('CategorySetup')}
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
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
        {/* Overspent Alert Banner */}
        {overspentCategories.length > 0 && (
          <View style={[styles.overspentBanner, { backgroundColor: theme.error + '15' }]}>
            <View style={[styles.overspentIconContainer, { backgroundColor: theme.error }]}>
              <Icon name="alert-circle" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.overspentTextContainer}>
              <Text style={[styles.overspentTitle, { color: theme.error }]}>
                {overspentCategories.length === 1
                  ? '1 Category Over Budget'
                  : `${overspentCategories.length} Categories Over Budget`}
              </Text>
              <Text style={[styles.overspentSubtitle, { color: theme.textSecondary }]}>
                Total overspent: {formatCurrency(totalOverspent)}
              </Text>
            </View>
          </View>
        )}

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
            <EmptyState
              variant="categories"
              compact
              actionLabel="Create Category"
              onActionPress={handleOpenCreateModal}
            />
          )}
        </View>

        <View style={{ height: Platform.OS === 'ios' ? spacing.xl : 0 }} />
      </ScrollView>

      {/* Upgrade Prompt for Category Limit */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Unlimited Categories"
        message={`You've reached the limit of ${5} custom categories. Upgrade to Premium to create unlimited categories!`}
      />
    </View>
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
  overspentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  overspentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  overspentTextContainer: {
    flex: 1,
  },
  overspentTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  overspentSubtitle: {
    ...typography.bodySmall,
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

