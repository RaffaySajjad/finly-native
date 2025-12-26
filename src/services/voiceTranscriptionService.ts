/**
 * Voice Transcription Service
 * Purpose: Transcribe audio recordings to text for AI processing
 * Uses OpenAI Whisper API via backend endpoint
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadFile } from './fileUploadService';

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
    if (Platform.OS === 'ios' && !audioUri.startsWith('file://')) {
      fileUri = `file://${audioUri}`;
    }

    // Release builds (both iOS and Android): Copy file to cache for reliable access
    // In release builds, file URIs may have restricted access when used directly in FormData
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const cachedFilePath = `${cacheDir}audio_transcription_${Date.now()}.${ext}`;
        
        console.log('[VoiceTranscription] Copying file to cache for reliable access:', {
          from: audioUri,
          to: cachedFilePath,
          platform: Platform.OS
        });
        
        await FileSystem.copyAsync({
          from: audioUri,
          to: cachedFilePath
        });
        
        // Verify the copied file exists and has content
        const copiedFileInfo = await FileSystem.getInfoAsync(cachedFilePath);
        if (copiedFileInfo.exists && (copiedFileInfo.size ?? 0) > 0) {
          fileUri = cachedFilePath;
          console.log('[VoiceTranscription] Successfully copied file to cache');
        } else {
          console.warn('[VoiceTranscription] Copied file verification failed, using original URI');
        }
      }
    } catch (copyError) {
      console.warn('[VoiceTranscription] Failed to copy file to cache, using original URI:', copyError);
      // Fall back to original URI - it may still work in debug builds
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

    // Build endpoint with query params
    const queryParams = languageCode
      ? `?languageCode=${encodeURIComponent(languageCode)}`
      : '';
    const endpoint = `/ai/transcribe-audio${queryParams}`;

    // Use native fetch-based upload (works on Android)
    const response = await uploadFile<{ text: string }>(endpoint, formData, {
      timeout: 60000 // 60 seconds timeout for transcription
    });

    // Check response
    if (!response.success) {
      const errorMessage = response.error?.message || 'Failed to transcribe audio. Please try again.';
      
      // Handle specific error codes
      if (response.error?.statusCode === 413) {
        throw new Error('Audio file is too large. Maximum size is 25MB.');
      }
      if (response.error?.statusCode === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      if (response.error?.statusCode === 404) {
        throw new Error('Transcription service not available. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    if (response.data?.text) {
      const transcribedText = response.data.text.trim();
      console.log(
        '[VoiceTranscription] Transcription successful:',
        transcribedText.substring(0, 50) + '...'
      );
      return transcribedText;
    }

    console.warn('[VoiceTranscription] No text in response:', response);
    return null;
  } catch (error: any) {
    console.error('[VoiceTranscription] Transcription error:', error);
    throw error;
  }
}

/**
 * Check if transcription is available
 */
export function isTranscriptionAvailable(): boolean {
  // Transcription is now available via backend
  return true;
}
