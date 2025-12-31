import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../hooks/useAlert';
import { useAppDispatch } from '../store';
import { deleteAccount as deleteAccountAction } from '../store/slices/authSlice';
import {
  isBiometricAvailable,
  authenticateForAccountDeletion,
  getBiometricName,
} from '../services/biometricService';
import { BottomSheetBackground, PrimaryButton, InputGroup } from '../components';
import { typography, spacing, borderRadius } from '../theme';

export interface DeleteAccountSheetRef {
  open: () => void;
  close: () => void;
}

interface DeleteAccountSheetProps {
  onSuccess?: () => void;
}

const DeleteAccountSheet = forwardRef<DeleteAccountSheetRef, DeleteAccountSheetProps>(({ onSuccess }, ref) => {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const { showError, showWarning, AlertComponent } = useAlert();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [reasonForDeletion, setReasonForDeletion] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setReasonForDeletion('');
      setFeedback('');
      setFeedback('');
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleDelete = async () => {
    // Show final confirmation alert before proceeding
    showWarning(
      'Final Confirmation',
      'This will permanently delete all your data including:\n\n• All transactions\n• All categories and budgets\n• All income sources\n• All receipts\n• All tags\n• All preferences\n\nThis action cannot be undone. You will be signed out immediately.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Check if biometric authentication is available
              const biometricAvailable = await isBiometricAvailable();

              if (biometricAvailable) {
                // Trigger biometric authentication
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                const biometricName = await getBiometricName();
                const authenticated = await authenticateForAccountDeletion();

                if (!authenticated) {
                  // Biometric authentication failed or was cancelled
                  setIsLoading(false);
                  showWarning(
                    'Authentication Required',
                    `${biometricName} authentication is required to delete your account. Please try again.`
                  );
                  return;
                }
              }

              // Proceed with account deletion with feedback
              await dispatch(deleteAccountAction({
                reasonForDeletion: reasonForDeletion.trim() || undefined,
                feedback: feedback.trim() || undefined,
              })).unwrap();

              // Close feedback sheet after success
              bottomSheetRef.current?.dismiss();

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              
              if (onSuccess) {
                onSuccess();
              }
            } catch (error) {
              showError('Error', 'Failed to delete account. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={['75%']}
      enablePanDownToClose
      backgroundComponent={BottomSheetBackground}
      handleIndicatorStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        style={styles.bottomSheetContent}
        contentContainerStyle={styles.bottomSheetContentContainer}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.expense + '20' }]}>
            <Icon name="delete-forever" size={32} color={theme.expense} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Delete Account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We're sorry to see you go. Please let us know why you're leaving so we can improve.
          </Text>
        </View>

        <InputGroup
          label="Reason for leaving (Optional)"
          placeholder="e.g., Found another app, Too expensive..."
          value={reasonForDeletion}
          onChangeText={setReasonForDeletion}
          TextInputComponent={BottomSheetTextInput}
        />

        <InputGroup
          label="Additional Feedback (Optional)"
          placeholder="What could we have done better?"
          value={feedback}
          onChangeText={setFeedback}
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
          TextInputComponent={BottomSheetTextInput}
        />

        <View style={styles.warningContainer}>
          <Icon name="alert-circle-outline" size={20} color={theme.expense} />
          <Text style={[styles.warningText, { color: theme.expense }]}>
            This action is permanent and cannot be undone.
          </Text>
        </View>

        <PrimaryButton
          label={isLoading ? "Deleting Account..." : "Permanently Delete Account"}
          onPress={handleDelete}
          loading={isLoading}
          backgroundColor={theme.expense}
          fullWidth
        />
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => bottomSheetRef.current?.dismiss()}
        >
          <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
      {AlertComponent}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // Red transparent
  },
  warningText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    ...typography.labelLarge,
  },
});

export default DeleteAccountSheet;
