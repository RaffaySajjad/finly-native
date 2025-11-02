/**
 * VerifyEmailScreen - Email Verification with OTP
 * Purpose: Verify user's email address using OTP sent to their email
 * Features: OTP input, resend functionality, auto-submit
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAppDispatch, useAppSelector } from '../store';
import { verifyEmail, resendOTP } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { AuthStackParamList } from '../navigation/types';

type VerifyEmailNavigationProp = StackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
type VerifyEmailRouteProp = RouteProp<AuthStackParamList, 'VerifyEmail'>;

/**
 * VerifyEmailScreen - OTP verification interface
 */
const VerifyEmailScreen: React.FC = () => {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const navigation = useNavigation<VerifyEmailNavigationProp>();
  const route = useRoute<VerifyEmailRouteProp>();

  const email = route.params?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

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

    // Focus first input
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

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && value) {
      const otpCode = newOtp.join('');
      if (otpCode.length === 6) {
        handleVerify(otpCode);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter all 6 digits');
      return;
    }

    try {
      await dispatch(verifyEmail({ email, otp: code })).unwrap();
      Alert.alert('Success', 'Email verified successfully!');
      // Navigation handled by root navigator after auth state changes
    } catch (error) {
      Alert.alert('Verification Failed', error instanceof Error ? error.message : 'Invalid OTP. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await dispatch(resendOTP(email)).unwrap();
      Alert.alert('OTP Sent', 'A new verification code has been sent to your email');
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to resend OTP');
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
                We've sent a 6-digit code to
              </Text>
              <Text style={[styles.email, { color: theme.primary }]}>{email}</Text>
            </Animated.View>

            {/* OTP Input Card */}
            <Animated.View
              style={[
                styles.otpCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                elevation.lg,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Enter verification code
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: digit ? theme.primary : theme.border,
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
                    editable={!isLoading}
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: theme.primary }, elevation.md]}
                onPress={() => handleVerify()}
                disabled={isLoading || otp.join('').length !== 6}
                activeOpacity={0.9}
              >
                {isLoading ? (
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

            {/* Help Text */}
            <Animated.View style={[styles.helpSection, { opacity: fadeAnim }]}>
              <Icon name="information-outline" size={16} color={theme.textTertiary} />
              <Text style={[styles.helpText, { color: theme.textTertiary }]}>
                Check your spam folder if you don't see the email
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
    marginBottom: spacing.xxl,
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
  otpCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  label: {
    ...typography.labelMedium,
    marginBottom: spacing.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
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
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  helpText: {
    ...typography.bodySmall,
  },
});

export default VerifyEmailScreen;

