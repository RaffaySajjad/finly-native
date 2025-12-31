/**
 * AICategoryChat Component
 * Purpose: Chat interface for AI-powered category generation during onboarding
 * Features: Text input, example prompts, loading states with encouraging messages
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';

interface AICategoryChatProps {
  onSubmit: (description: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

// Example prompts users can tap to use
const EXAMPLE_PROMPTS = [
  "I'm a grad student living alone, focusing on saving",
  "Remote worker who loves travel and dining out",
  "Parent of 2, single income, trying to budget better",
  "Freelance designer, irregular income, need to track projects",
];

// Encouraging messages shown during AI generation
const LOADING_MESSAGES = [
  "Understanding your lifestyle...",
  "Crafting personalized categories...",
  "Calculating smart budgets...",
  "Almost there...",
];

const AICategoryChat: React.FC<AICategoryChatProps> = ({
  onSubmit,
  onBack,
  isLoading,
}) => {
  const { theme, isDark } = useTheme();
  const [description, setDescription] = useState('');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Cycle through loading messages
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Pulse animation for loading
  useEffect(() => {
    if (!isLoading) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [isLoading]);

  const handleSubmit = async () => {
    if (description.trim().length < 10 || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onSubmit(description.trim());
  };

  const handleExampleTap = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDescription(prompt);
    inputRef.current?.focus();
  };

  const canSubmit = description.trim().length >= 10 && !isLoading;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={isLoading}
          >
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <LinearGradient
                colors={['#8B5CF6' + '30', '#8B5CF6' + '15']}
                style={styles.iconContainer}
              >
                <Icon name="robot-happy" size={24} color="#8B5CF6" />
              </LinearGradient>
              <Text style={[styles.title, { color: theme.text }]}>Tell Me About You</Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              I'll create custom categories for your lifestyle
            </Text>
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingIconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                style={styles.loadingGradient}
              >
                <Icon name="robot-happy" size={48} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <Text style={[styles.loadingMessage, { color: theme.text }]}>
              {LOADING_MESSAGES[loadingMessageIndex]}
            </Text>
            <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
              This usually takes 5-10 seconds
            </Text>
          </View>
        ) : (
          <>
            {/* Example Prompts - Horizontal Chips */}
            <View style={styles.examplesWrapper}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                Try an example:
              </Text>
              <ScrollView
                horizontal
                style={styles.examplesContainer}
                contentContainerStyle={styles.examplesContent}
                showsHorizontalScrollIndicator={false}
              >
                {EXAMPLE_PROMPTS.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.examplePrompt,
                      {
                        backgroundColor: isDark ? theme.card : '#FFFFFF',
                        borderColor: theme.border,
                      },
                      elevation.sm,
                    ]}
                    onPress={() => handleExampleTap(prompt)}
                  >
                    <Icon name="message-text-outline" size={16} color={theme.primary} />
                    <Text style={[styles.exampleText, { color: theme.text }]}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Area */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: isDark ? theme.surface : '#F9FAFB',
                  borderColor: theme.border,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                  },
                ]}
                placeholder="Describe your lifestyle, goals, and spending habits..."
                placeholderTextColor={theme.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
                editable={!isLoading}
              />
              <View style={styles.inputFooter}>
                <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                  {description.length}/1000
                </Text>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: canSubmit ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                >
                  <Icon name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch', // Force full width regardless of content below
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 40, // Match back button width for true centering
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  backButton: {
    padding: spacing.xs,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    opacity: 0.8,
  },
  sectionLabel: {
    ...typography.labelSmall,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    opacity: 0.7,
  },
  examplesWrapper: {
    marginBottom: spacing.md,
  },
  examplesContainer: {
    flexGrow: 0,
  },
  examplesContent: {
    paddingHorizontal: 4,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  examplePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    maxWidth: 250,
  },
  exampleText: {
    ...typography.caption,
    fontWeight: '500',
    marginHorizontal: spacing.xs,
  },
  inputContainer: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    minHeight: 140,
  },
  textInput: {
    ...typography.bodyMedium,
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  charCount: {
    ...typography.caption,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  loadingIconContainer: {
    marginBottom: spacing.lg,
  },
  loadingGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMessage: {
    ...typography.titleMedium,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  loadingSubtext: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});

export default AICategoryChat;
