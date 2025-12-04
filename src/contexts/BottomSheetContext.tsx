/**
 * BottomSheetContext
 * Purpose: Share bottom sheet handler between DashboardScreen and CustomTabBar
 */

import React, { createContext, useContext, useRef, useCallback, ReactNode, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { Expense, IncomeTransaction } from '../types';

interface BottomSheetContextType {
  setHandler: (handler: (() => void) | null) => void;
  openBottomSheet: (editingExpense?: Expense, editingIncome?: IncomeTransaction) => void;
  setBottomSheetRef: (ref: BottomSheet | null) => void;
  onTransactionAdded: () => void;
  setOnTransactionAdded: (callback: (() => void) | null) => void;
  editingExpense: Expense | null;
  editingIncome: IncomeTransaction | null;
  setEditingExpense: (expense: Expense | null) => void;
  setEditingIncome: (income: IncomeTransaction | null) => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

export const BottomSheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlerRef = useRef<(() => void) | null>(null);
  const bottomSheetRefRef = useRef<BottomSheet | null>(null);
  const onTransactionAddedRef = useRef<(() => void) | null>(null);
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

  const openBottomSheet = useCallback((editingExpenseParam?: Expense, editingIncomeParam?: IncomeTransaction) => {
    console.log('[BottomSheetContext] openBottomSheet called', { editingExpense: !!editingExpenseParam, editingIncome: !!editingIncomeParam });

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
    <BottomSheetContext.Provider value={{
      setHandler,
      openBottomSheet,
      setBottomSheetRef,
      onTransactionAdded,
      setOnTransactionAdded,
      editingExpense,
      editingIncome,
      setEditingExpense,
      setEditingIncome,
    }}>
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

