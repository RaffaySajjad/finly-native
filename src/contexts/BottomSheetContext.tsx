/**
 * BottomSheetContext
 * Purpose: Share bottom sheet handler between DashboardScreen and CustomTabBar
 */

import React, { createContext, useContext, useMemo, useRef, useCallback, ReactNode, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
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
  setBottomSheetRef: (ref: BottomSheetModal | null) => void;
  onTransactionAdded: () => void;
  /** Subscribe to transaction changes. Returns unsubscribe function. */
  subscribeToTransactionChanges: (callback: () => void) => () => void;
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
  const bottomSheetRefRef = useRef<BottomSheetModal | null>(null);
  const onParsedTransactionUpdateRef = useRef<((update: ParsedTransactionUpdate) => void) | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeTransaction | null>(null);

  const setHandler = useCallback((newHandler: (() => void) | null) => {
    handlerRef.current = newHandler;
  }, []);

  const setBottomSheetRef = useCallback((ref: BottomSheetModal | null) => {
    bottomSheetRefRef.current = ref;
  }, []);

  const setOnTransactionAdded = useCallback((callback: (() => void) | null) => {
    // DEPRECATED: Kept for backward compatibility, use subscribeToTransactionChanges instead
    // This will be the 'primary' callback for existing code
    if (callback) {
      transactionSubscribersRef.current.add(callback);
    }
  }, []);

  // New subscriber pattern - returns unsubscribe function
  const transactionSubscribersRef = useRef<Set<() => void>>(new Set());

  const subscribeToTransactionChanges = useCallback((callback: () => void) => {
    transactionSubscribersRef.current.add(callback);
    logger.debug(`[BottomSheetContext] Subscriber added, total: ${transactionSubscribersRef.current.size}`);

    // Return unsubscribe function
    return () => {
      transactionSubscribersRef.current.delete(callback);
      logger.debug(`[BottomSheetContext] Subscriber removed, total: ${transactionSubscribersRef.current.size}`);
    };
  }, []);

  const onTransactionAdded = useCallback(() => {
    logger.debug(`[BottomSheetContext] Notifying ${transactionSubscribersRef.current.size} subscribers`);
    transactionSubscribersRef.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('[BottomSheetContext] Subscriber callback error:', error);
      }
    });
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
      subscribeToTransactionChanges,
      onParsedTransactionUpdate,
      setOnParsedTransactionUpdate,
    }),
    [
      setHandler,
      openBottomSheet,
      setBottomSheetRef,
      onTransactionAdded,
      subscribeToTransactionChanges,
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

