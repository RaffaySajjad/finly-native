/**
 * InsightsScreen component
 * Purpose: Displays AI-generated financial insights and recommendations
 * Features: Grouped by date, pagination with infinite scroll, notification-style UI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { useSubscription } from '../hooks/useSubscription';
import { logger } from '../utils/logger';
import { getDateKey, formatDateLabel } from '../utils/dateFormatter';
import { InsightCard, PremiumBadge, UpgradePrompt, AIAssistantFAB } from '../components';
import { GradientHeader } from '../components/GradientHeader';
import { AnimatedCard } from '../components/PremiumComponents';
import { apiService } from '../services/api';
import { Insight } from '../types';
import { typography, spacing } from '../theme';
import { springPresets } from '../theme/AnimationConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../hooks/useScrollToTopOnTabPress';
import { useAppDispatch } from '../store';
import { markAllInsightsRead, clearUnreadCount } from '../store/slices/insightsSlice';

const INSIGHTS_FIRST_LOAD_KEY = '@finly_insights_first_load_done';

interface GroupedInsights {
  date: string;
  dateLabel: string;
  insights: Insight[];
}

/**
 * Group insights by date
 * Also filters out duplicate insights with the same title on the same day,
 * keeping only the most recent one
 */
const groupInsightsByDate = (insights: Insight[]): GroupedInsights[] => {
  // Remove duplicates by ID first to prevent duplicate groups
  const uniqueInsights = Array.from(
    new Map(insights.map(insight => [insight.id, insight])).values()
  );

  // Sort by date (newest first)
  const sortedInsights = [...uniqueInsights].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const grouped: Record<string, Insight[]> = {};

  sortedInsights.forEach((insight) => {
    // Use consistent date key generation (local timezone)
    const dateKey = getDateKey(insight.createdAt);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(insight);
  });

  // Convert to array, dedupe by title within each day, and sort by date (newest first)
  return Object.entries(grouped)
    .map(([date, dayInsights]) => {
      // Sort insights within the day (newest first)
      const sortedDayInsights = dayInsights.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Filter out duplicates with same title, keeping only the latest (first after sort)
      const seenTitles = new Set<string>();
      const dedupedInsights = sortedDayInsights.filter((insight) => {
        if (seenTitles.has(insight.title)) {
          return false; // Skip duplicate title
        }
        seenTitles.add(insight.title);
        return true;
      });

      return {
        date,
        dateLabel: formatDateLabel(dayInsights[0].createdAt),
        insights: dedupedInsights,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * InsightsScreen - Shows AI-powered financial insights grouped by date
 */
const InsightsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { getCurrencySymbol, convertFromUSD } = useCurrency();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const insets = useSafeAreaInsets();
  const currencySymbol = getCurrencySymbol();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const { isPremium, getRemainingUsage, requiresUpgrade, trackUsage } = useSubscription();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [groupedInsights, setGroupedInsights] = useState<GroupedInsights[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean | null>(null);
  const flatListRef = useRef<FlatList<GroupedInsights>>(null);

  // Entry animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkFirstLoad();
    // Entry animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Mark all insights as read when screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure user actually sees the insights
      const timer = setTimeout(() => {
        dispatch(markAllInsightsRead());
      }, 1500);
      
      return () => clearTimeout(timer);
    }, [dispatch])
  );

  // Scroll to top when tab is pressed while already on this screen
  useScrollToTopOnTabPress(undefined, flatListRef);

  /**
   * Check if this is the first time loading insights
   */
  const checkFirstLoad = async (): Promise<void> => {
    try {
      const firstLoadDone = await AsyncStorage.getItem(INSIGHTS_FIRST_LOAD_KEY);
      const isFirst = firstLoadDone !== 'true';
      setIsFirstLoad(isFirst);

      // Load insights - will auto-generate on first load
      await loadInsights(true, isFirst);

      // Mark first load as done after successful load
      if (isFirst) {
        await AsyncStorage.setItem(INSIGHTS_FIRST_LOAD_KEY, 'true');
      }
    } catch (error) {
      console.error('[InsightsScreen] Error checking first load:', error);
      setIsFirstLoad(false);
      // Fallback: try to load anyway
      await loadInsights(true, false);
    }
  };

  /**
   * Loads insights from API with pagination
   */
  const loadInsights = async (initialLoad: boolean = false, forceRefreshParam?: boolean): Promise<void> => {
    // Check if user has access to insights
    if (requiresUpgrade('advancedInsights')) {
      setShowUpgradePrompt(true);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Determine if we should call API:
      // - First load (isFirstLoad === true): always call API (forceRefresh=true)
      // - Pull-to-refresh (forceRefreshParam === true): always call API (forceRefresh=true)
      // - After first load (not refreshing): use cache only, don't call API (forceRefresh=false)
      const isFirstTime = isFirstLoad === true;
      const isRefreshing = forceRefreshParam === true;
      const shouldCallAPI = isFirstTime || isRefreshing;

      logger.debug('[InsightsScreen] Loading insights:', {
        initialLoad,
        refreshing,
        forceRefresh: shouldCallAPI,
        forceRefreshParam,
        isFirstLoad,
        isFirstTime,
        isRefreshing,
        shouldCallAPI
      });

      // Call API only on first load or pull-to-refresh
      // Otherwise, rely on cache (which will be checked by apiClient)
      const result = await apiService.getInsights({
        limit: 20,
        cursor: initialLoad ? undefined : nextCursor || undefined,
        includeRead: true,
        forceRefresh: shouldCallAPI, // true on first load or pull-to-refresh only
      });

      logger.debug('[InsightsScreen] Insights loaded:', {
        count: result.insights.length,
        total: result.pagination.total,
        hasMore: result.pagination.hasMore
      });

      if (initialLoad) {
        setInsights(result.insights);
      } else {
        // Deduplicate by ID when appending paginated results
        setInsights((prev) => {
          const existingIds = new Set(prev.map(insight => insight.id));
          const newInsights = result.insights.filter(insight => !existingIds.has(insight.id));
          return [...prev, ...newInsights];
        });
      }

      setHasMore(result.pagination.hasMore);
      setNextCursor(result.pagination.nextCursor);
      setTotal(result.pagination.total);

      // Track usage for free tier
      if (!isPremium && initialLoad) {
        trackUsage('advancedInsights');
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /**
   * Handles pull-to-refresh
   */
  const onRefresh = (): void => {
    logger.debug('[InsightsScreen] Pull to refresh triggered');
    setRefreshing(true);
    setNextCursor(null);
    // Pass true for forceRefresh explicitly since refreshing state hasn't updated yet
    loadInsights(true, true);
  };

  /**
   * Load more insights (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor) {
      loadInsights(false);
    }
  }, [loadingMore, hasMore, nextCursor]);

  // Update grouped insights when insights change
  useEffect(() => {
    const grouped = groupInsightsByDate(insights);
    setGroupedInsights(grouped);
  }, [insights]);

  /**
   * Render date header
   */
  const renderDateHeader = ({ item }: { item: GroupedInsights }) => (
    <View style={[styles.dateHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.dateHeaderText, { color: theme.textSecondary }]}>
        {item.dateLabel}
      </Text>
      <View style={[styles.dateHeaderLine, { backgroundColor: theme.border }]} />
    </View>
  );

  /**
   * Handle action button press on insight
   * Navigates to relevant screen based on action type
   */
  const handleActionPress = useCallback((insight: Insight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logger.debug('[InsightsScreen] Action pressed:', { 
      id: insight.id, 
      actionType: insight.actionType,
      targetEntity: insight.targetEntity 
    });

    // Navigate based on action type
    // Note: targetEntity contains category/entity NAME, not ID, so we use Trends for budget analysis
    switch (insight.actionType) {
      case 'set_budget':
      case 'reduce_spending':
      case 'review_merchant':
        // Navigate to Trends for spending analysis (targetEntity is a name, not an ID)
        navigation.navigate('Trends');
        break;
      case 'cancel_subscription':
        // Open AI assistant to discuss subscriptions
        navigation.navigate('AIAssistant', { 
          initialQuery: `Tell me about my subscriptions and which ones I might consider canceling` 
        });
        break;
      case 'automate_savings':
      case 'celebrate_win':
        // Open AI assistant for personalized advice
        navigation.navigate('AIAssistant', { 
          initialQuery: `Help me automate my savings based on my current spending patterns` 
        });
        break;
      default:
        // Default: open AI assistant with context about this insight
        navigation.navigate('AIAssistant', { 
          initialQuery: `Tell me more about: ${insight.title}` 
        });
    }
  }, [navigation]);

  /**
   * Render insight item
   */
  const renderInsight = ({ item }: { item: Insight }) => (
    <View style={styles.insightWrapper}>
      <InsightCard insight={item} onActionPress={handleActionPress} />
    </View>
  );

  /**
   * Render list item (date header + insights)
   */
  const renderSection = ({ item }: { item: GroupedInsights }) => (
    <View>
      {renderDateHeader({ item })}
      {item.insights.map((insight) => (
        <View key={insight.id} style={styles.insightWrapper}>
          <InsightCard insight={insight} onActionPress={handleActionPress} />
        </View>
      ))}
    </View>
  );

  /**
   * Render footer (loading indicator for pagination)
   */
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon name="lightbulb-on-outline" size={64} color={theme.textTertiary} />
        <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
          No insights available yet
        </Text>
        <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary }]}>
          Keep tracking your expenses to get personalized tips
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />
      
      {/* Premium Header with Gradient Accent */}
      <Animated.View style={{ opacity: fadeAnim, zIndex: 1 }}>
        <GradientHeader />
        <View style={[styles.header, { marginTop: insets.top }]}>
            <View style={styles.headerTop}>
          {Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.text }]}>Insights</Text>
            {/* Show total savings potential */}
            {insights.length > 0 && (() => {
              // Sum savings in USD, then convert to user's currency
              const totalSavingsUSD = insights.reduce((sum, i) => sum + (i.savingsAmount || 0), 0);
              const totalSavings = convertFromUSD(totalSavingsUSD);
              if (totalSavings > 0) {
                return (
                  <View style={styles.savingsSummary}>
                    <Icon name="piggy-bank" size={14} color="#10B981" />
                    <Text style={styles.savingsSummaryText}>
                      {currencySymbol}{totalSavings >= 1000 
                        ? `${(totalSavings / 1000).toFixed(1)}K` 
                        : Math.round(totalSavings)}/mo potential savings
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
            {!isPremium && total > 0 && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {getRemainingUsage('advancedInsights')} insights remaining this week
              </Text>
            )}
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
        </View>
      </Animated.View>

      {loading && insights.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={groupedInsights}
          renderItem={renderSection}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 200,
            offset: 200 * index,
            index,
          })}
        />
      )}

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Advanced Insights"
        message={
          !isPremium
            ? 'Valuable insights! You’ve viewed your weekly free tips. Upgrade to Premium for unlimited financial guidance.'
            : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: spacing.md,
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
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
  savingsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  savingsSummaryText: {
    ...typography.labelMedium,
    color: '#10B981',
    fontWeight: '600',
  },
  upgradeButton: {
    padding: spacing.xs,
    marginLeft: spacing.md,
  },
  content: {
    paddingBottom: spacing.xxxl + 20,
  },
  dateHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  dateHeaderText: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dateHeaderLine: {
    height: 1,
    width: '100%',
  },
  insightWrapper: {
    marginBottom: spacing.sm,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});

export default InsightsScreen;
