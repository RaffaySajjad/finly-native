/**
 * Tags Service
 * Purpose: Manages user-created tags for organizing expenses
 * Features: Create, read, update, delete tags using backend API
 */

import { Tag } from '../types';
import { api } from './apiClient';
import { API_ENDPOINTS } from '../config/api.config';

/**
 * Load all tags for the current user
 */
export async function getTags(): Promise<Tag[]> {
  try {
    const response = await api.get<Tag[]>(API_ENDPOINTS.TAGS.LIST);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch tags');
    }
    return response.data || [];
  } catch (error) {
    console.error('Error loading tags:', error);
    return [];
  }
}

/**
 * Create a new tag
 */
export async function createTag(name: string, color?: string): Promise<Tag> {
  try {
    // Generate a color if not provided
    const tagColors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EC4899', // Pink
      '#8B5CF6', // Purple
      '#EF4444', // Red
      '#6366F1', // Indigo
      '#14B8A6', // Teal
    ];
    
    const randomColor = color || tagColors[Math.floor(Math.random() * tagColors.length)];

    const response = await api.post<Tag>(API_ENDPOINTS.TAGS.LIST, {
      name: name.trim(),
      color: randomColor,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create tag');
    }

    if (!response.data) {
      throw new Error('No tag data returned from server');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
}

/**
 * Update an existing tag
 */
export async function updateTag(tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
  try {
    const response = await api.put<Tag>(
      API_ENDPOINTS.TAGS.LIST + '/' + tagId,
      updates
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update tag');
    }

    if (!response.data) {
      throw new Error('No tag data returned from server');
    }

    return response.data;
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string): Promise<void> {
  try {
    const response = await api.delete(API_ENDPOINTS.TAGS.LIST + '/' + tagId);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete tag');
    }
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
}

/**
 * Get tag by ID
 */
export async function getTagById(tagId: string): Promise<Tag | null> {
  try {
    const tags = await getTags();
    return tags.find(t => t.id === tagId) || null;
  } catch (error) {
    console.error('Error getting tag by ID:', error);
    return null;
  }
}

export default {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTagById,
};

