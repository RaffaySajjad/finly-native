/**
 * CategoryOnboardingScreen component
 * Purpose: Guide new users to set up their expense categories
 * Features: Quick setup with defaults or custom category creation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type CategoryOnboardingNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Default categories for quick setup
 */
const DEFAULT_CATEGORIES_CONFIG = [
  { id: 'food', name: 'Food & Dining', icon: 'food', color: '#F59E0B', budgetLimit: 600 },
  { id: 'transport', name: 'Transportation', icon: 'car', color: '#3B82F6', budgetLimit: 200 },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: '#EC4899', budgetLimit: 400 },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie', color: '#8B5CF6', budgetLimit: 150 },
  { id: 'health', name: 'Health', icon: 'heart-pulse', color: '#10B981', budgetLimit: 100 },
  { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt', color: '#6366F1', budgetLimit: 300 },
  { id: 'other', name: 'Other', icon: 'dots-horizontal', color: '#6B7280' },
];

/**
 * CategoryOnboardingScreen - Onboarding for category setup
 */
const CategoryOnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<CategoryOnboardingNavigationProp>();

  const [isSettingUp, setIsSettingUp] = useState(false);

  // Automatically set up categories when screen loads
  useEffect(() => {
    const autoSetup = async () => {
      setIsSettingUp(true);
      try {
        // Automatically set up default categories
        await apiService.setupDefaultCategories();
        
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Small delay to show loading state, then navigate back
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } catch (error) {
        Alert.alert('Error', 'Failed to set up categories. Please try again.');
        console.error(error);
        setIsSettingUp(false);
      }
    };

    autoSetup();
  }, []);

  const handleQuickSetup = async () => {
    setIsSettingUp(true);
    try {
      // Use the new setupDefaultCategories method
      await apiService.setupDefaultCategories();
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Categories Set Up! 🎉',
        'You can now start tracking your expenses. You can customize these categories anytime.',
        [
          {
            text: 'Got it',
            onPress: () => {
              // CategoriesScreen will detect that categories exist and show them
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to set up categories. Please try again.');
      console.error(error);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Setting up your categories...
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  optionCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  optionDescription: {
    ...typography.bodySmall,
  },
  categoriesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs / 2,
    maxWidth: '48%',
  },
  categoryPreviewText: {
    ...typography.labelSmall,
    fontSize: 11,
  },
  moreIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  moreIndicatorText: {
    ...typography.labelSmall,
    fontSize: 11,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primaryButton: {
    // backgroundColor set inline
  },
  secondaryButton: {
    borderWidth: 2,
  },
  setupButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  benefitsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.lg,
  },
  benefitsTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default CategoryOnboardingScreen;

