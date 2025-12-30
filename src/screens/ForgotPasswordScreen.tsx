/**
 * ForgotPasswordScreen - Password Recovery
 * Purpose: Allows users to reset their password (mock implementation)
 * Features: Email validation, success feedback
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '../components/GradientHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { springPresets } from '../theme/AnimationConfig';
import { GlowButton } from '../components/PremiumComponents';
import { AuthStackParamList } from '../navigation/types';
import authService from '../services/authService';

type ForgotPasswordNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

/**
 * ForgotPasswordScreen - Password recovery interface
 */
const ForgotPasswordScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const navigation = useNavigation<ForgotPasswordNavigationProp>();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...springPresets.smooth,
      }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    // Clear previous errors
    setEmailError('');
    setGeneralError('');

    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      await authService.forgotPassword(email);
      
      setLoading(false);
      setEmailSent(true);

      // Navigate to reset password screen immediately
      navigation.navigate('ResetPassword', { email });
    } catch (error: any) {
      setLoading(false);
      setEmailSent(false);
      const errorMessage = error?.message || 'Failed to send reset code. Please try again.';
      
      // Show error inline
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('not found')) {
        setEmailError(errorMessage);
      } else {
        setGeneralError(errorMessage);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      <LinearGradient
        colors={[theme.primary + '20', theme.background, theme.background]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-left" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                No worries! Enter your email and we'll send you reset instructions.
              </Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              style={[
                styles.formCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation.lg,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.background,
                    borderColor: emailError ? theme.expense : theme.border,
                  }
                ]}>
                  <Icon name="email-outline" size={20} color={emailError ? theme.expense : theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="you@email.com"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError('');
                      if (generalError) setGeneralError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!emailSent}
                  />
                  {emailSent && (
                    <Icon name="check-circle" size={20} color={theme.income} />
                  )}
                </View>
                {emailError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{emailError}</Text>
                )}
              </View>

              {/* General Error Message */}
              {generalError && (
                <View style={[styles.generalErrorContainer, { backgroundColor: theme.expense + '10', borderColor: theme.expense + '30' }]}>
                  <Icon name="alert-circle-outline" size={18} color={theme.expense} />
                  <Text style={[styles.generalErrorText, { color: theme.expense }]}>{generalError}</Text>
                </View>
              )}

              {/* Reset Button */}
              <GlowButton
                onPress={handleResetPassword}
                variant={emailSent ? 'success' : 'primary'}
                disabled={loading || emailSent}
                glowIntensity={shouldUseGlowEffects ? 'medium' : undefined}
                style={[
                  styles.resetButton,
                  (generalError || emailError) && { marginTop: spacing.md },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <View style={styles.resetButtonContent}>
                    <Icon
                      name={emailSent ? 'check-circle-outline' : 'send'}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.resetButtonText}>
                      {emailSent ? 'Email Sent!' : 'Send Reset Link'}
                    </Text>
                    </View>
                )}
              </GlowButton>

              {emailSent && (
                <Text style={[styles.successText, { color: theme.income }]}>
                  ✓ Check your email for reset instructions
                </Text>
              )}
            </Animated.View>

            {/* Back to Login Link */}
            <Animated.View style={[styles.loginSection, { opacity: fadeAnim }]}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Icon name="arrow-left" size={18} color={theme.primary} />
                <Text style={[styles.loginLink, { color: theme.primary }]}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.xl + 44, // Account for status bar
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: Platform.OS === 'ios' ? 52 : undefined,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  input: {
    ...typography.bodyMedium,
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 0 : spacing.md,
    height: Platform.OS === 'ios' ? 52 : undefined,
    textAlignVertical: 'center',
    includeFontPadding: Platform.OS === 'android' ? false : undefined,
  },
  resetButton: {
    marginTop: spacing.md,
  },
  resetButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resetButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successText: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
  },
  loginSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loginLink: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    color: '#EF4444',
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  generalErrorText: {
    ...typography.bodySmall,
    flex: 1,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;

