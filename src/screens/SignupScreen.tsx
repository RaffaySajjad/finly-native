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
  Alert,
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
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return false;
    }

    // Validate name (min 2 chars, max 100)
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters long');
      return false;
    }

    if (name.length > 100) {
      Alert.alert('Invalid Name', 'Name must not exceed 100 characters');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return false;
    }

    // Validate password (min 8 chars, must contain uppercase, lowercase, and number)
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long');
      return false;
    }

    if (password.length > 128) {
      Alert.alert('Password Too Long', 'Password must not exceed 128 characters');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      const result = await dispatch(signupAction({ name, email, password })).unwrap();
      
      // Navigate to email verification screen immediately
      navigation.navigate('VerifyEmail', { email });
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Check Your Email',
          'We\'ve sent a verification code to your email address. Please check your inbox and enter the 6-digit code.'
        );
      }, 500);
    } catch (error) {
      Alert.alert('Signup Failed', error instanceof Error ? error.message : 'Please try again');
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
                <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Icon name="account-outline" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="John Doe"
                    placeholderTextColor={theme.textTertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Icon name="email-outline" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="your@email.com"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Icon name="lock-outline" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="At least 8 characters, uppercase, lowercase, number"
                    placeholderTextColor={theme.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Icon name="lock-check-outline" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={theme.textTertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, { backgroundColor: theme.primary }, elevation.md]}
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
});

export default SignupScreen;
