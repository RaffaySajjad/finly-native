/**
 * AnimatedSplashScreen - Beautiful branded splash experience
 * Purpose: Provides an elegant loading animation that matches the app's design language
 * Features: Logo scale/rotation animation, gradient background, smooth fade transition
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

// Minimum time to show splash (ms) for branding impact
const MIN_SPLASH_DURATION = 1800;

interface AnimatedSplashScreenProps {
  /** Whether the app is ready to display (auth loaded, fonts loaded, etc.) */
  isAppReady: boolean;
  /** Callback when splash animation completes and app should be shown */
  onAnimationComplete: () => void;
  /** Optional loading status message to display */
  loadingStatus?: string;
}

/**
 * AnimatedSplashScreen component
 * Displays a beautiful branded loading screen with smooth animations
 */
export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isAppReady,
  onAnimationComplete,
  loadingStatus,
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Pulse animation for loading indicator
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Track if entrance animation completed
  const entranceComplete = useRef(false);
  const startTime = useRef(Date.now());

  /**
   * Start the entrance animation sequence
   */
  useEffect(() => {
    // Hide native splash screen after a brief delay
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore errors - splash may already be hidden
      }
    };
    
    // Small delay to ensure smooth transition from native splash
    setTimeout(hideSplash, 100);

    // Orchestrated entrance animation
    const entranceAnimation = Animated.sequence([
      // Logo entrance with spring bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(logoGlow, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Title fade in with slide
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle and progress bar
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start(() => {
      entranceComplete.current = true;
    });

    // Start progress bar animation
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: MIN_SPLASH_DURATION,
      useNativeDriver: false,
    }).start();

    // Start pulse animation loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, []);

  /**
   * Handle exit animation when app is ready
   */
  useEffect(() => {
    if (!isAppReady) return;

    const elapsed = Date.now() - startTime.current;
    const remainingTime = Math.max(0, MIN_SPLASH_DURATION - elapsed);

    // Wait for minimum duration, then animate out
    const exitTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete();
      });
    }, remainingTime);

    return () => clearTimeout(exitTimeout);
  }, [isAppReady, onAnimationComplete]);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const progressBarWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#4F46E5', '#4A90E2', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles for depth */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      <View style={styles.decorativeCircle4} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [
                { scale: logoScale },
                { rotate: logoRotation },
              ],
              opacity: logoGlow,
            },
          ]}
        >
          {/* Logo glow effect */}
          <Animated.View
            style={[
              styles.logoGlow,
              { transform: [{ scale: pulseScale }] },
            ]}
          />
          
          {/* Logo container */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon-white.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* App Name */}
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

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: subtitleOpacity },
          ]}
        >
          Smart money management
        </Animated.Text>

        {/* Loading indicator */}
        <Animated.View
          style={[
            styles.progressContainer,
            { opacity: subtitleOpacity },
          ]}
        >
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressBarWidth },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Bottom branding / loading status */}
      <Animated.View
        style={[
          styles.footer,
          { opacity: subtitleOpacity },
        ]}
      >
        <Text style={styles.footerText}>
          {loadingStatus || 'Your AI finance companion'}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  // Decorative background elements
  decorativeCircle1: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: height * 0.25,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle3: {
    position: 'absolute',
    bottom: height * 0.15,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  decorativeCircle4: {
    position: 'absolute',
    bottom: -80,
    left: width * 0.3,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  // Main content
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // Logo styles
  logoWrapper: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 38,
  },
  logoText: {
    fontSize: 80,
    fontWeight: '800',
    color: '#4F46E5',
    marginTop: -8,
  },
  logoAccent: {
    position: 'absolute',
    top: 18,
    right: 18,
  },
  // Text styles
  title: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    marginBottom: 40,
  },
  // Progress indicator
  progressContainer: {
    width: '60%',
    maxWidth: 200,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22D3EE',
    borderRadius: 2,
  },
  // Footer
  footer: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
});

export default AnimatedSplashScreen;

