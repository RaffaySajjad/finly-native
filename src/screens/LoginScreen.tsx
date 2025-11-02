/**
 * LoginScreen - User Authentication
 * Purpose: Allows users to log into their account
 * Features: Email/password validation, elegant animations, keyboard handling
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
import { login as loginAction } from '../store/slices/authSlice';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { AuthStackParamList } from '../navigation/types';

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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password');
      return;
    }

    try {
      await dispatch(loginAction({ email, password })).unwrap();
      // Navigation handled by root navigator after auth state changes
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'Please try again');
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
                    placeholder="Enter your password"
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

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: theme.primary }, elevation.md]}
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
});

export default LoginScreen;
