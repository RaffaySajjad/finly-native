/**
 * OnboardingScreen Component
 * Purpose: First-time user onboarding flow
 * Introduces key features and guides users through the app
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
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
import { useEffect } from 'react';
import { useAppFlow } from '../contexts/AppFlowContext';
import { IMPORT_SHOWN_KEY, ONBOARDING_STORAGE_KEY } from '../constants/storageKeys';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  type?: 'currency' | 'import' | 'standard';
}

const OnboardingScreen: React.FC = () => {
  const { getCurrencySymbol } = useCurrency();
  const { markOnboardingComplete } = useAppFlow();

  const onboardingSlides: OnboardingSlide[] = [
    {
      id: '1',
      icon: 'wallet-outline',
      title: 'Your Money, Clarity First',
      description: 'Effortlessly log expenses in seconds—no bank connection needed. Just you and your goals.',
      color: '#6366F1',
    },
    {
      id: '2',
      icon: 'cash-multiple',
      title: 'Watch Your Wealth Grow',
      description: 'Set up your income sources once, and we’ll handle the rest automatically. Seeing your balance grow has never been easier.',
      color: '#10B981',
    },
    {
      id: '3',
      icon: 'camera-outline',
      title: 'No More Paper Clutter',
      description: 'Snap a photo, and let AI organize the details for you. Keep your wallet clean and your records perfect.',
      color: '#F59E0B',
    },
    {
      id: '4',
      icon: 'microphone',
      title: 'Just Talk to Finly',
      description: `Before you forget: "Coffee for ${getCurrencySymbol()}5." Speak naturally, and let AI handle the categorization. It's like magic for your money.`,
      color: '#8B5CF6',
    },
    {
      id: '5',
      icon: 'file-import',
      title: 'Move In Effortlessly',
      description: 'Switching apps? Bring your history with you in one tap. Your data belongs to you.',
      color: '#EC4899',
      type: 'import',
    },
    {
      id: 'currency',
      icon: 'currency-usd',
      title: 'Select Currency',
      description: 'Choose your preferred currency for tracking expenses and income.',
      color: '#10B981',
      type: 'currency',
    },
  ];
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wantsToImport, setWantsToImport] = useState<boolean | null>(null);
  const [shouldShowImportSlide, setShouldShowImportSlide] = useState(true);
  const [hasTransactions, setHasTransactions] = useState<boolean | null>(null);

  // Currency state
  const [currency, setCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const { setCurrency: setGlobalCurrency } = useCurrency();

  // Check if user already has transactions on mount
  useEffect(() => {
    const checkExistingTransactions = async () => {
      try {
        // Check if user has any transactions (single request, minimal payload).
        const result = await apiService.getUnifiedTransactionsPaginated({ limit: 1 }).catch(() => ({
          transactions: [],
          pagination: { hasMore: false, nextCursor: null, total: 0 },
        }));

        const hasAnyTransactions = result.transactions.length > 0;

        setHasTransactions(hasAnyTransactions);

        // If user has transactions, skip import slide
        if (hasAnyTransactions) {
          setShouldShowImportSlide(false);
        }
      } catch (error) {
        console.error('[Onboarding] Error checking transactions:', error);
        // On error, show import slide (default behavior)
        setHasTransactions(false);
      }
    };

    checkExistingTransactions();
    loadCurrencies();
  }, []);

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

  // Filter slides based on import preference and existing transactions
  const filteredSlides = onboardingSlides.filter((slide, index) => {
    // Show import slide only if user hasn't decided yet, wants to import, and has no existing transactions
    if (slide.id === '5' && (!shouldShowImportSlide || hasTransactions)) {
      return false;
    }
    return true;
  });

  // Ensure currentIndex is valid when slides change
  useEffect(() => {
    if (currentIndex >= filteredSlides.length) {
      setCurrentIndex(Math.max(0, filteredSlides.length - 1));
    }
  }, [filteredSlides.length]);

  const handleImportChoice = async (choice: boolean) => {
    setWantsToImport(choice);
    
    if (choice) {
      // User wants to import - navigate to CSV import screen
      navigation.navigate('CSVImport');
    } else {
      // User doesn't want to import - mark import as skipped
      setShouldShowImportSlide(false);
      // Mark import as shown/skipped so it doesn't appear after income setup
      await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
      // Don't complete yet, proceed to currency selection
    }
  };

  const handleNext = () => {
    // Special handling for import question slide (now last slide)
    const currentSlide = filteredSlides[currentIndex];

    if (!currentSlide) return;

    if (currentSlide.type === 'import' && wantsToImport === null) {
      return; // Don't proceed if they haven't answered
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

  const handleSkip = async () => {
    await markOnboardingComplete();
  };

  const handleComplete = async () => {
    await markOnboardingComplete();
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

  const renderCurrencySelectionSlide = (index: number) => {
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
        key={'currency-slide'}
        style={[
          styles.slide,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
          <Icon name="currency-usd" size={80} color="#10B981" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Select Currency
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary, marginBottom: spacing.xl }]}>
          Choose your preferred currency for tracking expenses.
        </Text>

        <View style={styles.currencyListContainer}>
          <ScrollView
            style={styles.currencyList}
            contentContainerStyle={styles.currencyListContent}
            showsVerticalScrollIndicator={false}
          >
            {currencies.map((curr) => (
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

  const renderImportQuestionSlide = (index: number) => {
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
        key={'import-question-slide'}
        style={[
          styles.slide,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#EC4899' + '20' }]}>
          <Icon name="file-import" size={80} color="#EC4899" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Want to Import Your Data?
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Switching from another app? You can import your existing transactions now.
        </Text>
        
        <View style={styles.importButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.importButton,
              styles.importYesButton,
              { backgroundColor: theme.primary },
              elevation.md,
            ]}
            onPress={() => handleImportChoice(true)}
            activeOpacity={0.8}
          >
            <Icon name="check" size={24} color="#FFFFFF" />
            <Text style={styles.importButtonText}>Yes, Import</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.importButton,
              styles.importNoButton,
              { backgroundColor: theme.card, borderColor: theme.border },
              elevation.sm,
            ]}
            onPress={() => handleImportChoice(false)}
            activeOpacity={0.8}
          >
            <Icon name="close" size={24} color={theme.textSecondary} />
            <Text style={[styles.importButtonTextSecondary, { color: theme.textSecondary }]}>
              Skip for Now
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => {
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
          {
            opacity,
            transform: [{ scale }],
          },
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

      {/* Skip Button */}
      {/* <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
      </TouchableOpacity> */}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredSlides.map((slide, index) => {
          if (slide.type === 'currency') {
            return renderCurrencySelectionSlide(index);
          }
          // Render import question slide instead of regular import slide
          if (slide.type === 'import' && shouldShowImportSlide) {
            return renderImportQuestionSlide(index);
          }
          return renderSlide(slide, index);
        })}
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
            onPress={() => {
              const prevIndex = currentIndex - 1;
              scrollViewRef.current?.scrollTo({
                x: prevIndex * width,
                animated: true,
              });
              setCurrentIndex(prevIndex);
            }}
          >
            <Icon name="arrow-left" size={20} color={theme.text} />
            <Text style={[styles.backButtonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
        )}

        {/* Hide Next button on import question slide if they haven't answered */}
        {!(filteredSlides[currentIndex]?.type === 'import' && wantsToImport === null && shouldShowImportSlide) && (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: theme.primary }, elevation.md]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === filteredSlides.length - 1 ? 'Get Started' : 'Next'}
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
  skipButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headlineLarge,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  importYesButton: {
    // backgroundColor set inline
  },
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
  currencyListContainer: {
    height: 240,
    width: '100%',
    marginTop: spacing.md,
  },
  currencyList: {
    flex: 1,
    width: '100%'
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
  currencyCode: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: 2,
  },
  currencyName: {
    ...typography.bodySmall,
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
});

export default OnboardingScreen;

/**
 * Check if onboarding has been completed
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    return completed === 'true';
  } catch {
    return false;
  }
}

/**
 * Reset onboarding (for testing)
 */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

