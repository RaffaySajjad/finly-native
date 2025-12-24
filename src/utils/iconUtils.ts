/**
 * Icon Utilities
 * Validation and fallback handling for MaterialCommunityIcons
 */

// Valid MaterialCommunityIcons for insights
const VALID_ICONS = new Set([
  'alert-outline', 'alert-circle', 'alert-octagon', 'check-circle', 'piggy-bank',
  'trending-up', 'trending-down', 'chart-pie', 'chart-bar', 'lightbulb-outline',
  'target', 'arrow-down-circle', 'arrow-up-circle', 'speedometer', 'timer-sand',
  'calendar-clock', 'calendar-check', 'cash-multiple', 'credit-card', 'wallet',
  'shopping', 'car', 'food', 'airplane', 'home', 'heart-pulse', 'star', 'trophy',
  'medal', 'fire', 'clock-outline', 'lightbulb', 'calendar-weekend', 'alert',
  'information-outline', 'cash', 'bank', 'chart-line', 'receipt', 'tag',
]);

// Fallback mappings for common invalid icons
const ICON_FALLBACKS: Record<string, string> = {
  'alert-triangle': 'alert-outline',
  'warning': 'alert-outline',
  'exclamation': 'alert-circle',
  'info': 'information-outline',
  'success': 'check-circle',
  'error': 'alert-octagon',
};

/**
 * Get a valid MaterialCommunityIcon name, with fallback for invalid icons
 */
export const getValidIcon = (icon: string): string => {
  if (VALID_ICONS.has(icon)) return icon;
  if (ICON_FALLBACKS[icon]) return ICON_FALLBACKS[icon];
  return 'information-outline';
};












