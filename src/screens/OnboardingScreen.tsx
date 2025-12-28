/**
 * OnboardingScreen Component
 * Purpose: Comprehensive first-time user onboarding flow  
 * 
 * 3-Phase Structure:
 * Phase 1: Value Proposition (slides 0-3)
 * Phase 2: Personalization (slides 4-6)
 * Phase 3: Call to Action (slide 7)
 * 
 * After completing onboarding, users are directed to PaywallScreen.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { apiService } from '../services/api';
import {
  getCurrencies,
  saveUserCurrency,
  Currency,
  getUserCurrency,
} from '../services/currencyService';
import { useAppFlow } from '../contexts/AppFlowContext';
import { IMPORT_SHOWN_KEY, USER_GOAL_KEY } from '../constants/storageKeys';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

// User goals for personalization
type UserGoal = 'budget' | 'save' | 'track' | 'debt';

interface GoalOption {
  id: UserGoal;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const GOALS: GoalOption[] = [
  { id: 'budget', icon: 'chart-pie', title: 'Budget Better', description: 'Control monthly spending', color: '#6366F1' },
  { id: 'save', icon: 'piggy-bank', title: 'Save More', description: 'Build an emergency fund', color: '#10B981' },
  { id: 'track', icon: 'magnify', title: 'Track Everything', description: 'Know where money goes', color: '#F59E0B' },
  { id: 'debt', icon: 'credit-card-off', title: 'Pay Off Debt', description: 'Become debt-free', color: '#EF4444' },
];

interface OnboardingSlide {
  id: string;
  phase: 'value' | 'personalization' | 'action';
  icon: string;
  title: string;
  description: string;
  color: string;
  type?: 'standard' | 'features' | 'goal' | 'currency' | 'import' | 'cta';
  features?: Array<{ icon: string; text: string }>;
}

const OnboardingScreen: React.FC = () => {
  const { getCurrencySymbol } = useCurrency();
  const { markOnboardingComplete } = useAppFlow();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Personalization state
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);

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

  // Animation values for feature highlights
  const featureAnim = useRef(new Animated.Value(0)).current;

  const onboardingSlides: OnboardingSlide[] = [
    // Phase 1: Value Proposition
    {
      id: 'welcome',
      phase: 'value',
      icon: 'hand-wave',
      title: 'Welcome to Finly',
      description: 'Your AI-powered personal finance companion. Take control of your money with intelligent insights and effortless tracking.',
      color: '#6366F1',
      type: 'standard',
    },
    {
      id: 'ai-power',
      phase: 'value',
      icon: 'brain',
      title: 'AI That Understands You',
      description: 'Ask questions in plain English. Get personalized insights. Finly learns your habits to help you spend smarter.',
      color: '#8B5CF6',
      type: 'features',
      features: [
        { icon: 'chat-processing', text: 'Chat with your finances' },
        { icon: 'lightbulb', text: 'Smart spending insights' },
        { icon: 'trending-up', text: 'Personalized tips' },
        { icon: 'lock', text: 'Your data stays private' },
      ],
    },
    {
      id: 'effortless',
      phase: 'value',
      icon: 'lightning-bolt',
      title: 'Track Effortlessly',
      description: 'Multiple ways to log expenses in seconds. No bank connection needed—your data stays private.',
      color: '#10B981',
      type: 'features',
      features: [
        { icon: 'microphone', text: `"Coffee for ${getCurrencySymbol()}5" — done` },
        { icon: 'camera', text: 'Snap a receipt' },
        { icon: 'keyboard', text: 'Quick manual entry' },
      ],
    },
    {
      id: 'analytics',
      phase: 'value',
      icon: 'chart-box',
      title: 'See the Big Picture',
      description: 'Beautiful charts and trends. Understand your spending patterns. Make informed decisions.',
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
      id: 'goal',
      phase: 'personalization',
      icon: 'target',
      title: "What's Your Goal?",
      description: 'Help us personalize your experience. Pick your primary focus.',
      color: '#EC4899',
      type: 'goal',
    },
    {
      id: 'currency',
      phase: 'personalization',
      icon: 'currency-usd',
      title: 'Select Currency',
      description: 'Choose your primary currency for tracking expenses and income.',
      color: '#10B981',
      type: 'currency',
    },
    {
      id: 'import',
      phase: 'personalization',
      icon: 'file-import',
      title: 'Switching Apps?',
      description: 'Bring your transaction history from another app. Your financial journey continues seamlessly.',
      color: '#6366F1',
      type: 'import',
    },
    // Phase 3: Call to Action
    {
      id: 'ready',
      phase: 'action',
      icon: 'rocket-launch',
      title: "You're All Set!",
      description: "Let's unlock the full power of Finly and start your journey to financial clarity.",
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

    checkExistingTransactions();
    loadCurrencies();
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
  };

  const handleGoalSelect = async (goal: UserGoal) => {
    setSelectedGoal(goal);
    await AsyncStorage.setItem(USER_GOAL_KEY, goal);

    // Sync goal with backend for personalized insights
    try {
      await apiService.updateGoal(goal);
    } catch (error) {
      // Silent fail - goal is saved locally, will sync on next app load
      console.warn('[Onboarding] Failed to sync goal with backend:', error);
    }
  };

  // Filter slides based on import preference
  const filteredSlides = onboardingSlides.filter((slide) => {
    if (slide.type === 'import' && (!shouldShowImportSlide || hasTransactions)) {
      return false;
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

  const handleNext = () => {
    const currentSlide = filteredSlides[currentIndex];

    if (!currentSlide) return;

    // Validate goal selection
    if (currentSlide.type === 'goal' && !selectedGoal) {
      return; // Must select a goal
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
    await markOnboardingComplete();
    // Navigation to Paywall is handled by AppNavigator based on flow state
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

  const renderGoalSlide = (slide: OnboardingSlide, index: number) => {
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

        <View style={styles.goalsGrid}>
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalCard,
                {
                  backgroundColor: selectedGoal === goal.id ? goal.color + '20' : theme.card,
                  borderColor: selectedGoal === goal.id ? goal.color : theme.border,
                },
              ]}
              onPress={() => handleGoalSelect(goal.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.goalIconContainer, { backgroundColor: goal.color + '20' }]}>
                <Icon name={goal.icon as any} size={28} color={goal.color} />
              </View>
              <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
              <Text style={[styles.goalDescription, { color: theme.textSecondary }]}>
                {goal.description}
              </Text>
              {selectedGoal === goal.id && (
                <View style={[styles.goalCheck, { backgroundColor: goal.color }]}>
                  <Icon name="check" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
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

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    switch (slide.type) {
      case 'features':
        return renderFeaturesSlide(slide, index);
      case 'goal':
        return renderGoalSlide(slide, index);
      case 'currency':
        return renderCurrencySlide(index);
      case 'import':
        return renderImportSlide(slide, index);
      case 'cta':
        return renderCtaSlide(slide, index);
      default:
        return renderStandardSlide(slide, index);
    }
  };

  const canProceed = () => {
    const currentSlide = filteredSlides[currentIndex];
    if (!currentSlide) return false;

    if (currentSlide.type === 'goal' && !selectedGoal) return false;
    if (currentSlide.type === 'import' && wantsToImport === null) return false;

    return true;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
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
      <View style={styles.actions}>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleBack}
          >
            <Icon name="arrow-left" size={20} color={theme.text} />
          </TouchableOpacity>
        )}

        {/* Spacer when no back button */}
        {currentIndex === 0 && <View style={{ flex: 1 }} />}

        {/* Hide Next on import slide if unanswered */}
        {!(filteredSlides[currentIndex]?.type === 'import' && wantsToImport === null) && (
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: canProceed() ? theme.primary : theme.border,
                flex: currentIndex === 0 ? 1 : 2,
              },
              elevation.md,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === filteredSlides.length - 1 ? 'Continue' : 'Next'}
            </Text>
            {currentIndex < filteredSlides.length - 1 && (
              <Icon name="arrow-right" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
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
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineLarge,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
