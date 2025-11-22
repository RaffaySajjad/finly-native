/**
 * AddIncomeScreen Component
 * Purpose: Add manual income transactions
 * Features: Select income source, enter amount, description, and date
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiService } from '../services/api';
import { IncomeSource } from '../types';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { CurrencyInput, DatePickerInput } from '../components';

const AddIncomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { getCurrencySymbol, convertToUSD } = useCurrency();

  const [amount, setAmount] = useState('');
  const [incomeSourceId, setIncomeSourceId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadIncomeSources();
  }, []);

  const loadIncomeSources = async () => {
    try {
      setLoadingSources(true);
      const sources = await apiService.getIncomeSources();
      setIncomeSources(sources);
    } catch (error) {
      console.error('Error loading income sources:', error);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please add a description');
      return;
    }

    setSaving(true);

    try {
      // Convert amount from display currency to USD before sending
      const amountInUSD = convertToUSD(parseFloat(amount));
      await apiService.createIncomeTransaction({
        amount: amountInUSD,
        date: date.toISOString(),
        description: description.trim(),
        incomeSourceId: incomeSourceId || undefined,
      });

      Alert.alert(
        'Success',
        'Income recorded successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save income. Please try again.');
      console.error('Error saving income:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedSource = incomeSources.find(s => s.id === incomeSourceId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Income</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AMOUNT</Text>
            <View style={[styles.amountContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <CurrencyInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                autoFocus
                large
                showSymbol={true}
                allowDecimals={true}
                inputStyle={styles.amountInputField}
              />
            </View>
          </View>

          {/* Income Source Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INCOME SOURCE</Text>
            {loadingSources ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading sources...
                </Text>
              </View>
            ) : (
              <View style={styles.sourcesList}>
                {/* Option for "Other" (no source) */}
                <TouchableOpacity
                  style={[
                    styles.sourceButton,
                    {
                      backgroundColor: !incomeSourceId ? theme.primary + '20' : theme.card,
                      borderColor: !incomeSourceId ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setIncomeSourceId(undefined)}
                >
                  <Icon name="cash-plus" size={24} color={!incomeSourceId ? theme.primary : theme.textSecondary} />
                  <Text
                    style={[
                      styles.sourceLabel,
                      {
                        color: !incomeSourceId ? theme.primary : theme.textSecondary,
                        fontWeight: !incomeSourceId ? '600' : '400',
                      },
                    ]}
                  >
                    Other / One-time
                  </Text>
                </TouchableOpacity>

                {/* List of income sources */}
                {incomeSources.map((source) => (
                  <TouchableOpacity
                    key={source.id}
                    style={[
                      styles.sourceButton,
                      {
                        backgroundColor: incomeSourceId === source.id ? theme.primary + '20' : theme.card,
                        borderColor: incomeSourceId === source.id ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setIncomeSourceId(source.id)}
                  >
                    <Icon name="wallet" size={24} color={incomeSourceId === source.id ? theme.primary : theme.textSecondary} />
                    <View style={styles.sourceInfo}>
                      <Text
                        style={[
                          styles.sourceLabel,
                          {
                            color: incomeSourceId === source.id ? theme.primary : theme.text,
                            fontWeight: incomeSourceId === source.id ? '600' : '400',
                          },
                        ]}
                      >
                        {source.name}
                      </Text>
                      {incomeSourceId === source.id && (
                        <Text style={[styles.sourceAmount, { color: theme.primary }]}>
                          {getCurrencySymbol()}{source.amount.toFixed(2)} {source.frequency}
                        </Text>
                      )}
                    </View>
                    {incomeSourceId === source.id && (
                      <Icon name="check-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="What is this income for?"
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATE</Text>
            <DatePickerInput
              date={date}
              onDateChange={setDate}
              label="Transaction Date"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.income }, elevation.md]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check-circle" size={24} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Record Income</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelSmall,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  amountInputField: {
    ...typography.titleLarge,
    fontWeight: '700',
    paddingVertical: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMedium,
  },
  sourcesList: {
    gap: spacing.sm,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.md,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceLabel: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  sourceAmount: {
    ...typography.bodySmall,
    marginTop: spacing.xs / 2,
  },
  descriptionInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 80,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AddIncomeScreen;

