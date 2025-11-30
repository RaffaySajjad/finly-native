/**
 * PrivacySettingsScreen Component
 * Purpose: Privacy settings and data management
 * Includes data export, deletion, and privacy policy
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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useAppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import dataExportService from '../services/dataExportService';
import { typography, spacing, borderRadius, elevation } from '../theme';
import {
  isBiometricAvailable,
  authenticateForAccountDeletion,
  getBiometricName,
} from '../services/biometricService';
import * as Haptics from 'expo-haptics';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PrivacySettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const jsonData = await dataExportService.exportDataAsJSON();
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Share.share({
          message: jsonData,
          title: 'Finly Data Export',
        });
      } else {
        Alert.alert('Data Exported', 'Your data has been exported successfully');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csvData = await dataExportService.exportExpensesAsCSV();
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Share.share({
          message: csvData,
          title: 'Finly Expenses Export',
        });
      } else {
        Alert.alert('Data Exported', 'Your expenses have been exported as CSV');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
  // Show confirmation alert first
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete all your data? This action cannot be undone. You will be logged out.',
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
              // Check if biometric authentication is available
              const biometricAvailable = await isBiometricAvailable();

              if (biometricAvailable) {
                // Trigger biometric authentication as final step
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }

                const biometricName = await getBiometricName();
                const authenticated = await authenticateForAccountDeletion();

                if (!authenticated) {
                  // Biometric authentication failed or was cancelled
                  Alert.alert(
                    'Authentication Failed',
                    `${biometricName} authentication is required to delete all data.`
                  );
                  return;
                }
              }

            // Proceed with deletion after successful authentication
              setIsDeleting(true);
              try {
                await dataExportService.deleteAllData();
                Alert.alert(
                  'Data Deleted',
                  'All your data has been deleted. You will be logged out.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Dispatch logout action - AppNavigator will handle navigation to Auth stack
                        dispatch(logout());
                      },
                    },
                  ]
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to delete data. Please try again.');
                console.error(error);
              } finally {
                setIsDeleting(false);
              }
            } catch (error) {
              console.error('Biometric check error:', error);
              Alert.alert('Error', 'Authentication check failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  const SettingItem: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    variant?: 'default' | 'danger';
    loading?: boolean;
  }> = ({ icon, title, subtitle, onPress, variant = 'default', loading = false }) => {
    const isDanger = variant === 'danger';
    const iconColor = isDanger ? theme.expense : theme.primary;
    const textColor = isDanger ? theme.expense : theme.text;

    return (
      <TouchableOpacity
        style={[
          styles.settingItem,
          { backgroundColor: theme.card, borderColor: theme.border },
          elevation.sm,
        ]}
        onPress={onPress}
        disabled={loading}
      >
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
          <Icon name={icon as any} size={24} color={iconColor} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: textColor }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {loading ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          <Icon name="chevron-right" size={24} color={theme.textTertiary} />
        )}
      </TouchableOpacity>
    );
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Privacy Badge */}
        <View style={[styles.privacyBadge, { backgroundColor: theme.success + '20', borderColor: theme.success }]}>
          <Icon name="shield-check" size={32} color={theme.success} />
          <Text style={[styles.privacyBadgeTitle, { color: theme.text }]}>
            Your Data is Private
          </Text>
          <Text style={[styles.privacyBadgeText, { color: theme.textSecondary }]}>
            Your data is securely stored and private. We never share your financial information with third parties.
          </Text>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EXPORT DATA</Text>
          {/* <SettingItem
            icon="file-export"
            title="Export as JSON"
            subtitle="Download all your data in JSON format"
            onPress={handleExportJSON}
            loading={isExporting}
          />
          <SettingItem
            icon="file-excel"
            title="Export as CSV"
            subtitle="Download expenses in CSV format"
            onPress={handleExportCSV}
            loading={isExporting}
          /> */}

          <SettingItem
            icon="file-export"
            title="Export Transactions"
            subtitle="Export transactions to CSV file"
            onPress={() => navigation.navigate('ExportTransactions')}
          />
          <SettingItem
            icon="file-import"
            title="Import Transactions"
            subtitle="Import transactions from CSV files"
            onPress={() => navigation.navigate('CSVImport')}
          />
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA MANAGEMENT</Text>
          <SettingItem
            icon="delete-outline"
            title="Delete All Data"
            subtitle="Permanently delete all your expenses and settings"
            onPress={handleDeleteAllData}
            variant="danger"
            loading={isDeleting}
          />
        </View>

        {/* Privacy Policy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INFORMATION</Text>
          <SettingItem
            icon="file-document-outline"
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          {/* <SettingItem
            icon="information-outline"
            title="About Data Storage"
            subtitle="Learn how your data is stored"
            onPress={() => {
              Alert.alert(
                'Data Storage',
                'All your expenses, categories, and insights are stored locally on your device using encrypted storage. No data is sent to external servers unless you explicitly choose to export it.'
              );
            }}
          /> */}
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
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
  },
  privacyBadge: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  privacyBadgeTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  privacyBadgeText: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelSmall,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.titleMedium,
  },
  settingSubtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});

export default PrivacySettingsScreen;

