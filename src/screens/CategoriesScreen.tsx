/**
 * CategoriesScreen component
 * Purpose: Displays all expense categories with budget tracking
 * Shows spending breakdown and progress towards budget limits
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { CategoryCard, AIAssistantFAB } from '../components';
import { apiService } from '../services/api';
import { Category } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type CategoriesNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * CategoriesScreen - Shows all spending categories
 */
const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<CategoriesNavigationProp>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [])
  );

  useEffect(() => {
    // Load categories on mount
    loadCategories();
  }, []);

  /**
   * Loads categories from API
   */
  const loadCategories = async (): Promise<void> => {
    try {
      const [data, completed] = await Promise.all([
        apiService.getCategories(),
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
    loadCategories();
  };

  const totalSpent = categories.reduce((sum, cat) => sum + (cat.totalSpent || 0), 0);

  console.log("CATEGORIES:", categories, "Setup completed:", setupCompleted)

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
        <Text style={[styles.title, { color: theme.text }]}>Categories</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          This Month: {formatCurrency(totalSpent)}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.content}>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={() => navigation.navigate('CategoryDetails', { categoryId: category.id })}
            />
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
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
  title: {
    ...typography.headlineMedium,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
  },
  content: {
    paddingTop: spacing.sm,
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

