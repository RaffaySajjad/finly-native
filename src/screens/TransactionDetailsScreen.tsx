/**
 * TransactionDetailsScreen - Transaction Detail View
 * Purpose: Display detailed information about a transaction with edit/delete options
 * Features: Elegant card display, haptic feedback, smooth animations
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { RootStackParamList } from '../navigation/types';

type TransactionDetailsRouteProp = RouteProp<RootStackParamList, 'TransactionDetails'>;
type TransactionDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'TransactionDetails'>;

/**
 * TransactionDetailsScreen - Full transaction details modal
 */
const TransactionDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<TransactionDetailsNavigationProp>();
  const route = useRoute<TransactionDetailsRouteProp>();

  const { expense } = route.params;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      food: 'food',
      transport: 'car',
      shopping: 'shopping',
      entertainment: 'movie',
      health: 'heart-pulse',
      utilities: 'lightning-bolt',
      other: 'dots-horizontal',
    };
    return icons[category] || 'cash';
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

  const handleEdit = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate('AddExpense', { expense });
  };

  const handleDelete = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
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
          onPress: async () => {
            try {
              await apiService.deleteExpense(expense.id);
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const categoryColor = theme.categories[expense.category as keyof typeof theme.categories] || theme.primary;
  const isExpense = expense.type === 'expense';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            elevation.lg,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Category Icon */}
          <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
            <Icon name={getCategoryIcon(expense.category) as any} size={64} color={categoryColor} />
          </View>

          {/* Amount */}
          <Text
            style={[
              styles.amount,
              { color: isExpense ? theme.expense : theme.income },
            ]}
          >
            {isExpense ? '-' : '+'}${expense.amount.toFixed(2)}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.text }]}>
            {expense.description}
          </Text>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Category */}
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Category</Text>
              <View style={styles.detailValueRow}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                </Text>
              </View>
            </View>

            {/* Type */}
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Type</Text>
              <View style={styles.detailValueRow}>
                <Icon
                  name={isExpense ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={isExpense ? theme.expense : theme.income}
                />
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {expense.type.charAt(0).toUpperCase() + expense.type.slice(1)}
                </Text>
              </View>
            </View>

            {/* Date */}
            <View style={[styles.detailItem, styles.detailItemFull]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(expense.date)}
              </Text>
            </View>

            {/* ID */}
            <View style={[styles.detailItem, styles.detailItemFull]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Transaction ID</Text>
              <Text style={[styles.detailValue, { color: theme.textTertiary, fontFamily: 'monospace' }]}>
                {expense.id}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.editButton,
                { backgroundColor: theme.primary + '20', borderColor: theme.primary },
              ]}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Icon name="pencil" size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.deleteButton,
                { backgroundColor: theme.expense + '20', borderColor: theme.expense },
              ]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Icon name="delete-outline" size={20} color={theme.expense} />
              <Text style={[styles.actionButtonText, { color: theme.expense }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amount: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.titleMedium,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  detailsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  detailItem: {
    width: '47%',
  },
  detailItemFull: {
    width: '100%',
  },
  detailLabel: {
    ...typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  editButton: {},
  deleteButton: {},
  actionButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
});

export default TransactionDetailsScreen;

