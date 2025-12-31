/**
 * ChartEmptyState Component
 * Purpose: Animated empty state illustrations for chart components
 * Features: Staggered entrance animations, floating effects, SVG path animations
 * Variants: line, bar, pie - each with chart-specific animated illustrations
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, G, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, borderRadius } from '../../theme';
import ScaleButton from '../ScaleButton';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export type ChartEmptyStateVariant = 'line' | 'bar' | 'pie' | 'forecast';

interface ChartEmptyStateProps {
  variant: ChartEmptyStateVariant;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  compact?: boolean;
}

// Default copywriting for each chart variant
const DEFAULT_COPY: Record<ChartEmptyStateVariant, { title: string; subtitle: string }> = {
  line: {
    title: "No spending data yet",
    subtitle: "Add expenses to see your spending trends over time"
  },
  bar: {
    title: "No category data yet", 
    subtitle: "Add expenses to see your spending breakdown by category"
  },
  pie: {
    title: "No breakdown available",
    subtitle: "Add expenses to see how your spending is distributed"
  },
  forecast: {
    title: "Building your forecast...",
    subtitle: "Keep logging expenses and we'll have a personalized prediction for you soon!"
  },
};

const ChartEmptyState: React.FC<ChartEmptyStateProps> = React.memo(({
  variant,
  title,
  subtitle,
  actionLabel,
  onActionPress,
  compact = false,
}) => {
  const { theme, isDark } = useTheme();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const subtitleFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  // Chart-specific animations
  const lineDrawAnim = useRef(new Animated.Value(0)).current;
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;
  const bar4Anim = useRef(new Animated.Value(0)).current;
  const pieSegment1Anim = useRef(new Animated.Value(0)).current;
  const pieSegment2Anim = useRef(new Animated.Value(0)).current;
  const pieSegment3Anim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get default copy if not provided
  const displayTitle = title || DEFAULT_COPY[variant].title;
  const displaySubtitle = subtitle || DEFAULT_COPY[variant].subtitle;

  useEffect(() => {
    // Staggered entrance animation sequence
    // Note: Using useNativeDriver: false for all animations to maintain consistency 
    // with SVG animations (strokeDashoffset, etc.) which don't support native driver
    Animated.sequence([
      // First: fade and scale in the illustration
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }),
      ]),
      // Then: animate the chart elements
      Animated.parallel([
        // Line chart: draw the line
        Animated.timing(lineDrawAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        // Bar chart: staggered bars
        Animated.stagger(80, [
          Animated.spring(bar1Anim, { toValue: 1, tension: 40, friction: 6, useNativeDriver: false }),
          Animated.spring(bar2Anim, { toValue: 1, tension: 40, friction: 6, useNativeDriver: false }),
          Animated.spring(bar3Anim, { toValue: 1, tension: 40, friction: 6, useNativeDriver: false }),
          Animated.spring(bar4Anim, { toValue: 1, tension: 40, friction: 6, useNativeDriver: false }),
        ]),
        // Pie chart: staggered segments
        Animated.stagger(150, [
          Animated.timing(pieSegment1Anim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.timing(pieSegment2Anim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.timing(pieSegment3Anim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        ]),
      ]),
      // Then: fade in title
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Then: fade in subtitle
      Animated.timing(subtitleFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Finally: fade in button
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const renderLineChartIllustration = () => {
    const size = compact ? 100 : 140;
    const strokeColor = theme.expense + '80';
    const accentColor = theme.expense;
    const gridColor = theme.border + '40';

    // Path for a realistic spending trend line
    const linePath = "M 10 60 Q 25 55, 35 40 T 55 50 T 75 35 T 95 45 T 115 25 T 130 30";
    const pathLength = 200;

    const strokeDashoffset = lineDrawAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [pathLength, 0],
    });

    return (
      <View style={[styles.illustrationContainer, compact && styles.illustrationContainerCompact]}>
        <Svg width={size} height={size * 0.7} viewBox="0 0 140 98">
          {/* Grid lines */}
          <Path d="M 10 20 H 130" stroke={gridColor} strokeWidth={0.5} />
          <Path d="M 10 40 H 130" stroke={gridColor} strokeWidth={0.5} />
          <Path d="M 10 60 H 130" stroke={gridColor} strokeWidth={0.5} />
          <Path d="M 10 80 H 130" stroke={gridColor} strokeWidth={0.5} />

          {/* Animated line */}
          <AnimatedPath
            d={linePath}
            stroke={strokeColor}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={strokeDashoffset}
          />

          {/* X-axis */}
          <Path d="M 10 85 H 130" stroke={theme.border} strokeWidth={1} />
        </Svg>

        {/* Floating accent dot at end of line */}
        <Animated.View
          style={[
            styles.lineAccentDot,
            {
              backgroundColor: accentColor,
              transform: [{ translateY }, { scale: pulseAnim }],
              opacity: lineDrawAnim,
            },
          ]}
        />
      </View>
    );
  };

  const renderBarChartIllustration = () => {
    const size = compact ? 100 : 140;
    const colors = [theme.primary, theme.success, theme.warning, theme.expense];
    const heights = [50, 70, 40, 60];
    const barWidth = 18;
    const gap = 8;
    const startX = 20;

    return (
      <View style={[styles.illustrationContainer, compact && styles.illustrationContainerCompact]}>
        <Svg width={size} height={size * 0.7} viewBox="0 0 140 98">
          {/* Grid lines */}
          <Path d="M 10 20 H 130" stroke={theme.border + '30'} strokeWidth={0.5} />
          <Path d="M 10 40 H 130" stroke={theme.border + '30'} strokeWidth={0.5} />
          <Path d="M 10 60 H 130" stroke={theme.border + '30'} strokeWidth={0.5} />

          {/* Animated bars */}
          {[bar1Anim, bar2Anim, bar3Anim, bar4Anim].map((anim, index) => {
            const x = startX + index * (barWidth + gap);
            const height = heights[index];
            
            const animatedHeight = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, height],
            });
            
            const animatedY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [80, 80 - height],
            });

            return (
              <AnimatedRect
                key={index}
                x={x}
                y={animatedY}
                width={barWidth}
                height={animatedHeight}
                rx={4}
                fill={colors[index] + 'CC'}
              />
            );
          })}

          {/* X-axis */}
          <Path d="M 10 80 H 130" stroke={theme.border} strokeWidth={1} />
        </Svg>
      </View>
    );
  };

  const renderPieChartIllustration = () => {
    const size = compact ? 100 : 140;
    const centerX = 70;
    const centerY = 49;
    const radius = 35;
    const innerRadius = 20;

    // Segment colors
    const colors = [theme.primary, theme.success, theme.warning];
    
    // Create arc paths for donut segments
    const createArcPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
      const startOuter = {
        x: centerX + outerR * Math.cos(startAngle),
        y: centerY + outerR * Math.sin(startAngle),
      };
      const endOuter = {
        x: centerX + outerR * Math.cos(endAngle),
        y: centerY + outerR * Math.sin(endAngle),
      };
      const startInner = {
        x: centerX + innerR * Math.cos(endAngle),
        y: centerY + innerR * Math.sin(endAngle),
      };
      const endInner = {
        x: centerX + innerR * Math.cos(startAngle),
        y: centerY + innerR * Math.sin(startAngle),
      };
      
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      
      return `M ${startOuter.x} ${startOuter.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
    };

    // Define segments (-90° offset to start from top)
    const segments = [
      { start: -Math.PI / 2, end: Math.PI / 6, anim: pieSegment1Anim },
      { start: Math.PI / 6, end: 2 * Math.PI / 3, anim: pieSegment2Anim },
      { start: 2 * Math.PI / 3, end: 3 * Math.PI / 2, anim: pieSegment3Anim },
    ];

    return (
      <View style={[styles.illustrationContainer, compact && styles.illustrationContainerCompact]}>
        <Svg width={size} height={size * 0.7} viewBox="0 0 140 98">
          <Defs>
            {colors.map((color, i) => (
              <LinearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </LinearGradient>
            ))}
          </Defs>

          {/* Background ring (subtle) */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={theme.border + '30'}
            strokeWidth={radius - innerRadius}
          />

          {/* Animated segments - using AnimatedPath with opacity prop */}
          {segments.map((seg, index) => {
            const path = createArcPath(seg.start, seg.end, radius, innerRadius);
            
            return (
              <AnimatedPath
                key={index}
                d={path}
                fill={colors[index] + 'CC'}
                opacity={seg.anim}
              />
            );
          })}
        </Svg>

        {/* Center pulsing icon */}
        <Animated.View
          style={[
            styles.pieCenterIcon,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Icon name="chart-donut" size={compact ? 16 : 20} color={theme.primary + '60'} />
        </Animated.View>
      </View>
    );
  };

  const renderForecastIllustration = () => {
    const size = compact ? 100 : 140;
    const strokeColor = theme.primary + '80';
    const gridColor = theme.border + '40';

    // Dashed forecast line path
    const solidPath = "M 10 60 Q 30 40, 50 50 T 80 35";
    const dashedPath = "M 80 35 Q 95 30, 110 40 T 130 25";
    const pathLength = 150;

    const strokeDashoffset = lineDrawAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [pathLength, 0],
    });

    return (
      <View style={[styles.illustrationContainer, compact && styles.illustrationContainerCompact]}>
        <Svg width={size} height={size * 0.7} viewBox="0 0 140 98">
          {/* Grid lines */}
          <Path d="M 10 20 H 130" stroke={gridColor} strokeWidth={0.5} />
          <Path d="M 10 40 H 130" stroke={gridColor} strokeWidth={0.5} />
          <Path d="M 10 60 H 130" stroke={gridColor} strokeWidth={0.5} />
          <Path d="M 10 80 H 130" stroke={gridColor} strokeWidth={0.5} />

          {/* Solid historical line */}
          <AnimatedPath
            d={solidPath}
            stroke={strokeColor}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={strokeDashoffset}
          />

          {/* Dashed forecast line */}
          <AnimatedPath
            d={dashedPath}
            stroke={theme.primary + '50'}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6 4"
            opacity={lineDrawAnim}
          />

          {/* X-axis */}
          <Path d="M 10 85 H 130" stroke={theme.border} strokeWidth={1} />
        </Svg>

        {/* Crystal ball accent floating */}
        <Animated.View
          style={[
            styles.forecastAccent,
            {
              backgroundColor: theme.primary + '15',
              borderColor: theme.primary + '30',
              transform: [{ translateY }, { scale: pulseAnim }],
              opacity: lineDrawAnim,
            },
          ]}
        >
          <Icon name="crystal-ball" size={compact ? 14 : 18} color={theme.primary} />
        </Animated.View>
      </View>
    );
  };

  const renderIllustration = () => {
    switch (variant) {
      case 'line':
        return renderLineChartIllustration();
      case 'bar':
        return renderBarChartIllustration();
      case 'pie':
        return renderPieChartIllustration();
      case 'forecast':
        return renderForecastIllustration();
      default:
        return renderLineChartIllustration();
    }
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {renderIllustration()}
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          {
            color: theme.text,
            opacity: titleFadeAnim,
          }
        ]}
      >
        {displayTitle}
      </Animated.Text>

      <Animated.Text
        style={[
          styles.subtitle,
          compact && styles.subtitleCompact,
          {
            color: theme.textSecondary,
            opacity: subtitleFadeAnim,
          }
        ]}
      >
        {displaySubtitle}
      </Animated.Text>

      {actionLabel && onActionPress && (
        <Animated.View style={{ opacity: buttonFadeAnim }}>
          <ScaleButton
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={onActionPress}
            hapticArgs="medium"
          >
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </ScaleButton>
        </Animated.View>
      )}
    </View>
  );
});

ChartEmptyState.displayName = 'ChartEmptyState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  containerCompact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  illustrationContainer: {
    width: 160,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  illustrationContainerCompact: {
    width: 120,
    height: 85,
    marginBottom: spacing.sm,
  },
  lineAccentDot: {
    position: 'absolute',
    top: 18,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pieCenterIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastAccent: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    ...typography.titleMedium,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 17,
  },
  titleCompact: {
    fontSize: 14,
    marginTop: 0,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 220,
  },
  actionButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ChartEmptyState;
