/**
 * Receipt Service
 * Purpose: Manage receipt storage and retrieval
 * Premium feature - receipt gallery and organization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt } from '../types';

const RECEIPTS_STORAGE_KEY = '@finly_receipts';

/**
 * Save a receipt
 */
export async function saveReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
  try {
    const receipts = await getReceipts();
    const newReceipt: Receipt = {
      ...receipt,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    receipts.push(newReceipt);
    await AsyncStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
    return newReceipt;
  } catch (error) {
    console.error('Error saving receipt:', error);
    throw error;
  }
}

/**
 * Get all receipts
 */
export async function getReceipts(): Promise<Receipt[]> {
  try {
    const data = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading receipts:', error);
    return [];
  }
}

/**
 * Get receipt by ID
 */
export async function getReceiptById(id: string): Promise<Receipt | null> {
  try {
    const receipts = await getReceipts();
    return receipts.find((r) => r.id === id) || null;
  } catch (error) {
    console.error('Error getting receipt:', error);
    return null;
  }
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(id: string): Promise<void> {
  try {
    const receipts = await getReceipts();
    const filtered = receipts.filter((r) => r.id !== id);
    await AsyncStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting receipt:', error);
    throw error;
  }
}

/**
 * Search receipts
 */
export async function searchReceipts(query: string): Promise<Receipt[]> {
  try {
    const receipts = await getReceipts();
    const queryLower = query.toLowerCase();

    return receipts.filter((receipt) => {
      const merchant = receipt.extractedData?.merchant.toLowerCase() || '';
      // Search in merchant name and items if available
      const itemNames = receipt.extractedData?.items?.map(i => i.name.toLowerCase()).join(' ') || '';
      return merchant.includes(queryLower) || itemNames.includes(queryLower);
    });
  } catch (error) {
    console.error('Error searching receipts:', error);
    return [];
  }
}

/**
 * Get receipts by category
 */
export async function getReceiptsByCategory(category: string): Promise<Receipt[]> {
  try {
    const receipts = await getReceipts();
    return receipts.filter((r) => r.category === category);
  } catch (error) {
    console.error('Error filtering receipts:', error);
    return [];
  }
}

export default {
  saveReceipt,
  getReceipts,
  getReceiptById,
  deleteReceipt,
  searchReceipts,
  getReceiptsByCategory,
};

