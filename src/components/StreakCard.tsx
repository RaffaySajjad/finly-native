import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { borderRadius, spacing, typography } from '../theme';

interface StreakCardProps {
  streakCount: number;
  currentXP?: number;
  level?: number;
  loading?: boolean;
}

// Fire SVG Path (Simplified Flame)
const FIRE_PATH = "M76.5 45.2C72.8 38.5 67.5 32.8 61.2 28.5C59.8 40.5 53.5 51.5 44.5 58.8C54 41 51 19 36.8 5.5C36.2 4.8 35.2 4.8 34.5 5.5C22.2 17.5 15.5 33.8 15.8 50.8C16 66.8 24.2 80.8 37.5 89.2C38.5 89.8 39.8 89.5 40.2 88.5C40.8 87.2 40.5 85.8 39.5 84.8C34.8 79.5 31.8 72.8 31.2 65.5C31.2 65.5 31.2 65.5 31.2 65.5C31 63.5 33.2 62.2 34.8 63.2C41.8 67.8 48.2 74.2 53.2 81.8C53.8 82.8 55 83.2 56 82.8C68.5 76.5 77.2 63.8 78 49.2C78 47.8 77.5 46.5 76.5 45.2Z";

const PARTICLE_COUNT = 8; // Reduced count for smaller space

const StreakCard: React.FC<StreakCardProps> = ({ streakCount, currentXP = 0, level = 1, loading = false }) => {
  // Animation Values
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Progress Calculation
  const xpProgress = currentXP % 1000;
  const xpTarget = 1000;
  const progressPercent = (xpProgress / xpTarget) * 100;
  
  // Particle System
  const particles = useRef([...Array(PARTICLE_COUNT)].map(() => ({
    y: new Animated.Value(0),
    x: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    // 1. Breathing Fire (Scale)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Glow Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Particle System (Adjusted for smaller height)
    particles.forEach((particle, index) => {
      const delay = index * 500 + Math.random() * 1000;
      
      const animateParticle = () => {
        // Reset properties
        particle.y.setValue(0);
        particle.x.setValue(Math.random() * 20 - 10); // Reduced spread
        particle.opacity.setValue(0);
        particle.scale.setValue(0);

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(particle.y, {
              toValue: -40 - Math.random() * 20, // Reduced fly up distance
              duration: 1500 + Math.random() * 800,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.parallel([
                Animated.timing(particle.opacity, {
                  toValue: 0.8,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.scale, {
                  toValue: 0.3 + Math.random() * 0.3, // Smaller particles
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
              Animated.delay(400),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start(() => {
            animateParticle(); 
        });
      };

      animateParticle();
    });
  };

  // Interpolations
  const scale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const glowScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }} // Horizontal gradient
        style={styles.cardBackground}
      >
        <View style={styles.contentRow}>
          
          {/* Left Side: Fire & Particles */}
          <View style={styles.iconContainer}>
            {/* Background Glow */}
            <Animated.View
              style={[
                styles.ambientGlow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 69, 0, 0.5)', 'transparent']}
                style={styles.glowGradient}
              />
            </Animated.View>

            {/* Particles */}
            <View style={styles.particleContainer}>
              {particles.map((particle, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      opacity: particle.opacity,
                      transform: [
                        { translateY: particle.y },
                        { translateX: particle.x },
                        { scale: particle.scale }
                      ]
                    }
                  ]}
                />
              ))}
            </View>

            {/* Fire SVG */}
            <Animated.View style={[styles.fireWrapper, { transform: [{ scale }] }]}>
              <Svg height="46" width="46" viewBox="0 0 100 100">
                <Defs>
                  <SvgLinearGradient id="fireGrad" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0" stopColor="#FF4500" stopOpacity="1" />
                    <Stop offset="0.5" stopColor="#FF8C00" stopOpacity="1" />
                    <Stop offset="1" stopColor="#FFD700" stopOpacity="1" />
                  </SvgLinearGradient>
                </Defs>
                <Path
                  d={FIRE_PATH}
                  fill="url(#fireGrad)"
                  stroke="#FFD700"
                  strokeWidth="0.5"
                  strokeOpacity="0.6"
                />
              </Svg>
            </Animated.View>
          </View>

          {/* Right Side: Text Info */}
          <View style={styles.textContainer}>
             <View style={styles.streakRow}>
                <Text style={styles.streakCount}>{streakCount}</Text>
                <Text style={styles.streakLabel}>{streakCount === 1 ? 'DAY' : 'DAYS'} STREAK</Text>
                {/* 
                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>LVL {level}</Text>
                </View>
                */}
             </View>
             
             <Text style={styles.streakMessage}>
               {streakCount > 7 ? "You're on fire! 🔥" : "Keep it going!"}
             </Text>

             {/* XP Progress Bar - Hidden for now
             <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
             </View>
             <Text style={styles.xpText}>{xpProgress} / {xpTarget} XP</Text>
             */}
          </View>
        </View>
      </LinearGradient>
      
      {/* Glossy Overlay */}
      <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glossOverlay}
          pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 72,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    elevation: 4,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardBackground: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  ambientGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 5, 
  },
  glowGradient: {
    flex: 1,
    borderRadius: 30,
  },
  fireWrapper: {
    zIndex: 10,
    marginTop: 4, 
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 69, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginRight: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
    letterSpacing: 1,
    marginRight: 10,
  },
  streakMessage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    marginTop: -2,
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 5,
  },
  particle: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  levelText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  xpText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
  glossOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});

export default StreakCard;
