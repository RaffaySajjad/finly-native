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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useCurrency } from '../contexts/CurrencyContext';
import { useBottomSheetActions } from '../contexts/BottomSheetContext';
import { UpgradePrompt, PremiumBadge } from '../components';
import { GradientHeader } from '../components/GradientHeader';
import { apiService } from '../services/api';
import receiptService from '../services/receiptService';
import { extractReceiptTransactions } from '../services/receiptOCRService';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Category } from '../types';
import { reviewService } from '../services/reviewService';

type ReceiptUploadNavigationProp = StackNavigationProp<RootStackParamList, 'ReceiptUpload'>;

/**
 * ReceiptUploadScreen - Scan and process receipts
 */
const ReceiptUploadScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ReceiptUploadNavigationProp>();
  const { isPremium, requiresUpgrade, trackUsage, getRemainingUsage } = useSubscription();
  const { currencyCode } = useCurrency();
  const { openBottomSheet } = useBottomSheetActions();

  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Animation values
  const scanLinePosition = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Removed automatic permission request - permissions will be requested on demand

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Extract transactions from receipt using AI OCR
      const extractedTransactions = await extractReceiptTransactions(image, currencyCode);

      if (!extractedTransactions || extractedTransactions.length === 0) {
        Alert.alert(
          'No Info Found',
          'We couldn\'t read the transaction details. Try a clearer photo.'
        );
        setScanning(false);
        return;
      }

      // Track usage for free tier
      trackUsage('receiptScanning');

      // Separate expenses and income transactions
      const expenseTransactions = extractedTransactions.filter(tx => tx.type === 'expense');
      const incomeTransactions = extractedTransactions.filter(tx => tx.type === 'income');

      // Process expenses and income separately
      if (expenseTransactions.length > 0) {
        // Handle expense transactions
        let combinedExpense;

        if (expenseTransactions.length > 1) {
          // Combine multiple expense transactions
          const totalAmount = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);
          const totalOriginalAmount = expenseTransactions.reduce(
            (sum, tx) => sum + (tx.originalAmount || 0),
            0
          );

          const firstTx = expenseTransactions[0];
          const allSameCurrency = expenseTransactions.every(
            tx => tx.originalCurrency === firstTx.originalCurrency
          );

          const merchantName = firstTx.description.split(' - ')[0] ||
            firstTx.description.split(' ')[0] ||
            'Receipt';

          combinedExpense = {
            amount: totalAmount,
            description: `${merchantName} - ${expenseTransactions.length} items`,
            categoryId: firstTx.categoryId!,
            date: firstTx.date,
            originalAmount: allSameCurrency && totalOriginalAmount > 0
              ? totalOriginalAmount 
              : firstTx.originalAmount,
            originalCurrency: firstTx.originalCurrency,
          };
        } else {
          combinedExpense = {
            amount: expenseTransactions[0].amount,
            description: expenseTransactions[0].description,
            categoryId: expenseTransactions[0].categoryId!,
            date: expenseTransactions[0].date,
            originalAmount: expenseTransactions[0].originalAmount,
            originalCurrency: expenseTransactions[0].originalCurrency,
          };
        }

        // Build a temp Expense object so SharedBottomSheet can prefill fields immediately.
        // We mark it with a temp id so save logic creates a new expense (not "update").
        const nowIso = new Date().toISOString();
        const categoryFallback = categories.find((c) => c.id === combinedExpense.categoryId) || categories[0];
        const prefillExpense = {
          id: `temp-expense-receipt-${Date.now()}`,
          amount: combinedExpense.amount,
          categoryId: combinedExpense.categoryId || categoryFallback?.id,
          category: categoryFallback
            ? { id: categoryFallback.id, name: categoryFallback.name, icon: categoryFallback.icon, color: categoryFallback.color }
            : { id: combinedExpense.categoryId, name: 'Uncategorized', icon: 'help-circle-outline', color: '#9CA3AF' },
          description: combinedExpense.description,
          date: combinedExpense.date,
          createdAt: nowIso,
          updatedAt: nowIso,
          originalAmount: combinedExpense.originalAmount,
          originalCurrency: combinedExpense.originalCurrency,
        };

        // Save receipt to gallery (premium feature) - only for expenses
        if (isPremium) {
          const merchantName = combinedExpense.description.split(' - ')[0] || combinedExpense.description;
          await receiptService.saveReceipt({
            imageUrl: image,
            extractedData: {
              merchant: merchantName,
              date: combinedExpense.date,
              total: combinedExpense.amount,
            },
            categoryId: prefillExpense.categoryId,
          });
        }

        // Open SharedBottomSheet with pre-filled expense data
        openBottomSheet(prefillExpense);

        // Track receipt scan as valuable action for review prompts
        reviewService.trackValuableAction('receipt_scan');
      }

      if (incomeTransactions.length > 0) {
        // Handle income transactions - open bottom sheet with income pre-filled
        // For now, navigate back and let user manually add via bottom sheet
        // In future, we can add a navigation param to pre-fill income
        Alert.alert(
          'Incoming Money!',
          `We found ${incomeTransactions.length} income transaction(s). Head to the income tab to add it.`,
          [{ text: 'OK' }]
        );
      }

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setScanning(false);
    } catch (error: any) {
      setScanning(false);

      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Extract user-friendly error message
      const errorMessage = error?.message || 'Couldn\'t capture that. Try again with a clearer photo?';

      Alert.alert(
        'Try Again',
        errorMessage,
        [
          {
            text: 'Try Again',
            style: 'default',
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // Optionally clear the image to allow user to select a new one
              setImage(null);
              fadeAnim.setValue(0);
            },
          },
        ]
      );
      console.error('[ReceiptUpload] OCR error:', error);
    }
  };

  const scanLineTranslateY = scanLinePosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GradientHeader />
      <View style={[styles.header, { marginTop: insets.top }]}>
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
              Snap a photo or pick from gallery. We'll handle the rest.
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
                      <Text style={styles.scanningText}>Reading receipt details...</Text>
                    </View>
                </>
              )}
            </View>

            {!scanning && (
                <>
                  <View style={styles.disclaimerContainer}>
                    <Icon name="information" size={16} color={theme.textSecondary} />
                    <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                      AI may make mistakes. Please double-check the extracted transaction details before accepting.
                    </Text>
                  </View>
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
                        Cancel
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
                </>
            )}

            {scanning && (
              <View style={styles.scanningInfo}>
                <Text style={[styles.scanningInfoText, { color: theme.textSecondary }]}>
                    ✨ Reading receipt details...
                  </Text>
                  <Text style={[styles.scanningInfoSubtext, { color: theme.textTertiary }]}>
                    Just a moment.
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
            ? 'You\'ve mastered the basics! Unlock unlimited scanning to track every single expense with ease.'
            : undefined
        }
      />
    </View>
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
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  disclaimerText: {
    ...typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
});

export default ReceiptUploadScreen;
