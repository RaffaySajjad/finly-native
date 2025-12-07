/**
 * Biometric Authentication Service
 * Purpose: Handle biometric authentication (Face ID, Touch ID, Fingerprint)
 * Used for sensitive operations like account deletion
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';

/**
 * Check if biometric hardware is available on the device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return false;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Get the types of biometric authentication available
 */
export const getBiometricTypes = async (): Promise<string[]> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const typeNames: string[] = [];

    types.forEach(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          typeNames.push('Fingerprint');
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          typeNames.push('Face ID');
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          typeNames.push('Iris');
          break;
      }
    });

    return typeNames;
  } catch (error) {
    console.error('Error getting biometric types:', error);
    return [];
  }
};

/**
 * Get a user-friendly biometric name for prompts
 */
export const getBiometricName = async (): Promise<string> => {
  const types = await getBiometricTypes();
  
  if (types.length === 0) {
    return 'biometric authentication';
  }

  if (Platform.OS === 'ios') {
    return types.includes('Face ID') ? 'Face ID' : 'Touch ID';
  }

  return types.includes('Fingerprint') ? 'fingerprint' : 'biometric authentication';
};

/**
 * Authenticate user with biometrics
 * @param promptMessage - Custom message to show in the authentication prompt
 * @param cancelLabel - Custom label for the cancel button (Android)
 * @returns Promise<boolean> - true if authenticated successfully, false otherwise
 */
export const authenticateWithBiometrics = async (
  promptMessage: string = 'Authenticate to continue',
  cancelLabel: string = 'Cancel'
): Promise<boolean> => {
  try {
    // Check if biometrics are available
    const available = await isBiometricAvailable();
    if (!available) {
      console.warn('Biometric authentication not available');
      return false;
    }

    // Attempt authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      fallbackLabel: 'Use Passcode', // iOS fallback
      disableDeviceFallback: false, // Allow device passcode as fallback
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
};

/**
 * Authenticate for account deletion - specialized method with proper messaging
 */
export const authenticateForAccountDeletion = async (): Promise<boolean> => {
  const biometricName = await getBiometricName();
  const message = Platform.OS === 'ios'
    ? `Authenticate with ${biometricName} to delete your account`
    : 'Authenticate to delete your account';

  return authenticateWithBiometrics(message, 'Cancel');
};

/**
 * Check if biometric login is enabled in settings
 */
export const isBiometricLoginEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking biometric preference:', error);
    // Default to false on error to avoid lockout loops
    return false;
  }
};

/**
 * Enable biometric login
 * returns true if successful
 */
export const enableBiometricLogin = async (): Promise<boolean> => {
  try {
    // Verify one last time that it works before enabling
    const authenticated = await authenticateWithBiometrics(
      'Confirm biometrics to enable login',
      'Cancel'
    );

    if (authenticated) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    return false;
  }
};

/**
 * Disable biometric login
 */
export const disableBiometricLogin = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
  } catch (error) {
    console.error('Error disabling biometric login:', error);
  }
};

