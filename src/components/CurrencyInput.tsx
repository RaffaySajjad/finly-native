/**
 * CurrencyInput Component
 * Purpose: Reusable currency input with real-time formatting
 * Features: Auto-formats with commas, shows currency symbol, handles decimals
 * Currency selection: Click symbol to select different currency for transaction
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrencyInput, parseCurrencyInput, currencyInputToNumber } from '../utils/currencyFormatter';
import { getCurrencyByCode, saveLastUsedCurrency } from '../services/currencyService';
import { CurrencySelector } from './CurrencySelector';
import { typography, spacing, borderRadius } from '../theme';

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  onValueChange?: (numericValue: number) => void;
  onCurrencyChange?: (currencyCode: string) => void;
  showSymbol?: boolean;
  allowDecimals?: boolean;
  containerStyle?: any;
  inputStyle?: any;
  symbolStyle?: any;
  large?: boolean;
  TextInputComponent?: React.ComponentType<any>;
  selectedCurrency?: string; // Optional: override the displayed currency
  allowCurrencySelection?: boolean; // Whether to allow clicking symbol to change currency
}

/**
 * CurrencyInput - A text input that automatically formats currency as user types
 * @param value - The numeric string value (without formatting)
 * @param onChangeText - Callback with unformatted string value
 * @param onValueChange - Optional callback with numeric value
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @param allowDecimals - Whether to allow decimals (default: true)
 * @param large - Use large text style (default: false)
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChangeText,
  onValueChange,
  onCurrencyChange,
  showSymbol = true,
  allowDecimals = true,
  containerStyle,
  inputStyle,
  symbolStyle,
  large = false,
  TextInputComponent = TextInput,
  selectedCurrency,
  allowCurrencySelection = false,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const { getCurrencySymbol, currencyCode } = useCurrency();
  const { isPremium } = useSubscription();
  const [displayValue, setDisplayValue] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Use selectedCurrency if provided, otherwise use current active currency
  // For display purposes, we show the selected currency (if set) or active currency
  const displayCurrencyCode = selectedCurrency || currencyCode;
  const displayCurrency = getCurrencyByCode(displayCurrencyCode);
  const displaySymbol = displayCurrency?.symbol || getCurrencySymbol();

  // For selection highlighting in modal, use selectedCurrency if set, otherwise active currency
  const selectedCurrencyCode = selectedCurrency || currencyCode;

  // Initialize display value from prop value
  useEffect(() => {
    if (value === '') {
      setDisplayValue('');
    } else {
      const formatted = formatCurrencyInput(value, allowDecimals);
      setDisplayValue(formatted);
    }
  }, [value, allowDecimals]);

  const handleCurrencySelect = async (currencyCode: string) => {
    // Save to last used currencies
    await saveLastUsedCurrency(currencyCode);
    
    if (onCurrencyChange) {
      onCurrencyChange(currencyCode);
    }
    setShowCurrencyModal(false);
  };

  const handleSymbolPress = () => {
    if (allowCurrencySelection) {
      if (!isPremium) {
        setShowUpgradePrompt(true);
        return;
      }
      setShowCurrencyModal(true);
    }
  };

  /**
   * Handle text change with real-time formatting
   */
  const handleChangeText = (text: string) => {
    // Format the input
    const formatted = formatCurrencyInput(text, allowDecimals);
    setDisplayValue(formatted);
    
    // Parse back to plain numeric string
    const plain = parseCurrencyInput(formatted);
    onChangeText(plain);
    
    // If onValueChange callback provided, call it with numeric value
    if (onValueChange) {
      const numericValue = currencyInputToNumber(formatted);
      onValueChange(numericValue);
    }
  };

  const textStyle = large ? styles.inputLarge : styles.input;
  const symbolTextStyle = large ? styles.symbolLarge : styles.symbol;

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        {showSymbol && (
          allowCurrencySelection ? (
            <TouchableOpacity
              onPress={handleSymbolPress}
              activeOpacity={0.7}
              style={styles.symbolButton}
            >
              <Text style={[symbolTextStyle, { color: theme.primary }, symbolStyle]}>
                {displaySymbol}
              </Text>
              <Icon name="chevron-down" size={14} color={theme.primary} style={styles.chevronIcon} />
            </TouchableOpacity>
          ) : (
              <Text style={[symbolTextStyle, { color: theme.text }, symbolStyle]}>
                {"  "}{displaySymbol}
              </Text>
            )
        )}
        <TextInputComponent
          {...textInputProps}
          style={[
            textStyle,
            { color: theme.text },
            inputStyle,
          ]}
          value={displayValue}
          onChangeText={handleChangeText}
          keyboardType="decimal-pad"
          placeholder={textInputProps.placeholder || '0.00'}
          placeholderTextColor={textInputProps.placeholderTextColor || theme.textTertiary}
        />
      </View>

      {/* Currency Selection Modal */}
      {allowCurrencySelection && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCurrencyModal}
          onRequestClose={() => setShowCurrencyModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setShowCurrencyModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                  <Icon name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <CurrencySelector
                selectedCurrency={selectedCurrencyCode}
                onCurrencySelect={handleCurrencySelect}
                title="" // Title is already shown in modal header
                renderContainer={(children) => (
                  <ScrollView style={styles.modalScrollView}>
                    {children}
                  </ScrollView>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Upgrade Prompt for Non-Premium Users */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Multi-Currency Transactions"
        message="Upgrade to Finly Pro to record expenses in any of 150+ currencies."
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbol: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  symbolLarge: {
    ...typography.displayMedium,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  symbolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  chevronIcon: {
    marginLeft: 2,
  },
  input: {
    ...typography.titleMedium,
    flex: 1,
  },
  inputLarge: {
    ...typography.displayMedium,
    fontWeight: '700',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  modalScrollView: {
    maxHeight: 500,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySectionTitle: {
    ...typography.labelMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  currencyFlag: {
    fontSize: 24,
  },
  currencyCode: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: 2,
  },
  currencyName: {
    ...typography.bodySmall,
  },
});

export default CurrencyInput;

