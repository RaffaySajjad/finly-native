/**
 * AIAssistantScreen Component
 * Purpose: AI-powered assistant for financial queries and insights
 * Features: Chat interface, query history, premium gating, rate limiting
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import {
  processAIQuery,
  getQueryLimits,
  getQueryHistory,
  AIQuery
} from '../services/aiAssistantService';
import { useSubscription } from '../hooks/useSubscription';
import { typography, spacing, borderRadius, elevation } from '../theme';
import { useCurrency } from '../contexts/CurrencyContext';
import * as Haptics from 'expo-haptics';
import UpgradePrompt from '../components/UpgradePrompt';
import MarkdownText from '../components/MarkdownText';
import PremiumBadge from '../components/PremiumBadge';

type AIAssistantNavigationProp = StackNavigationProp<RootStackParamList>;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const AIAssistantScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatCurrency } = useCurrency();
  const navigation = useNavigation<AIAssistantNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AIAssistant'>>();
  const { isPremium } = useSubscription();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryLimits, setQueryLimits] = useState({ used: 0, limit: 5, resetDate: '' });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const routeParams = route.params;
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAtBottom = useRef(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (messages.length > 0 || streamingText) {
      // Use setTimeout to ensure content is rendered before scrolling
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, streamingText]);

  // Scroll to bottom when content size changes (handles keyboard, new messages, etc.)
  const handleContentSizeChange = () => {
    scrollToBottom();
  };

  const scrollToBottom = (animated = true) => {
    if (isAtBottom.current) {
      scrollViewRef.current?.scrollToEnd({ animated });
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    isAtBottom.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  // Cleanup streaming timeout on unmount
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const limits = await getQueryLimits(isPremium);
      setQueryLimits(limits);

      const initialMessages: Message[] = [
        {
          id: 'welcome',
          type: 'assistant',
          content: `👋 Hi! I'm your Finly AI assistant. I can help you with:\n\n📊 Transaction questions\n💡 Feature explanations\n📈 Spending insights\n\n${isPremium ? '✨ You have unlimited queries!' : `You have ${limits.limit - limits.used} queries remaining today.`}\n\nWhat would you like to know?`,
          timestamp: new Date().toISOString(),
        },
      ];
      
      // Load history for premium users (or if we decide to show some history for free users too)
      // The backend now handles the limit (0 for free, 15 for premium)
      setLoading(true);
      const history = await getQueryHistory();

      if (history.length > 0) {
        // Sort by timestamp ascending for display
        const sortedHistory = [...history].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        sortedHistory.forEach((q: AIQuery) => {
          initialMessages.push({
            id: `history_${q.id}_user`,
            type: 'user',
            content: q.query,
            timestamp: q.timestamp,
          });
          initialMessages.push({
            id: `history_${q.id}_assistant`,
            type: 'assistant',
            content: q.response,
            timestamp: q.timestamp,
          });
        });
      }
      setLoading(false);

      if (routeParams?.initialQuery) {
        setQuery(routeParams.initialQuery);
      }
      
      setMessages(initialMessages);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setLoading(false);
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || query.trim();
    if (!textToSend || loading) return;

    // Check limits
    if (!isPremium && queryLimits.used >= queryLimits.limit) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setQuery('');

    // Force scroll to bottom when sending new message
    isAtBottom.current = true;
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Create placeholder assistant message for streaming
      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        type: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessageId);
      setStreamingText('');

      // Process query
      const result = await processAIQuery(
        textToSend,
        isPremium,
        formatCurrency,
        routeParams?.context
      );

      // Stream the response character by character
      await streamText(result.response, assistantMessageId);

      // Ensure scroll to bottom after streaming completes
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      // Update limits
      const updatedLimits = await getQueryLimits(isPremium);
      setQueryLimits(updatedLimits);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      if (error.message.includes('limit')) {
        setShowUpgrade(true);
        Alert.alert(
          'Query Limit Reached',
          error.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to process query. Please try again.');
      }
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
      setStreamingText('');
    }
  };

  /**
   * Stream text character by character with smooth animation
   */
  const streamText = async (fullText: string, messageId: string): Promise<void> => {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const charsPerChunk = 2; // Characters to show per frame (adjust for speed)
      const delay = 20; // Milliseconds between chunks (adjust for speed)

      const stream = () => {
        if (currentIndex >= fullText.length) {
          // Streaming complete - update the actual message
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
                ? { ...msg, content: fullText }
                : msg
            )
          );
          setStreamingText('');
          setStreamingMessageId(null);
          // Ensure scroll to bottom after streaming completes
          setTimeout(() => {
            scrollToBottom();
          }, 50);
          resolve();
          return;
        }

        const nextIndex = Math.min(currentIndex + charsPerChunk, fullText.length);
        const partialText = fullText.substring(0, nextIndex);
        setStreamingText(partialText);
        currentIndex = nextIndex;

        // Scroll during streaming to keep up with new content (every 10 characters)
        if (currentIndex % 10 === 0) {
          setTimeout(() => {
            scrollToBottom();
          }, 0);
        }

        streamingTimeoutRef.current = setTimeout(stream, delay);
      };

      stream();
    });
  };

  const quickQueries = [
    'How much did I spend this month?',
    'What\'s my balance?',
    'How do I import transactions?',
    'What\'s my biggest expense?',
    isPremium ? 'Show me spending trends' : 'Upgrade for insights',
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Icon name="robot" size={32} color={theme.primary} />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>AI Assistant</Text>
              {!isPremium && (
                <Text style={[styles.usageText, { color: theme.textSecondary }]}>
                  {queryLimits.limit - queryLimits.used} queries remaining today
                </Text>
              )}
            </View>
          </View>
          {!isPremium && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Subscription')}
              style={styles.upgradeButton}
            >
              <PremiumBadge size="small" />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.type === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: message.type === 'user' ? theme.primary : theme.card,
                    borderColor: message.type === 'user' ? theme.primary : theme.border,
                  },
                  elevation.sm,
                ]}
              >
                {message.type === 'assistant' && (
                  <View style={styles.assistantIcon}>
                    <Icon name="robot" size={16} color={theme.primary} />
                  </View>
                )}
                {message.type === 'assistant' ? (
                  <MarkdownText
                    style={[
                      styles.messageText,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {streamingMessageId === message.id && streamingText
                      ? streamingText
                      : message.content}
                  </MarkdownText>
                ) : (
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: '#FFFFFF',
                        },
                      ]}
                    >
                      {message.content}
                    </Text>
                )}
              </View>
            </View>
          ))}

          {loading && !streamingMessageId && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Thinking...</Text>
            </View>
          )}

          {/* Quick Queries */}
          {messages.length <= 1 && (
            <View style={styles.quickQueriesContainer}>
              <Text style={[styles.quickQueriesTitle, { color: theme.textSecondary }]}>Quick Questions</Text>
              {quickQueries.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickQueryButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => {
                    if (q.includes('Upgrade')) {
                      navigation.navigate('Subscription');
                    } else {
                      handleSendQuery(q);
                    }
                  }}
                >
                  <Text style={[styles.quickQueryText, { color: theme.text }]}>{q}</Text>
                  <Icon name="arrow-right" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: Platform.OS === 'ios' ? spacing.xxl + 50 : spacing.md + insets.bottom,
          }
        ]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ask me anything..."
              placeholderTextColor={theme.textTertiary}
              value={query}
              onChangeText={setQuery}
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSendQuery()}
              editable={!loading && (isPremium || queryLimits.used < queryLimits.limit)}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: (isPremium || queryLimits.used < queryLimits.limit) && query.trim()
                    ? theme.primary
                    : theme.border,
                },
              ]}
              onPress={() => handleSendQuery()}
              disabled={loading || !query.trim() || (!isPremium && queryLimits.used >= queryLimits.limit)}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          {!isPremium && queryLimits.used >= queryLimits.limit && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Icon name="crown" size={16} color={theme.primary} />
              <Text style={[styles.upgradeButtonText, { color: theme.primary }]}>
                Upgrade for unlimited queries
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {showUpgrade && (
        <UpgradePrompt
          visible={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          feature="AI Assistant"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: 2,
  },
  usageText: {
    ...typography.bodySmall,
  },
  upgradeButton: {
    padding: spacing.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  assistantIcon: {
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingLeft: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
  },
  quickQueriesContainer: {
    marginTop: spacing.lg,
  },
  quickQueriesTitle: {
    ...typography.labelMedium,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  quickQueryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  quickQueryText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  inputContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.bodyMedium,
    maxHeight: 100,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  upgradeButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
});

export default AIAssistantScreen;

