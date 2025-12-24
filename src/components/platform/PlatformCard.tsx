/**
 * Platform-specific Card Components
 * Purpose: Render cards with platform-appropriate styling
 */

import React from 'react';
import { View, ViewStyle, StyleSheet, Platform, requireNativeComponent } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlatform } from '../../theme/platformDetector';
import { getMaterialDesign3Colors } from '../../theme/materialDesign3';
import { getAppleDesignSystemColors } from '../../theme/appleDesignSystem';
import { getLiquidGlassColors } from '../../theme/liquidGlass';
import { spacing, borderRadius, elevation } from '../../theme';

// Native iOS 26 Liquid Glass component (Objective-C bridge)
const LiquidGlassViewNative = Platform.OS === 'ios' 
  ? requireNativeComponent('LiquidGlassView')
  : null;

interface PlatformCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: number;
}

/**
 * PlatformCard - Automatically uses correct styling for platform
 */
export const PlatformCard: React.FC<PlatformCardProps> = ({ children, style, elevation: elevationLevel = 1 }) => {
  const { theme } = useTheme();
  const platform = usePlatform();

  let cardStyle: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.md,
  };

  if (platform.isAndroid) {
    // Material Design 3 styling
    const md3 = getMaterialDesign3Colors(theme);
    cardStyle = {
      ...cardStyle,
      backgroundColor: md3.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 0,
      shadowColor: md3.shadow,
      shadowOffset: { width: 0, height: elevationLevel * 2 },
      shadowOpacity: 0.1 + elevationLevel * 0.05,
      shadowRadius: elevationLevel * 4,
      elevation: elevationLevel * 2,
    };
  } else if (platform.supportsLiquidGlass) {
    // iOS 26+ Liquid Glass will use native component
    // For now, use semi-transparent styling
    const lg = getLiquidGlassColors(theme);
    cardStyle = {
      ...cardStyle,
      backgroundColor: lg.glassBackground,
      borderColor: lg.glassBorder,
      borderRadius: borderRadius.xl,
    };
  } else {
    // iOS < 26 Apple Design System
    const apple = getAppleDesignSystemColors(theme);
    cardStyle = {
      ...cardStyle,
      backgroundColor: apple.secondarySystemBackground,
      borderRadius: borderRadius.lg,
      borderColor: apple.separator,
    };
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

/**
 * LiquidGlassCard - Native iOS 26 Liquid Glass component wrapper
 * This will use the native Objective-C component when iOS 26+ is detected
 */
export const LiquidGlassCard: React.FC<PlatformCardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const platform = usePlatform();

  // For iOS 26+, use native LiquidGlassView component
  // TODO: Enable when iOS 26 SDK is available and properly typed
  // Note: Native components don't support children directly in React Native
  // We'll wrap it in a View instead
  // if (platform.supportsLiquidGlass && LiquidGlassViewNative) {
  //   return (
  //     <View style={style}>
  //       <LiquidGlassViewNative
  //         style={StyleSheet.absoluteFill}
  //         glassStyle="systemMaterial"
  //         cornerRadius={borderRadius.xl}
  //         blurRadius={20}
  //       />
  //       <View style={{ padding: spacing.md }}>{children}</View>
  //     </View>
  //   );
  // }

  // Fallback styling for iOS < 26 or Android
  const lg = getLiquidGlassColors(theme);
  return (
    <View
      style={[
        {
          backgroundColor: lg.glassBackground,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: lg.glassBorder,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default PlatformCard;

