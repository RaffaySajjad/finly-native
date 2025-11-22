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
import { SafeAreaView } from 'react-native-safe-area-context';
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

type SignupNavigationProp = StackNavigationProp<AuthStackParamList, 'Signup'>;

/**
 * SignupScreen - User registration interface
 */
const SignupScreen: React.FC = () => {
  const { theme } = useTheme();
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
      
      // Show success message
      showSuccess(
        'Check Your Email',
        `We've sent a verification link to ${email}. Please check your inbox and click the link to verify your account. If you didn't receive the email, please check your spam folder.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      console.error('[SignupScreen] Signup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      
      // Try to determine which field has the error
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes('email') || errorLower.includes('already exists') || errorLower.includes('already registered')) {
        setEmailError(errorMessage);
      } else if (errorLower.includes('password')) {
        setPasswordError(errorMessage);
      } else if (errorLower.includes('name')) {
        setNameError(errorMessage);
      } else {
        setGeneralError(errorMessage);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
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
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.background,
                    borderColor: nameError ? theme.expense : theme.border,
                  }
                ]}>
                  <Icon name="account-outline" size={20} color={nameError ? theme.expense : theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="John Doe"
                    placeholderTextColor={theme.textTertiary}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (nameError) setNameError('');
                      if (generalError) setGeneralError('');
                    }}
                    autoCapitalize="words"
                  />
                </View>
                {nameError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{nameError}</Text>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
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
                    placeholder="your@email.com"
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
                  />
                </View>
                {emailError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{emailError}</Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.background,
                    borderColor: passwordError ? theme.expense : theme.border,
                  }
                ]}>
                  <Icon name="lock-outline" size={20} color={passwordError ? theme.expense : theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="At least 8 characters, uppercase, lowercase, number"
                    placeholderTextColor={theme.textTertiary}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError('');
                      if (generalError) setGeneralError('');
                      // Also clear confirm password error if passwords match
                      if (confirmPassword && text === confirmPassword && confirmPasswordError) {
                        setConfirmPasswordError('');
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={passwordError ? theme.expense : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{passwordError}</Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.background,
                    borderColor: confirmPasswordError ? theme.expense : theme.border,
                  }
                ]}>
                  <Icon name="lock-check-outline" size={20} color={confirmPasswordError ? theme.expense : theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={theme.textTertiary}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (generalError) setGeneralError('');
                      if (confirmPasswordError) {
                        // Clear error if passwords match
                        if (text === password) {
                          setConfirmPasswordError('');
                        } else {
                          setConfirmPasswordError('Passwords do not match');
                        }
                      }
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={confirmPasswordError ? theme.expense : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError && (
                  <Text style={[styles.errorText, { color: theme.expense }]}>{confirmPasswordError}</Text>
                )}
              </View>

              {/* General Error Message */}
              {generalError && (
                <View style={[styles.generalErrorContainer, { backgroundColor: theme.expense + '10', borderColor: theme.expense + '30' }]}>
                  <Icon name="alert-circle-outline" size={18} color={theme.expense} />
                  <Text style={[styles.generalErrorText, { color: theme.expense }]}>{generalError}</Text>
                </View>
              )}

              {/* Signup Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  { backgroundColor: theme.primary },
                  generalError && { marginTop: spacing.md },
                  elevation.md
                ]}
                onPress={handleSignup}
                disabled={authLoading}
                activeOpacity={0.9}
              >
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.signupButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>
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
    </SafeAreaView>
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
    paddingTop: spacing.md,
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
});

export default SignupScreen;
