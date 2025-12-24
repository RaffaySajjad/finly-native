/**
 * VerificationScreen - Email Verification with OTP
 * Purpose: Verify user email using OTP sent to email
 * Features: OTP input, resend functionality, auto-login on success
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
import { useAlert } from '../hooks/useAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAppDispatch, useAppSelector } from '../store';
import { verifyEmail } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import authService from '../services/authService';

type VerificationNavigationProp = StackNavigationProp<AuthStackParamList, 'Verification'>;
type VerificationRouteProp = RouteProp<AuthStackParamList, 'Verification'>;

/**
 * VerificationScreen - Email verification interface
 */
const VerificationScreen: React.FC = () => {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<VerificationNavigationProp>();
  const route = useRoute<VerificationRouteProp>();
  const { showError, showSuccess, AlertComponent } = useAlert();

  const email = route.params?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  // Error state
  const [error, setError] = useState('');

  // Refs for OTP inputs
  const inputRefs = useRef<(TextInput | null)[]>([]);

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

    // Focus first OTP input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  }, []);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(''); // Clear error on typing

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit if all filled
    if (value && index === 5 && newOtp.every(d => d !== '')) {
       // Optional: auto submit
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await dispatch(verifyEmail({ email, otp: otpCode })).unwrap();
      // On success, the auth state changes and AppNavigator will automatically switch to Main App
    } catch (error: any) {
      setLoading(false);
      setError(error?.message || 'Verification failed. Please try again.');
      // Clear OTP on error? Maybe not all of it.
      // setOtp(['', '', '', '', '', '']);
      // inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await authService.resendVerificationEmail(email);
      showSuccess('Code Sent', 'A new verification code has been sent to your email');
      setResendTimer(60);
      setCanResend(false);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to resend code');
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
              
              <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                <Icon name="email-check" size={48} color={theme.primary} />
              </View>

              <Text style={[styles.title, { color: theme.text }]}>Verify Your Email</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter the 6-digit code sent to
              </Text>
              <Text style={[styles.email, { color: theme.primary }]}>{email}</Text>
            </Animated.View>

            {/* Verification Card */}
            <Animated.View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation.lg,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* OTP Input */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Verification Code
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: error ? theme.expense : (digit ? theme.primary : theme.border),
                        color: theme.text,
                      },
                      digit && { borderWidth: 2 },
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading}
                  />
                ))}
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                   <Icon name="alert-circle" size={16} color={theme.expense} />
                   <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
                </View>
              ) : null}

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: theme.primary }, elevation.md]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              {/* Resend Section */}
              <View style={styles.resendSection}>
                <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                  Didn't receive the code?{' '}
                </Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={[styles.resendLink, { color: theme.primary }]}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.resendTimer, { color: theme.textTertiary }]}>
                    Resend in {resendTimer}s
                  </Text>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  iconCircle: {
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
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  label: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  verifyButton: {
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  verifyButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resendSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    ...typography.bodySmall,
  },
  resendLink: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  resendTimer: {
    ...typography.bodySmall,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  errorText: {
    ...typography.bodySmall,
  },
});

export default VerificationScreen;
