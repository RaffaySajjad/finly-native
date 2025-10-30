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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { typography, spacing, borderRadius, elevation } from '../theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const ONBOARDING_STORAGE_KEY = '@finly_onboarding_completed';
const IMPORT_SHOWN_KEY = '@finly_import_shown';

const onboardingSlides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'wallet-outline',
    title: 'Track Every Expense',
    description: 'Easily log your expenses. Keep track of your finances without linking bank accounts.',
    color: '#6366F1',
  },
  {
    id: '2',
    icon: 'cash-multiple',
    title: 'Auto-Track Income',
    description: 'Set up your income sources and we\'ll automatically add them to your balance on schedule. Perfect for salaries, freelance, and recurring payments.',
    color: '#10B981',
  },
  {
    id: '3',
    icon: 'camera-outline',
    title: 'Scan Receipts Instantly',
    description: 'Take a photo of your receipt and let AI extract all the details automatically. Perfect for expenses on the go.',
    color: '#F59E0B',
  },
  {
    id: '4',
    icon: 'microphone',
    title: 'Voice & AI Entry',
    description: 'Say or type multiple transactions at once. "Coffee $5, Gas $30, Lunch $15" and we\'ll parse it all.',
    color: '#8B5CF6',
  },
  {
    id: '5',
    icon: 'file-import',
    title: 'Import from Other Apps',
    description: 'Switching from Wallet by BudgetBakers or another app? Import your existing transactions with just a CSV file. We\'ll handle duplicates automatically.',
    color: '#EC4899',
  },
];

const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wantsToImport, setWantsToImport] = useState<boolean | null>(null);
  const [shouldShowImportSlide, setShouldShowImportSlide] = useState(true);

  // Filter slides based on import preference
  const filteredSlides = onboardingSlides.filter((slide, index) => {
    // Show import slide only if user hasn't decided yet or wants to import
    if (slide.id === '5' && !shouldShowImportSlide) {
      return false;
    }
    return true;
  });

  const handleImportChoice = async (choice: boolean) => {
    setWantsToImport(choice);
    
    if (choice) {
      // User wants to import - navigate to CSV import screen
      navigation.navigate('CSVImport');
    } else {
      // User doesn't want to import - mark import as skipped and complete onboarding
      setShouldShowImportSlide(false);
      // Mark import as shown/skipped so it doesn't appear after income setup
      await AsyncStorage.setItem(IMPORT_SHOWN_KEY, 'true');
      // Complete onboarding since we're at the last slide
      handleComplete();
    }
  };

  const handleNext = () => {
    // Special handling for import question slide (now index 4, which is the last slide)
    if (currentIndex === 4 && wantsToImport === null) {
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
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    // AppNavigator will detect the change and re-render
    // No need to navigate manually
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    // AppNavigator will detect the change and re-render
    // No need to navigate manually
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

  const renderImportQuestionSlide = () => {
    const inputRange = [
      3 * width,
      4 * width,
      5 * width,
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
          Switching from Wallet by BudgetBakers or another app? You can import your existing transactions now.
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
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
      </TouchableOpacity>

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
          // Render import question slide instead of regular import slide
          if (slide.id === '5' && shouldShowImportSlide) {
            return renderImportQuestionSlide();
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
        {!(currentIndex === 4 && wantsToImport === null && shouldShowImportSlide) && (
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

