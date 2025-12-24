/**
 * useVoiceRecording Hook
 * Purpose: Enterprise-grade voice recording hook with permissions handling
 * Features: Audio recording, transcription, error handling, and state management
 * Follows: SOLID principles (SRP), performance-optimized
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform, Alert, AppState, AppStateStatus } from 'react-native';

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // in seconds
  uri: string | null;
  error: string | null;
}

export interface UseVoiceRecordingReturn {
  state: VoiceRecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  resetRecording: () => void;
  requestPermissions: () => Promise<boolean>;
}

/**
 * useVoiceRecording - Hook for managing voice recording
 * Returns recording state and control functions
 */
export const useVoiceRecording = (): UseVoiceRecordingReturn => {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    uri: null,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * Request microphone permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'Finly needs access to your microphone to record voice transactions. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS, we can't programmatically open settings, but we can guide the user
              if (Platform.OS === 'ios') {
                Alert.alert(
                  'Enable Microphone',
                  'Go to Settings > Finly > Microphone and enable access.'
                );
              }
            }},
          ]
        );
        return false;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      return true;
    } catch (error) {
      console.error('[useVoiceRecording] Permission error:', error);
      setState(prev => ({ ...prev, error: 'Failed to request microphone permission' }));
      return false;
    }
  }, []);

  /**
   * Wait for app to be in active state with retry
   * Returns true if app is active, false if timeout
   */
  const waitForActiveState = async (maxWaitMs: number = 500): Promise<boolean> => {
    const startTime = Date.now();
    const checkInterval = 50; // Check every 50ms
    
    while (Date.now() - startTime < maxWaitMs) {
      if (AppState.currentState === 'active') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return AppState.currentState === 'active';
  };

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Wait for app to be in foreground with retry (handles transition states)
      const isActive = await waitForActiveState(500);
      if (!isActive) {
        const errorMsg = 'Please ensure the app is in the foreground to start recording.';
        setState(prev => ({
          ...prev,
          error: errorMsg,
        }));
        Alert.alert(
          'Recording Unavailable',
          errorMsg,
          [{ text: 'OK' }]
        );
        return;
      }

      // Check permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return;
      }

      // Stop any existing recording
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.warn('[useVoiceRecording] Error stopping existing recording:', e);
        }
        recordingRef.current = null;
      }

      // Small delay before setting audio mode (helps with iOS state transitions)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Re-check app state after delay (state might have changed)
      if (AppState.currentState !== 'active') {
        console.warn('[useVoiceRecording] App went to background during setup');
        setState(prev => ({
          ...prev,
          error: 'App went to background. Please try again.',
        }));
        return;
      }

      // Ensure audio mode is set right before recording (critical for iOS)
      // This must be done right before creating the recording to ensure app is in foreground
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (audioModeError) {
        console.error('[useVoiceRecording] Failed to set audio mode:', audioModeError);
        // On iOS, this error often means app is not in foreground
        if (Platform.OS === 'ios') {
          setState(prev => ({
            ...prev,
            error: 'Unable to activate audio session. Please try again.',
          }));
          Alert.alert(
            'Recording Unavailable',
            'Could not activate audio session. Please ensure the app is fully in the foreground and try again.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Another small delay after audio mode setup
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // Handle recording status updates if needed
          if (status.isDoneRecording) {
            setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
          }
        }
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        uri: null,
        error: null,
      });
    } catch (error) {
      console.error('[useVoiceRecording] Start recording error:', error);
      
      // Provide user-friendly error message for background state
      let errorMessage = 'Failed to start recording';
      let showAlert = false;
      
      if (error instanceof Error) {
        const errorLower = error.message.toLowerCase();
        if (errorLower.includes('background') || 
            errorLower.includes('audio session') ||
            errorLower.includes('not in foreground') ||
            errorLower.includes('avaudiosession')) {
          errorMessage = 'Please ensure the app is fully in the foreground to start recording.';
          showAlert = true;
        } else {
          errorMessage = error.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));
      
      // Show alert for background/audio session errors
      if (showAlert) {
        Alert.alert(
          'Recording Unavailable',
          'Voice recording requires the app to be fully in the foreground. Please tap away from any dialogs and try again.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [requestPermissions]);

  /**
   * Stop recording and return audio URI
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // CRITICAL: Get the URI BEFORE stopping and unloading
      // After stopAndUnloadAsync(), the file reference may become invalid
      const uri = recordingRef.current.getURI();
      
      console.log('[useVoiceRecording] Recording URI before unload:', uri);

      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      // Reset audio mode to allow playback (disable recording mode)
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (audioModeError) {
        console.warn('[useVoiceRecording] Failed to reset audio mode:', audioModeError);
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        uri: uri || null,
      }));

      return uri;
    } catch (error) {
      console.error('[useVoiceRecording] Stop recording error:', error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording',
      }));
      return null;
    }
  }, []);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recordingRef.current || !state.isRecording) {
        return;
      }

      await recordingRef.current.pauseAsync();

      // Pause duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setState(prev => ({ ...prev, isPaused: true }));
    } catch (error) {
      console.error('[useVoiceRecording] Pause recording error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pause recording',
      }));
    }
  }, [state.isRecording]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(async (): Promise<void> => {
    try {
      if (!recordingRef.current || !state.isPaused) {
        return;
      }

      await recordingRef.current.startAsync();
      startTimeRef.current = Date.now() - (state.duration * 1000);

      // Resume duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);

      setState(prev => ({ ...prev, isPaused: false }));
    } catch (error) {
      console.error('[useVoiceRecording] Resume recording error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resume recording',
      }));
    }
  }, [state.isPaused, state.duration]);

  /**
   * Reset recording state
   */
  const resetRecording = useCallback((): void => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(console.error);
      recordingRef.current = null;
    }

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      uri: null,
      error: null,
    });
  }, []);

  // Handle app state changes - stop recording if app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active' && state.isRecording && recordingRef.current) {
        // App went to background while recording - stop recording gracefully
        console.warn('[useVoiceRecording] App went to background, stopping recording');
        if (recordingRef.current) {
          recordingRef.current.stopAndUnloadAsync()
            .then(() => {
              setState(prev => ({
                ...prev,
                isRecording: false,
                isPaused: false,
                error: 'Recording stopped because app went to background',
              }));
            })
            .catch(console.error);
          recordingRef.current = null;
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [state.isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
    };
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    requestPermissions,
  };
};

