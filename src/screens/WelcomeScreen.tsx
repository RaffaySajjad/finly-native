/**
 * WelcomeScreen - First Impression Landing Page
 * Purpose: Introduces Finly to new and returning users with beautiful branding
 * Features: Animated logo, value propositions, elegant gradient design
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';

import { AuthStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { brandGradients, glowEffects } from '../theme/DesignTokens';
import { springPresets, timingPresets, staggerDelays } from '../theme/AnimationConfig';
import { usePerformance } from '../contexts/PerformanceContext';
import { GlowButton } from '../components/PremiumComponents';

type WelcomeNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

interface FeatureItem {
  icon: string;
  title: string;
  delay: number;
  isSubtle?: boolean; // For the privacy line - styled differently
}

// 3 Hero Features + 1 Privacy Trust Line (Wilmer's ASO strategy)
const features: FeatureItem[] = [
  { icon: 'microphone', title: 'Speak it. Logged.', delay: 400 },
  { icon: 'camera', title: 'Snap receipts. Done.', delay: 550 },
  { icon: 'robot', title: 'AI that actually helps', delay: 700 },
  { icon: 'shield-lock', title: 'Private by design. No bank linking.', delay: 850, isSubtle: true },
];

/**
 * WelcomeScreen - Beautiful landing page with premium animations
 */
const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNavigationProp>();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(50)).current;

  // 3D Logo animation
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Gradient animation
  const [gradientColors, setGradientColors] = useState(brandGradients.primary.colors);
  const gradientAnim = useRef(new Animated.Value(0)).current;

  // Feature item animations
  const featureAnimations = features.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    slide: useRef(new Animated.Value(20)).current,
    scale: useRef(new Animated.Value(0.9)).current,
  }));

  useEffect(() => {
    // 3D Logo entrance animation
    const logoAnimations: Animated.CompositeAnimation[] = [
      Animated.spring(logoScale, {
        toValue: 1,
        ...springPresets.bouncy,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ];

    // Add rotation only for high-end devices
    if (shouldUseComplexAnimations) {
      logoAnimations.push(
        Animated.spring(logoRotate, {
          toValue: 1,
          ...springPresets.gentle,
        })
      );
    }

    Animated.sequence([
      Animated.parallel(logoAnimations),
      // Title fade in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          ...timingPresets.normal,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          ...springPresets.smooth,
        }),
      ]),
      // Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        ...timingPresets.fast,
      }),
    ]).start();

    // Features staggered animation
    features.forEach((_, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(featureAnimations[index].opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(featureAnimations[index].slide, {
            toValue: 0,
            ...springPresets.smooth,
          }),
          Animated.spring(featureAnimations[index].scale, {
            toValue: 1,
            ...springPresets.gentle,
          }),
        ]).start();
      }, features[index].delay);
    });

    // Buttons animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          ...timingPresets.normal,
        }),
        Animated.spring(buttonsSlide, {
          toValue: 0,
          ...springPresets.bouncy,
        }),
      ]).start();
    }, 900);

    // Animated gradient (if device supports complex animations)
    if (shouldUseComplexAnimations) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gradientAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(gradientAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [shouldUseComplexAnimations]);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Signup');
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login');
  };

  // Interpolate logo rotation for 3D effect
  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={['#4F46E5', '#4A90E2', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* 3D Animated Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { rotateY: shouldUseComplexAnimations ? logoRotateInterpolate : '0deg' },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoInner,
                shouldUseGlowEffects && {
                  ...glowEffects.medium,
                  shadowColor: '#6366F1',
                },
              ]}
            >
              <Image
                source={require('../../assets/icon-white.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>

          {/* Title */}
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleSlide }],
              },
            ]}
          >
            Finly AI
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text
            style={[
              styles.subtitle,
              { opacity: subtitleOpacity },
            ]}
          >
            Financial Clarity. Effortlessly.
          </Animated.Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              style={[
                feature.isSubtle ? styles.subtleFeatureItem : styles.featureItem,
                {
                  opacity: featureAnimations[index].opacity,
                  transform: [
                    { translateX: featureAnimations[index].slide },
                    { scale: featureAnimations[index].scale },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  feature.isSubtle ? styles.subtleFeatureIcon : styles.featureIcon,
                  !feature.isSubtle && shouldUseGlowEffects && {
                    ...glowEffects.subtle,
                    shadowColor: '#22D3EE',
                  },
                ]}
              >
                <Icon
                  name={feature.icon as any}
                  size={feature.isSubtle ? 16 : 20}
                  color={feature.isSubtle ? 'rgba(255, 255, 255, 0.6)' : '#22D3EE'}
                />
              </Animated.View>
              <Text style={feature.isSubtle ? styles.subtleFeatureText : styles.featureText}>
                {feature.title}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Actions Section */}
        <Animated.View
          style={[
            styles.actionsSection,
            {
              opacity: buttonsOpacity,
              transform: [{ translateY: buttonsSlide }],
            },
          ]}
        >
          {/* Get Started Button - Premium Glow Button */}
          <GlowButton
            onPress={handleGetStarted}
            variant="primary"
            glowIntensity="medium"
            style={styles.primaryButton}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Icon name="arrow-right" size={20} color="#FFFFFF" />
            </View>
          </GlowButton>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account? <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer with Terms and Privacy Policy */}
        <Animated.View
          style={[
            styles.footer,
            { opacity: buttonsOpacity },
          ]}
        >
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('TermsOfService')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  // Decorative background elements
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: height * 0.3,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle3: {
    position: 'absolute',
    bottom: -50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
  },
  // Hero Section
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoInner: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  // Features Section
  featuresSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  // Subtle privacy/trust line - smaller, muted styling
  subtleFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    opacity: 0.85,
  },
  subtleFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtleFeatureText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.1,
  },
  // Actions Section
  actionsSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  signInLink: {
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  }
});

export default WelcomeScreen;

