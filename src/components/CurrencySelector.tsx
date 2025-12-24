/**
 * CurrencySelector Component
 * Purpose: Reusable currency selection UI with search and "Recently Used" section
 * Features: Search bar, shows last 3 used currencies, then all other currencies
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
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
 * CurrencySelector - Reusable currency selection component with search
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter currencies based on search query
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return currencies;
    }
    const query = searchQuery.toLowerCase().trim();
    return currencies.filter(
      (curr) =>
        curr.code.toLowerCase().includes(query) ||
        curr.name.toLowerCase().includes(query) ||
        curr.symbol.toLowerCase().includes(query)
    );
  }, [currencies, searchQuery]);

  // Get currencies that are in the recently used list (up to 3)
  const recentlyUsedCurrencies = useMemo(() => {
    if (searchQuery.trim()) return []; // Hide when searching
    return lastUsedCurrencies
      .slice(0, 3)
      .map(code => currencies.find(c => c.code === code))
      .filter((curr): curr is Currency => curr !== undefined);
  }, [currencies, lastUsedCurrencies, searchQuery]);

  // Get other currencies (excluding recently used ones when not searching)
  const otherCurrencies = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredCurrencies;
    }
    return currencies.filter(
      curr => !lastUsedCurrencies.slice(0, 3).includes(curr.code)
    );
  }, [currencies, filteredCurrencies, lastUsedCurrencies, searchQuery]);

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
            <Text style={[styles.currencySymbolBadge, { color: theme.textSecondary, backgroundColor: theme.background }]}>
              {curr.symbol}
            </Text>
          </View>
          <Text style={[styles.currencyName, { color: theme.textSecondary }]} numberOfLines={1}>
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

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Icon name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search currencies..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loadingCurrencies ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          {/* Recently Used Section */}
            {recentlyUsedCurrencies.length > 0 && !searchQuery.trim() && (
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
                  All Currencies ({currencies.length})
              </Text>
            </>
          )}

            {/* Search Results Header */}
            {searchQuery.trim() && (
              <Text style={[styles.currencySectionTitle, { color: theme.textSecondary }]}>
                {filteredCurrencies.length} {filteredCurrencies.length === 1 ? 'result' : 'results'}
              </Text>
            )}

            {/* No Results */}
            {searchQuery.trim() && filteredCurrencies.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="currency-usd-off" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No currencies found for "{searchQuery}"
                </Text>
              </View>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
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
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    paddingVertical: spacing.xs,
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
  currencySymbolBadge: {
    ...typography.labelSmall,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  currencyName: {
    ...typography.bodyMedium,
    marginLeft: 32 + spacing.sm, // Flag width + gap
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default CurrencySelector;

