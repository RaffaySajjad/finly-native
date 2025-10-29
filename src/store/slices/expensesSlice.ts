/**
 * Expenses Slice - Redux Toolkit
 * Purpose: Manages expenses/transactions state
 * Handles CRUD operations for financial transactions
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Expense } from '../../types';

interface ExpensesState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ExpensesState = {
  expenses: [],
  isLoading: false,
  error: null,
};

/**
 * Async thunk to fetch all expenses
 */
export const fetchExpenses = createAsyncThunk(
  'expenses/fetchAll',
  async () => {
    const expenses = await apiService.getExpenses();
    return expenses;
  }
);

/**
 * Async thunk to create a new expense
 */
export const createExpense = createAsyncThunk(
  'expenses/create',
  async (expense: Omit<Expense, 'id'>) => {
    const newExpense = await apiService.createExpense(expense);
    return newExpense;
  }
);

/**
 * Async thunk to update an expense
 */
export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ id, updates }: { id: string; updates: Partial<Omit<Expense, 'id'>> }) => {
    const updatedExpense = await apiService.editExpense(id, updates);
    return updatedExpense;
  }
);

/**
 * Async thunk to delete an expense
 */
export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id: string) => {
    await apiService.deleteExpense(id);
    return id;
  }
);

/**
 * Async thunk to generate AI expense
 */
export const generateAIExpense = createAsyncThunk(
  'expenses/generateAI',
  async () => {
    const aiExpense = await apiService.mockAIExpense();
    return aiExpense;
  }
);

/**
 * Async thunk to extract receipt data
 */
export const extractReceiptData = createAsyncThunk(
  'expenses/extractReceipt',
  async (imageUri: string) => {
    const extractedData = await apiService.extractReceiptData(imageUri);
    return extractedData;
  }
);

/**
 * Expenses slice with reducers and actions
 */
const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch expenses
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch expenses';
      });

    // Create expense
    builder
      .addCase(createExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses.unshift(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create expense';
      });

    // Update expense
    builder
      .addCase(updateExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.expenses.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update expense';
      });

    // Delete expense
    builder
      .addCase(deleteExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses = state.expenses.filter(e => e.id !== action.payload);
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete expense';
      });

    // Generate AI expense
    builder
      .addCase(generateAIExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateAIExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses.unshift(action.payload);
      })
      .addCase(generateAIExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to generate AI expense';
      });

    // Extract receipt data (doesn't modify state, just returns data)
    builder
      .addCase(extractReceiptData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(extractReceiptData.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(extractReceiptData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to extract receipt data';
      });
  },
});

export const { clearError } = expensesSlice.actions;
export default expensesSlice.reducer;

