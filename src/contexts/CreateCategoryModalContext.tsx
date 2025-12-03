/**
 * CreateCategoryModalContext
 * Purpose: Control CreateCategoryModal from anywhere in the app, similar to BottomSheetContext
 */

import React, { createContext, useContext, useRef, useCallback, ReactNode, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';

interface CreateCategoryModalConfig {
  onCreate: (data: {
    name: string;
    icon: string;
    color: string;
    budgetLimit?: number;
  }) => Promise<void>;
  isPremium: boolean;
  existingCategoryNames?: string[];
}

interface CreateCategoryModalContextType {
  openCreateCategoryModal: (config: CreateCategoryModalConfig) => void;
  closeCreateCategoryModal: () => void;
  setBottomSheetRef: (ref: BottomSheet | null) => void;
  config: CreateCategoryModalConfig | null;
}

const CreateCategoryModalContext = createContext<CreateCategoryModalContextType | undefined>(undefined);

export const CreateCategoryModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const bottomSheetRefRef = useRef<BottomSheet | null>(null);
  const [config, setConfig] = useState<CreateCategoryModalConfig | null>(null);

  const setBottomSheetRef = useCallback((ref: BottomSheet | null) => {
    console.log('[CreateCategoryModalContext] setBottomSheetRef', !!ref);
    bottomSheetRefRef.current = ref;
  }, []);

  const openCreateCategoryModal = useCallback((newConfig: CreateCategoryModalConfig) => {
    console.log('[CreateCategoryModalContext] openCreateCategoryModal', {
      hasRef: !!bottomSheetRefRef.current,
      config: newConfig
    });
    setConfig(newConfig);
    if (bottomSheetRefRef.current) {
      console.log('[CreateCategoryModalContext] snapping to index 0');
      bottomSheetRefRef.current.snapToIndex(0);
    } else {
      console.warn('[CreateCategoryModalContext] No ref available!');
    }
  }, []);

  const closeCreateCategoryModal = useCallback(() => {
    if (bottomSheetRefRef.current) {
      bottomSheetRefRef.current.close();
    }
    // Clear config after a delay to allow close animation
    setTimeout(() => {
      setConfig(null);
    }, 300);
  }, []);

  return (
    <CreateCategoryModalContext.Provider value={{ 
      openCreateCategoryModal, 
      closeCreateCategoryModal, 
      setBottomSheetRef,
      config,
    }}>
      {children}
    </CreateCategoryModalContext.Provider>
  );
};

export const useCreateCategoryModal = () => {
  const context = useContext(CreateCategoryModalContext);
  if (!context) {
    throw new Error('useCreateCategoryModal must be used within CreateCategoryModalProvider');
  }
  return context;
};

