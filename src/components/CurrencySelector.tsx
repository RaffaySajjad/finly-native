/**
 * CurrencySelector Component
 * Purpose: Reusable currency selection UI with "Recently Used" section
 * Features: Shows last 3 used currencies, then all other currencies
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrencies, getLastUsedCurrencies, Currency } from '../services/currencyService';
import { typography, spacing, borderRadius } from '../theme';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencySelect: (currencyCode: string) => void;
  renderContainer?: (children: React.ReactNode) => React.ReactNode;
  title?: string;
}

/**
 * CurrencySelector - Reusable currency selection component
 * @param selectedCurrency - Currently selected currency code
 * @param onCurrencySelect - Callback when currency is selected
 * @param renderContainer - Optional function to render custom container (for BottomSheet, Modal, etc.)
 * @param title - Optional title for the selector
 */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  onCurrencySelect,
  renderContainer,
  title = 'Select Currency',
}) => {
  const { theme } = useTheme();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [lastUsedCurrencies, setLastUsedCurrencies] = useState<string[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const currencyList = await getCurrencies();
      const lastUsed = await getLastUsedCurrencies();
      
      setCurrencies(currencyList);
      setLastUsedCurrencies(lastUsed);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const handleCurrencySelect = (currencyCode: string) => {
    onCurrencySelect(currencyCode);
  };

  // Get currencies that are in the recently used list (up to 3, excluding current selection)
  const recentlyUsedCurrencies = lastUsedCurrencies
    .filter(code => code !== selectedCurrency)
    .slice(0, 3)
    .map(code => currencies.find(c => c.code === code))
    .filter((curr): curr is Currency => curr !== undefined);

  // Get all other currencies (excluding recently used ones and current selection)
  const otherCurrencies = currencies.filter(
    curr => !lastUsedCurrencies.includes(curr.code) || curr.code === selectedCurrency
  );

  const renderCurrencyOption = (curr: Currency) => {
    const isSelected = selectedCurrency === curr.code;
    return (
      <TouchableOpacity
        key={curr.code}
        style={[
          styles.currencyOption,
          {
            backgroundColor: isSelected ? theme.primary + '20' : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
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
        {isSelected && (
          <Icon name="check-circle" size={24} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const content = (
    <>
      {title && <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}

      {loadingCurrencies ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          {/* Recently Used Section */}
          {recentlyUsedCurrencies.length > 0 && (
            <>
              <Text style={[styles.currencySectionTitle, { color: theme.textSecondary }]}>
                Recently Used
              </Text>
              {recentlyUsedCurrencies.map(renderCurrencyOption)}
              <Text
                style={[
                  styles.currencySectionTitle,
                  { color: theme.textSecondary, marginTop: spacing.md },
                ]}
              >
                All Currencies
              </Text>
            </>
          )}

          {/* All Other Currencies */}
          {otherCurrencies.map(renderCurrencyOption)}
        </>
      )}
    </>
  );

  // If custom container renderer is provided, use it; otherwise use default ScrollView
  if (renderContainer) {
    return <>{renderContainer(content)}</>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
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
    borderWidth: 1,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
    gap: spacing.sm,
  },
  currencyFlag: {
    fontSize: 24,
  },
  currencyCode: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  currencyName: {
    ...typography.bodyMedium,
  },
});

export default CurrencySelector;

