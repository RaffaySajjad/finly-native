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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { CategoryCard } from '../components';
import { apiService } from '../services/api';
import { Category } from '../types';
import { typography, spacing } from '../theme';

/**
 * CategoriesScreen - Shows all spending categories
 */
const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  /**
   * Loads categories from API
   */
  const loadCategories = async (): Promise<void> => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handles pull-to-refresh
   */
  const onRefresh = (): void => {
    setRefreshing(true);
    loadCategories();
  };

  const totalSpent = categories.reduce((sum, cat) => sum + cat.totalSpent, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Categories</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Total Spent: ${totalSpent.toFixed(2)}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.content}>
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
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
});

export default CategoriesScreen;

