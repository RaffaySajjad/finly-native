/**
 * Categories Slice - Redux Toolkit
 * Purpose: Manages category data and budget limits
 * Handles category spending tracking and budget updates
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Category } from '../../types';

interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  categories: [],
  isLoading: false,
  error: null,
};

/**
 * Async thunk to fetch all categories
 */
export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async () => {
    const categories = await apiService.getCategories();
    return categories;
  }
);

/**
 * Async thunk to update category budget
 * Note: In real implementation, this would call an API endpoint
 */
export const updateCategoryBudget = createAsyncThunk(
  'categories/updateBudget',
  async ({ categoryId, budgetLimit }: { categoryId: string; budgetLimit: number }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { categoryId, budgetLimit };
  }
);

/**
 * Categories slice with reducers and actions
 */
const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch categories';
      });

    // Update category budget
    builder
      .addCase(updateCategoryBudget.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCategoryBudget.fulfilled, (state, action) => {
        state.isLoading = false;
        const category = state.categories.find(c => c.id === action.payload.categoryId);
        if (category) {
          category.budgetLimit = action.payload.budgetLimit;
        }
      })
      .addCase(updateCategoryBudget.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update budget';
      });
  },
});

export const { clearError } = categoriesSlice.actions;
export default categoriesSlice.reducer;

