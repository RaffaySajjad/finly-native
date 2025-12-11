/**
 * VoiceTransactionScreen Component
 * Purpose: Enterprise-grade voice and text input for AI-powered multi-transaction entry
 * Premium feature - allows users to speak or type multiple transactions at once
 * Features: First-class voice recording with visual feedback, text input fallback
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSubscription } from '../hooks/useSubscription';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { UpgradePrompt, DatePickerInput, ToggleSelector } from '../components';
import { parseTransactionInput } from '../services/aiTransactionService';
import { transcribeAudio } from '../services/voiceTranscriptionService';
import { apiService } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { typography, spacing, borderRadius, elevation } from '../theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

type InputMode = 'voice' | 'text';

const VoiceTransactionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency, getCurrencySymbol, currencyCode, convertToUSD } = useCurrency();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium, requiresUpgrade } = useSubscription();
  const {
    state: recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    requestPermissions,
  } = useVoiceRecording();

  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [input, setInput] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<
    Array<{
      type: 'expense' | 'income';
      amount: number;
      description: string;
      categoryId?: string;
      incomeSourceId?: string;
      date?: string;
      selected: boolean;
    }>
  >([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const waveformAnimation = useRef(new Animated.Value(0)).current;

  // Waveform animation for recording
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveformAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      waveformAnimation.setValue(0);
    }
  }, [recordingState.isRecording, recordingState.isPaused]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle recording start
  const handleStartRecording = async () => {
    if (requiresUpgrade('voiceEntry')) {
      setShowUpgradePrompt(true);
      return;
    }

    try {
      await startRecording();
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      Alert.alert('Recording Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  // Handle recording stop
  const handleStopRecording = async () => {
    try {
      const uri = await stopRecording();
      setRecordingUri(uri);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Recording is complete - transcription will happen when user clicks "Process with AI"
      if (uri) {
        console.log('[VoiceTransaction] Recording saved:', uri);
      }
    } catch (error) {
      Alert.alert('Recording Error', 'Failed to stop recording.');
      console.error('[VoiceTransaction] Stop recording error:', error);
    }
  };

  // Handle pause/resume
  const handlePauseResume = async () => {
    if (recordingState.isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  };

  // Play recorded audio
  const handlePlayRecording = async () => {
    if (!recordingUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        {
          shouldPlay: true,
          volume: 1.0, // Set volume to maximum (1.0)
          isMuted: false,
        }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Set volume explicitly after creation (some platforms need this)
      await newSound.setVolumeAsync(1.0);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('[VoiceTransaction] Playback error:', error);
      Alert.alert('Playback Error', 'Failed to play recording.');
    }
  };

  // Stop playback
  const handleStopPlayback = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  };

  // Process input (text or transcribed)
  const handleProcessInput = async () => {
    if (!input.trim() && !recordingUri) {
      Alert.alert('Empty Input', 'Please record or enter transactions');
      return;
    }

    if (requiresUpgrade('voiceEntry')) {
      setShowUpgradePrompt(true);
      return;
    }

    setIsProcessing(true);
    Keyboard.dismiss();

    try {
      let textToProcess = input.trim();

      // If we have a recording but no text, transcribe it first
      if (!textToProcess && recordingUri) {
        setIsTranscribing(true);
        try {
          console.log('[VoiceTransaction] Transcribing recording:', recordingUri);
          const transcribedText = await transcribeAudio(recordingUri);

          if (!transcribedText || transcribedText.trim().length === 0) {
            Alert.alert(
              'Transcription Failed',
              'Could not transcribe the audio. Please try recording again or type manually.'
            );
            setIsProcessing(false);
            setIsTranscribing(false);
            return;
          }

          // Set the transcribed text and use it for processing
          textToProcess = transcribedText.trim();
          setInput(textToProcess);
          console.log('[VoiceTransaction] Transcription successful:', textToProcess);
        } catch (transcriptionError: any) {
          console.error('[VoiceTransaction] Transcription error:', transcriptionError);
          Alert.alert(
            'Transcription Error',
            transcriptionError.message || 'Failed to transcribe audio. Please try again or type manually.'
          );
          setIsProcessing(false);
          setIsTranscribing(false);
          return;
        } finally {
          setIsTranscribing(false);
        }
      }

      // If we still don't have text, show error
      if (!textToProcess) {
        Alert.alert('No Text', 'Please enter or record transactions first.');
        setIsProcessing(false);
        return;
      }

      // Parse transactions from text
      const transactions = await parseTransactionInput(textToProcess, [], getCurrencySymbol(), currencyCode);

      if (transactions.length === 0) {
        Alert.alert('No Transactions Found', 'Could not identify any transactions. Please try again with clearer details.');
        setIsProcessing(false);
        return;
      }

      // Add new transactions to existing preview
      setParsedTransactions(prev => [
        ...prev,
        ...transactions.map(tx => ({ ...tx, selected: true }))
      ]);

      // Clear input and recording for next batch
      setInput('');
      resetRecording();
      setRecordingUri(null);
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to parse transactions. Please try again.');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransactions = async () => {
    const selectedTransactions = parsedTransactions.filter(tx => tx.selected);

    if (selectedTransactions.length === 0) {
      Alert.alert('No Selection', 'Please select at least one transaction to confirm.');
      return;
    }

    setIsProcessing(true);

    try {
      const promises = selectedTransactions.map(async (tx) => {
        const originalAmount = tx.amount;
        const amountInUSD = convertToUSD(originalAmount);
        const txDate = tx.date ? new Date(tx.date) : transactionDate;
        
        if (tx.type === 'expense') {
        return apiService.addExpense({
          amount: amountInUSD,
          description: tx.description,
            categoryId: tx.categoryId!,
            date: txDate,
          originalAmount: originalAmount,
          originalCurrency: currencyCode,
        });
        } else {
          // Income transaction
          return apiService.createIncomeTransaction({
            amount: amountInUSD,
            description: tx.description,
            incomeSourceId: tx.incomeSourceId,
            date: txDate.toISOString(),
            originalAmount: originalAmount,
            originalCurrency: currencyCode,
          });
        }
      });

      await Promise.all(promises);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Success!',
        `Added ${selectedTransactions.length} transaction${selectedTransactions.length > 1 ? 's' : ''} successfully! 🎉`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save transactions');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setInput('');
    resetRecording();
    setRecordingUri(null);
    if (sound) {
      sound.unloadAsync().catch(console.error);
      setSound(null);
    }
    setIsPlaying(false);
    inputRef.current?.focus();
  };

  const handleClearPreview = () => {
    setParsedTransactions([]);
  };

  const toggleTransactionSelection = (index: number) => {
    setParsedTransactions(prev =>
      prev.map((tx, i) => i === index ? { ...tx, selected: !tx.selected } : tx)
    );
  };

  const toggleSelectAll = () => {
    const allSelected = parsedTransactions.every(tx => tx.selected);
    setParsedTransactions(prev =>
      prev.map(tx => ({ ...tx, selected: !allSelected }))
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
      resetRecording();
    };
  }, []);

  const waveformOpacity = waveformAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            AI Transaction Entry
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}>
          <Icon name="robot" size={24} color={theme.primary} />
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              Intelligent Transaction Entry
            </Text>
            <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
              Use natural language to record transactions. Our AI extracts amounts, descriptions, and categories automatically—supporting multiple transactions in a single entry.
            </Text>
            <View style={styles.examplesContainer}>
              <Text style={[styles.exampleText, { color: theme.textTertiary }]}>
                Example: "Lunch $15, Uber $20, and Groceries $50"
              </Text>
            </View>
          </View>
        </View>

        {/* Input Mode Toggle */}
        <View style={styles.modeToggleSection}>
          <ToggleSelector
            options={[
              { value: 'voice', label: 'Voice' },
              { value: 'text', label: 'Text' },
            ]}
            selectedValue={inputMode}
            onValueChange={(value) => {
              setInputMode(value as InputMode);
              if (value === 'text') {
                inputRef.current?.focus();
              } else if (value === 'voice' && recordingState.isRecording) {
                // If switching to voice while recording, stop recording first
                handleStopRecording();
              }
            }}
            fullWidth
          />
        </View>

        {/* Voice Recording Section */}
        {inputMode === 'voice' && (
          <View style={styles.voiceSection}>
            {!recordingState.isRecording && !recordingUri && (
              <View style={styles.voicePromptCard}>
                <Icon name="microphone" size={48} color={theme.primary} />
                <Text style={[styles.voicePromptText, { color: theme.text }]}>
                  Tap to start recording
                </Text>
                <Text style={[styles.voicePromptSubtext, { color: theme.textSecondary }]}>
                  Speak your transactions clearly
                </Text>
              </View>
            )}

            {recordingState.isRecording && (
              <View style={[styles.recordingCard, { backgroundColor: theme.card, borderColor: theme.error }, elevation.md]}>
                <Animated.View style={[styles.waveformContainer, { opacity: waveformOpacity }]}>
                  <View style={[styles.waveformBar, { backgroundColor: theme.error }]} />
                  <View style={[styles.waveformBar, styles.waveformBarMedium, { backgroundColor: theme.error }]} />
                  <View style={[styles.waveformBar, styles.waveformBarLarge, { backgroundColor: theme.error }]} />
                  <View style={[styles.waveformBar, styles.waveformBarMedium, { backgroundColor: theme.error }]} />
                  <View style={[styles.waveformBar, { backgroundColor: theme.error }]} />
                </Animated.View>
                <Text style={[styles.recordingTimer, { color: theme.error }]}>
                  {formatDuration(recordingState.duration)}
                </Text>
                <Text style={[styles.recordingStatus, { color: theme.textSecondary }]}>
                  {recordingState.isPaused ? 'Paused' : 'Recording...'}
                </Text>
              </View>
            )}

            {recordingUri && !recordingState.isRecording && (
              <View style={[styles.recordingCompleteCard, { backgroundColor: theme.card, borderColor: theme.success }, elevation.sm]}>
                <Icon name="check-circle" size={32} color={theme.success} />
                <Text style={[styles.recordingCompleteText, { color: theme.text }]}>
                  Recording Complete
                </Text>
                <Text style={[styles.recordingCompleteSubtext, { color: theme.textSecondary }]}>
                  {formatDuration(recordingState.duration)}
                </Text>
              </View>
            )}

            {/* Recording Controls */}
            <View style={styles.recordingControls}>
              {!recordingState.isRecording && !recordingUri && (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: theme.primary }, elevation.lg]}
                  onPress={handleStartRecording}
                  disabled={isProcessing || isTranscribing}
                >
                  <Icon name="microphone" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {recordingState.isRecording && (
                <>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}
                    onPress={handlePauseResume}
                  >
                    <Icon
                      name={recordingState.isPaused ? 'play' : 'pause'}
                      size={24}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stopButton, { backgroundColor: theme.error }, elevation.sm]}
                    onPress={handleStopRecording}
                  >
                    <Icon name="stop" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}

              {recordingUri && !recordingState.isRecording && (
                <>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}
                    onPress={isPlaying ? handleStopPlayback : handlePlayRecording}
                  >
                    <Icon
                      name={isPlaying ? 'stop' : 'play'}
                      size={24}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: theme.card, borderColor: theme.border }, elevation.sm]}
                    onPress={() => {
                      resetRecording();
                      setRecordingUri(null);
                    }}
                  >
                    <Icon name="delete" size={24} color={theme.error} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {isTranscribing && (
              <View style={styles.transcribingIndicator}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.transcribingText, { color: theme.textSecondary }]}>
                  Transcribing...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Text Input Section */}
        {inputMode === 'text' && (
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Your Transactions
              </Text>
              {input.length > 0 && (
                <TouchableOpacity onPress={handleClear} disabled={isProcessing}>
                  <Text style={[styles.clearLink, { color: theme.primary }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                elevation.sm,
              ]}
              placeholder="Type or use keyboard dictation to enter transactions..."
              placeholderTextColor={theme.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="sentences"
              editable={!isProcessing}
            />
          </View>
        )}

        {/* Process Button */}
        {(input.trim() || recordingUri) && (
          <TouchableOpacity
            style={[
              styles.processButton,
              { backgroundColor: theme.primary, opacity: isProcessing ? 0.6 : 1 },
              elevation.md
            ]}
            onPress={handleProcessInput}
            disabled={isProcessing || isTranscribing}
          >
            {(isProcessing || isTranscribing) ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.processingText}>
                  {isTranscribing ? 'Transcribing...' : 'Processing...'}
                </Text>
              </View>
            ) : (
              <>
                <Icon name="auto-fix" size={20} color="#FFFFFF" />
                <Text style={styles.processButtonText}>Process with AI</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Date Picker */}
        <View style={styles.dateSection}>
          <DatePickerInput
            date={transactionDate}
            onDateChange={setTransactionDate}
            label="DEFAULT DATE (IF NOT SPECIFIED)"
          />
        </View>

        {/* Parsed Transactions Preview */}
        {parsedTransactions.length > 0 && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewTitle, { color: theme.text }]}>
                Preview ({parsedTransactions.filter(tx => tx.selected).length}/{parsedTransactions.length})
              </Text>
              <View style={styles.previewActions}>
                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
                  <Text style={[styles.selectAllText, { color: theme.primary }]}>
                    {parsedTransactions.every(tx => tx.selected) ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClearPreview} style={styles.clearPreviewButton}>
                  <Icon name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {parsedTransactions.map((tx, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.transactionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: tx.selected ? theme.primary : theme.border,
                    borderWidth: tx.selected ? 2 : 1,
                    opacity: tx.selected ? 1 : 0.6,
                  },
                  elevation.sm,
                ]}
                onPress={() => toggleTransactionSelection(index)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: tx.selected ? theme.primary : 'transparent',
                      borderColor: tx.selected ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => toggleTransactionSelection(index)}
                >
                  {tx.selected && <Icon name="check" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
                <View style={[styles.transactionIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Icon
                    name="check-circle-outline"
                    size={24}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <View style={styles.transactionHeader}>
                  <Text style={[styles.transactionDescription, { color: theme.text }]}>
                    {tx.description}
                  </Text>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: tx.type === 'income' ? theme.income + '20' : theme.expense + '20' }
                    ]}>
                      <Icon
                        name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'}
                        size={12}
                        color={tx.type === 'income' ? theme.income : theme.expense}
                      />
                      <Text style={[
                        styles.typeBadgeText,
                        { color: tx.type === 'income' ? theme.income : theme.expense }
                      ]}>
                        {tx.type === 'income' ? 'Income' : 'Expense'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionMeta}>
                    {tx.type === 'expense' && tx.categoryId && (
                    <Text style={[styles.transactionCategory, { color: theme.textSecondary }]}>
                        Category: {tx.categoryId.substring(0, 8)}...
                    </Text>
                    )}
                    {tx.type === 'income' && tx.incomeSourceId && (
                      <Text style={[styles.transactionCategory, { color: theme.textSecondary }]}>
                        Source: {tx.incomeSourceId.substring(0, 8)}...
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: tx.type === 'income' ? theme.income : theme.expense }
                ]}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: theme.success }, elevation.md]}
              onPress={handleConfirmTransactions}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                      Confirm All
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Voice & AI Transaction Entry"
        message="This premium feature allows you to add multiple transactions at once using natural language. Speak or type multiple expenses and let AI parse them automatically."
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  instructionsCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  instructionsText: {
    ...typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  examplesContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  exampleText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  modeToggleSection: {
    marginBottom: spacing.lg,
  },
  voiceSection: {
    marginBottom: spacing.lg,
  },
  voicePromptCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  voicePromptText: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  voicePromptSubtext: {
    ...typography.bodySmall,
  },
  recordingCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  waveformBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  waveformBarMedium: {
    height: 30,
  },
  waveformBarLarge: {
    height: 40,
  },
  recordingTimer: {
    ...typography.displaySmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  recordingStatus: {
    ...typography.bodySmall,
  },
  recordingCompleteCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  recordingCompleteText: {
    ...typography.titleMedium,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  recordingCompleteSubtext: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  transcribingText: {
    ...typography.bodySmall,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  clearLink: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  input: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  processButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  processingText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
  },
  previewSection: {
    marginTop: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectAllText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  clearPreviewButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  previewTitle: {
    ...typography.titleMedium,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.xs,
  },
  transactionDescription: {
    ...typography.titleSmall,
    fontWeight: '600',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  typeBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  transactionCategory: {
    ...typography.bodySmall,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transactionAmount: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 4,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  confirmButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default VoiceTransactionScreen;
