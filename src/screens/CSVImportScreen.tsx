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
  Alert,
  ActivityIndicator,
  Platform,
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
import { importWalletCSV, validateWalletCSV } from '../services/csvImportService';
import { typography, spacing, borderRadius, elevation } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    description: 'Import from Wallet CSV export',
    available: true,
  },
  {
    id: 'mint',
    name: 'Mint',
    icon: 'leaf',
    description: 'Import from Mint CSV export',
    available: false,
    comingSoon: true,
  },
  {
    id: 'ynab',
    name: 'YNAB (You Need A Budget)',
    icon: 'chart-line',
    description: 'Import from YNAB CSV export',
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
    description: 'Import from Personal Capital CSV',
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
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(
    IMPORT_SOURCES.find(s => s.available) || null
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
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
      Alert.alert('Coming Soon', 'This import source is not yet available. We\'re working on it!');
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
        Alert.alert('Error', 'Failed to read file');
        return;
      }

      // Read file content using new File API
      const fileObj = new File(file.uri);
      const fileContent = await fileObj.text();
      
      // Validate CSV format (Wallet-specific for now)
      if (selectedSource.id === 'wallet') {
        const validation = validateWalletCSV(fileContent);
        if (!validation.valid) {
          Alert.alert('Invalid CSV', validation.error || 'CSV file format is not supported');
          return;
        }
      }

      // Confirm import
      Alert.alert(
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
      Alert.alert('Error', `Failed to select file: ${error.message}`);
      console.error('File selection error:', error);
    }
  };

  const handleImport = async (csvContent: string) => {
    if (!selectedSource || selectedSource.id !== 'wallet') {
      Alert.alert('Error', 'Only Wallet by BudgetBakers import is currently supported');
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0, percentage: 0 });

    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await importWalletCSV(csvContent, (progress) => {
        setImportProgress(progress);
      });

      setImportResult(result);
      setImportProgress(null);

      // Mark import as shown if first time
      if (isFirstTime) {
        await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
      }

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Import Complete! 🎉',
        `Successfully imported ${result.imported} transactions.\n${result.skipped} transactions were skipped (duplicates or invalid).`,
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
      Alert.alert('Import Failed', error.message || 'Failed to import transactions');
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
              Want to import your existing transactions? We support multiple import sources.
            </Text>
          </View>
        )}

        {/* Import Sources */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SELECT SOURCE</Text>
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
                    if (Platform.OS === 'ios') {
                      Haptics.selectionAsync();
                    }
                  } else {
                    Alert.alert('Coming Soon', `${source.name} import is coming soon!`);
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
        {selectedSource && selectedSource.available && selectedSource.id === 'wallet' && (
          <>
            {/* How to Export */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>HOW TO EXPORT</Text>
              <View style={styles.stepsList}>
                {[
                  { step: '1', text: 'Open Wallet by BudgetBakers app' },
                  { step: '2', text: 'Go to Settings → Export' },
                  { step: '3', text: 'Select CSV format' },
                  { step: '4', text: 'Export your transactions' },
                  { step: '5', text: 'Select the file here to import' },
                ].map((item, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.stepNumberText, { color: theme.primary }]}>{item.step}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Supported Features */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>WHAT GETS IMPORTED</Text>
              <View style={styles.featuresList}>
                {[
                  { icon: 'cash-multiple', text: 'Income and Expense transactions' },
                  { icon: 'calendar', text: 'Transaction dates' },
                  { icon: 'tag', text: 'Categories (mapped automatically)' },
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
          </>
        )}

        {/* Progress Indicator */}
        {importing && importProgress && (
          <View style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
            <View style={styles.progressHeader}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.progressTitle, { color: theme.text }]}>Importing...</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${importProgress.percentage}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {importProgress.current} of {importProgress.total} transactions ({importProgress.percentage}%)
            </Text>
          </View>
        )}

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
});

export default CSVImportScreen;
