/**
 * IconButton Component
 * Purpose: Reusable icon-only button with consistent styling
 * Follows: SOLID principles (SRP), performance-optimized with React.memo
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius } from '../theme';
import ScaleButton from './ScaleButton';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  containerStyle?: any;
}

/**
 * IconButton - Reusable icon-only button
 * @param icon - Icon name to display
 * @param onPress - Press handler
 * @param size - Icon size (default: 24)
 * @param color - Icon color (default: theme.text)
 * @param backgroundColor - Background color (default: theme.card)
 * @param containerStyle - Custom container styles
 */
const IconButton: React.FC<IconButtonProps> = React.memo(({
  icon,
  onPress,
  size = 24,
  color,
  backgroundColor,
  containerStyle,
}) => {
  const { theme } = useTheme();

  return (
    <ScaleButton
      style={[
        styles.button,
        {
          backgroundColor: backgroundColor || theme.card,
          borderColor: theme.border,
        },
        containerStyle,
      ]}
      onPress={onPress}
      hapticFeedback="light"
      scaleAmount={0.92}
    >
      <Icon name={icon as any} size={size} color={color || theme.text} />
    </ScaleButton>
  );
});

IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export default IconButton;
