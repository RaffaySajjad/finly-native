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
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { InsightCard, PremiumBadge, UpgradePrompt, AIAssistantFAB } from '../components';
import { apiService } from '../services/api';
import { Insight } from '../types';
import { typography, spacing } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

/**
 * InsightsScreen - Shows AI-powered financial insights
 */
const InsightsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isPremium, getRemainingUsage, requiresUpgrade, trackUsage } = useSubscription();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  /**
   * Loads insights from API
   */
  const loadInsights = async (): Promise<void> => {
    // Check if user has access to insights
    if (requiresUpgrade('advancedInsights')) {
      setShowUpgradePrompt(true);
      setRefreshing(false);
      return;
    }

    try {
      const data = await apiService.getInsights();
      setInsights(data);

      // Track usage for free tier
      if (!isPremium) {
        trackUsage('advancedInsights');
      }
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
        {Platform.OS === 'android' && <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>}
        <View style={styles.headerContent}>
          <Icon name="brain" size={32} color={theme.primary} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>AI Insights</Text>
            {!isPremium && (
              <Text style={[styles.usageText, { color: theme.textSecondary }]}>
                {getRemainingUsage('advancedInsights')} insights remaining this week
              </Text>
            )}
          </View>
        </View>
        {!isPremium && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Subscription')}
            style={styles.upgradeButton}
          >
            <PremiumBadge size="small" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
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

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Advanced Insights"
        message={
          !isPremium
            ? `You've used ${3 - getRemainingUsage('advancedInsights')} of 3 free insights this week. Upgrade to Premium for unlimited AI-powered insights.`
            : undefined
        }
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: 2,
  },
  usageText: {
    ...typography.bodySmall,
  },
  upgradeButton: {
    padding: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
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

