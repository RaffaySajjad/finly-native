/**
 * Receipt OCR Service
 * Purpose: Extract transaction details from receipt images using AI
 * Uses OpenAI Vision API via backend endpoint
 */

import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/api.config';

export interface ExtractedTransaction {
  amount: number; // Amount in USD (for database storage)
  description: string;
  categoryId: string;
  date: string;
  originalAmount: number; // Original amount in user's currency
  originalCurrency: string; // User's currency code
}

/**
 * Extract transactions from receipt image using backend AI Vision API
 * @param imageUri - URI of the receipt image to process
 * @param currencyCode - Optional currency code (e.g., 'USD', 'PKR')
 * @returns Array of extracted transactions
 */
export async function extractReceiptTransactions(
  imageUri: string,
  currencyCode?: string
): Promise<ExtractedTransaction[]> {
  try {
    console.log('[ReceiptOCR] Starting extraction for:', imageUri);

    // Extract filename from URI
    const uriWithoutQuery = imageUri.split('?')[0];
    const filename = uriWithoutQuery.split('/').pop() || 'receipt.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Determine MIME type
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' 
      : ext === 'png' ? 'image/png' 
      : ext === 'gif' ? 'image/gif' 
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';

    // Create FormData for multipart upload
    const formData = new FormData();
    
    // In React Native, FormData accepts objects with uri, type, and name
    const fileUri = Platform.OS === 'ios' 
      ? imageUri // Keep full URI including file://
      : imageUri;

    formData.append('image', {
      uri: fileUri,
      type: mimeType,
      name: filename,
    } as any);

    // Build query params
    const queryParams = currencyCode ? `?currencyCode=${encodeURIComponent(currencyCode)}` : '';

    console.log('[ReceiptOCR] Uploading receipt image:', filename);

    // Make request with FormData
    const response = await apiClient.post<{ success: boolean; data: ExtractedTransaction[] }>(
      `/ai/extract-receipt${queryParams}`,
      formData,
      {
        timeout: 60000, // 60 seconds timeout for OCR
      }
    );

    if (response.data?.success && response.data?.data) {
      const transactions = response.data.data;
      console.log('[ReceiptOCR] Extraction successful:', transactions.length, 'transactions found');
      return transactions;
    }

    console.warn('[ReceiptOCR] Unexpected response format:', response.data);
    return [];
  } catch (error: any) {
    console.error('[ReceiptOCR] Extraction error:', error);
    
    // Provide user-friendly error messages
    if (error.response?.status === 413) {
      throw new Error('Image file is too large. Maximum size is 20MB.');
    }
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.error?.message || 'Invalid image format.');
    }

    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }

    throw new Error(error.message || 'Failed to extract receipt data. Please try again.');
  }
}

/**
 * Check if receipt OCR is available
 */
export function isReceiptOCRAvailable(): boolean {
  // OCR is now available via backend
  return true;
}

