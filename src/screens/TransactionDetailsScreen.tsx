/**
 * TransactionDetailsScreen - Premium Transaction Detail View
 * Purpose: Display detailed information about a transaction with premium design
 * Features: Gradient backgrounds, glassmorphism, haptic feedback, smooth animations
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { apiService } from '../services/api';
import tagsService from '../services/tagsService';
import { PaymentMethod, Tag, UnifiedTransaction, Expense, IncomeTransaction } from '../types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { springPresets } from '../theme/AnimationConfig';
import { RootStackParamList } from '../navigation/types';
import { useAlert } from '../hooks/useAlert';
import { GlowButton, AnimatedCard } from '../components/PremiumComponents';
import { GradientHeader } from '../components/GradientHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TransactionDetailsRouteProp = RouteProp<RootStackParamList, 'TransactionDetails'>;
type TransactionDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'TransactionDetails'>;

/**
 * Generate a human-readable short ID from UUID
 * Format: TXN-XXXX (using first 4 chars of UUID)
 */
const generateShortId = (uuid: string): string => {
  const cleanUuid = uuid.replace(/-/g, '').toUpperCase();
  return `TXN-${cleanUuid.substring(0, 4)}`;
};

/**
 * TransactionDetailsScreen - Full transaction details modal with premium design
 */
const TransactionDetailsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { formatCurrency, formatTransactionAmount } = useCurrency();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const navigation = useNavigation<TransactionDetailsNavigationProp>();
  const route = useRoute<TransactionDetailsRouteProp>();
  const insets = useSafeAreaInsets();
  const { showError, showInfo, showSuccess, AlertComponent } = useAlert();
  const { openBottomSheet } = useBottomSheetActions();

  const { transaction } = route.params;
  const [tags, setTags] = useState<Tag[]>([]);
  const [showFullId, setShowFullId] = useState(false);
  const isExpense = transaction.type === 'expense';

  // Load tags if transaction has tags (expenses only)
  useEffect(() => {
    const loadTags = async () => {
      if (isExpense && transaction.tags && transaction.tags.length > 0) {
        try {
          const allTags = await tagsService.getTags();
          const tagIds = transaction.tags!.map(t => typeof t === 'string' ? t : t.id);
          const expenseTags = allTags.filter(t => tagIds.includes(t.id));
          setTags(expenseTags);
        } catch (error) {
          console.error('Error loading tags:', error);
        }
      }
    };
    loadTags();
  }, [transaction.tags, isExpense]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getPaymentMethodName = (method?: PaymentMethod): string => {
    if (!method) return 'Not specified';
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPaymentMethodIcon = (method?: PaymentMethod): string => {
    const icons: Record<PaymentMethod, string> = {
      CREDIT_CARD: 'credit-card',
      DEBIT_CARD: 'card',
      CASH: 'cash',
      CHECK: 'receipt',
      BANK_TRANSFER: 'bank-transfer',
      DIGITAL_WALLET: 'wallet',
      OTHER: 'dots-horizontal',
    };
    return method ? icons[method] : 'credit-card-outline';
  };

  const getCategoryIcon = (category?: { id: string; name: string; icon: string }): string => {
    return category?.icon || 'cash';
  };

  const getCategoryName = (category?: { id: string; name: string }): string => {
    return category?.name || 'Other';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCopyId = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(transaction.id);
    showSuccess('Copied!', 'Transaction ID copied to clipboard');
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isExpense) {
      const expense: Expense = {
        id: transaction.id,
        amount: transaction.amount,
        categoryId: transaction.category!.id,
        category: transaction.category!,
        description: transaction.description,
        date: transaction.date,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        tags: transaction.tags,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt || transaction.createdAt,
        originalAmount: transaction.originalAmount,
        originalCurrency: transaction.originalCurrency,
      };
      navigation.goBack();
      setTimeout(() => openBottomSheet(expense), 300);
    } else {
      const income: IncomeTransaction = {
        id: transaction.id,
        userId: '',
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        incomeSourceId: transaction.incomeSource?.id,
        autoAdded: transaction.autoAdded || false,
        createdAt: transaction.createdAt,
        originalAmount: transaction.originalAmount,
        originalCurrency: transaction.originalCurrency,
      };
      navigation.goBack();
      setTimeout(() => openBottomSheet(undefined, income), 300);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const deleteTransaction = async () => {
      try {
        if (isExpense) {
          await apiService.deleteExpense(transaction.id);
        } else {
          await apiService.deleteIncomeTransaction(transaction.id);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } catch (error) {
        showError('Error', 'Failed to delete transaction');
      }
    };

    showInfo(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteTransaction,
        },
      ]
    );
  };

  const category = isExpense ? transaction.category : undefined;
  const categoryColor = category?.color || (isExpense ? theme.primary : theme.income);
  const categoryName = isExpense ? getCategoryName(category) : 'Income';
  const categoryIcon = isExpense ? getCategoryIcon(category) : 'cash-plus';

  // Build informative AI query with full transaction context
  const buildAIQuery = (): string => {
    const amount = formatCurrency(transaction.amount);
    const date = new Date(transaction.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    
    if (isExpense) {
      const categoryStr = transaction.category?.name || 'Uncategorized';
      const paymentStr = transaction.paymentMethod 
        ? ` paid via ${getPaymentMethodName(transaction.paymentMethod)}`
        : '';
      return `Analyze my ${categoryStr} expense: "${transaction.description}" for ${amount} on ${date}${paymentStr}. What insights can you share?`;
    } else {
      const sourceStr = transaction.incomeSource?.name || 'Income';
      return `Analyze my ${sourceStr}: "${transaction.description}" for ${amount} on ${date}. What insights can you share?`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />

      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.card }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Icon name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Details</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          }}
        >
          {/* Main Card with Gradient Background */}
          <View style={[styles.mainCard, { backgroundColor: theme.card, borderColor: categoryColor + '20' }, elevation.lg]}>
            {/* Gradient Accent */}
            <LinearGradient
              colors={[categoryColor + '15', 'transparent']}
              style={styles.cardGradient}
            />

            {/* Category Icon with Gradient */}
            <LinearGradient
              colors={[categoryColor + '30', categoryColor + '15']}
              style={styles.iconContainer}
            >
              <Icon name={categoryIcon as any} size={56} color={categoryColor} />
            </LinearGradient>

            {/* Amount */}
            <Text
              style={[
                styles.amount,
                { color: isExpense ? theme.expense : theme.income },
              ]}
            >
              {isExpense ? '-' : '+'}{formatTransactionAmount(transaction.amount, transaction.originalAmount, transaction.originalCurrency)}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: theme.text }]}>
              {transaction.description}
            </Text>

            {/* Date & Time Badge */}
            <View style={[styles.dateBadge, { backgroundColor: theme.background }]}>
              <Icon name="calendar-clock" size={14} color={theme.textSecondary} />
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {formatDate(transaction.date)} • {formatTime(transaction.createdAt)}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View style={[styles.detailsCard, { backgroundColor: theme.card }, elevation.md]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Transaction Information</Text>

            <View style={styles.detailsGrid}>
              {/* Category/Income Source */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Icon name={isExpense ? 'shape' : 'cash-multiple'} size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    {isExpense ? 'Category' : 'Source'}
                  </Text>
                </View>
                <View style={styles.detailValueRow}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {isExpense ? categoryName : (transaction.incomeSource?.name || 'Manual Income')}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Type */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Icon name="swap-vertical" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Type</Text>
                </View>
                <View style={styles.detailValueRow}>
                  <Icon
                    name={isExpense ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={18}
                    color={isExpense ? theme.expense : theme.income}
                  />
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {isExpense ? 'Expense' : 'Income'}
                  </Text>
                </View>
              </View>

              {/* Payment Method (expenses only) */}
              {isExpense && transaction.paymentMethod && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Icon name="credit-card-outline" size={18} color={theme.textSecondary} />
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Payment</Text>
                    </View>
                    <View style={styles.detailValueRow}>
                      <Icon
                        name={getPaymentMethodIcon(transaction.paymentMethod) as any}
                        size={18}
                        color={theme.textSecondary}
                      />
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {getPaymentMethodName(transaction.paymentMethod)}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Auto Added (income only) */}
              {!isExpense && transaction.autoAdded !== undefined && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Icon name="source-branch" size={18} color={theme.textSecondary} />
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Entry Type</Text>
                    </View>
                    <View style={styles.detailValueRow}>
                      <Icon
                        name={transaction.autoAdded ? 'auto-fix' : 'hand-pointing-right'}
                        size={18}
                        color={theme.textSecondary}
                      />
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {transaction.autoAdded ? 'Auto Added' : 'Manual'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Tags Section */}
          {tags.length > 0 && (
            <View style={[styles.tagsCard, { backgroundColor: theme.card }, elevation.md]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tags</Text>
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <LinearGradient
                    key={tag.id}
                    colors={[tag.color + '25', tag.color + '15']}
                    style={[styles.tagChip, { borderColor: tag.color + '40' }]}
                  >
                    <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                    <Text style={[styles.tagChipText, { color: tag.color }]}>{tag.name}</Text>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* Notes Section */}
          {transaction.notes && (
            <View style={[styles.notesCard, { backgroundColor: theme.card }, elevation.md]}>
              <View style={styles.notesHeader}>
                <Icon name="note-text-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
              </View>
              <Text style={[styles.notesText, { color: theme.textSecondary }]}>
                {transaction.notes}
              </Text>
            </View>
          )}

          {/* Transaction ID Section */}
          <View style={[styles.idCard, { backgroundColor: theme.card }, elevation.sm]}>
            <View style={styles.idHeader}>
              <View style={styles.idLabelContainer}>
                <Icon name="identifier" size={18} color={theme.textSecondary} />
                <Text style={[styles.idLabel, { color: theme.textSecondary }]}>Transaction ID</Text>
              </View>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: theme.primary + '15' }]}
                onPress={handleCopyId}
                activeOpacity={0.7}
              >
                <Icon name="content-copy" size={16} color={theme.primary} />
                <Text style={[styles.copyButtonText, { color: theme.primary }]}>Copy</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowFullId(!showFullId);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.idBadge, { backgroundColor: theme.background }]}>
                <Text style={[styles.shortId, { color: theme.primary }]}>
                  {generateShortId(transaction.id)}
                </Text>
                <Icon
                  name={showFullId ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {showFullId && (
              <Text style={[styles.fullId, { color: theme.textTertiary }]}>
                {transaction.id}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <GlowButton
              variant="secondary"
              glowIntensity={shouldUseGlowEffects ? 'subtle' : undefined}
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('AIAssistant', {
                  context: {
                    transactionId: transaction.id,
                    transactionType: transaction.type,
                    amount: transaction.amount,
                    description: transaction.description,
                    category: transaction.category?.name,
                    date: transaction.date,
                  },
                  initialQuery: buildAIQuery(),
                });
              }}
            >
              <View style={styles.buttonContent}>
                <Icon name="robot" size={20} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.primary }]}>Ask AI</Text>
              </View>
            </GlowButton>

            <GlowButton
              variant="primary"
              glowIntensity={shouldUseGlowEffects ? 'medium' : 'subtle'}
              style={styles.actionButton}
              onPress={handleEdit}
            >
              <View style={styles.buttonContent}>
                <Icon name="pencil" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Edit</Text>
              </View>
            </GlowButton>

            <GlowButton
              variant="danger"
              glowIntensity={shouldUseGlowEffects ? 'medium' : 'subtle'}
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <View style={styles.buttonContent}>
                <Icon name="delete-outline" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Delete</Text>
              </View>
            </GlowButton>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Alert Dialog */}
      {AlertComponent}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  headerTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.sm
  },
  mainCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amount: {
    ...typography.displaySmall,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.titleLarge,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  dateText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
  detailsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  detailsGrid: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  tagsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagChipText: {
    ...typography.labelMedium,
    fontWeight: '700',
  },
  notesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notesText: {
    ...typography.bodyMedium,
    lineHeight: 22,
  },
  idCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  idHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  idLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  idLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  copyButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  shortId: {
    ...typography.titleMedium,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fullId: {
    ...typography.labelSmall,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});

export default TransactionDetailsScreen;

