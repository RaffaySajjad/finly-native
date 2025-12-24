/**
 * BottomSheetContext
 * Purpose: Share bottom sheet handler between DashboardScreen and CustomTabBar
 */

import React, { createContext, useContext, useMemo, useRef, useCallback, ReactNode, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { Expense, IncomeTransaction } from '../types';
import { logger } from '../utils/logger';

export interface ParsedTransactionUpdate {
  index: number;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  categoryId?: string;
  incomeSourceId?: string;
  date?: string;
}

interface BottomSheetActionsContextType {
  setHandler: (handler: (() => void) | null) => void;
  openBottomSheet: (editingExpense?: Expense, editingIncome?: IncomeTransaction) => void;
  setBottomSheetRef: (ref: BottomSheet | null) => void;
  onTransactionAdded: () => void;
  setOnTransactionAdded: (callback: (() => void) | null) => void;
  onParsedTransactionUpdate: ((update: ParsedTransactionUpdate) => void) | null;
  setOnParsedTransactionUpdate: (callback: ((update: ParsedTransactionUpdate) => void) | null) => void;
}

interface BottomSheetEditStateContextType {
  editingExpense: Expense | null;
  editingIncome: IncomeTransaction | null;
  setEditingExpense: (expense: Expense | null) => void;
  setEditingIncome: (income: IncomeTransaction | null) => void;
}

const BottomSheetActionsContext = createContext<BottomSheetActionsContextType | undefined>(undefined);
const BottomSheetEditStateContext = createContext<BottomSheetEditStateContextType | undefined>(undefined);

export const BottomSheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlerRef = useRef<(() => void) | null>(null);
  const bottomSheetRefRef = useRef<BottomSheet | null>(null);
  const onTransactionAddedRef = useRef<(() => void) | null>(null);
  const onParsedTransactionUpdateRef = useRef<((update: ParsedTransactionUpdate) => void) | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeTransaction | null>(null);

  const setHandler = useCallback((newHandler: (() => void) | null) => {
    handlerRef.current = newHandler;
  }, []);

  const setBottomSheetRef = useCallback((ref: BottomSheet | null) => {
    bottomSheetRefRef.current = ref;
  }, []);

  const setOnTransactionAdded = useCallback((callback: (() => void) | null) => {
    onTransactionAddedRef.current = callback;
  }, []);

  const onTransactionAdded = useCallback(() => {
    if (onTransactionAddedRef.current) {
      onTransactionAddedRef.current();
    }
  }, []);

  const setOnParsedTransactionUpdate = useCallback((callback: ((update: ParsedTransactionUpdate) => void) | null) => {
    onParsedTransactionUpdateRef.current = callback;
  }, []);

  const onParsedTransactionUpdate = useCallback((update: ParsedTransactionUpdate) => {
    if (onParsedTransactionUpdateRef.current) {
      onParsedTransactionUpdateRef.current(update);
    }
  }, []);

  const openBottomSheet = useCallback((editingExpenseParam?: Expense, editingIncomeParam?: IncomeTransaction) => {
    logger.debug('[BottomSheetContext] openBottomSheet called', {
      editingExpense: !!editingExpenseParam,
      editingIncome: !!editingIncomeParam,
    });

    // Set editing data if provided
    if (editingExpenseParam) {
      setEditingExpense(editingExpenseParam);
      setEditingIncome(null);
    } else if (editingIncomeParam) {
      setEditingIncome(editingIncomeParam);
      setEditingExpense(null);
    } else {
      // Clear editing data when opening for new transaction
      setEditingExpense(null);
      setEditingIncome(null);
    }

    logger.debug('[BottomSheetContext] refs status', {
      hasBottomSheetRef: !!bottomSheetRefRef.current,
      hasHandler: !!handlerRef.current,
    });
    if (bottomSheetRefRef.current) {
      logger.debug('[BottomSheetContext] Opening via ref');
      bottomSheetRefRef.current.snapToIndex(0);
    } else if (handlerRef.current) {
      logger.debug('[BottomSheetContext] Opening via handler');
      handlerRef.current();
    } else {
      logger.warn('[BottomSheetContext] No handler or bottomSheetRef registered yet');
    }
  }, []);

  // Keep action values stable even when editing state changes.
  const actionsValue = useMemo<BottomSheetActionsContextType>(
    () => ({
      setHandler,
      openBottomSheet,
      setBottomSheetRef,
      onTransactionAdded,
      setOnTransactionAdded,
      onParsedTransactionUpdate,
      setOnParsedTransactionUpdate,
    }),
    [
      setHandler,
      openBottomSheet,
      setBottomSheetRef,
      onTransactionAdded,
      setOnTransactionAdded,
      onParsedTransactionUpdate,
      setOnParsedTransactionUpdate,
    ]
  );

  const editStateValue = useMemo<BottomSheetEditStateContextType>(
    () => ({
      editingExpense,
      editingIncome,
      setEditingExpense,
      setEditingIncome,
    }),
    [editingExpense, editingIncome]
  );

  return (
    <BottomSheetActionsContext.Provider value={actionsValue}>
      <BottomSheetEditStateContext.Provider value={editStateValue}>
        {children}
      </BottomSheetEditStateContext.Provider>
    </BottomSheetActionsContext.Provider>
  );
};

export const useBottomSheetActions = (): BottomSheetActionsContextType => {
  const context = useContext(BottomSheetActionsContext);
  if (!context) {
    throw new Error('useBottomSheetActions must be used within BottomSheetProvider');
  }
  return context;
};

export const useBottomSheetEditState = (): BottomSheetEditStateContextType => {
  const context = useContext(BottomSheetEditStateContext);
  if (!context) {
    throw new Error('useBottomSheetEditState must be used within BottomSheetProvider');
  }
  return context;
};

// Backwards-compatible hook (kept for existing imports).
// Prefer `useBottomSheetActions` for most consumers to avoid rerenders on edit state changes.
export const useBottomSheet = (): BottomSheetActionsContextType & BottomSheetEditStateContextType => {
  const actions = useBottomSheetActions();
  const edit = useBottomSheetEditState();
  return { ...actions, ...edit };
};

