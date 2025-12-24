/**
 * Receipt OCR Service
 * Purpose: Extract transaction details from receipt images using AI
 * Uses OpenAI Vision API via backend endpoint
 */

import { Platform } from 'react-native';
import { uploadFile } from './fileUploadService';

export interface ExtractedTransaction {
  type: 'expense' | 'income';
  amount: number; // Amount in USD (for database storage)
  description: string;
  categoryId?: string;
  incomeSourceId?: string;
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
    console.log('[ReceiptOCR] Starting extraction with URI:', imageUri);
    console.log('[ReceiptOCR] Platform:', Platform.OS);
    console.log('[ReceiptOCR] Currency:', currencyCode);
    
    // Extract filename from URI
    const uriWithoutQuery = imageUri.split('?')[0];
    const filename = uriWithoutQuery.split('/').pop() || 'receipt.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';

    // Determine MIME type
    const mimeType =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
        ? 'image/png'
        : ext === 'gif'
        ? 'image/gif'
        : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

    // Create FormData for multipart upload
    const formData = new FormData();

    // In React Native, FormData accepts objects with uri, type, and name
    formData.append('image', {
      uri: imageUri,
      type: mimeType,
      name: filename
    } as any);

    // Build endpoint with query params
    const queryParams = currencyCode
      ? `?currencyCode=${encodeURIComponent(currencyCode)}`
      : '';
    const endpoint = `/ai/extract-receipt${queryParams}`;

    console.log('[ReceiptOCR] Uploading via fetch:', {
      uri: imageUri,
      type: mimeType,
      name: filename,
      endpoint
    });

    // Use native fetch-based upload (works on Android)
    const response = await uploadFile<ExtractedTransaction[]>(endpoint, formData, {
      timeout: 60000 // 60 seconds timeout for OCR
    });

    // Check if response indicates an error
    if (!response.success) {
      const errorMessage = response.error?.message || 'Failed to extract receipt data. Please try again.';
      
      // Handle specific error codes
      if (response.error?.statusCode === 413) {
        throw new Error('Image file is too large. Maximum size is 20MB.');
      }
      if (response.error?.statusCode === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      if (response.error?.statusCode === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    if (response.data && response.data.length > 0) {
      console.log('[ReceiptOCR] Extraction successful:', response.data.length, 'transactions found');
      return response.data;
    }

    console.warn('[ReceiptOCR] No transactions found in response');
    throw new Error('Could not extract transaction data from the receipt. Please try again with a clearer image.');
  } catch (error: any) {
    console.error('[ReceiptOCR] Extraction error:', error);
    throw error;
  }
}

/**
 * Check if receipt OCR is available
 */
export function isReceiptOCRAvailable(): boolean {
  // OCR is now available via backend
  return true;
}
