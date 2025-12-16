/**
 * Voice Transcription Service
 * Purpose: Transcribe audio recordings to text for AI processing
 * Uses OpenAI Whisper API via backend endpoint
 */

import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/api.config';

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
    // Extract filename from URI (remove query params if any)
    const uriWithoutQuery = audioUri.split('?')[0];
    const filename = uriWithoutQuery.split('/').pop() || 'recording.m4a';
    const ext = filename.split('.').pop()?.toLowerCase() || 'm4a';

    // Determine MIME type
    const mimeType =
      ext === 'm4a'
        ? 'audio/m4a'
        : ext === 'mp3'
        ? 'audio/mpeg'
        : ext === 'wav'
        ? 'audio/wav'
        : 'audio/m4a';

    // Create FormData for multipart upload
    const formData = new FormData();

    // In React Native, FormData accepts objects with uri, type, and name
    // For iOS, we need to keep the file:// prefix or use the full path
    // For Android, we can use the URI directly
    const fileUri =
      Platform.OS === 'ios'
        ? audioUri // Keep full URI including file://
        : audioUri;

    formData.append('audio', {
      uri: fileUri,
      type: mimeType,
      name: filename
    } as any);

    // Get auth token
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // Build query params
    const queryParams = languageCode
      ? `?languageCode=${encodeURIComponent(languageCode)}`
      : '';

    // Make request with FormData
    // Note: Content-Type will be automatically removed by apiClient interceptor for FormData
    const response = await apiClient.post<{
      success: boolean;
      data: { text: string };
    }>(`/ai/transcribe-audio${queryParams}`, formData, {
      timeout: 60000 // 60 seconds timeout for transcription
    });

    if (response.data?.success && response.data?.data?.text) {
      const transcribedText = response.data.data.text.trim();
      console.log(
        '[VoiceTranscription] Transcription successful:',
        transcribedText.substring(0, 50) + '...'
      );
      return transcribedText;
    }

    console.warn(
      '[VoiceTranscription] Unexpected response format:',
      response.data
    );
    return null;
  } catch (error: any) {
    console.error('[VoiceTranscription] Transcription error:', error);

    // Provide user-friendly error messages
    if (error.response?.status === 413) {
      throw new Error('Audio file is too large. Maximum size is 25MB.');
    }

    if (error.response?.status === 400) {
      throw new Error(
        error.response.data?.error?.message || 'Invalid audio file format.'
      );
    }

    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
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

