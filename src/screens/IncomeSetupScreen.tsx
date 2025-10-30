/**
 * IncomeSetupScreen Component
 * Purpose: First-time income setup after signup/onboarding
 * Guides users to set up their income sources in a step-by-step, welcoming way
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
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
import { createIncomeSource } from '../services/incomeService';
import { IncomeFrequency } from '../types';
import { BottomSheetBackground } from '../components';
import { typography, spacing, borderRadius, elevation } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStartingBalance, getStartingBalance } from '../services/userService';
import {
  getCurrencies,
  getUserCurrency,
  saveUserCurrency,
  Currency,
} from '../services/currencyService';

type IncomeSetupNavigationProp = StackNavigationProp<RootStackParamList>;

const INCOME_SETUP_COMPLETED_KEY = '@finly_income_setup_completed';

const FREQUENCY_OPTIONS: Array<{ value: IncomeFrequency; label: string; icon: string; description: string }> = [
  { value: 'weekly', label: 'Weekly', icon: 'calendar-week', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-weekly', icon: 'calendar-range', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-month', description: 'Once a month' },
  { value: 'custom', label: 'Custom', icon: 'calendar-edit', description: 'Specific dates' },
];

type SetupStep = 0 | 1 | 2 | 3 | 4;

const IncomeSetupScreen: React.FC = () => {
  const { theme } = useTheme();
  const { getCurrencySymbol, setCurrency: setCurrencyGlobal } = useCurrency();
  const navigation = useNavigation<IncomeSetupNavigationProp>();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<SetupStep>(0); // Start with currency selection
  
  // Currency selection state
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<IncomeFrequency>('monthly');
  const [autoAdd] = useState(true); // Default to true, hide toggle for simplicity
  const [dayOfWeek, setDayOfWeek] = useState<number | undefined>(undefined);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(15); // Default to 15th
  const [customDates, setCustomDates] = useState<number[]>([]);
  const [customDatesInput, setCustomDatesInput] = useState('');
  const [startingBalanceInput, setStartingBalanceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [incomeSourceSaved, setIncomeSourceSaved] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load currency on mount
    loadInitialCurrency();
    // Auto-open bottom sheet on mount
    setTimeout(() => {
      bottomSheetRef.current?.expand();
    }, 500);
  }, []);

  useEffect(() => {
    // Load currencies when currency step is active
    if (currentStep === 0) {
      loadCurrencies();
    }
  }, [currentStep]);

  const loadInitialCurrency = async () => {
    try {
      const savedCurrency = await getUserCurrency();
      setSelectedCurrency(savedCurrency);
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  };

  const loadCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const currencyList = await getCurrencies();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const handleCurrencySelect = async (currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    await saveUserCurrency(currencyCode);
    await setCurrencyGlobal(currencyCode); // Update global currency context
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  useEffect(() => {
    // Animate step transitions
    Animated.timing(slideAnim, {
      toValue: currentStep,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

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

  const handleSkip = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await AsyncStorage.setItem(INCOME_SETUP_COMPLETED_KEY, 'true');
  };

  const handleNext = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentStep === 0) {
      // Currency selection - move to income setup
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!name.trim()) {
        Alert.alert('What should we call it?', 'Please give your income source a name (e.g., Salary, Freelance)');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('How much?', 'Please enter a valid amount');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Validate frequency-specific fields
      if (frequency === 'weekly' && dayOfWeek === undefined) {
        Alert.alert('Which day?', 'Please select a day of the week');
        return;
      }
      if (frequency === 'monthly' && dayOfMonth === undefined) {
        Alert.alert('Which day?', 'Please select a day of the month');
        return;
      }
      if (frequency === 'custom' && customDates.length === 0) {
        Alert.alert('Which dates?', 'Please enter at least one date (e.g., 15, 30)');
        return;
      }
      
      // Save income source and move to starting balance step
      handleSaveIncomeSource();
    }
  };

  const handleBack = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as SetupStep);
    }
  };

  const handleSaveIncomeSource = async () => {
    setSaving(true);
    try {
      const sourceData = {
        name: name.trim(),
        amount: parseFloat(amount),
        frequency,
        startDate: new Date().toISOString(), // Default to today
        autoAdd: true, // Always auto-add for onboarding
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        customDates: frequency === 'custom' ? customDates : undefined,
      };

      await createIncomeSource(sourceData);
      setIncomeSourceSaved(true);
      setCurrentStep(4); // Move to starting balance step
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Oops!', 'Failed to save income source. Please try again.');
      console.error('Error saving income source:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // Handle starting balance
    const balance = startingBalanceInput ? parseFloat(startingBalanceInput) : 0;
    if (isNaN(balance)) {
      Alert.alert('Invalid Amount', 'Please enter a valid starting balance');
      return;
    }

    setSaving(true);
    try {
      console.log(`[IncomeSetupScreen] About to save starting balance: ${balance}`);
      await setStartingBalance(balance);
      console.log(`[IncomeSetupScreen] Starting balance saved successfully`);
      
      // Verify it was saved
      const savedBalance = await getStartingBalance();
      console.log(`[IncomeSetupScreen] Verified saved balance: ${savedBalance}`);
      
      await AsyncStorage.setItem(INCOME_SETUP_COMPLETED_KEY, 'true');
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'Perfect! 🎉',
        'Your income and starting balance are set up! We\'ll automatically track your earnings.',
        [{ text: 'Get Started', onPress: () => {} }]
      );
    } catch (error) {
      Alert.alert('Oops!', 'Something went wrong. Please try again.');
      console.error('Error saving starting balance:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {[0, 1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.stepIndicatorRow}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: currentStep >= step ? theme.primary : theme.border,
                },
              ]}
            />
            {step < 4 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor: currentStep > step ? theme.primary : theme.border,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="currency-usd" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.stepTitle, { color: theme.text }]}>Choose Your Currency</Text>
        <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
          Select the currency you'll use for your transactions
        </Text>
      </View>

      {loadingCurrencies ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.currencyList}>
          {currencies.map((curr) => (
            <TouchableOpacity
              key={curr.code}
              style={[
                styles.currencyOption,
                {
                  backgroundColor: selectedCurrency === curr.code ? theme.primary + '20' : theme.card,
                  borderColor: selectedCurrency === curr.code ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleCurrencySelect(curr.code)}
            >
              <View style={styles.currencyInfo}>
                <View style={styles.currencyHeader}>
                  <Text style={styles.currencyFlag}>{curr.flag}</Text>
                  <Text style={[styles.currencyCode, { color: theme.text }]}>{curr.code}</Text>
                </View>
                <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                  {curr.name}
                </Text>
              </View>
              {selectedCurrency === curr.code && (
                <Icon name="check-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="tag-outline" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.stepTitle, { color: theme.text }]}>What's this income called?</Text>
        <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
          Give it a name so you can easily identify it later
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g., Salary, Freelance, Side Gig"
          placeholderTextColor={theme.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="cash" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.stepTitle, { color: theme.text }]}>How much?</Text>
        <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
          Enter the amount you receive
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={[styles.amountInputLarge, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.currencySymbolLarge, { color: theme.text }]}>{getCurrencySymbol()}</Text>
          <TextInput
            style={[styles.amountInputFieldLarge, { color: theme.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="calendar-clock" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.stepTitle, { color: theme.text }]}>How often?</Text>
        <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
          Select how frequently you receive this income
        </Text>
      </View>

      <View style={styles.frequencyGrid}>
        {FREQUENCY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.frequencyCard,
              {
                backgroundColor: frequency === option.value ? theme.primary + '20' : theme.card,
                borderColor: frequency === option.value ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              setFrequency(option.value);
              if (Platform.OS === 'ios') {
                Haptics.selectionAsync();
              }
            }}
          >
            <Icon name={option.icon as any} size={24} color={frequency === option.value ? theme.primary : theme.textSecondary} />
            <Text style={[
              styles.frequencyCardLabel,
              { color: frequency === option.value ? theme.primary : theme.text },
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.frequencyCardDescription,
              { color: theme.textTertiary },
            ]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conditional fields - only show when relevant */}
      {frequency === 'weekly' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Which day?</Text>
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
                onPress={() => {
                  setDayOfWeek(index);
                  if (Platform.OS === 'ios') {
                    Haptics.selectionAsync();
                  }
                }}
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
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Which day of the month?</Text>
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
                onPress={() => {
                  setDayOfMonth(day);
                  if (Platform.OS === 'ios') {
                    Haptics.selectionAsync();
                  }
                }}
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
        </View>
      )}

      {frequency === 'custom' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Which days of the month?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g., 15, 30"
            placeholderTextColor={theme.textTertiary}
            value={customDatesInput}
            onChangeText={handleCustomDatesChange}
            autoFocus
          />
          {customDates.length > 0 && (
            <View style={styles.customDatesPreview}>
              <Text style={[styles.customDatesLabel, { color: theme.textSecondary }]}>Income will be added on:</Text>
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

      {frequency === 'biweekly' && (
        <View style={styles.inputGroup}>
          <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
            <Icon name="information-outline" size={20} color={theme.primary} />
            <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
              Income will be added every 2 weeks starting from today
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="wallet" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.stepTitle, { color: theme.text }]}>What's your current balance?</Text>
        <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
          Enter how much money you have right now. You can always adjust this later by tapping the balance card.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={[styles.amountInputLarge, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.currencySymbolLarge, { color: theme.text }]}>{getCurrencySymbol()}</Text>
          <TextInput
            style={[styles.amountInputFieldLarge, { color: theme.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            value={startingBalanceInput}
            onChangeText={setStartingBalanceInput}
            autoFocus
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
          <Icon name="information-outline" size={20} color={theme.primary} />
          <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
            This is your starting point. All future income and expenses will be calculated from this balance.
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Set Up Your Income</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          We'll help you track your earnings automatically
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Welcome Card */}
        <View style={[styles.welcomeCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.md]}>
          <View style={[styles.welcomeIcon, { backgroundColor: theme.primary + '20' }]}>
            <Icon name="cash-multiple" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            Welcome to Finly! 👋
          </Text>
          <Text style={[styles.welcomeDescription, { color: theme.textSecondary }]}>
            Let's set up your first income source. Don't worry, you can add more later or skip this step.
          </Text>
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={[styles.skipButton, { borderColor: theme.border }]}
          onPress={handleSkip}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Skip for Now</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Setup Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['75%']}
        enablePanDownToClose={false}
        backgroundComponent={BottomSheetBackground}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      >
        <View style={{ flex: 1 }}>
          <BottomSheetScrollView
            style={styles.bottomSheetContent}
            contentContainerStyle={[
              styles.bottomSheetContentContainer,
              currentStep === 0 && styles.currencyStepContainer
            ]}
          >
            {renderStepIndicator()}

            {/* Step Content */}
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            {/* Action Buttons - Inside ScrollView for non-currency steps */}
            {currentStep !== 0 && (
              <View style={styles.actionButtons}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={handleBack}
                  >
                    <Icon name="arrow-left" size={20} color={theme.text} />
                    <Text style={[styles.backButtonText, { color: theme.text }]}>Back</Text>
                  </TouchableOpacity>
                )}

                {currentStep < 3 ? (
                  <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: theme.primary }, elevation.sm]}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Icon name="arrow-right" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : currentStep === 3 ? (
                  <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: theme.primary }, elevation.sm]}
                    onPress={handleNext}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.nextButtonText}>Next</Text>
                        <Icon name="arrow-right" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }, elevation.sm]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.saveButtonText}>Complete Setup</Text>
                        <Icon name="check" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </BottomSheetScrollView>

          {/* Action Buttons - Fixed at bottom for currency step */}
          {currentStep === 0 && (
            <View style={[styles.fixedActionButtons, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: theme.primary }, elevation.sm]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Icon name="arrow-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  welcomeCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  welcomeIcon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  welcomeDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  skipButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 24,
    height: 2,
    marginHorizontal: spacing.xs,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  stepDescription: {
    ...typography.bodySmall,
    textAlign: 'center',
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
  amountInputLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  currencySymbolLarge: {
    ...typography.headlineMedium,
    marginRight: spacing.md,
    fontWeight: '700',
  },
  amountInputFieldLarge: {
    flex: 1,
    ...typography.headlineMedium,
    fontWeight: '700',
    paddingVertical: spacing.sm,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  frequencyCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    gap: spacing.xs,
  },
  frequencyCardLabel: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  frequencyCardDescription: {
    ...typography.bodySmall,
    fontSize: 11,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    ...typography.bodySmall,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: 'transparent',
  },
  fixedActionButtons: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  backButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  nextButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyList: {
    gap: spacing.sm,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  currencyCode: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  currencyName: {
    ...typography.bodySmall,
  },
  currencyFlag: {
    fontSize: 24,
  },
  currencyStepContainer: {
    paddingBottom: 100, // Extra padding so list doesn't get hidden behind fixed button
  },
  fixedActionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default IncomeSetupScreen;

/**
 * Check if income setup has been completed
 */
export async function hasCompletedIncomeSetup(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(INCOME_SETUP_COMPLETED_KEY);
    return completed === 'true';
  } catch {
    return false;
  }
}
