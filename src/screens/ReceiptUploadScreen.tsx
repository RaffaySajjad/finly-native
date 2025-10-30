/**
 * ReceiptUploadScreen - Receipt Scanner with Mock OCR
 * Purpose: Allow users to scan receipts and extract data automatically
 * Features: Image picker, animated scanning, OCR simulation
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt, PremiumBadge } from '../components';
import { apiService } from '../services/api';
import receiptService from '../services/receiptService';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type ReceiptUploadNavigationProp = StackNavigationProp<RootStackParamList, 'ReceiptUpload'>;

/**
 * ReceiptUploadScreen - Scan and process receipts
 */
const ReceiptUploadScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ReceiptUploadNavigationProp>();
  const { isPremium, requiresUpgrade, trackUsage, getRemainingUsage } = useSubscription();

  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Animation values
  const scanLinePosition = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Removed automatic permission request - permissions will be requested on demand

  useEffect(() => {
    if (scanning) {
      // Start scanning animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLinePosition, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLinePosition, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLinePosition.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  useEffect(() => {
    if (image) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [image]);

  const pickImageFromGallery = async () => {
    try {
      // Request media library permissions only when user chooses gallery
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need access to your photo library to select receipts!'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const captureImage = async () => {
    try {
      // Request camera permissions only when user chooses to take photo
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos of receipts!'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image');
      console.error(error);
    }
  };

  const scanReceipt = async () => {
    if (!image) {
      Alert.alert('No Image', 'Please select or capture a receipt first');
      return;
    }

    // Check premium access
    if (requiresUpgrade('receiptScanning')) {
      setShowUpgradePrompt(true);
      return;
    }

    setScanning(true);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Simulate OCR extraction
      const extractedData = await apiService.extractReceiptData(image);

      // Track usage for free tier
      trackUsage('receiptScanning');

      // Save receipt to gallery (premium feature)
      if (isPremium) {
        await receiptService.saveReceipt({
          imageUri: image,
          extractedData: {
            merchant: extractedData.description.split(' - ')[0] || extractedData.description,
            date: new Date().toISOString(),
            total: extractedData.amount,
          },
          category: extractedData.category,
        });
      }

      // Success haptic
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setScanning(false);

      // Navigate to Add Expense screen with pre-filled data
      navigation.navigate('AddExpense', {
        expense: extractedData,
      });
    } catch (error) {
      setScanning(false);
      Alert.alert('Scan Failed', 'Could not extract receipt data. Please try again.');
      console.error(error);
    }
  };

  const scanLineTranslateY = scanLinePosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Scan Receipt</Text>
        {isPremium && (
          <TouchableOpacity
            onPress={() => navigation.navigate('ReceiptGallery')}
            style={styles.galleryButton}
          >
            <Icon name="image-multiple" size={24} color={theme.primary} />
          </TouchableOpacity>
        )}
        {!isPremium && <View style={{ width: 40 }} />}
      </View>

      <View style={styles.content}>
        {!image ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[theme.primary + '20', theme.primary + '10']}
              style={styles.emptyIconContainer}
            >
              <Icon name="receipt-text-outline" size={80} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Upload a Receipt
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Take a photo or select from your gallery to automatically extract transaction details
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.primary },
                  elevation.md,
                ]}
                onPress={captureImage}
              >
                <Icon name="camera" size={24} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  elevation.sm,
                ]}
                onPress={pickImageFromGallery}
              >
                <Icon name="image" size={24} color={theme.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
            <View style={[styles.imagePreview, { backgroundColor: theme.card }, elevation.md]}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
              
              {scanning && (
                <>
                  <View style={styles.scanOverlay}>
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          transform: [
                            { translateY: scanLineTranslateY },
                            { scale: pulseAnim },
                          ],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={[
                          'transparent',
                          theme.primary + '80',
                          theme.primary,
                          theme.primary + '80',
                          'transparent',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.scanLineGradient}
                      />
                    </Animated.View>
                  </View>
                  <View style={styles.scanningBadge}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.scanningText}>Scanning receipt...</Text>
                  </View>
                </>
              )}
            </View>

            {!scanning && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.changeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => {
                    setImage(null);
                    fadeAnim.setValue(0);
                  }}
                >
                  <Icon name="close" size={20} color={theme.textSecondary} />
                  <Text style={[styles.changeButtonText, { color: theme.textSecondary }]}>
                    Change Image
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scanButton,
                    { backgroundColor: theme.primary },
                    elevation.md,
                  ]}
                  onPress={scanReceipt}
                >
                  <Icon name="scan-helper" size={24} color="#FFFFFF" />
                  <Text style={styles.scanButtonText}>Scan Receipt</Text>
                </TouchableOpacity>
              </View>
            )}

            {scanning && (
              <View style={styles.scanningInfo}>
                <Text style={[styles.scanningInfoText, { color: theme.textSecondary }]}>
                  📊 Extracting transaction details...
                </Text>
                <Text style={[styles.scanningInfoSubtext, { color: theme.textTertiary }]}>
                  This usually takes 1-2 seconds
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Receipt Scanning"
        message={
          !isPremium
            ? `You've used ${Math.max(0, 3 - getRemainingUsage('receiptScanning'))} of 3 free scans this month. Upgrade to Premium for unlimited receipt scanning.`
            : undefined
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  galleryButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
  },
  imagePreview: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanLine: {
    width: '100%',
    height: 3,
    position: 'absolute',
    top: 0,
  },
  scanLineGradient: {
    width: '100%',
    height: '100%',
  },
  scanningBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  scanningText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  changeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  changeButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  scanButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  scanButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scanningInfo: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  scanningInfoText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  scanningInfoSubtext: {
    ...typography.bodySmall,
  },
});

export default ReceiptUploadScreen;

