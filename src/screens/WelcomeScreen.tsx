/**
 * WelcomeScreen - First Impression Landing Page
 * Purpose: Introduces Finly to new and returning users with beautiful branding
 * Features: Animated logo, value propositions, elegant gradient design
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';

import { AuthStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type WelcomeNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

interface FeatureItem {
  icon: string;
  title: string;
  delay: number;
}

const features: FeatureItem[] = [
  { icon: 'lightning-bolt', title: 'Track expenses instantly', delay: 400 },
  { icon: 'microphone', title: 'Voice-powered entries', delay: 550 },
  { icon: 'chart-line', title: 'AI-driven insights', delay: 700 },
];

/**
 * WelcomeScreen - Beautiful landing page for first-time users
 */
const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNavigationProp>();

  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(50)).current;

  // Feature item animations
  const featureAnimations = features.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    slide: useRef(new Animated.Value(20)).current,
  }));

  useEffect(() => {
    // Orchestrated entrance animation
    const animationSequence = Animated.sequence([
      // Logo entrance with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Title fade in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

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
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, features[index].delay);
    });

    // Buttons animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonsSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);
  }, []);

  const handleGetStarted = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate('Signup');
  };

  const handleSignIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('Login');
  };

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
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
          {/* Animated Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: logoScale },
                  { rotate: logoRotation },
                ],
              },
            ]}
          >
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>F</Text>
              {/* Accent arrow */}
              <View style={styles.logoAccent}>
                <Icon name="trending-up" size={24} color="#22D3EE" />
              </View>
            </View>
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
            Your AI-powered finance companion
          </Animated.Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              style={[
                styles.featureItem,
                {
                  opacity: featureAnimations[index].opacity,
                  transform: [{ translateX: featureAnimations[index].slide }],
                },
              ]}
            >
              <View style={styles.featureIcon}>
                <Icon name={feature.icon as any} size={20} color="#22D3EE" />
              </View>
              <Text style={styles.featureText}>{feature.title}</Text>
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
          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Icon name="arrow-right" size={20} color="#4F46E5" />
          </TouchableOpacity>

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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
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
  logoText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#4F46E5',
    marginTop: -8,
  },
  logoAccent: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  // Actions Section
  actionsSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
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
  },
});

export default WelcomeScreen;

