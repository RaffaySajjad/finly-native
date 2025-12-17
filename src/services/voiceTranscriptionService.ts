/**
 * Voice Transcription Service
 * Purpose: Transcribe audio recordings to text for AI processing
 * Uses OpenAI Whisper API via backend endpoint
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './apiClient';
import { API_CONFIG } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/api.config';

/**
 * Validate that the audio file exists and is readable
 * @param uri - URI of the audio file
 * @returns File info if valid, throws error if not
 */
async function validateAudioFile(
  uri: string
): Promise<{ exists: boolean; size: number }> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      console.error('[VoiceTranscription] File does not exist:', uri);
      throw new Error(
        'Audio file not found. The recording may have been deleted.'
      );
    }

    const size = fileInfo.size ?? 0;

    if (size === 0) {
      console.error('[VoiceTranscription] File is empty:', uri);
      throw new Error('Audio file is empty. Please try recording again.');
    }

    console.log('[VoiceTranscription] File validated:', {
      uri,
      size,
      exists: fileInfo.exists
    });

    return { exists: fileInfo.exists, size };
  } catch (error: any) {
    if (error.message?.includes('Audio file')) {
      throw error;
    }
    console.error('[VoiceTranscription] Error validating file:', error);
    throw new Error(
      'Could not access the audio file. Please try recording again.'
    );
  }
}

/**
 * Transcribe audio file to text using backend OpenAI Whisper API
 * @param audioUri - URI of the audio file to transcribe (local file URI)
 * @param languageCode - Optional language code (e.g., 'en', 'es')
 * @returns Transcribed text or null if transcription fails
 */
export async function transcribeAudio(
  audioUri: string,
  languageCode?: string
): Promise<string | null> {
  try {
    console.log('[VoiceTranscription] Starting transcription for:', audioUri);

    // Validate file exists before attempting upload
    const fileInfo = await validateAudioFile(audioUri);

    // Extract filename from URI (remove query params if any)
    const uriWithoutQuery = audioUri.split('?')[0];
    const filename = uriWithoutQuery.split('/').pop() || 'recording.m4a';
    const ext = filename.split('.').pop()?.toLowerCase() || 'm4a';

    // Determine MIME type - use audio/mp4 for m4a as it's more widely supported
    const mimeType =
      ext === 'm4a'
        ? 'audio/mp4' // audio/mp4 is more standard than audio/m4a
        : ext === 'mp3'
        ? 'audio/mpeg'
        : ext === 'wav'
        ? 'audio/wav'
        : ext === 'caf'
        ? 'audio/x-caf'
        : 'audio/mp4';

    // Create FormData for multipart upload
    const formData = new FormData();

    // In React Native, FormData accepts objects with uri, type, and name
    // Ensure the URI has the correct format for the platform
    let fileUri = audioUri;

    // iOS: Ensure file:// prefix is present
    // Android: URI should work as-is
    if (Platform.OS === 'ios' && !audioUri.startsWith('file://')) {
      fileUri = `file://${audioUri}`;
    }

    console.log('[VoiceTranscription] Uploading file:', {
      originalUri: audioUri,
      fileUri,
      mimeType,
      filename,
      size: fileInfo.size
    });

    formData.append('audio', {
      uri: fileUri,
      type: mimeType,
      name: filename
    } as any);

    // Build query params
    const queryParams = languageCode
      ? `?languageCode=${encodeURIComponent(languageCode)}`
      : '';

    // Make request with FormData
    // Note: Content-Type will be automatically removed by apiClient interceptor for FormData
    // api.post returns ApiResponse<T> directly (already unwrapped from axios response)
    const response = await api.post<{ text: string }>(
      `/ai/transcribe-audio${queryParams}`,
      formData,
      {
        timeout: 60000 // 60 seconds timeout for transcription
      }
    );

    // api.post returns { success, data, message, error } directly
    if (response.success && response.data?.text) {
      const transcribedText = response.data.text.trim();
      console.log(
        '[VoiceTranscription] Transcription successful:',
        transcribedText.substring(0, 50) + '...'
      );
      return transcribedText;
    }

    console.warn('[VoiceTranscription] Unexpected response format:', response);
    return null;
  } catch (error: any) {
    console.error('[VoiceTranscription] Transcription error:', error);
    console.error('[VoiceTranscription] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Re-throw file validation errors as-is
    if (
      error.message?.includes('Audio file') ||
      error.message?.includes('recording')
    ) {
      throw error;
    }

    // Provide user-friendly error messages
    if (error.response?.status === 413) {
      throw new Error('Audio file is too large. Maximum size is 25MB.');
    }

    if (error.response?.status === 400) {
      const serverMessage =
        error.response.data?.error?.message || error.response.data?.message;
      if (
        serverMessage?.toLowerCase().includes('file') ||
        serverMessage?.toLowerCase().includes('audio')
      ) {
        throw new Error(serverMessage);
      }
      throw new Error('Invalid audio file format. Please try recording again.');
    }

    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }

    if (error.response?.status === 404) {
      throw new Error(
        'Transcription service not available. Please try again later.'
      );
    }

    // Network errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error(
        'Transcription timed out. Please try with a shorter recording.'
      );
    }

    if (!error.response && error.message?.includes('Network')) {
      throw new Error(
        'Network error. Please check your connection and try again.'
      );
    }

    throw new Error(
      error.message || 'Failed to transcribe audio. Please try again.'
    );
  }
}

/**
 * Check if transcription is available
 */
export function isTranscriptionAvailable(): boolean {
  // Transcription is now available via backend
  return true;
}

