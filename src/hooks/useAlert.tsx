/**
 * useAlert Hook
 * Purpose: Provides a simple API for showing alert dialogs
 * Replaces Alert.alert with a modern, consistent experience
 */

import { useState, useCallback } from 'react';
import { AlertDialog, AlertType, AlertButton } from '../components/AlertDialog';

export interface ShowAlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
  });

  const showAlert = useCallback(
    (options: ShowAlertOptions) => {
      setAlertState({
        visible: true,
        title: options.title,
        message: options.message,
        type: options.type || 'default',
        buttons: options.buttons,
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Convenience methods for common alert types
  const showError = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      showAlert({ title, message, type: 'error', buttons });
    },
    [showAlert]
  );

  const showSuccess = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      showAlert({ title, message, type: 'success', buttons });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      showAlert({ title, message, type: 'warning', buttons });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, message: string, buttons?: AlertButton[]) => {
      showAlert({ title, message, type: 'info', buttons });
    },
    [showAlert]
  );

  const AlertComponent = (
    <AlertDialog
      visible={alertState.visible}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      buttons={alertState.buttons}
      onClose={hideAlert}
    />
  );

  return {
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    hideAlert,
    AlertComponent,
  };
};

