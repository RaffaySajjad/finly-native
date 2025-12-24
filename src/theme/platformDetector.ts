/**
 * Platform Detector
 * Purpose: Detect iOS version and platform for conditional UI rendering
 */

import { Platform, PlatformIOSStatic } from 'react-native';

interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  iosVersion: number | null;
  supportsLiquidGlass: boolean;
}

/**
 * Get iOS version number
 */
function getIOSVersion(): number | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const version = (Platform as PlatformIOSStatic).Version;
  if (typeof version === 'number') {
    return version;
  }

  // Parse version string if needed
  const match = version?.toString().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const iosVersion = getIOSVersion();
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  return {
    isIOS,
    isAndroid,
    iosVersion,
    supportsLiquidGlass: isIOS && iosVersion !== null && iosVersion >= 26,
  };
}

/**
 * Use platform-specific component
 */
export function usePlatform(): PlatformInfo {
  return getPlatformInfo();
}

export default getPlatformInfo;

