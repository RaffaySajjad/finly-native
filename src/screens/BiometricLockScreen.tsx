/**
 * Biometric Lock Screen
 * Purpose: Protects the app access when biometric security is enabled
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing } from '../theme';
import { authenticateWithBiometrics, getBiometricName } from '../services/biometricService';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlock }) => {
  const { theme } = useTheme();
  const [biometricName, setBiometricName] = useState('Biometrics');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    loadBiometricInfo();
    // Delay slightly to let the UI mount/render before auth prompt
    const timer = setTimeout(() => {
      handleAuthentication(); 
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Listen for app coming back to foreground to retry if needed? 
  // Maybe not necessary if we display a big button.

  const loadBiometricInfo = async () => {
    const name = await getBiometricName();
    setBiometricName(name);
  };

  const handleAuthentication = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      const success = await authenticateWithBiometrics(
        'Unlock Finly to continue',
        'Use Passcode' // Or 'Cancel' but usually we want to allow entry if bio fails via fallback if system allows
      );

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Auth error in lock screen:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <Icon name="shield-lock" size={64} color={theme.primary} />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>Finly AI is Locked</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Please authenticate with {biometricName} to access your finances.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleAuthentication}
          activeOpacity={0.8}
          disabled={isAuthenticating}
        >
          <Icon name={getIconName(biometricName)} size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {isAuthenticating ? 'Verifying...' : `Unlock with ${biometricName}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getIconName = (bioName: string): any => {
  const lower = bioName.toLowerCase();
  if (lower.includes('face')) return 'face-recognition';
  if (lower.includes('finger') || lower.includes('touch')) return 'fingerprint';
  return 'shield-check';
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headlineMedium,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLarge,
    marginBottom: spacing.xxl,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 30, // Pill shape
    gap: spacing.sm,
    minWidth: 200,
  },
  buttonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
