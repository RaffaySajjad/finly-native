/**
 * Performance Context
 * Purpose: Provide device performance capabilities throughout the app
 * 
 * Usage:
 * const { deviceTier, shouldUseComplexAnimations } = usePerformance();
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  initializePerformanceDetection,
  setPerformanceOverride,
  resetPerformanceOverride,
  DeviceTier,
  AnimationComplexity,
} from '../utils/PerformanceDetector';

interface PerformanceProfile {
  deviceTier: DeviceTier;
  animationComplexity: AnimationComplexity;
  shouldUseComplexAnimations: boolean;
  shouldUseGlowEffects: boolean;
  shouldUseParticleEffects: boolean;
  shouldUseBlurEffects: boolean;
  maxFPS: 60 | 30;
}

interface PerformanceContextType extends PerformanceProfile {
  isInitialized: boolean;
  setOverride: (tier: DeviceTier) => Promise<void>;
  resetOverride: () => Promise<void>;
}

const defaultProfile: PerformanceProfile = {
  deviceTier: 'mid',
  animationComplexity: 'medium',
  shouldUseComplexAnimations: true,
  shouldUseGlowEffects: true,
  shouldUseParticleEffects: false,
  shouldUseBlurEffects: true,
  maxFPS: 60,
};

const PerformanceContext = createContext<PerformanceContextType>({
  ...defaultProfile,
  isInitialized: false,
  setOverride: async () => {},
  resetOverride: async () => {},
});

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider');
  }
  return context;
};

interface PerformanceProviderProps {
  children: ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<PerformanceProfile>(defaultProfile);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const detectedProfile = await initializePerformanceDetection();
        setProfile(detectedProfile);
        setIsInitialized(true);
      } catch (error) {
        console.error('[PerformanceContext] Initialization error:', error);
        setIsInitialized(true); // Still mark as initialized with defaults
      }
    };

    initialize();
  }, []);

  const handleSetOverride = async (tier: DeviceTier) => {
    await setPerformanceOverride(tier);
    // Re-initialize to apply new settings
    const newProfile = await initializePerformanceDetection();
    setProfile(newProfile);
  };

  const handleResetOverride = async () => {
    await resetPerformanceOverride();
    // Re-initialize to detect actual device tier
    const newProfile = await initializePerformanceDetection();
    setProfile(newProfile);
  };

  const value: PerformanceContextType = {
    ...profile,
    isInitialized,
    setOverride: handleSetOverride,
    resetOverride: handleResetOverride,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
