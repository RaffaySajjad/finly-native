/**
 * ReceiptGalleryScreen Component
 * Purpose: Display and manage all scanned receipts
 * Premium feature - receipt gallery with search and organization
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumBadge, UpgradePrompt } from '../components';
import receiptService from '../services/receiptService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { Receipt } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ReceiptGalleryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setFilteredReceipts(receipts);
    }
  }, [searchQuery, receipts]);

  const checkAccessAndLoad = async () => {
    if (requiresUpgrade('receiptScanning')) {
      setShowUpgradePrompt(true);
      return;
    }
    await loadReceipts();
  };

  const loadReceipts = async () => {
    try {
      const data = await receiptService.getReceipts();
      setReceipts(data);
      setFilteredReceipts(data);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const results = await receiptService.searchReceipts(query);
      setFilteredReceipts(results);
    } catch (error) {
      console.error('Error searching receipts:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReceipts();
  };

  const handleDeleteReceipt = (receipt: Receipt) => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await receiptService.deleteReceipt(receipt.id);
              await loadReceipts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete receipt');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#1A1A1A' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Receipt Gallery</Text>
          {!isPremium && <PremiumBadge size="small" />}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      {isPremium && (
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text }]}
            placeholder="Search receipts..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      >
        {filteredReceipts.length > 0 ? (
          <View style={styles.receiptsGrid}>
            {filteredReceipts.map((receipt) => (
              <TouchableOpacity
                key={receipt.id}
                style={[
                  styles.receiptCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  elevation.sm,
                ]}
                onPress={() => {
                  // Navigate to receipt details
                }}
                onLongPress={() => handleDeleteReceipt(receipt)}
              >
                <Image
                  source={{ uri: receipt.imageUri }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
                {receipt.extractedData && (
                  <View style={styles.receiptInfo}>
                    <Text style={[styles.receiptMerchant, { color: theme.text }]} numberOfLines={1}>
                      {receipt.extractedData.merchant}
                    </Text>
                    <Text style={[styles.receiptAmount, { color: theme.expense }]}>
                      {formatCurrency(receipt.extractedData.total)}
                    </Text>
                    <Text style={[styles.receiptDate, { color: theme.textSecondary }]}>
                      {formatDate(receipt.extractedData.date)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="image-multiple-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {searchQuery ? 'No receipts found' : 'No receipts yet'}
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary }]}>
              {searchQuery
                ? 'Try a different search term'
                : 'Scan receipts to see them here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Receipt Gallery"
        message="This premium feature allows you to view, search, and organize all your scanned receipts in one place."
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
    gap: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    paddingVertical: spacing.sm,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  receiptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  receiptCard: {
    width: '48%',
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F3F4F6',
  },
  receiptInfo: {
    padding: spacing.sm,
  },
  receiptMerchant: {
    ...typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  receiptAmount: {
    ...typography.titleMedium,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  receiptDate: {
    ...typography.bodySmall,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.titleMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default ReceiptGalleryScreen;

