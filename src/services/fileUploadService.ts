/**
 * File Upload Service
 * Purpose: Handle FormData file uploads using native fetch API
 * 
 * Note: Axios has known issues with FormData uploads on React Native Android.
 * This service uses the native fetch API which has proper FormData support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../config/api.config';

export interface UploadResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
  message?: string;
}

/**
 * Upload a file using FormData via native fetch API
 * This works reliably on both iOS and Android
 */
export async function uploadFile<T = any>(
  endpoint: string,
  formData: FormData,
  options: {
    timeout?: number;
  } = {}
): Promise<UploadResponse<T>> {
  const { timeout = 60000 } = options;
  
  try {
    // Get auth token
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    // Build full URL
    const baseUrl = `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`;
    const url = `${baseUrl}${endpoint}`;
    
    console.log('[FileUpload] Starting upload to:', url);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          // Don't set Content-Type - fetch will set it automatically with boundary for FormData
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Parse response
      const responseData = await response.json();
      
      console.log('[FileUpload] Response status:', response.status);
      console.log('[FileUpload] Response data:', JSON.stringify(responseData).substring(0, 200));
      
      if (!response.ok) {
        // Handle error responses
        return {
          success: false,
          error: responseData.error || {
            code: 'UPLOAD_ERROR',
            message: responseData.message || `HTTP ${response.status} error`,
            statusCode: response.status,
          },
        };
      }
      
      return responseData as UploadResponse<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.error('[FileUpload] Upload error:', error);
    
    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out. Please try again.',
          statusCode: 408,
        },
      };
    }
    
    // Handle network errors
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection and try again.',
          statusCode: 0,
        },
      };
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        statusCode: 0,
      },
    };
  }
}
