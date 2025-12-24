/**
 * ErrorBoundary Component
 * Purpose: Catch and handle React errors gracefully
 * Shows user-friendly error messages instead of crashing
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.expense + '20' }]}>
          <Icon name="alert-circle-outline" size={64} color={theme.expense} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Don't worry, your data is safe. Please try again or restart the app.
        </Text>

        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.errorTitle, { color: theme.text }]}>Error Details:</Text>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>
              {error.toString()}
            </Text>
            {error.stack && (
              <Text style={[styles.errorStack, { color: theme.textTertiary }]}>
                {error.stack}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.primary }, elevation.md]}
          onPress={onReset}
        >
          <Icon name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>Try Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyLarge,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    lineHeight: 24,
  },
  errorDetails: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  errorStack: {
    ...typography.bodySmall,
    fontFamily: 'monospace',
    fontSize: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  resetButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ErrorBoundary;

