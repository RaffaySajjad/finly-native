/**
 * IncomeManagementScreen Component
 * Purpose: Manage income sources (salary, freelance, etc.)
 * Features: Add, edit, delete income sources with auto-scheduling
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import {
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
} from '../services/incomeService';
import { IncomeSource, IncomeFrequency } from '../types';
import { BottomSheetBackground } from '../components';
import { typography, spacing, borderRadius, elevation } from '../theme';

type IncomeManagementNavigationProp = StackNavigationProp<RootStackParamList>;

const FREQUENCY_OPTIONS: Array<{ value: IncomeFrequency; label: string; icon: string }> = [
  { value: 'weekly', label: 'Weekly', icon: 'calendar-week' },
  { value: 'biweekly', label: 'Bi-weekly', icon: 'calendar-range' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-month' },
  { value: 'custom', label: 'Custom Dates', icon: 'calendar-edit' },
  { value: 'manual', label: 'Manual Only', icon: 'hand-pointing-right' },
];

const IncomeManagementScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const navigation = useNavigation<IncomeManagementNavigationProp>();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<IncomeFrequency>('monthly');
  const [autoAdd, setAutoAdd] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>(undefined);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(undefined);
  const [customDates, setCustomDates] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const customDatesInputRef = useRef<TextInput>(null);
  const [customDatesInput, setCustomDatesInput] = useState('');

  useEffect(() => {
    loadIncomeSources();
  }, []);

  useEffect(() => {
    if (editingSource) {
      setName(editingSource.name);
      setAmount(editingSource.amount.toString());
      setFrequency(editingSource.frequency);
      setAutoAdd(editingSource.autoAdd);
      setDayOfWeek(editingSource.dayOfWeek);
      setDayOfMonth(editingSource.dayOfMonth);
      setCustomDates(editingSource.customDates || []);
      setStartDate(editingSource.startDate.split('T')[0]);
      bottomSheetRef.current?.expand();
    } else {
      resetForm();
    }
  }, [editingSource]);

  const loadIncomeSources = async () => {
    try {
      setLoading(true);
      const sources = await getIncomeSources();
      setIncomeSources(sources);
    } catch (error) {
      console.error('Error loading income sources:', error);
      Alert.alert('Error', 'Failed to load income sources');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setFrequency('monthly');
    setAutoAdd(true);
    setDayOfWeek(undefined);
    setDayOfMonth(undefined);
    setCustomDates([]);
    setCustomDatesInput('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEditingSource(null);
  };

  const handleOpenAddSheet = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    resetForm();
    bottomSheetRef.current?.expand();
  };

  const handleCloseSheet = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => {
      resetForm();
    }, 300);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for this income source');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    // Validate frequency-specific fields
    if (frequency === 'weekly' && dayOfWeek === undefined) {
      Alert.alert('Missing Day', 'Please select a day of the week');
      return;
    }

    if (frequency === 'monthly' && dayOfMonth === undefined) {
      Alert.alert('Missing Day', 'Please select a day of the month');
      return;
    }

    if (frequency === 'custom' && customDates.length === 0) {
      Alert.alert('Missing Dates', 'Please enter at least one custom date (e.g., 15, 30)');
      return;
    }

    setSaving(true);
    try {
      const sourceData = {
        name: name.trim(),
        amount: parseFloat(amount),
        frequency,
        startDate: new Date(startDate).toISOString(),
        autoAdd,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        customDates: frequency === 'custom' ? customDates : undefined,
      };

      if (editingSource) {
        await updateIncomeSource(editingSource.id, sourceData);
        Alert.alert('Success', 'Income source updated successfully!');
      } else {
        await createIncomeSource(sourceData);
        Alert.alert('Success', 'Income source added successfully!');
      }

      await loadIncomeSources();
      handleCloseSheet();
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save income source');
      console.error('Error saving income source:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (source: IncomeSource) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Delete Income Source',
      `Are you sure you want to delete "${source.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncomeSource(source.id);
              await loadIncomeSources();
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete income source');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (source: IncomeSource) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setEditingSource(source);
  };

  const parseCustomDates = (input: string): number[] => {
    return input
      .split(',')
      .map(d => parseInt(d.trim(), 10))
      .filter(d => !isNaN(d) && d >= 1 && d <= 31)
      .sort((a, b) => a - b);
  };

  const handleCustomDatesChange = (text: string) => {
    setCustomDatesInput(text);
    const dates = parseCustomDates(text);
    setCustomDates(dates);
  };

  const getFrequencyLabel = (source: IncomeSource): string => {
    switch (source.frequency) {
      case 'weekly':
        const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Every ${weekDays[source.dayOfWeek || 0]}`;
      case 'biweekly':
        return 'Every 2 weeks';
      case 'monthly':
        return `Day ${source.dayOfMonth || 1} of each month`;
      case 'custom':
        return `Days ${source.customDates?.join(', ') || 'N/A'} of each month`;
      case 'manual':
        return 'Manual entry only';
      default:
        return source.frequency;
    }
  };

  const getNextPaymentDate = (source: IncomeSource): string => {
    if (!source.autoAdd || source.frequency === 'manual') {
      return 'N/A';
    }

    const now = new Date();
    const start = new Date(source.startDate);
    let next = new Date(start);

    // Simple calculation - in production, use incomeService.calculateNextPaymentDate
    switch (source.frequency) {
      case 'weekly':
        while (next < now) {
          next.setDate(next.getDate() + 7);
        }
        break;
      case 'biweekly':
        while (next < now) {
          next.setDate(next.getDate() + 14);
        }
        break;
      case 'monthly':
        if (source.dayOfMonth) {
          next.setDate(source.dayOfMonth);
          if (next < now) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        break;
      case 'custom':
        // Find next custom date
        if (source.customDates && source.customDates.length > 0) {
          const today = now.getDate();
          const nextCustom = source.customDates.find(d => d >= today);
          if (nextCustom) {
            next.setDate(nextCustom);
          } else {
            next.setDate(source.customDates[0]);
            next.setMonth(next.getMonth() + 1);
          }
        }
        break;
    }

    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Income Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Icon name="information-outline" size={24} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Income will be automatically added to your balance on the scheduled dates. You can also manually add income entries anytime.
          </Text>
        </View>

        {/* Income Sources List */}
        {incomeSources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="wallet-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Income Sources</Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Add your first income source to automatically track your earnings
            </Text>
          </View>
        ) : (
          <View style={styles.sourcesList}>
            {incomeSources.map((source) => (
              <View
                key={source.id}
                style={[styles.sourceCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}
              >
                <View style={styles.sourceHeader}>
                  <View style={[styles.sourceIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Icon name="cash-multiple" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.sourceInfo}>
                    <Text style={[styles.sourceName, { color: theme.text }]}>{source.name}</Text>
                    <Text style={[styles.sourceFrequency, { color: theme.textSecondary }]}>
                      {getFrequencyLabel(source)}
                    </Text>
                  </View>
                  <View style={styles.sourceAmount}>
                    <Text style={[styles.sourceAmountText, { color: theme.primary }]}>
                      {formatCurrency(source.amount)}
                    </Text>
                  </View>
                </View>

                {source.autoAdd && (
                  <View style={styles.sourceMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="calendar-clock" size={16} color={theme.textTertiary} />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        Next: {getNextPaymentDate(source)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.sourceActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => handleEdit(source)}
                  >
                    <Icon name="pencil" size={18} color={theme.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.expense + '20' }]}
                    onPress={() => handleDelete(source)}
                  >
                    <Icon name="delete" size={18} color={theme.expense} />
                    <Text style={[styles.actionButtonText, { color: theme.expense }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }, elevation.md]}
          onPress={handleOpenAddSheet}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Income Source</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['85%']}
        enablePanDownToClose
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetContentContainer}
        >
          <Text style={[styles.sheetTitle, { color: theme.text }]}>
            {editingSource ? 'Edit Income Source' : 'Add Income Source'}
          </Text>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g., Salary, Freelance, Side Gig"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
            <View style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.text }]}>{getCurrencySymbol()}</Text>
              <TextInput
                style={[styles.amountInputField, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Frequency</Text>
            <View style={styles.frequencyGrid}>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    {
                      backgroundColor: frequency === option.value ? theme.primary + '20' : theme.card,
                      borderColor: frequency === option.value ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setFrequency(option.value)}
                >
                  <Icon name={option.icon as any} size={20} color={frequency === option.value ? theme.primary : theme.textSecondary} />
                  <Text style={[
                    styles.frequencyOptionText,
                    { color: frequency === option.value ? theme.primary : theme.textSecondary },
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency-specific fields */}
          {frequency === 'weekly' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Day of Week</Text>
              <View style={styles.daySelector}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: dayOfWeek === index ? theme.primary + '20' : theme.card,
                        borderColor: dayOfWeek === index ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setDayOfWeek(index)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      { color: dayOfWeek === index ? theme.primary : theme.textSecondary },
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {frequency === 'monthly' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Day of Month</Text>
              <View style={styles.daySelector}>
                {[1, 5, 10, 15, 20, 25, 30].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: dayOfMonth === day ? theme.primary + '20' : theme.card,
                        borderColor: dayOfMonth === day ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setDayOfMonth(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      { color: dayOfMonth === day ? theme.primary : theme.textSecondary },
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, marginTop: spacing.sm }]}
                placeholder="Or enter custom day (1-31)"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
                value={dayOfMonth?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 1 && num <= 31) {
                    setDayOfMonth(num);
                  } else if (text === '') {
                    setDayOfMonth(undefined);
                  }
                }}
              />
            </View>
          )}

          {frequency === 'custom' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Days of Month</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g., 15, 30 (comma-separated)"
                placeholderTextColor={theme.textTertiary}
                value={customDatesInput}
                onChangeText={handleCustomDatesChange}
              />
              {customDates.length > 0 && (
                <View style={styles.customDatesPreview}>
                  <Text style={[styles.customDatesLabel, { color: theme.textSecondary }]}>Will add income on:</Text>
                  <View style={styles.customDatesChips}>
                    {customDates.map((date) => (
                      <View key={date} style={[styles.customDateChip, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.customDateChipText, { color: theme.primary }]}>
                          Day {date}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Start Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textTertiary}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>

          {/* Auto Add Toggle */}
          <View style={[styles.inputGroup, styles.toggleGroup]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Auto-Add Income</Text>
              <Text style={[styles.toggleDescription, { color: theme.textTertiary }]}>
                Automatically add this income on scheduled dates
              </Text>
            </View>
            <Switch
              value={autoAdd}
              onValueChange={setAutoAdd}
              trackColor={{ false: theme.border, true: theme.primary + '60' }}
              thumbColor={autoAdd ? theme.primary : theme.surface}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }, elevation.sm]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editingSource ? 'Update Income Source' : 'Add Income Source'}
              </Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
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
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    ...typography.bodySmall,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleLarge,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  sourcesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  sourceCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    ...typography.titleMedium,
    marginBottom: 2,
  },
  sourceFrequency: {
    ...typography.bodySmall,
  },
  sourceAmount: {
    alignItems: 'flex-end',
  },
  sourceAmountText: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  sourceMeta: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
  },
  sourceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  addButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
  },
  sheetTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.titleMedium,
    marginRight: spacing.sm,
  },
  amountInputField: {
    flex: 1,
    ...typography.titleMedium,
    paddingVertical: spacing.md,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: '45%',
  },
  frequencyOptionText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  customDatesPreview: {
    marginTop: spacing.md,
  },
  customDatesLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  customDatesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  customDateChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  customDateChipText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDescription: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  saveButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default IncomeManagementScreen;

