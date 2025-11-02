/**
 * BottomSheetContext
 * Purpose: Share bottom sheet handler between DashboardScreen and CustomTabBar
 */

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';

interface BottomSheetContextType {
  setHandler: (handler: (() => void) | null) => void;
  openBottomSheet: () => void;
  setBottomSheetRef: (ref: BottomSheet | null) => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

export const BottomSheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlerRef = useRef<(() => void) | null>(null);
  const bottomSheetRefRef = useRef<BottomSheet | null>(null);

  const setHandler = useCallback((newHandler: (() => void) | null) => {
    handlerRef.current = newHandler;
  }, []);

  const setBottomSheetRef = useCallback((ref: BottomSheet | null) => {
    bottomSheetRefRef.current = ref;
  }, []);

  const openBottomSheet = useCallback(() => {
    console.log('[BottomSheetContext] openBottomSheet called');
    console.log('[BottomSheetContext] bottomSheetRefRef.current:', !!bottomSheetRefRef.current);
    console.log('[BottomSheetContext] handlerRef.current:', !!handlerRef.current);
    if (bottomSheetRefRef.current) {
      console.log('[BottomSheetContext] Opening via ref');
      bottomSheetRefRef.current.snapToIndex(0);
    } else if (handlerRef.current) {
      console.log('[BottomSheetContext] Opening via handler');
      handlerRef.current();
    } else {
      console.warn('[BottomSheetContext] No handler or bottomSheetRef registered yet');
    }
  }, []);

  return (
    <BottomSheetContext.Provider value={{ setHandler, openBottomSheet, setBottomSheetRef }}>
      {children}
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = () => {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error('useBottomSheet must be used within BottomSheetProvider');
  }
  return context;
};

