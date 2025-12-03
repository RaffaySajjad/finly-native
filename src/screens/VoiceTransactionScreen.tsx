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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt, PremiumBadge, DatePickerInput } from '../components';
import { parseTransactionInput } from '../services/aiTransactionService';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Expense } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const VoiceTransactionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol, currencyCode, convertToUSD } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();

  const [input, setInput] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<
    Array<{
      amount: number;
      description: string;
      categoryId: string;
      date?: string;
      selected: boolean; // For checkbox selection
    }>
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
    Keyboard.dismiss();

    try {
      // AI extracts numbers as-is, no currency conversion needed
      // Pass currency code for better context (amounts are in user's currency, not USD)
      const transactions = await parseTransactionInput(input, [], getCurrencySymbol(), currencyCode);
      if (transactions.length === 0) {
        Alert.alert('No Transactions Found', 'Could not identify any transactions. Please try again with clearer details.');
        setIsProcessing(false);
        return;
      }

      // Add new transactions to existing preview (append mode)
      setParsedTransactions(prev => [
        ...prev,
        ...transactions.map(tx => ({ ...tx, selected: true })) // New transactions are selected by default
      ]);

      // Clear input for next batch
      setInput('');
      
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
    const selectedTransactions = parsedTransactions.filter(tx => tx.selected);

    if (selectedTransactions.length === 0) {
      Alert.alert('No Selection', 'Please select at least one transaction to confirm.');
      return;
    }

    setIsProcessing(true);

    try {
      const promises = selectedTransactions.map(tx => {
        const originalAmount = tx.amount; // Amount in user's currency (e.g., PKR)
        // Convert amount from display currency to USD before sending
        // All amounts are stored in USD in the database
        const amountInUSD = convertToUSD(originalAmount);
        
        return apiService.addExpense({
          amount: amountInUSD, // Converted to USD for database storage
          description: tx.description,
          categoryId: tx.categoryId,
          date: transactionDate, // Use the selected date for all transactions
          originalAmount: originalAmount, // Store the original amount user entered in their currency
          originalCurrency: currencyCode, // Store user's currency
        });
      });

      await Promise.all(promises);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Success!',
        `Added ${selectedTransactions.length} transaction${selectedTransactions.length > 1 ? 's' : ''} successfully! 🎉`,
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
    inputRef.current?.focus();
  };

  const handleClearPreview = () => {
    setParsedTransactions([]);
  };

  const toggleTransactionSelection = (index: number) => {
    setParsedTransactions(prev =>
      prev.map((tx, i) => i === index ? { ...tx, selected: !tx.selected } : tx)
    );
  };

  const toggleSelectAll = () => {
    const allSelected = parsedTransactions.every(tx => tx.selected);
    setParsedTransactions(prev =>
      prev.map(tx => ({ ...tx, selected: !allSelected }))
    );
  };

  // Helper to get category name/icon (since we only have ID)
  // In a real app we might want to fetch categories or pass them in
  // For now we'll use a generic fallback or try to guess from ID if it matches our hardcoded list
  const getCategoryDisplay = (categoryId: string) => {
    // This is a simplification. Ideally we should look up the category from a context or prop
    return {
      icon: 'dots-horizontal',
      name: 'Transaction',
    };
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
          <Icon name="robot" size={24} color={theme.primary} />
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              AI-Powered Entry
            </Text>
            <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
              Speak or type naturally. Finly's AI understands multiple transactions at once.
            </Text>
            <View style={styles.examplesContainer}>
              <Text style={[styles.exampleText, { color: theme.textTertiary }]}>
                "Lunch $15, Uber $20, and Groceries $50"
              </Text>
            </View>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Your Transactions
            </Text>
            {input.length > 0 && (
              <TouchableOpacity onPress={handleClear} disabled={isProcessing}>
                <Text style={[styles.clearLink, { color: theme.primary }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              elevation.sm,
            ]}
            placeholder="Tap microphone on keyboard to speak, or type here..."
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoCapitalize="sentences"
            editable={!isProcessing}
          />

          {/* Process Button */}
          <TouchableOpacity
            style={[
              styles.processButton,
              { backgroundColor: theme.primary, opacity: (!input.trim() || isProcessing) ? 0.6 : 1 },
              elevation.md
            ]}
            onPress={handleProcessInput}
            disabled={isProcessing || !input.trim()}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="auto-fix" size={20} color="#FFFFFF" />
                <Text style={styles.processButtonText}>Process with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <View style={styles.dateSection}>
          <DatePickerInput
            date={transactionDate}
            onDateChange={setTransactionDate}
            label="DEFAULT DATE (IF NOT SPECIFIED)"
          />
        </View>

        {/* Parsed Transactions Preview */}
        {parsedTransactions.length > 0 && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewTitle, { color: theme.text }]}>
                Preview ({parsedTransactions.filter(tx => tx.selected).length}/{parsedTransactions.length})
              </Text>
              <View style={styles.previewActions}>
                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
                  <Text style={[styles.selectAllText, { color: theme.primary }]}>
                    {parsedTransactions.every(tx => tx.selected) ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClearPreview} style={styles.clearPreviewButton}>
                  <Icon name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {parsedTransactions.map((tx, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.transactionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: tx.selected ? theme.primary : theme.border,
                    borderWidth: tx.selected ? 2 : 1,
                    opacity: tx.selected ? 1 : 0.6,
                  },
                  elevation.sm,
                ]}
                onPress={() => toggleTransactionSelection(index)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: tx.selected ? theme.primary : 'transparent',
                      borderColor: tx.selected ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => toggleTransactionSelection(index)}
                >
                  {tx.selected && <Icon name="check" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
                <View style={[styles.transactionIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Icon
                    name="check-circle-outline"
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
                      Category ID: {tx.categoryId.substring(0, 8)}...
                    </Text>
                  </View>
                </View>
                <Text style={[styles.transactionAmount, { color: theme.expense }]}>
                  -{formatCurrency(tx.amount)}
                </Text>
              </TouchableOpacity>
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
                      Confirm All
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
    marginBottom: spacing.sm,
  },
  examplesContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  exampleText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  clearLink: {
    ...typography.labelSmall,
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
  processButton: {
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
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectAllText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  clearPreviewButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  previewTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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

