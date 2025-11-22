/**
 * LoginScreen - User Authentication
 * Purpose: Allows users to log into their account
 * Features: Email/password validation, elegant animations, keyboard handling
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import { login as loginAction } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import authService from '../services/authService';
import { useAlert } from '../hooks/useAlert';

type LoginNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

/**
 * LoginScreen - User login interface
 */
const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const { isLoading: authLoading } = useAppSelector((state) => state.auth);
  const navigation = useNavigation<LoginNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  
  // Error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  
  // Alert hook (only for email verification info)
  const { showInfo, AlertComponent } = useAlert();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
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
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debug: Log when error states change
  useEffect(() => {
    console.log('[LoginScreen] Error states changed:', { emailError, passwordError, generalError, isMounted: isMountedRef.current });
  }, [emailError, passwordError, generalError]);

  const handleLogin = async () => {
    // Don't clear errors at the start - let them persist until user types or we set new ones
    // Only clear if we're about to show new validation errors
    let shouldClearErrors = false;

    // Validate fields
    if (!email.trim()) {
      setEmailError('Please enter your email');
      setPasswordError('');
      setGeneralError('');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      setPasswordError('');
      setGeneralError('');
      return;
    }

    if (!password) {
      setEmailError('');
      setPasswordError('Please enter your password');
      setGeneralError('');
      return;
    }

    // Clear errors only if we pass validation
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    try {
      await dispatch(loginAction({ email, password })).unwrap();
      // Navigation handled by root navigator after auth state changes
    } catch (error: any) {
      console.log('[LoginScreen] Login error caught:', error);
      console.log('[LoginScreen] Error type:', typeof error);
      console.log('[LoginScreen] Error structure:', JSON.stringify(error, null, 2));
      
      // Extract error information - handle both object and string errors
      let errorMessage: string = 'Invalid email or password. Please try again.';
      let errorCode: string | undefined;
      
      try {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.message) {
          errorMessage = error.message;
          errorCode = error.code;
        } else if (error?.payload) {
          // Handle case where error might be wrapped
          errorMessage = error.payload?.message || (typeof error.payload === 'string' ? error.payload : errorMessage);
          errorCode = error.payload?.code;
        } else if (error) {
          // Last resort - try to stringify or use toString
          errorMessage = String(error) || errorMessage;
        }
      } catch (parseError) {
        console.error('[LoginScreen] Error parsing error object:', parseError);
        // Keep default errorMessage
      }

      console.log('[LoginScreen] Extracted errorMessage:', errorMessage);
      console.log('[LoginScreen] Extracted errorCode:', errorCode);
      
      // Ensure we always have an error message
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = 'Invalid email or password. Please try again.';
      }

      // Check if error is due to unverified email
      const isEmailNotVerified =
        errorMessage?.toLowerCase().includes('verify your email') ||
        errorMessage?.toLowerCase().includes('email not verified') ||
        errorCode === 'EMAIL_NOT_VERIFIED';

      if (isEmailNotVerified) {
        // Show message about email verification with option to resend
        showInfo(
          'Email Not Verified',
          `Please check your email (${email}) and click the verification link to activate your account. If you didn't receive the email, please check your spam folder.`,
          [
            {
              text: 'Resend Email',
              onPress: () => handleResendVerificationEmail(email),
              style: 'default',
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Show inline error for login failures
        const errorLower = errorMessage.toLowerCase();
        const isAuthError = errorCode === 'AUTHENTICATION_ERROR' || errorLower.includes('authentication_error');
        const isValidationError = errorCode === 'VALIDATION_ERROR';
        
        console.log('[LoginScreen] Setting error display:', { errorMessage, errorCode, errorLower, isAuthError, isValidationError });
        
        // Use a function to set errors to ensure they're set even if component re-renders
        const setErrors = () => {
          if (!isMountedRef.current) {
            console.warn('[LoginScreen] Component unmounted, skipping error state update');
            return;
          }
          
          // For validation errors, show on the appropriate field or general
          if (isValidationError) {
            if (errorLower.includes('email') && (errorLower.includes('valid') || errorLower.includes('invalid') || errorLower.includes('format'))) {
              // Email validation error - show under email field
              setEmailError(errorMessage);
              setPasswordError('');
              setGeneralError('');
              console.log('[LoginScreen] Set email error (validation):', errorMessage);
            } else if (errorLower.includes('password')) {
              // Password validation error - show under password field
              setEmailError('');
              setPasswordError(errorMessage);
              setGeneralError('');
              console.log('[LoginScreen] Set password error (validation):', errorMessage);
            } else {
              // Other validation errors - show as general error
              setEmailError('');
              setPasswordError('');
              setGeneralError(errorMessage);
              console.log('[LoginScreen] Set general error (validation):', errorMessage);
            }
          } else if (isAuthError || errorLower.includes('invalid email or password')) {
            // This is a general authentication error - show on general error container
            setEmailError('');
            setPasswordError('');
            setGeneralError(errorMessage);
            console.log('[LoginScreen] Set general error (auth error):', errorMessage);
          } else if (errorLower.includes('email') && !errorLower.includes('password') && (errorLower.includes('user not found') || errorLower.includes('not found'))) {
            setEmailError(errorMessage);
            setPasswordError('');
            setGeneralError('');
            console.log('[LoginScreen] Set email error:', errorMessage);
          } else if (errorLower.includes('password') && !errorLower.includes('email') && (errorLower.includes('incorrect password') || errorLower.includes('invalid password') || errorLower.includes('wrong password'))) {
            setEmailError('');
            setPasswordError(errorMessage);
            setGeneralError('');
            console.log('[LoginScreen] Set password error:', errorMessage);
          } else {
            // Default: show general error for any other errors
            setEmailError('');
            setPasswordError('');
            setGeneralError(errorMessage);
            console.log('[LoginScreen] Set general error (default):', errorMessage);
          }
        };
        
        // Set errors immediately
        setErrors();
        
        // Also set after a brief delay to ensure they persist through any re-renders
        setTimeout(() => {
          if (isMountedRef.current) {
            setErrors();
            console.log('[LoginScreen] Re-applied error states after delay');
          }
        }, 100);
      }
    }
  };

  const handleResendVerificationEmail = async (emailAddress: string) => {
    if (isResendingEmail) return;

    setIsResendingEmail(true);
    setGeneralError('');
    try {
      await authService.resendVerificationEmail(emailAddress);
      // Success is handled by the info dialog
    } catch (error: any) {
      setGeneralError(error?.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setIsResendingEmail(false);
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
            {/* Login Form */}
            <>
            {/* Logo Section */}
            <Animated.View
              style={[
                styles.logoSection,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
                <Icon name="wallet" size={48} color="#FFFFFF" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Welcome to Finly</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Your smart finance companion
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
                    placeholder="Enter your password"
                    placeholderTextColor={theme.textTertiary}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError('');
                      if (generalError) setGeneralError('');
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

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {/* General Error Message */}
              {generalError && (
                <View style={[styles.generalErrorContainer, { backgroundColor: theme.expense + '10', borderColor: theme.expense + '30' }]}>
                  <Icon name="alert-circle-outline" size={18} color={theme.expense} />
                  <Text style={[styles.generalErrorText, { color: theme.expense }]}>{generalError}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { backgroundColor: theme.primary },
                  generalError && { marginTop: spacing.md },
                  elevation.md
                ]}
                onPress={handleLogin}
                disabled={authLoading}
                activeOpacity={0.9}
              >
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Signup Link */}
            <Animated.View style={[styles.signupSection, { opacity: fadeAnim }]}>
              <Text style={[styles.signupText, { color: theme.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={[styles.signupLink, { color: theme.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </Animated.View>
            </>
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
    height: Platform.OS === 'ios' ? 45 : undefined,
    textAlignVertical: 'center',
    includeFontPadding: Platform.OS === 'android' ? false : undefined
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  loginButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  loginButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  signupText: {
    ...typography.bodyMedium,
  },
  signupLink: {
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

export default LoginScreen;
