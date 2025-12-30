/**
 * AIIntroSlide Component
 * Purpose: Automated AI demo showcase during onboarding
 * Features: Scripted conversation that plays automatically, showcasing AI capabilities
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { usePerformance } from '../../contexts/PerformanceContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { springPresets } from '../../theme/AnimationConfig';
import { glowEffects } from '../../theme/DesignTokens';

interface AIIntroSlideProps {
  slideColor: string;
  onDemoComplete: () => void; // Called when all messages have played
}

interface DemoMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  delay: number; // ms before this message appears
}

// Scripted conversation showcasing 3 key AI capabilities
const DEMO_CONVERSATION: DemoMessage[] = [
  // Greeting
  {
    id: 'greeting',
    type: 'assistant',
    content: "Hey! I'm Finly AI. Let me show you what I can do...",
    delay: 500,
  },
  // 1. Natural Language Queries
  {
    id: 'q1',
    type: 'user',
    content: "How much did I spend on coffee this month?",
    delay: 1500,
  },
  {
    id: 'a1',
    type: 'assistant',
    content: "☕ You've spent $47.50 on coffee this month. That's 12 purchases, averaging $3.96 per coffee. Want me to track this as a category?",
    delay: 1800,
  },
  // 2. Pattern Detection & Insights
  {
    id: 'q2',
    type: 'user',
    content: "Any spending patterns I should know about?",
    delay: 2200,
  },
  {
    id: 'a2',
    type: 'assistant',
    content: "📊 I noticed you spend 40% more on weekends, and your subscription costs jumped $15 since last month. Also, you tend to overspend in the last week before payday. Want tips to fix that?",
    delay: 2000,
  },
  // 3. Personalized Actionable Advice
  {
    id: 'q3',
    type: 'user',
    content: "Help me save $200 this month",
    delay: 2200,
  },
  {
    id: 'a3',
    type: 'assistant',
    content: "💡 Based on your habits:\n• Cut 2 coffee runs/week → Save $32\n• Skip one weekend dinner out → Save $45\n• Cancel unused gym subscription → Save $29\n• Pack lunch 3x/week → Save $60\n\nThat's $166! Add one more coffee skip and you're there. I can remind you!",
    delay: 2500,
  },
];

const AIIntroSlide: React.FC<AIIntroSlideProps> = ({ slideColor, onDemoComplete }) => {
  const { theme, isDark } = useTheme();
  const { shouldUseComplexAnimations, shouldUseGlowEffects } = usePerformance();
  const [visibleMessages, setVisibleMessages] = useState<DemoMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [demoComplete, setDemoComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const messageAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Initialize fade animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Play the demo conversation automatically
  useEffect(() => {
    if (currentMessageIndex >= DEMO_CONVERSATION.length) {
      setIsTyping(false);
      setDemoComplete(true);
      onDemoComplete();
      return;
    }

    const message = DEMO_CONVERSATION[currentMessageIndex];
    
    // Show typing indicator for assistant messages
    if (message.type === 'assistant' && currentMessageIndex > 0) {
      setIsTyping(true);
    }

    const timer = setTimeout(() => {
      // Initialize animation for this message
      messageAnimations.current[message.id] = new Animated.Value(0);
      
      setIsTyping(false);
      setVisibleMessages(prev => [...prev, message]);
      
      // Haptic feedback when message appears
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate message entrance with spring
      Animated.spring(messageAnimations.current[message.id], {
        toValue: 1,
        ...springPresets.gentle,
        useNativeDriver: true,
      }).start();

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Move to next message
      setCurrentMessageIndex(prev => prev + 1);
    }, message.delay);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, onDemoComplete]);

  const getMessageAnimation = (id: string) => {
    if (!messageAnimations.current[id]) {
      messageAnimations.current[id] = new Animated.Value(1);
    }
    return {
      opacity: messageAnimations.current[id],
      transform: [
        {
          translateY: messageAnimations.current[id].interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
      ],
    };
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Premium Header with Gradient Icon */}
      <View style={styles.header}>
        <LinearGradient
          colors={[slideColor + '30', slideColor + '15']}
          style={[
            styles.iconContainer,
            shouldUseGlowEffects && {
              shadowColor: slideColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
          ]}
        >
          <Icon name="robot-happy" size={40} color={slideColor} />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Meet Finly AI</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            See what I can do for you
          </Text>
        </View>
      </View>

      {/* Demo Chat Container with Premium Styling */}
      <View style={[
        styles.chatContainer,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation.md
      ]}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleMessages.map((message) => (
            <Animated.View
              key={message.id}
              style={[
                styles.messageBubble,
                message.type === 'user'
                  ? [styles.userBubble, { backgroundColor: theme.primary }]
                  : [styles.assistantBubble, { backgroundColor: isDark ? theme.surface : '#F3F4F6' }],
                getMessageAnimation(message.id),
              ]}
            >
              {message.type === 'assistant' && (
                <Icon 
                  name="robot" 
                  size={16} 
                  color={slideColor} 
                  style={styles.botIcon} 
                />
              )}
              <Text
                style={[
                  styles.messageText,
                  { color: message.type === 'user' ? '#FFFFFF' : theme.text },
                ]}
              >
                {message.content}
              </Text>
            </Animated.View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.assistantBubble, styles.messageBubble, styles.typingBubble, { backgroundColor: isDark ? theme.surface : '#F3F4F6' }]}>
              <Icon name="robot" size={16} color={slideColor} style={styles.botIcon} />
              <View style={styles.typingDots}>
                <TypingDot delay={0} color={slideColor} />
                <TypingDot delay={150} color={slideColor} />
                <TypingDot delay={300} color={slideColor} />
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Status indicator */}
      <Text style={[styles.statusText, { color: theme.textTertiary }]}>
        {demoComplete ? "✨ This is just a glimpse of what I can do for you" : ''}
      </Text>
    </Animated.View>
  );
};

// Animated typing dot component
const TypingDot: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.typingDot,
        {
          backgroundColor: color,
          opacity: dotAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          }),
          transform: [
            {
              scale: dotAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1.2],
              }),
            },
          ],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: spacing.xs,
  },
  messageBubble: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: '8%',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    marginRight: '8%',
    flexDirection: 'row',
  },
  typingBubble: {
    paddingVertical: spacing.md,
  },
  botIcon: {
    marginRight: spacing.xs,
    marginTop: 3,
  },
  messageText: {
    ...typography.bodyMedium,
    lineHeight: 20,
    flexShrink: 1,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.bodySmall,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

export default AIIntroSlide;
