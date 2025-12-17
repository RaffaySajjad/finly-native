/**
 * Date Formatter Utility
 * Shared date formatting functions for consistent date display across the app
 */

/**
 * Get date key (YYYY-MM-DD) in local timezone for consistent grouping
 */
export const getDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date string for display with smart labels (Today, Yesterday, weekday, or full date)
 */
export const formatDateLabel = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    const daysDiff = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      if (date.getFullYear() < today.getFullYear()) {
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } else {
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long'
        });
      }
    }
  }
};

/**
 * Check if a date is in the current month
 */
export const isCurrentMonth = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

/**
 * Get month label for a date (e.g., "December (This month)" or "November 2024")
 */
export const getMonthLabel = (dateString: string, isCurrent: boolean): string => {
  const date = new Date(dateString);
  if (isCurrent) {
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    return `${monthName} (This month)`;
  }
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

