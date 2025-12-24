/**
 * Hook to scroll to top when tab is pressed while already on that screen
 * Purpose: Improve UX by allowing users to quickly return to top of screen
 */

import React, { useEffect, useRef } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ScrollView, FlatList } from 'react-native';

/**
 * Hook that scrolls to top when tab is pressed while screen is already focused
 * @param scrollViewRef - Ref to ScrollView component
 * @param flatListRef - Ref to FlatList component (optional, use if screen uses FlatList)
 */
export const useScrollToTopOnTabPress = (
  scrollViewRef?: React.RefObject<any>,
  flatListRef?: React.RefObject<any>
): void => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const tabPressListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Only set up listener if screen is focused
    if (!isFocused) {
      return;
    }

    // Listen for tab press events
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Only scroll if screen is already focused (user pressed same tab)
      if (isFocused) {
        // Scroll ScrollView to top
        const scrollView = scrollViewRef?.current as ScrollView | null | undefined;
        if (scrollView) {
          scrollView.scrollTo({ y: 0, animated: true });
        }
        
        // Scroll FlatList to top
        const flatList = flatListRef?.current as FlatList<any> | null | undefined;
        if (flatList) {
          flatList.scrollToOffset({ offset: 0, animated: true });
        }
      }
    });

    tabPressListenerRef.current = unsubscribe;

    return () => {
      if (tabPressListenerRef.current) {
        tabPressListenerRef.current();
      }
    };
  }, [navigation, isFocused, scrollViewRef, flatListRef]);
};

