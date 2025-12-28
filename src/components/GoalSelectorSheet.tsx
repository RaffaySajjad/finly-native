/**
 * GoalSelectorSheet Component
 * Purpose: Bottom sheet for selecting/changing financial goal
 * Used in Profile screen for goal management
 */

import React, { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';
import { useGoal, GOAL_INFO, UserGoal } from '../hooks/useGoal';
import { typography, spacing, borderRadius } from '../theme';
import { BottomSheetBackground, PrimaryButton } from './index';

export interface GoalSelectorSheetRef {
  open: () => void;
  close: () => void;
}

interface GoalSelectorSheetProps {
  onGoalChanged?: (goal: UserGoal) => void;
}

const GOALS: UserGoal[] = ['budget', 'save', 'track', 'debt'];

const GoalSelectorSheet = forwardRef<GoalSelectorSheetRef, GoalSelectorSheetProps>(
  ({ onGoalChanged }, ref) => {
    const { theme } = useTheme();
    const { goal: currentGoal, updateGoal, updating } = useGoal();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Sync selected goal when current goal changes or sheet opens
    useEffect(() => {
      if (isOpen && currentGoal) {
        setSelectedGoal(currentGoal);
      }
    }, [currentGoal, isOpen]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      open: () => {
        setSelectedGoal(currentGoal);
        setIsOpen(true);
        bottomSheetRef.current?.expand();
      },
      close: () => {
        setIsOpen(false);
        bottomSheetRef.current?.close();
      },
    }));

    const handleConfirm = useCallback(async () => {
      // If no change, just close
      if (!selectedGoal || selectedGoal === currentGoal) {
        setIsOpen(false);
        bottomSheetRef.current?.close();
        return;
      }

      // Store the selected goal before async operation
      const goalToSet = selectedGoal;
      
      const success = await updateGoal(goalToSet);
      
      // Always close the sheet after update attempt
      setIsOpen(false);
      bottomSheetRef.current?.close();
      
      if (success) {
        // Notify parent after sheet closes
        setTimeout(() => {
          onGoalChanged?.(goalToSet);
        }, 100);
      }
    }, [selectedGoal, currentGoal, updateGoal, onGoalChanged]);

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        setIsOpen(false);
      }
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundComponent={(props) => <BottomSheetBackground {...props} />}
        handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
        onChange={handleSheetChange}
      >
        <BottomSheetView style={styles.container}>
          <Text style={[styles.title, { color: theme.text }]}>
            Change Your Goal
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your insights and dashboard will adapt to help you achieve this goal
          </Text>

          {/* Goal Options */}
          <View style={styles.goalsContainer}>
            {GOALS.map((goalId) => {
              const goalInfo = GOAL_INFO[goalId];
              const isSelected = selectedGoal === goalId;
              const isCurrent = currentGoal === goalId;

              return (
                <TouchableOpacity
                  key={goalId}
                  style={[
                    styles.goalOption,
                    { 
                      backgroundColor: isSelected ? goalInfo.color + '15' : theme.card,
                      borderColor: isSelected ? goalInfo.color : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedGoal(goalId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.goalIcon, { backgroundColor: goalInfo.color + '20' }]}>
                    <Icon name={goalInfo.icon as any} size={24} color={goalInfo.color} />
                  </View>
                  <View style={styles.goalText}>
                    <View style={styles.goalTitleRow}>
                      <Text style={[styles.goalTitle, { color: theme.text }]}>
                        {goalInfo.title}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.currentBadgeText, { color: theme.primary }]}>
                            Current
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.goalDescription, { color: theme.textSecondary }]}>
                      {goalInfo.description}
                    </Text>
                  </View>
                  <View style={styles.radioContainer}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? goalInfo.color : theme.border },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: goalInfo.color }]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          <View style={styles.confirmButton}>
            <PrimaryButton
              label={updating ? 'Updating...' : 'Confirm Goal'}
              onPress={handleConfirm}
              disabled={updating || !selectedGoal || selectedGoal === currentGoal}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginBottom: spacing.lg,
  },
  goalsContainer: {
    gap: spacing.sm,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  goalText: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  goalTitle: {
    ...typography.titleSmall,
    fontWeight: '600',
  },
  goalDescription: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    ...typography.labelSmall,
    fontWeight: '600',
    fontSize: 10,
  },
  radioContainer: {
    marginLeft: spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  confirmButton: {
    marginTop: spacing.lg,
  },
});

GoalSelectorSheet.displayName = 'GoalSelectorSheet';

export default GoalSelectorSheet;
