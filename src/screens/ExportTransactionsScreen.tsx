/**
 * ExportTransactionsScreen component
 * Purpose: Allow users to export transactions to CSV files with date range selection
 * Features: Date range selection, CSV export, file sharing
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/api';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useAlert } from '../hooks/useAlert';
import { UnifiedTransaction } from '../types';

type ExportTransactionsNavigationProp = StackNavigationProp<RootStackParamList>;

type DateRangeOption = {
  id: string;
  label: string;
  getDateRange: () => { startDate: Date; endDate: Date };
};

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  {
    id: 'last_month',
    label: 'Last Month',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      return { startDate, endDate };
    },
  },
  {
    id: 'last_quarter',
    label: 'Last Quarter',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      return { startDate, endDate };
    },
  },
  {
    id: 'half_year',
    label: 'Last 6 Months',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      return { startDate, endDate };
    },
  },
  {
    id: 'year',
    label: 'Last Year',
    getDateRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      return { startDate, endDate };
    },
  },
  // {
  //   id: 'all_time',
  //   label: 'All Time',
  //   getDateRange: () => {
  //     const endDate = new Date();
  //     const startDate = new Date(2020, 0, 1); // Start from 2020
  //     return { startDate, endDate };
  //   },
  // },
];

/**
 * ExportTransactionsScreen - Export transactions to CSV
 */
const ExportTransactionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ExportTransactionsNavigationProp>();
  const { showError, showSuccess, AlertComponent } = useAlert();
  
  const [selectedRange, setSelectedRange] = useState<string>('last_month');
  const [exporting, setExporting] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const convertToCSV = (transactions: UnifiedTransaction[]): string => {
    if (transactions.length === 0) {
      return 'Date,Type,Amount,Description,Category,Payment Method,Tags\n';
    }

    const headers = 'Date,Type,Amount,Description,Category,Payment Method,Tags\n';
    const rows = transactions.map((tx) => {
      const date = formatDate(new Date(tx.date));
      const type = tx.type === 'expense' ? 'Expense' : 'Income';
      const amount = tx.amount.toString();
      const description = (tx.description || '').replace(/,/g, ';').replace(/"/g, '""');
      const category = tx.category?.name || (tx.type === 'income' ? (tx.incomeSource?.name || 'Income') : 'Uncategorized');
      const paymentMethod = tx.paymentMethod || '';
      const tags = tx.tags?.map(t => typeof t === 'string' ? t : t.name).join(';') || '';
      
      return `"${date}","${type}","${amount}","${description}","${category}","${paymentMethod}","${tags}"`;
    });

    return headers + rows.join('\n');
  };

  const handleExport = async () => {
    const selectedOption = DATE_RANGE_OPTIONS.find(opt => opt.id === selectedRange);
    if (!selectedOption) {
      showError('Error', 'Please select a date range');
      return;
    }

    setExporting(true);

    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const { startDate, endDate } = selectedOption.getDateRange();
      
      // Fetch transactions for the selected date range
      const transactions = await apiService.getUnifiedTransactions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 10000, // Large limit to get all transactions
      });

      if (transactions.length === 0) {
        showError('No Transactions', 'No transactions found for the selected date range.');
        setExporting(false);
        return;
      }

      // Convert to CSV
      const csvContent = convertToCSV(transactions);

      // Create a file with the CSV content using legacy FileSystem API
      const fileName = `finly_transactions_${formatDate(startDate)}_to_${formatDate(endDate)}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Write CSV content to file (UTF-8 is the default encoding)
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        try {
          // Share the file - this will allow users to save to Files app
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Transactions',
            UTI: 'public.comma-separated-values-text', // iOS UTI for CSV
          });

          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          showSuccess(
            'Export Complete',
            `Successfully exported ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}. You can save it to your Files app from the share menu.`
          );
        } catch (shareError: any) {
          // User cancelled or sharing failed - don't show error, file is still created
          if (shareError.message && !shareError.message.includes('User cancelled')) {
            // Only show error if it's not a cancellation
            showError('Share Failed', 'File was created but sharing failed. Please try again.');
          }
          // If user cancelled, silently return - file is still available in cache
        }
      } else {
        // Fallback: if sharing is not available, show file location
        showSuccess(
          'Export Complete',
          `Successfully exported ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}. File saved to: ${fileUri}`
        );
      }
    } catch (error: any) {
      console.error('Export error:', error);
      showError('Export Failed', error.message || 'Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const selectedOption = DATE_RANGE_OPTIONS.find(opt => opt.id === selectedRange);
  const dateRange = selectedOption?.getDateRange();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Export Transactions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Icon name="information-outline" size={24} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            Export your transactions to a CSV file. Select a date range below to choose which transactions to export.
          </Text>
        </View>

        {/* Date Range Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SELECT DATE RANGE</Text>
          <View style={styles.rangeButtonsContainer}>
            {DATE_RANGE_OPTIONS.map((option) => {
              const isSelected = selectedRange === option.id;
              const range = option.getDateRange();
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.rangeButton,
                    {
                      backgroundColor: isSelected ? theme.primary + '20' : theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                    elevation.sm,
                  ]}
                  onPress={() => {
                    setSelectedRange(option.id);
                    if (Platform.OS === 'ios') {
                      Haptics.selectionAsync();
                    }
                  }}
                >
                  <View style={styles.rangeButtonContent}>
                    <View style={styles.rangeButtonHeader}>
                      <Text style={[styles.rangeButtonLabel, { color: theme.text }]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Icon name="check-circle" size={20} color={theme.primary} />
                      )}
                    </View>
                    <Text style={[styles.rangeButtonDates, { color: theme.textSecondary }]}>
                      {formatDateForDisplay(range.startDate)} - {formatDateForDisplay(range.endDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[
            styles.exportButton,
            { backgroundColor: theme.primary },
            exporting && styles.exportButtonDisabled,
            elevation.md,
          ]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Exporting...</Text>
            </>
          ) : (
            <>
              <Icon name="file-export" size={24} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Export to CSV</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={[styles.featuresCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
            <Text style={[styles.featuresTitle, { color: theme.text }]}>What Gets Exported</Text>
            <View style={styles.featuresList}>
              {[
                { icon: 'calendar', text: 'Transaction dates' },
                { icon: 'cash-multiple', text: 'Transaction types (Income/Expense)' },
                { icon: 'currency-usd', text: 'Amounts' },
                { icon: 'text', text: 'Descriptions and notes' },
                { icon: 'tag', text: 'Categories and tags' },
                { icon: 'credit-card', text: 'Payment methods' },
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Icon name={feature.icon as any} size={18} color={theme.primary} />
                  <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Alert Dialog */}
      {AlertComponent}
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
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headlineMedium,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    flex: 1,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.labelSmall,
    marginBottom: spacing.md,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rangeButtonsContainer: {
    gap: spacing.md,
  },
  rangeButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  rangeButtonContent: {
    flex: 1,
  },
  rangeButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rangeButtonLabel: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  rangeButtonDates: {
    ...typography.bodySmall,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  featuresCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  featuresTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodySmall,
    flex: 1,
  },
});

export default ExportTransactionsScreen;

