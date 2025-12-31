/**
 * PersonaSelectionSlide Component
 * Purpose: Allow users to select a lifestyle persona during onboarding
 * Features: Grid of persona cards, AI chat option, smooth animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius, elevation } from '../../theme';
import { springPresets } from '../../theme/AnimationConfig';

export interface Persona {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  description: string;
  categoryCount: number;
}

interface PersonaSelectionSlideProps {
  personas: Persona[];
  selectedPersonaId: string | null;
  onSelectPersona: (personaId: string) => void;
  onChatWithAI: () => void;
  isLoading?: boolean;
}

const PersonaSelectionSlide: React.FC<PersonaSelectionSlideProps> = ({
  personas,
  selectedPersonaId,
  onSelectPersona,
  onChatWithAI,
  isLoading = false,
}) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Staggered entrance animations for cards
  const cardAnimations = useRef(
    personas.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Fade in container
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Stagger card animations
    Animated.stagger(
      50,
      cardAnimations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          ...springPresets.gentle,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [personas.length]);

  const handleSelectPersona = (personaId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPersona(personaId);
  };

  const handleChatWithAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChatWithAI();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.titleRow]}>
          <LinearGradient
            colors={['#8B5CF6' + '30', '#8B5CF6' + '15']}
            style={styles.iconContainer}
          >
            <Icon name="account-group" size={24} color="#8B5CF6" />
          </LinearGradient>
          <Text style={[styles.title, { color: theme.text }]}>Who Are You?</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Pick a lifestyle profile for personalized categories
        </Text>
      </View>

      {/* Personas Grid */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {personas.map((persona, index) => {
          const isSelected = selectedPersonaId === persona.id;
          const animValue = cardAnimations[index] || new Animated.Value(1);

          return (
            <Animated.View
              key={persona.id}
              style={[
                styles.cardWrapper,
                {
                  opacity: animValue,
                  transform: [
                    {
                      translateY: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.personaCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                  elevation.sm,
                ]}
                onPress={() => handleSelectPersona(persona.id)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                {/* Selection Tint Overlay */}
                {isSelected && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: theme.primary + '15',
                        borderRadius: borderRadius.lg,
                      },
                    ]}
                  />
                )}
                {/* Emoji Badge */}
                <View
                  style={[
                    styles.emojiBadge,
                    { backgroundColor: isDark ? theme.surface : '#F9FAFB' },
                  ]}
                >
                  <Text style={styles.cardEmoji}>{persona.emoji}</Text>
                </View>

                {/* Content */}
                <Text
                  style={[styles.personaName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {persona.name}
                </Text>
                <Text
                  style={[styles.personaDescription, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {persona.description}
                </Text>

                {/* Category count badge */}
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: theme.primary + '20' },
                  ]}
                >
                  <Text style={[styles.categoryCount, { color: theme.primary }]}>
                    {persona.categoryCount} categories
                  </Text>
                </View>

                {/* Selected checkmark */}
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Icon name="check" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* AI Chat CTA */}
      <TouchableOpacity
        style={[
          styles.aiChatButton,
          {
            backgroundColor: isDark ? theme.card : '#FFFFFF',
            borderColor: theme.primary + '40',
            borderWidth: 1.5,
          },
          elevation.sm,
        ]}
        onPress={handleChatWithAI}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          style={styles.aiIconGradient}
        >
          <Icon name="robot" size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.aiTextContainer}>
          <Text style={[styles.aiTitle, { color: theme.text }]}>
            Something custom?
          </Text>
          <Text style={[styles.aiSubtitle, { color: theme.textSecondary }]}>
            Describe your life to Finly AI
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={theme.primary} />
      </TouchableOpacity>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Setting up your categories...
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0, // Let parent handle padding
    paddingTop: 0,
  },
  header: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
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
  scrollContainer: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  cardWrapper: {
    width: '48.5%',
    marginBottom: spacing.sm,
  },
  personaCard: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    minHeight: 120,
    position: 'relative',
  },
  emojiBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardEmoji: {
    fontSize: 18,
  },
  personaName: {
    ...typography.bodySmall,
    fontWeight: '700',
    marginBottom: 1,
  },
  personaDescription: {
    ...typography.caption,
    lineHeight: 14,
    opacity: 0.8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: spacing.xs,
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 4,
    borderRadius: borderRadius.xl,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  aiIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  aiTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  aiSubtitle: {
    ...typography.bodySmall,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  loadingText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
  },
});

export default PersonaSelectionSlide;
