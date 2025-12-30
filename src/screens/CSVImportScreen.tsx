/**
 * CSVImportScreen component
 * Purpose: Allow users to import transactions from CSV files
 * Features: Multiple import sources, file picker, CSV parsing, progress tracking, duplicate detection
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { startCSVImport, pollImportStatus, validateWalletCSV, ImportJobStatus } from '../services/csvImportService';
import { typography, spacing, borderRadius, elevation } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../hooks/useAlert';
import { GradientHeader } from '../components/GradientHeader';

type CSVImportNavigationProp = StackNavigationProp<RootStackParamList>;

const IMPORT_SHOWN_KEY = '@finly_import_shown';

interface ImportSource {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: 'wallet',
    name: 'Wallet by BudgetBakers',
    icon: 'wallet',
    description: 'Import transactions from Wallet CSV export',
    available: true
  },
  {
    id: 'mint',
    name: 'Mint',
    icon: 'leaf',
    description: 'Import transactions from Mint CSV export',
    available: false,
    comingSoon: true,
  },
  {
    id: 'ynab',
    name: 'YNAB',
    icon: 'chart-line',
    description: 'Import transactions from YNAB CSV export',
    available: false,
    comingSoon: true,
  },
  {
    id: 'excel',
    name: 'Excel / Google Sheets',
    icon: 'file-excel',
    description: 'Import from custom CSV format',
    available: false,
    comingSoon: true,
  },
  {
    id: 'personal_capital',
    name: 'Personal Capital',
    icon: 'chart-pie',
    description: 'Import transactions from Personal Capital CSV',
    available: false,
    comingSoon: true,
  },
];

/**
 * CSVImportScreen - Import transactions from CSV files
 */
const CSVImportScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<CSVImportNavigationProp>();
  const route = useRoute();
  const { showError, showSuccess, showInfo, showWarning, AlertComponent } = useAlert();

  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(
    IMPORT_SOURCES.find(s => s.available) || null
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    stage?: string;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Check if this is the first-time import modal
  const isFirstTime = route.params && (route.params as any).firstTime === true;

  const handleSelectFile = async () => {
    if (!selectedSource || !selectedSource.available) {
      showInfo('Coming Soon', 'This import source is not yet available. We\'re working on it!');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file.uri) {
        showError('Error', 'Failed to read file. Please try again.');
        return;
      }

      // Read file content using new File API
      const fileObj = new File(file.uri);
      const fileContent = await fileObj.text();
      
      // Validate CSV format based on selected source
      if (selectedSource.id === 'wallet') {
        const validation = validateWalletCSV(fileContent);
        if (!validation.valid) {
          showError('Invalid CSV Format', validation.error || 'The CSV file format is not recognized. Please ensure you\'re using the correct export format for this source.');
          return;
        }
      }
      // For other sources, basic validation (file is not empty)
      else if (fileContent.trim().length === 0) {
        showError('Invalid CSV File', 'The selected file appears to be empty. Please ensure you\'ve exported your transactions correctly.');
        return;
      }

      // Confirm import
      showInfo(
        'Import Transactions',
        `This will import transactions from ${selectedSource.name}. Duplicate transactions will be automatically skipped. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            style: 'default',
            onPress: () => handleImport(fileContent),
          },
        ]
      );
    } catch (error: any) {
      showError('Error', `Failed to select file: ${error.message || 'An unexpected error occurred'}`);
      console.error('File selection error:', error);
    }
  };

  const handleImport = async (csvContent: string) => {
    if (!selectedSource || !selectedSource.available) {
      showError('Unavailable Source', 'This import source is not yet available. Please select an available source.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0, percentage: 0, stage: 'starting' });

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start async import job
      const { jobId } = await startCSVImport(csvContent);

      // Poll for job status until completion
      const result = await pollImportStatus(
        jobId,
        (status: ImportJobStatus) => {
          // Update progress from job status
          const progress = status.progress || { current: 0, total: 0, percentage: 0 };
          setImportProgress({
            current: progress.current || 0,
            total: progress.total || 0,
            percentage: progress.percentage || 0,
            stage: progress.stage || 'processing',
          });
        },
        2000 // Poll every 2 seconds to avoid rate limiting
      );

      setImportResult(result);
      setImportProgress(null);

      // Mark import as shown if first time
      if (isFirstTime) {
        await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const skippedMessage = result.skipped > 0
        ? `\n${result.skipped} transaction${result.skipped === 1 ? '' : 's'} ${result.skipped === 1 ? 'was' : 'were'} skipped (duplicates or invalid entries).`
        : '';

      showSuccess(
        'Import Complete',
        `Successfully imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}.${skippedMessage}`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (isFirstTime) {
                // Navigate to main app after first-time import
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      showError('Import Failed', error.message || 'Failed to import transactions. Please check your file format and try again.');
      console.error('Import error:', error);
      setImportProgress(null);
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = async () => {
    if (isFirstTime) {
      await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <GradientHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={async () => {
              if (isFirstTime) {
                // If first time and no previous screen, navigate to MainTabs
                await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              } else {
                // Check if we can go back
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // If can't go back, navigate to MainTabs
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  });
                }
              }
            }}
          >
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Import Transactions</Text>
          {isFirstTime && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* First Time Message */}
        {isFirstTime && (
          <View style={[styles.firstTimeCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
            <Icon name="information-outline" size={24} color={theme.primary} />
            <Text style={[styles.firstTimeText, { color: theme.text }]}>
              Import your existing transactions from popular finance apps. Select your source below to get started.
            </Text>
          </View>
        )}

        {/* Import Sources */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SELECT IMPORT SOURCE</Text>
          <View style={styles.sourcesList}>
            {IMPORT_SOURCES.map((source) => (
              <TouchableOpacity
                key={source.id}
                style={[
                  styles.sourceCard,
                  {
                    backgroundColor: selectedSource?.id === source.id ? theme.primary + '20' : theme.card,
                    borderColor: selectedSource?.id === source.id ? theme.primary : theme.border,
                    opacity: source.available ? 1 : 0.6,
                  },
                  elevation.sm,
                ]}
                onPress={() => {
                  if (source.available) {
                    setSelectedSource(source);
                    Haptics.selectionAsync();
                  } else {
                    showInfo('Coming Soon', `${source.name} import support is coming soon!`);
                  }
                }}
                disabled={!source.available}
              >
                <View style={styles.sourceHeader}>
                  <View style={[styles.sourceIcon, { backgroundColor: source.available ? theme.primary + '20' : theme.border }]}>
                    <Icon
                      name={source.icon as any}
                      size={24}
                      color={source.available ? theme.primary : theme.textTertiary}
                    />
                  </View>
                  <View style={styles.sourceInfo}>
                    <View style={styles.sourceTitleRow}>
                      <Text style={[styles.sourceTitle, { color: theme.text }]}>{source.name}</Text>
                      {source.available && selectedSource?.id === source.id && (
                        <Icon name="check-circle" size={20} color={theme.primary} />
                      )}
                      {source.comingSoon && (
                        <View style={[styles.comingSoonBadge, { backgroundColor: theme.border }]}>
                          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>Soon</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sourceDescription, { color: theme.textSecondary }]}>
                      {source.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Source Instructions */}
        {selectedSource && selectedSource.available && (
          <>
            {/* General Export Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>GETTING YOUR CSV FILE</Text>
              <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
                <Icon name="information-outline" size={20} color={theme.primary} />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  Export your transactions from {selectedSource.name} using either the mobile app or web interface.
                  Look for an "Export" or "Download" option in your account settings or transactions section,
                  and select CSV format. Once exported, select the file here to import.
                </Text>
              </View>
            </View>

            {/* Supported Features */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>WHAT GETS IMPORTED</Text>
              <View style={styles.featuresList}>
                {[
                  { icon: 'cash-multiple', text: 'Income and expense transactions' },
                  { icon: 'calendar', text: 'Transaction dates' },
                  { icon: 'tag', text: 'Categories (automatically mapped)' },
                  { icon: 'credit-card', text: 'Payment methods' },
                  { icon: 'text', text: 'Notes and descriptions' },
                ].map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Icon name={feature.icon as any} size={20} color={theme.primary} />
                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.section}>
              <View style={[styles.disclaimerCard, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }, elevation.sm]}>
                <Icon name="alert-circle-outline" size={20} color={theme.warning} />
                <View style={styles.disclaimerContent}>
                  <Text style={[styles.disclaimerTitle, { color: theme.warning }]}>Important Disclaimer</Text>
                  <Text style={[styles.disclaimerText, { color: theme.text }]}>
                    • Duplicate transactions will be automatically detected and skipped{'\n'}
                    • Only transactions with valid dates, amounts, and required fields will be imported{'\n'}
                    • Category mapping is automatic but may require manual adjustment{'\n'}
                    • Please review imported transactions for accuracy{'\n'}
                    • We recommend backing up your data before importing
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Progress Modal - Full Screen Overlay */}
        <Modal
          visible={importing && importProgress !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.progressModalOverlay}>
            <View style={[styles.progressModal, { backgroundColor: theme.card }]}>
              <View style={styles.progressModalContent}>
                {/* Icon */}
                <View style={[styles.progressIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>

                {/* Title */}
                <Text style={[styles.progressModalTitle, { color: theme.text }]}>
                  Importing Transactions
                </Text>

                {/* Progress Bar */}
                <View style={styles.progressBarContainerModal}>
                  <View style={[styles.progressBarBackgroundModal, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.progressBarFillModal,
                        {
                          width: `${importProgress?.percentage || 0}%`,
                          backgroundColor: theme.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Progress Text */}
                <Text style={[styles.progressModalText, { color: theme.textSecondary }]}>
                  {importProgress?.current || 0} of {importProgress?.total || 0} transactions
                </Text>

                {/* Percentage */}
                <Text style={[styles.progressPercentage, { color: theme.primary }]}>
                  {importProgress?.percentage || 0}%
                </Text>

                {/* Status Message */}
                <Text style={[styles.progressStatus, { color: theme.textTertiary }]}>
                  Please wait while we import your transactions...
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Import Button */}
        {selectedSource && selectedSource.available && (
          <TouchableOpacity
            style={[
              styles.importButton,
              { backgroundColor: theme.primary },
              importing && styles.importButtonDisabled,
              elevation.md,
            ]}
            onPress={handleSelectFile}
            disabled={importing}
            activeOpacity={0.8}
          >
            {importing ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.importButtonText}>Importing...</Text>
              </>
            ) : (
              <>
                <Icon name="file-import" size={24} color="#FFFFFF" />
                <Text style={styles.importButtonText}>Select CSV File</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Import Result */}
        {importResult && (
          <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
            <View style={styles.resultHeader}>
              <Icon name="check-circle" size={24} color={theme.primary} />
              <Text style={[styles.resultTitle, { color: theme.text }]}>Import Summary</Text>
            </View>
            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: theme.primary }]}>{importResult.imported}</Text>
                <Text style={[styles.resultStatLabel, { color: theme.textSecondary }]}>Imported</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: theme.textSecondary }]}>{importResult.skipped}</Text>
                <Text style={[styles.resultStatLabel, { color: theme.textSecondary }]}>Skipped</Text>
              </View>
            </View>
            {importResult.errors.length > 0 && (
              <View style={styles.errorsContainer}>
                <Text style={[styles.errorsTitle, { color: theme.textSecondary }]}>Errors ({importResult.errors.length}):</Text>
                {importResult.errors.slice(0, 5).map((error, index) => (
                  <Text key={index} style={[styles.errorText, { color: theme.textTertiary }]}>
                    • {error}
                  </Text>
                ))}
                {importResult.errors.length > 5 && (
                  <Text style={[styles.errorText, { color: theme.textTertiary }]}>
                    ... and {importResult.errors.length - 5} more
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

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
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.headlineMedium,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  skipButton: {
    padding: spacing.xs,
  },
  skipButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  firstTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  firstTimeText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.labelSmall,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  sourcesList: {
    gap: spacing.md,
  },
  sourceCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sourceTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    flex: 1,
  },
  comingSoonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  comingSoonText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '600',
  },
  sourceDescription: {
    ...typography.bodySmall,
  },
  stepsList: {
    gap: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.labelMedium,
    fontWeight: '700',
  },
  stepText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  progressCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  resultStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatValue: {
    ...typography.headlineMedium,
    fontWeight: '700',
  },
  resultStatLabel: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  errorsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  errorsTitle: {
    ...typography.labelMedium,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...elevation.lg,
  },
  progressModalContent: {
    alignItems: 'center',
  },
  progressIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  progressModalTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  progressModalText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  progressPercentage: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  progressStatus: {
    ...typography.bodySmall,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  progressBarContainerModal: {
    width: '100%',
    marginBottom: spacing.md,
  },
  progressBarBackgroundModal: {
    height: 12,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  progressBarFillModal: {
    height: '100%',
    borderRadius: borderRadius.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    flex: 1,
    lineHeight: 22,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    ...typography.labelLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
});

export default CSVImportScreen;
