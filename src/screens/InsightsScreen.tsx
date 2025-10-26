/**
 * InsightsScreen component
 * Purpose: Displays AI-generated financial insights and recommendations
 * Provides actionable tips to help users save money and improve spending habits
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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { InsightCard } from '../components';
import { apiService } from '../services/api';
import { Insight } from '../types';
import { typography, spacing } from '../theme';

/**
 * InsightsScreen - Shows AI-powered financial insights
 */
const InsightsScreen: React.FC = () => {
  const { theme } = useTheme();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  /**
   * Loads insights from API
   */
  const loadInsights = async (): Promise<void> => {
    try {
      const data = await apiService.getInsights();
      setInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handles pull-to-refresh
   */
  const onRefresh = (): void => {
    setRefreshing(true);
    loadInsights();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Icon name="brain" size={32} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>AI Insights</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Personalized recommendations to help you save
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
          {insights.length > 0 ? (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="lightbulb-on-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No insights available yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary }]}>
                Keep tracking your expenses to get personalized tips
              </Text>
            </View>
          )}
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
    alignItems: 'center',
  },
  title: {
    ...typography.headlineMedium,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  content: {
    paddingTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    ...typography.titleMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default InsightsScreen;

