/**
 * SignupScreen - User Registration
 * Purpose: Allows new users to create an account
 * Features: Form validation, password confirmation, elegant animations
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
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '../components/GradientHeader';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAppDispatch, useAppSelector } from '../store';
import { signup as signupAction } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAlert } from '../hooks/useAlert';
import { AnimatedInput } from '../components/AnimatedInput';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { GlowButton } from '../components/PremiumComponents';

type SignupNavigationProp = StackNavigationProp<AuthStackParamList, 'Signup'>;

/**
 * SignupScreen - User registration interface
 */
const SignupScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { isLoading: authLoading } = useAppSelector((state) => state.auth);
  const navigation = useNavigation<SignupNavigationProp>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  
  // Alert hook (only for success message)
  const { showSuccess, AlertComponent } = useAlert();

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
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = (): boolean => {
    // Clear previous errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    let isValid = true;

    // Validate name
    if (!name.trim()) {
      setNameError('Please enter your name');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters long');
      isValid = false;
    } else if (name.length > 100) {
      setNameError('Name must not exceed 100 characters');
      isValid = false;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError('Please enter your email');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Please enter a valid email address');
        isValid = false;
      }
    }

    // Validate password
    if (!password) {
      setPasswordError('Please enter a password');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      isValid = false;
    } else if (password.length > 128) {
      setPasswordError('Password must not exceed 128 characters');
      isValid = false;
    } else {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        setPasswordError('Must contain uppercase, lowercase, and number');
        isValid = false;
      }
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async () => {
    // Clear general error
    setGeneralError('');
    
    if (!validateForm()) return;

    try {
      console.log('[SignupScreen] Starting signup process...');
      const result = await dispatch(signupAction({ name, email, password })).unwrap();
      console.log('[SignupScreen] Signup successful, result:', result);
      
      // Navigate to verification screen with email
      navigation.navigate('Verification', { email });
    } catch (error: any) {
      console.error('[SignupScreen] Signup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed. Please try again.';

      // Show error above the button
      setGeneralError(errorMessage);
      // Clear field errors to avoid confusion
      setEmailError('');
      setPasswordError('');
      setNameError('');
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
              <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Join Finly and start managing your finances
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
              {/* Name Input */}
              <AnimatedInput
                label="Full Name"
                icon="account-outline"
                placeholder="John Doe"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError('');
                  if (generalError) setGeneralError('');
                }}
                error={nameError}
                isValid={!nameError && name.length >= 2}
                autoCapitalize="words"
              />

              {/* Email Input */}
              <AnimatedInput
                label="Email"
                icon="email-outline"
                placeholder="you@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                  if (generalError) setGeneralError('');
                }}
                error={emailError}
                isValid={!emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Password Input */}
              <View>
                <AnimatedInput
                  label="Password"
                  icon="lock-outline"
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                    if (generalError) setGeneralError('');
                    if (confirmPassword && text === confirmPassword && confirmPasswordError) {
                      setConfirmPasswordError('');
                    }
                  }}
                  error={passwordError}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />
                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator password={password} />
              </View>

              {/* Confirm Password Input */}
              <AnimatedInput
                label="Confirm Password"
                icon="lock-check-outline"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (generalError) setGeneralError('');
                  if (confirmPasswordError) {
                    if (text === password) {
                      setConfirmPasswordError('');
                    } else {
                      setConfirmPasswordError('Passwords do not match');
                    }
                  }
                }}
                error={confirmPasswordError}
                isValid={!confirmPasswordError && confirmPassword === password && confirmPassword.length > 0}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {/* General Error Message */}
              {generalError && (
                <View style={[styles.generalErrorContainer, { backgroundColor: theme.expense + '10', borderColor: theme.expense + '30' }]}>
                  <Icon name="alert-circle-outline" size={18} color={theme.expense} />
                  <Text style={[styles.generalErrorText, { color: theme.expense }]}>{generalError}</Text>
                </View>
              )}

              {/* Terms and Privacy Consent */}
              <Text style={[styles.consentText, { color: theme.textSecondary }]}>
                By creating an account, you agree to our{' '}
                <Text
                  style={[styles.linkText, { color: theme.primary }]}
                  onPress={() => navigation.navigate('TermsOfService')}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  style={[styles.linkText, { color: theme.primary }]}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy Policy
                </Text>
              </Text>

              {/* Signup Button */}
              <GlowButton
                onPress={handleSignup}
                variant="primary"
                glowIntensity="medium"
                disabled={authLoading}
                style={[
                  styles.signupButton,
                  generalError && { marginTop: spacing.md },
                ]}
              >
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.signupButtonText}>Create Account</Text>
                )}
              </GlowButton>
            </Animated.View>

            {/* Login Link */}
            <Animated.View style={[styles.loginSection, { opacity: fadeAnim }]}>
              <Text style={[styles.loginText, { color: theme.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: theme.primary }]}>Log In</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      
      {/* Alert Dialog */}
      {AlertComponent}
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
    padding: spacing.lg,
    paddingTop: spacing.md + 44, // Account for status bar
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
  signupButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  signupButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    ...typography.bodyMedium,
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
  consentText: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 12,
  },
  linkText: {
    fontWeight: '600',
  },
});

export default SignupScreen;
