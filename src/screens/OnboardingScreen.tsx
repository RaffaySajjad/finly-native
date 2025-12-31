/**
 * OnboardingScreen Component
 * Purpose: Comprehensive first-time user onboarding flow  
 * 
 * 3-Phase Structure:
 * Phase 1: Value Proposition (slides 0-4)
 * Phase 2: Personalization (slides 5-7) - Currency, Persona/AI
 * Phase 3: Call to Action (slide 8)
 * 
 * After completing onboarding, users are directed to PaywallScreen.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, StatusBar, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { GradientHeader } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { springPresets } from '../theme/AnimationConfig';
import { apiService } from '../services/api';
import {
  getCurrencies,
  saveUserCurrency,
  Currency,
  getUserCurrency,
} from '../services/currencyService';
import { useAppFlow } from '../contexts/AppFlowContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { IMPORT_SHOWN_KEY } from '../constants/storageKeys';
import AIIntroSlide from '../components/onboarding/AIIntroSlide';
import PersonaSelectionSlide, { Persona } from '../components/onboarding/PersonaSelectionSlide';
import AICategoryChat from '../components/onboarding/AICategoryChat';
import { GlowButton } from '../components/PremiumComponents';
import * as Haptics from 'expo-haptics';
import { IncomeFrequency } from '../types';
import { createIncomeSource } from '../services/incomeService';
import CurrencyInput from '../components/CurrencyInput';


type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const FREQUENCY_OPTIONS: Array<{ value: IncomeFrequency; label: string; icon: string; description: string }> = [
  { value: 'WEEKLY', label: 'Weekly', icon: 'calendar-week', description: 'Every week' },
  { value: 'BIWEEKLY', label: 'Bi-weekly', icon: 'calendar-range', description: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly', icon: 'calendar-month', description: 'Once a month' },
];

interface OnboardingSlide {
  id: string;
  phase: 'value' | 'personalization' | 'action';
  icon: string;
  title: string;
  description: string;
  color: string;
  type?: 'standard' | 'features' | 'currency' | 'import' | 'cta' | 'ai-demo' | 'persona' | 'ai-chat' | 'income-name' | 'income-amount' | 'income-frequency' | 'starting-balance';
  features?: Array<{ icon: string; text: string }>;
}

const OnboardingScreen: React.FC = () => {
  const { getCurrencySymbol, convertToUSD, currencyCode } = useCurrency();
  const { markOnboardingComplete, markIncomeSetupComplete, markCategorySetupComplete } = useAppFlow();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const { shouldUseGlowEffects } = usePerformance();
  const insets = useSafeAreaInsets();

  // Persona-based category state
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [isAIChatMode, setIsAIChatMode] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categorySetupComplete, setCategorySetupComplete] = useState(false);

  // Currency state
  const [currency, setCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const { setCurrency: setGlobalCurrency } = useCurrency();

  // Import state
  const [wantsToImport, setWantsToImport] = useState<boolean | null>(null);
  const [shouldShowImportSlide, setShouldShowImportSlide] = useState(true);
  const [hasTransactions, setHasTransactions] = useState<boolean | null>(null);

  // Income & Balance state
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>('MONTHLY');
  const [incomeDayOfMonth, setIncomeDayOfMonth] = useState<number>(15);
  const [incomeDayOfWeek, setIncomeDayOfWeek] = useState<number>(1);
  const [startingBalance, setStartingBalanceValue] = useState('');
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  const [incomeSetupLocalComplete, setIncomeSetupLocalComplete] = useState(false);

  // AI Demo state - track if user has interacted with AI demo
  const [hasInteractedWithAI, setHasInteractedWithAI] = useState(false);

  // Animation values for feature highlights
  const featureAnim = useRef(new Animated.Value(0)).current;

  const onboardingSlides: OnboardingSlide[] = [
    // Phase 1: Value Proposition (ordered to match WelcomeScreen: Voice/Receipt → AI)
    {
      id: 'welcome',
      phase: 'value',
      icon: 'hand-wave',
      title: 'Welcome to Finly',
      description: 'Financial clarity. Effortlessly. No spreadsheets, no stress.',
      color: '#6366F1',
      type: 'standard',
    },
    {
      id: 'effortless',
      phase: 'value',
      icon: 'lightning-bolt',
      title: 'Log in Seconds',
      description: 'Multiple ways to track expenses instantly. No bank linking required.',
      color: '#10B981',
      type: 'features',
      features: [
        { icon: 'microphone', text: 'Speak it. Logged.' },
        { icon: 'camera', text: 'Snap receipts. Done.' },
        { icon: 'keyboard', text: 'Quick manual entry' },
      ],
    },
    {
      id: 'ai-power',
      phase: 'value',
      icon: 'brain',
      title: 'AI That Actually Helps',
      description: 'Ask questions in plain English. Get answers, not data dumps.',
      color: '#8B5CF6',
      type: 'features',
      features: [
        { icon: 'chat-processing', text: 'Ask anything about your money' },
        { icon: 'lightbulb', text: 'Insights you can act on' },
        { icon: 'shield-lock', text: 'Private by design' }
      ],
    },
    // AI Demo - Let users try the AI before committing
    {
      id: 'ai-demo',
      phase: 'value',
      icon: 'robot-happy',
      title: 'Try Me Out!',
      description: 'See how I can help you achieve financial clarity.',
      color: '#8B5CF6',
      type: 'ai-demo',
    },
    {
      id: 'analytics',
      phase: 'value',
      icon: 'chart-box',
      title: 'Clarity at a Glance',
      description: 'Beautiful charts. Smart trends. Decisions made easy.',
      color: '#F59E0B',
      type: 'features',
      features: [
        { icon: 'chart-pie', text: 'Category breakdown' },
        { icon: 'chart-line', text: 'Monthly trends' },
        { icon: 'calendar-month', text: 'Year comparisons' },
      ],
    },
    // Phase 2: Personalization
    {
      id: 'currency',
      phase: 'personalization',
      icon: 'currency-usd',
      title: 'Select Currency',
      description: 'Choose your primary currency for tracking.',
      color: '#10B981',
      type: 'currency',
    },
    {
      id: 'income-name',
      phase: 'personalization',
      icon: 'tag-outline',
      title: 'Monthly Income',
      description: "What's this income called?",
      color: '#10B981',
      type: 'income-name',
    },
    {
      id: 'income-amount',
      phase: 'personalization',
      icon: 'cash',
      title: 'How much?',
      description: 'Enter your typical monthly income after tax.',
      color: '#10B981',
      type: 'income-amount',
    },
    {
      id: 'income-frequency',
      phase: 'personalization',
      icon: 'calendar-month',
      title: 'How often?',
      description: 'Select how frequently you receive this income. You can edit this schedule anytime from Settings.',
      color: '#10B981',
      type: 'income-frequency',
    },
    {
      id: 'starting-balance',
      phase: 'personalization',
      icon: 'wallet',
      title: 'Current Balance',
      description: 'How much money do you have in your accounts right now?',
      color: '#10B981',
      type: 'starting-balance',
    },
    {
      id: 'persona',
      phase: 'personalization',
      icon: 'account-group',
      title: 'Who Are You?',
      description: 'Pick your lifestyle for personalized categories with smart budgets.',
      color: '#8B5CF6',
      type: 'persona',
    },
    {
      id: 'ai-chat',
      phase: 'personalization',
      icon: 'robot-happy',
      title: 'Tell Me More',
      description: 'Describe your lifestyle for custom AI-generated categories.',
      color: '#8B5CF6',
      type: 'ai-chat',
    },
    {
      id: 'import',
      phase: 'personalization',
      icon: 'file-import',
      title: 'Switching Apps?',
      description: 'Bring your transaction history from another app.',
      color: '#6366F1',
      type: 'import',
    },
    // Phase 3: Call to Action
    {
      id: 'ready',
      phase: 'action',
      icon: 'rocket-launch',
      title: "You're All Set!",
      description: "Your personalized categories are ready. Let's start your journey to financial clarity.",
      color: '#10B981',
      type: 'cta',
    },
  ];

  // Check if user already has transactions on mount
  useEffect(() => {
    const checkExistingTransactions = async () => {
      try {
        const result = await apiService.getUnifiedTransactionsPaginated({ limit: 1 }).catch(() => ({
          transactions: [],
          pagination: { hasMore: false, nextCursor: null, total: 0 },
        }));

        const hasAnyTransactions = result.transactions.length > 0;
        setHasTransactions(hasAnyTransactions);

        if (hasAnyTransactions) {
          setShouldShowImportSlide(false);
        }
      } catch (error) {
        console.error('[Onboarding] Error checking transactions:', error);
        setHasTransactions(false);
      }
    };

    const loadPersonas = async () => {
      try {
        const personaList = await apiService.getPersonas();
        setPersonas(personaList);
      } catch (error) {
        console.error('[Onboarding] Error loading personas:', error);
        // Use empty array - will show AI chat option only
      }
    };

    checkExistingTransactions();
    loadCurrencies();
    loadPersonas();
  }, []);

  // Animate features when on feature slides
  useEffect(() => {
    const currentSlide = filteredSlides[currentIndex];
    if (currentSlide?.type === 'features') {
      featureAnim.setValue(0);
      Animated.stagger(150, [
        Animated.spring(featureAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  }, [currentIndex]);

  const loadCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const [currencyList, savedCurrency] = await Promise.all([
        getCurrencies(),
        getUserCurrency(),
      ]);
      setCurrencies(currencyList);
      setCurrency(savedCurrency);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const handleCurrencySelect = async (curr: string) => {
    setCurrency(curr);
    await saveUserCurrency(curr);
    await setGlobalCurrency(curr);

    // Save as base currency for precise financial calculations
    try {
      await apiService.updateBaseCurrency(curr);
    } catch (error) {
      console.warn('[Onboarding] Failed to save base currency:', error);
      // Non-blocking - continue even if this fails
    }
  };

  /**
   * Handle persona selection and setup categories
   */
  const handlePersonaSelect = async (personaId: string) => {
    setSelectedPersonaId(personaId);
    setIsLoadingCategories(true);

    try {
      // Setup categories from persona
      await apiService.setupCategoriesFromPersona(personaId, 0); // Income will be set later in IncomeSetupScreen
      setCategorySetupComplete(true);

      // Auto-advance to next slide after categories are set up
      setTimeout(() => {
        setIsLoadingCategories(false);
        handleNext();
      }, 500);
    } catch (error) {
      console.error('[Onboarding] Failed to setup categories from persona:', error);
      Alert.alert('Error', 'Failed to set up categories. Please try again.');
      setIsLoadingCategories(false);
    }
  };

  /**
   * Switch to AI chat mode
   */
  const handleChatWithAI = () => {
    setIsAIChatMode(true);

    // Calculate index with isAIChatMode = true (state hasn't updated yet)
    const slidesWithAIChat = onboardingSlides.filter((slide) => {
      if (slide.type === 'import' && (!shouldShowImportSlide || hasTransactions)) {
        return false;
      }
      // Include AI chat slide since we're switching to that mode
      return true;
    });

    const aiChatIndex = slidesWithAIChat.findIndex(s => s.type === 'ai-chat');
    if (aiChatIndex >= 0) {
      scrollViewRef.current?.scrollTo({
        x: aiChatIndex * width,
        animated: true,
      });
      setCurrentIndex(aiChatIndex);
    }
  };

  /**
   * Handle AI category generation
   */
  const handleAICategorySubmit = async (description: string) => {
    setIsLoadingCategories(true);

    try {
      // Calculate monthly value for budgeting
      const amountNum = parseFloat(incomeAmount);
      let monthlyValue = convertToUSD(amountNum);

      if (incomeFrequency === 'WEEKLY') {
        monthlyValue = monthlyValue * 4.33;
      } else if (incomeFrequency === 'BIWEEKLY') {
        monthlyValue = monthlyValue * 2.16;
      }

      // Generate categories using AI
      const generatedCategories = await apiService.generateCategoriesFromAI(
        description,
        monthlyValue,
        currencyCode
      );

      // Setup categories from AI response
      await apiService.setupCategoriesFromAI(generatedCategories, monthlyValue);
      setCategorySetupComplete(true);

      // Skip to import or CTA slide
      setIsLoadingCategories(false);
      handleNext();
    } catch (error) {
      console.error('[Onboarding] Failed to generate AI categories:', error);
      Alert.alert('Error', 'Failed to generate categories. Please try again or choose a profile.');
      setIsLoadingCategories(false);
    }
  };

  /**
   * Go back from AI chat to persona selection
   */
  const handleBackFromAIChat = () => {
    setIsAIChatMode(false);
    const personaIndex = filteredSlides.findIndex(s => s.type === 'persona');
    if (personaIndex >= 0) {
      scrollViewRef.current?.scrollTo({
        x: personaIndex * width,
        animated: true,
      });
      setCurrentIndex(personaIndex);
    }
  };

  // Filter slides based on preferences and state
  const filteredSlides = onboardingSlides.filter((slide) => {
    // Hide import slide if user has transactions
    if (slide.type === 'import' && (!shouldShowImportSlide || hasTransactions)) {
      return false;
    }
    // Hide AI chat slide unless user explicitly chose it
    if (slide.type === 'ai-chat' && !isAIChatMode) {
      return false;
    }
    // Hide income & balance slides if user already has transactions (existing user)
    // Also hide currency and persona selection - they've already set these up
    if (hasTransactions) {
      const skipForExistingUsers = ['income-name', 'income-amount', 'income-frequency', 'starting-balance', 'currency', 'persona'];
      if (skipForExistingUsers.includes(slide.type || '')) {
        return false;
      }
    }
    return true;
  });

  const handleImportChoice = async (choice: boolean) => {
    setWantsToImport(choice);
    
    if (choice) {
      navigation.navigate('CSVImport' as any);
    } else {
      setShouldShowImportSlide(false);
      await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
    }
  };

  /**
   * PERSISTENCE: Save Income & Balance
   */
  const handleSaveIncomeAndBalance = async () => {
    if (isSavingIncome) return;
    setIsSavingIncome(true);

    try {
      // 1. Save Income Source
      const amountNum = parseFloat(incomeAmount);
      const amountInUSD = convertToUSD(amountNum);

      await createIncomeSource({
        name: incomeName,
        amount: amountInUSD,
        originalAmount: amountNum,
        originalCurrency: currencyCode,
        frequency: incomeFrequency,
        startDate: new Date().toISOString(),
        autoAdd: true,
        dayOfMonth: incomeFrequency === 'MONTHLY' ? incomeDayOfMonth : undefined,
        dayOfWeek: incomeFrequency === 'WEEKLY' ? incomeDayOfWeek : undefined,
      });

      // 2. Save Starting Balance via transaction (same approach as Adjust Balance modal)
      const balanceNum = parseFloat(startingBalance) || 0;

      // Only create adjustment transaction if user specified a balance
      if (balanceNum > 0) {
        const balanceInUSD = convertToUSD(balanceNum);
        await apiService.adjustBalanceByTransaction({
          amount: balanceNum,
          currency: currencyCode,
          amountInUSD: balanceInUSD,
        });
      }
      await markIncomeSetupComplete();

      setIncomeSetupLocalComplete(true);

      // Auto-advance to persona selection
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const nextIdx = currentIndex + 1;
      if (nextIdx < filteredSlides.length) {
        scrollViewRef.current?.scrollTo({ x: nextIdx * width, animated: true });
        setCurrentIndex(nextIdx);
      }
    } catch (error) {
      console.error('[Onboarding] Failed to save income/balance:', error);
      Alert.alert('Setup Error', 'We couldn\'t save your financial info. Please try again.');
    } finally {
      setIsSavingIncome(false);
    }
  };

  const handleNext = () => {
    const currentSlide = filteredSlides[currentIndex];

    if (!currentSlide) return;

    // Custom flow for starting-balance (persistence trigger)
    if (currentSlide.type === 'starting-balance') {
      handleSaveIncomeAndBalance();
      return;
    }

    // Skip persona slide validation if already complete
    if (currentSlide.type === 'persona' && !categorySetupComplete) {
      return; // Must select a persona
    }

    // Handle import slide
    if (currentSlide.type === 'import' && wantsToImport === null) {
      return;
    }

    if (currentIndex < filteredSlides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
      setCurrentIndex(prevIndex);
    }
  };

  const handleComplete = async () => {
    setIsSavingIncome(true);
    try {
      try {
        // Sync timezone one last time before completing
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (deviceTimezone) {
          await apiService.updateTimezone(deviceTimezone);
        }
      } catch (error) {
        console.error('[Onboarding] Final timezone sync failed:', error);
      }

      await markOnboardingComplete();
      // Also mark income setup complete since it was done within onboarding slides
      await markIncomeSetupComplete();

      // If user has transactions (existing user), they don't need category setup
      if (hasTransactions) {
        await markCategorySetupComplete();
      }

      // Navigation to Paywall or CategoryOnboarding is handled by AppNavigator based on flow state
    } finally {
      setIsSavingIncome(false);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        const actualIndex = Math.min(index, filteredSlides.length - 1);
        setCurrentIndex(actualIndex);
      },
    }
  );

  // Get current phase for progress indicator
  const getCurrentPhase = (): 'value' | 'personalization' | 'action' => {
    return filteredSlides[currentIndex]?.phase || 'value';
  };

  const renderPhaseIndicator = () => {
    const phase = getCurrentPhase();
    const phases = [
      { key: 'value', label: 'Discover' },
      { key: 'personalization', label: 'Personalize' },
      { key: 'action', label: 'Start' },
    ];

    return (
      <View style={styles.phaseContainer}>
        {phases.map((p, index) => (
          <View key={p.key} style={styles.phaseItem}>
            <View
              style={[
                styles.phaseDot,
                {
                  backgroundColor: phase === p.key ? theme.primary : theme.border,
                  transform: [{ scale: phase === p.key ? 1.2 : 1 }],
                },
              ]}
            />
            <Text
              style={[
                styles.phaseLabel,
                {
                  color: phase === p.key ? theme.primary : theme.textSecondary,
                  fontWeight: phase === p.key ? '600' : '400',
                },
              ]}
            >
              {p.label}
            </Text>
            {index < phases.length - 1 && (
              <View
                style={[
                  styles.phaseLine,
                  { backgroundColor: theme.border },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStandardSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[
          styles.slide,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {slide.description}
        </Text>
      </Animated.View>
    );
  };

  const renderFeaturesSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[styles.slide, { opacity, transform: [{ scale }] }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary, marginBottom: spacing.lg }]}>
          {slide.description}
        </Text>

        {/* Feature list */}
        <View style={styles.featuresList}>
          {slide.features?.map((feature, fIndex) => (
            <Animated.View
              key={fIndex}
              style={[
                styles.featureItem,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: currentIndex === index ? 1 : 0.5,
                },
              ]}
            >
              <View style={[styles.featureIconContainer, { backgroundColor: slide.color + '20' }]}>
                <Icon name={feature.icon as any} size={24} color={slide.color} />
              </View>
              <Text style={[styles.featureText, { color: theme.text }]}>{feature.text}</Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderPersonaSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[styles.slide, { width, opacity, transform: [{ scale }] }]}
      >
        <PersonaSelectionSlide
          personas={personas}
          selectedPersonaId={selectedPersonaId}
          onSelectPersona={handlePersonaSelect}
          onChatWithAI={handleChatWithAI}
          isLoading={isLoadingCategories}
        />
      </Animated.View>
    );
  };

  /**
   * Render AI Chat Slide - Custom category generation
   */
  const renderAIChatSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[styles.slide, { width, opacity }]}
      >
        <AICategoryChat
          onSubmit={handleAICategorySubmit}
          onBack={handleBackFromAIChat}
          isLoading={isLoadingCategories}
        />
      </Animated.View>
    );
  };

  const renderCurrencySlide = (index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const filteredCurrencies = currencies.filter((curr) => {
      const searchLower = currencySearch.toLowerCase().trim();
      if (!searchLower) return true;
      return (
        curr.code.toLowerCase().includes(searchLower) ||
        curr.name.toLowerCase().includes(searchLower)
      );
    });

    return (
      <Animated.View
        key="currency-slide"
        style={[styles.slide, { opacity, transform: [{ scale }] }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
          <Icon name="currency-usd" size={80} color="#10B981" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Select Currency</Text>
        <Text style={[styles.description, { color: theme.textSecondary, marginBottom: spacing.md }]}>
          Choose your primary currency for tracking.
        </Text>

        <View style={[styles.currencySearchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.currencySearchInput, { color: theme.text }]}
            placeholder="Search currencies..."
            placeholderTextColor={theme.textSecondary}
            value={currencySearch}
            onChangeText={setCurrencySearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {currencySearch.length > 0 && (
            <TouchableOpacity onPress={() => setCurrencySearch('')}>
              <Icon name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.currencyListContainer}>
          <ScrollView
            style={styles.currencyList}
            contentContainerStyle={styles.currencyListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filteredCurrencies.map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyOption,
                  {
                    backgroundColor: currency === curr.code ? theme.primary + '20' : theme.card,
                    borderColor: currency === curr.code ? theme.primary : theme.border,
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
                {currency === curr.code && (
                  <Icon name="check-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    );
  };

  const renderImportSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[styles.slide, { opacity, transform: [{ scale }] }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {slide.description}
        </Text>
        
        <View style={styles.importButtonsContainer}>
          <TouchableOpacity
            style={[styles.importButton, styles.importYesButton, { backgroundColor: theme.primary }, elevation.md]}
            onPress={() => handleImportChoice(true)}
            activeOpacity={0.8}
          >
            <Icon name="file-upload" size={24} color="#FFFFFF" />
            <Text style={styles.importButtonText}>Import Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.importButton, styles.importNoButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleImportChoice(false)}
            activeOpacity={0.8}
          >
            <Icon name="arrow-right" size={24} color={theme.textSecondary} />
            <Text style={[styles.importButtonTextSecondary, { color: theme.textSecondary }]}>
              Start Fresh
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  /**
   * Render Income Name Slide
   */
  const renderIncomeNameSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });

    return (
      <Animated.View key={slide.id} style={[styles.slide, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{slide.description}</Text>

        <View style={styles.inputSlideContainer}>
          <TextInput
            style={[styles.onboardingInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Salary, Side Gig"
            placeholderTextColor={theme.textTertiary}
            value={incomeName}
            onChangeText={setIncomeName}
            autoFocus={currentIndex === index}
          />
        </View>
      </Animated.View>
    );
  };

  /**
   * Render Income Amount Slide
   */
  const renderIncomeAmountSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });

    return (
      <Animated.View key={slide.id} style={[styles.slide, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{slide.description}</Text>

        <View style={styles.inputSlideContainer}>
          <View style={[styles.amountInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <CurrencyInput
              value={incomeAmount}
              onChangeText={setIncomeAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textTertiary}
              large
              showSymbol={true}
              inputStyle={[styles.amountInput, { color: theme.text }]}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  /**
   * Render Income Frequency Slide
   */
  const renderIncomeFrequencySlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });

    return (
      <Animated.View key={slide.id} style={[styles.slide, { opacity }]}>
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{slide.description}</Text>

        <View style={styles.frequencySelectionContainer}>
          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.freqOption,
                {
                  backgroundColor: incomeFrequency === option.value ? theme.primary + '20' : theme.card,
                  borderColor: incomeFrequency === option.value ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                setIncomeFrequency(option.value);
                Haptics.selectionAsync();
              }}
            >
              <View style={styles.freqOptionContent}>
                <Icon name={option.icon as any} size={28} color={incomeFrequency === option.value ? theme.primary : theme.textSecondary} />
                <View>
                  <Text style={[styles.freqLabel, { color: theme.text }]}>{option.label}</Text>
                  <Text style={[styles.freqDesc, { color: theme.textTertiary }]}>{option.description}</Text>
                </View>
              </View>
              {incomeFrequency === option.value && <Icon name="check-circle" size={24} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  /**
   * Render Starting Balance Slide
   */
  const renderStartingBalanceSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });

    return (
      <Animated.View key={slide.id} style={[styles.slide, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{slide.description}</Text>

        <View style={styles.inputSlideContainer}>
          <View style={[styles.amountInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <CurrencyInput
              value={startingBalance}
              onChangeText={setStartingBalanceValue}
              placeholder="0.00"
              placeholderTextColor={theme.textTertiary}
              large
              showSymbol={true}
              inputStyle={[styles.amountInput, { color: theme.text }]}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderCtaSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[styles.slide, { opacity, transform: [{ scale }] }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Icon name={slide.icon as any} size={80} color={slide.color} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {slide.description}
        </Text>

        {/* Recap of what they'll get */}
        <View style={styles.recapContainer}>
          <View style={[styles.recapItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="check-circle" size={20} color={theme.primary} />
            <Text style={[styles.recapText, { color: theme.text }]}>AI-Powered Insights</Text>
          </View>
          <View style={[styles.recapItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="check-circle" size={20} color={theme.primary} />
            <Text style={[styles.recapText, { color: theme.text }]}>Effortless Tracking</Text>
          </View>
          <View style={[styles.recapItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name="check-circle" size={20} color={theme.primary} />
            <Text style={[styles.recapText, { color: theme.text }]}>Beautiful Analytics</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  /**
   * Render AI Demo Slide - Interactive AI chat demo
   */
  const renderAIDemoSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={slide.id}
        style={[styles.slide, { width, opacity, transform: [{ translateY }] }]}
      >
        <AIIntroSlide
          slideColor={slide.color}
          onDemoComplete={() => setHasInteractedWithAI(true)}
        />
      </Animated.View>
    );
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    switch (slide.type) {
      case 'features':
        return renderFeaturesSlide(slide, index);
      case 'persona':
        return renderPersonaSlide(slide, index);
      case 'ai-chat':
        return renderAIChatSlide(slide, index);
      case 'currency':
        return renderCurrencySlide(index);
      case 'income-name':
        return renderIncomeNameSlide(slide, index);
      case 'income-amount':
        return renderIncomeAmountSlide(slide, index);
      case 'income-frequency':
        return renderIncomeFrequencySlide(slide, index);
      case 'starting-balance':
        return renderStartingBalanceSlide(slide, index);
      case 'import':
        return renderImportSlide(slide, index);
      case 'cta':
        return renderCtaSlide(slide, index);
      case 'ai-demo':
        return renderAIDemoSlide(slide, index);
      default:
        return renderStandardSlide(slide, index);
    }
  };

  const canProceed = () => {
    const currentSlide = filteredSlides[currentIndex];
    if (!currentSlide) return false;

    // Persona slide requires selection (handled via auto-advance)
    if (currentSlide.type === 'persona' && !categorySetupComplete && !isLoadingCategories) return true; // Can scroll but Next button advances
    if (currentSlide.type === 'ai-chat') return false; // Submit button advances, not Next

    // Income validation
    if (currentSlide.type === 'income-name' && !incomeName.trim()) return false;
    if (currentSlide.type === 'income-amount' && (!incomeAmount || parseFloat(incomeAmount) <= 0)) return false;
    if (currentSlide.type === 'starting-balance' && !startingBalance) return false;

    if (currentSlide.type === 'import' && wantsToImport === null) return false;
    if (currentSlide.type === 'ai-demo' && !hasInteractedWithAI) return false;

    return true;
  };

  // Get the appropriate button text for the current slide
  const getNextButtonText = () => {
    const currentSlide = filteredSlides[currentIndex];
    if (currentIndex === filteredSlides.length - 1) return 'Continue';
    if (currentSlide?.type === 'ai-demo') return "I'm Impressed! Continue";
    if (currentSlide?.type === 'persona') return categorySetupComplete ? 'Next' : 'Select a Profile';
    if (currentSlide?.type === 'starting-balance') return isSavingIncome ? 'Saving...' : 'Set & Continue';
    return 'Next';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

      {/* Phase Indicator */}
      {renderPhaseIndicator()}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={canProceed()}
      >
        {filteredSlides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {filteredSlides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: index === currentIndex ? theme.primary : theme.border,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Bottom Actions */}
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleBack();
            }}
          >
            <Icon name="arrow-left" size={20} color={theme.text} />
          </TouchableOpacity>
        )}

        {/* Spacer when no back button */}
        {currentIndex === 0 && <View style={{ flex: 1 }} />}

        {/* Hide Next on import slide if unanswered */}
        {!(filteredSlides[currentIndex]?.type === 'import' && wantsToImport === null) && (
          <GlowButton
            variant="primary"
            glowIntensity={canProceed() ? 'medium' : 'subtle'}
            disabled={!canProceed()}
            onPress={handleNext}
            style={[
              styles.nextButton,
              { flex: currentIndex === 0 ? 1 : 2 },
            ]}
          >
            <View style={styles.nextButtonContent}>
              <Text style={styles.nextButtonText}>
                {getNextButtonText()}
              </Text>
              {currentIndex < filteredSlides.length - 1 && (
                <Icon name="arrow-right" size={20} color="#FFFFFF" />
              )}
            </View>
          </GlowButton>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  phaseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + 20,
    minHeight: 50,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  phaseLabel: {
    ...typography.labelSmall,
    width: 70, // Fixed width to prevent shifting
    textAlign: 'left',
  },
  phaseLine: {
    width: 30,
    height: 2,
    marginHorizontal: spacing.sm,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg, // Reduced for more breathing room
  },
  iconContainer: {
    width: 100, // Reduced from 140
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    opacity: 0.8,
  },
  featuresList: {
    width: '100%',
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...typography.bodyMedium,
    flex: 1,
    fontWeight: '500',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  goalCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  goalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  goalTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  goalDescription: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  goalCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  currencySearchInput: {
    flex: 1,
    ...typography.bodyMedium,
    paddingVertical: spacing.xs,
  },
  currencyListContainer: {
    height: 200,
    width: '100%',
    marginTop: spacing.sm,
  },
  currencyList: {
    flex: 1,
    width: '100%',
  },
  currencyListContent: {
    paddingHorizontal: spacing.sm,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  currencyFlag: {
    fontSize: 24,
  },
  currencyCode: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  currencyName: {
    ...typography.bodySmall,
  },
  importButtonsContainer: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  importYesButton: {},
  importNoButton: {
    borderWidth: 2,
  },
  importButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  importButtonTextSecondary: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
  recapContainer: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  recapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  recapText: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  inputSlideContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  onboardingInput: {
    ...typography.titleLarge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    textAlign: 'center',
  },
  amountInputWrapper: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
  },
  amountInput: {
    ...typography.headlineSmall,
    textAlign: 'center',
    fontWeight: '700',
  },
  frequencySelectionContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  freqOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  freqOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  freqLabel: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  freqDesc: {
    ...typography.bodySmall,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default OnboardingScreen;

/**
 * Check if onboarding has been completed
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem('@finly_onboarding_completed');
    return completed === 'true';
  } catch {
    return false;
  }
}

/**
 * Reset onboarding (for testing)
 */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem('@finly_onboarding_completed');
}
