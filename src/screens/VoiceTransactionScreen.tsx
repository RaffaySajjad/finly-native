/**
 * VoiceTransactionScreen Component
 * Purpose: Voice and text input for AI-powered multi-transaction entry
 * Premium feature - allows users to speak or type multiple transactions at once
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt, PremiumBadge } from '../components';
import { parseTransactionInput, validateTransactions } from '../services/aiTransactionService';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Expense } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const VoiceTransactionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<
    Array<Omit<Expense, 'id' | 'date'>>
  >([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleProcessInput = async () => {
    if (!input.trim()) {
      Alert.alert('Empty Input', 'Please enter or speak transactions');
      return;
    }

    if (requiresUpgrade('voiceEntry')) {
      setShowUpgradePrompt(true);
      return;
    }

    setIsProcessing(true);

    try {
      const transactions = await parseTransactionInput(input);
      const validation = validateTransactions(transactions);

      if (!validation.valid) {
        Alert.alert('Parsing Error', validation.errors.join('\n'));
        setIsProcessing(false);
        return;
      }

      setParsedTransactions(transactions);
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to parse transactions. Please try again.');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransactions = async () => {
    if (parsedTransactions.length === 0) return;

    setIsProcessing(true);

    try {
      const now = new Date();
      const promises = parsedTransactions.map(tx =>
        apiService.createExpense({
          ...tx,
          date: now.toISOString(),
        })
      );

      await Promise.all(promises);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Success!',
        `Added ${parsedTransactions.length} transaction${parsedTransactions.length > 1 ? 's' : ''} successfully! 🎉`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save transactions');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setParsedTransactions([]);
    inputRef.current?.focus();
  };

  const categoryIcons: Record<string, string> = {
    food: 'food',
    transport: 'car',
    shopping: 'shopping',
    entertainment: 'movie',
    health: 'heart-pulse',
    utilities: 'lightning-bolt',
    other: 'dots-horizontal',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            AI Transaction Entry
          </Text>
          {!isPremium && <PremiumBadge size="small" />}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Icon name="lightbulb-on" size={24} color={theme.primary} />
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              Speak or Type Multiple Transactions
            </Text>
            <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
              Examples:{'\n'}
              • "Lunch at Cafe Luna $42.50, Uber $15, Groceries $89.99"{'\n'}
              • "Coffee $5.50, Gas $30, Target $67.50"{'\n'}
              • "Starbucks $8.75 and Amazon $45.99"
            </Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Transactions
          </Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              elevation.sm,
            ]}
            placeholder="Type or speak multiple transactions..."
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoCapitalize="sentences"
            editable={!isProcessing}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleClear}
              disabled={isProcessing || !input.trim()}
            >
              <Icon name="close" size={20} color={theme.textSecondary} />
              <Text style={[styles.clearButtonText, { color: theme.textSecondary }]}>
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.processButton, { backgroundColor: theme.primary }, elevation.md]}
              onPress={handleProcessInput}
              disabled={isProcessing || !input.trim()}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="robot" size={20} color="#FFFFFF" />
                  <Text style={styles.processButtonText}>Process</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Parsed Transactions Preview */}
        {parsedTransactions.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>
              Preview ({parsedTransactions.length} transaction{parsedTransactions.length > 1 ? 's' : ''})
            </Text>

            {parsedTransactions.map((tx, index) => (
              <View
                key={index}
                style={[
                  styles.transactionCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  elevation.sm,
                ]}
              >
                <View style={[styles.transactionIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Icon
                    name={categoryIcons[tx.category] as any}
                    size={24}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionDescription, { color: theme.text }]}>
                    {tx.description}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Text style={[styles.transactionCategory, { color: theme.textSecondary }]}>
                      {tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.transactionAmount, { color: theme.expense }]}>
                  -{formatCurrency(tx.amount)}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: theme.success }, elevation.md]}
              onPress={handleConfirmTransactions}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    Confirm & Add {parsedTransactions.length} Transaction{parsedTransactions.length > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Voice & AI Transaction Entry"
        message="This premium feature allows you to add multiple transactions at once using natural language. Speak or type multiple expenses and let AI parse them automatically."
      />
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  instructionsCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  instructionsText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  clearButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  processButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  processButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewSection: {
    marginTop: spacing.md,
  },
  previewTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionCategory: {
    ...typography.bodySmall,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transactionType: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  transactionAmount: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  confirmButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default VoiceTransactionScreen;

