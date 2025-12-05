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
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrencyInput, parseCurrencyInput, currencyInputToNumber } from '../utils/currencyFormatter';
import { getCurrencies, getCurrencyByCode, Currency, getLastUsedCurrency } from '../services/currencyService';
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
  const [displayValue, setDisplayValue] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [lastUsedCurrency, setLastUsedCurrency] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

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

  const loadCurrencies = async () => {
    // Only show loading if currencies aren't already loaded
    if (currencies.length === 0) {
      setLoadingCurrencies(true);
    }

    try {
      const currencyList = await getCurrencies();
      const lastUsed = await getLastUsedCurrency();

      // Sort currencies: last used at top, then alphabetical
      const sortedList = [...currencyList];
      if (lastUsed) {
        const lastUsedIndex = sortedList.findIndex(c => c.code === lastUsed);
        if (lastUsedIndex > 0) {
          const [lastUsedCurrencyItem] = sortedList.splice(lastUsedIndex, 1);
          sortedList.unshift(lastUsedCurrencyItem);
        }
      }

      setCurrencies(sortedList);
      setLastUsedCurrency(lastUsed);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const handleCurrencySelect = (currencyCode: string) => {
    if (onCurrencyChange) {
      onCurrencyChange(currencyCode);
    }
    setShowCurrencyModal(false);
  };

  const handleSymbolPress = () => {
    if (allowCurrencySelection) {
      // If currencies are already loaded, show modal immediately
      if (currencies.length > 0) {
        setShowCurrencyModal(true);
      } else {
        // Otherwise load currencies first, then show modal
        loadCurrencies().then(() => {
          setShowCurrencyModal(true);
        });
      }
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
                {displaySymbol}
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
              <ScrollView style={styles.modalScrollView}>
                {loadingCurrencies ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                  </View>
                ) : (
                  <>
                    {lastUsedCurrency && lastUsedCurrency !== selectedCurrencyCode && (
                      <>
                        <Text style={[styles.currencySectionTitle, { color: theme.textSecondary }]}>Recently Used</Text>
                        {currencies
                          .filter(c => c.code === lastUsedCurrency)
                          .map((curr) => (
                            <TouchableOpacity
                              key={curr.code}
                              style={[
                                styles.currencyOption,
                                {
                                  backgroundColor: selectedCurrencyCode === curr.code ? theme.primary + '20' : theme.card,
                                  borderColor: selectedCurrencyCode === curr.code ? theme.primary : theme.border,
                                },
                              ]}
                              onPress={() => handleCurrencySelect(curr.code)}
                            >
                              <View style={styles.currencyInfo}>
                                <View style={styles.currencyHeader}>
                                  <Text style={styles.currencyFlag}>{curr.flag}</Text>
                                  <Text style={[styles.currencyCode, { color: theme.text }]}>{curr.code}</Text>
                                </View>
                                <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                                  {curr.name}
                                </Text>
                              </View>
                              {selectedCurrencyCode === curr.code && (
                                <Icon name="check-circle" size={24} color={theme.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        <Text style={[styles.currencySectionTitle, { color: theme.textSecondary, marginTop: spacing.md }]}>All Currencies</Text>
                      </>
                    )}
                    {currencies
                      .filter(c => !lastUsedCurrency || c.code !== lastUsedCurrency || c.code === selectedCurrencyCode)
                      .map((curr) => (
                        <TouchableOpacity
                          key={curr.code}
                          style={[
                            styles.currencyOption,
                            {
                              backgroundColor: selectedCurrencyCode === curr.code ? theme.primary + '20' : theme.card,
                              borderColor: selectedCurrencyCode === curr.code ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => handleCurrencySelect(curr.code)}
                        >
                          <View style={styles.currencyInfo}>
                            <View style={styles.currencyHeader}>
                              <Text style={styles.currencyFlag}>{curr.flag}</Text>
                              <Text style={[styles.currencyCode, { color: theme.text }]}>{curr.code}</Text>
                            </View>
                            <Text style={[styles.currencyName, { color: theme.textSecondary }]}>
                              {curr.name}
                            </Text>
                          </View>
                          {selectedCurrencyCode === curr.code && (
                            <Icon name="check-circle" size={24} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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

