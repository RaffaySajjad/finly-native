/**
 * Tags Service
 * Purpose: Manages user-created tags for organizing expenses
 * Features: Create, read, update, delete tags with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tag } from '../types';

const TAGS_STORAGE_KEY = '@finly_tags';

// Default tags that are available to all users
const DEFAULT_TAGS: Tag[] = [
  {
    id: 'default_business',
    name: 'Business',
    color: '#3B82F6',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default_personal',
    name: 'Personal',
    color: '#10B981',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default_tax_deductible',
    name: 'Tax Deductible',
    color: '#F59E0B',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get user-specific storage key for tags
 */
const getUserTagsKey = (userId: string): string => {
  return `${TAGS_STORAGE_KEY}_${userId}`;
};

/**
 * Gets current user ID from AsyncStorage
 */
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('@finly_user_data');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id;
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }
  return null;
};

/**
 * Load all tags for the current user
 */
export async function getTags(): Promise<Tag[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return DEFAULT_TAGS;
    }

    const key = getUserTagsKey(userId);
    const data = await AsyncStorage.getItem(key);
    
    if (data) {
      const userTags = JSON.parse(data) as Tag[];
      // Merge default tags with user tags (avoid duplicates)
      const defaultTagIds = new Set(DEFAULT_TAGS.map(t => t.id));
      const customTags = userTags.filter(t => !defaultTagIds.has(t.id));
      return [...DEFAULT_TAGS, ...customTags];
    }

    return DEFAULT_TAGS;
  } catch (error) {
    console.error('Error loading tags:', error);
    return DEFAULT_TAGS;
  }
}

/**
 * Create a new tag
 */
export async function createTag(name: string, color?: string): Promise<Tag> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

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

    const newTag: Tag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color: randomColor,
      createdAt: new Date().toISOString(),
    };

    const existingTags = await getTags();
    const customTags = existingTags.filter(t => !DEFAULT_TAGS.some(dt => dt.id === t.id));
    const updatedTags = [...customTags, newTag];

    const key = getUserTagsKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(updatedTags));

    return newTag;
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
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const tags = await getTags();
    const customTags = tags.filter(t => !DEFAULT_TAGS.some(dt => dt.id === t.id));
    const tagIndex = customTags.findIndex(t => t.id === tagId);

    if (tagIndex === -1) {
      throw new Error('Tag not found');
    }

    customTags[tagIndex] = {
      ...customTags[tagIndex],
      ...updates,
    };

    const key = getUserTagsKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(customTags));

    return customTags[tagIndex];
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
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    // Prevent deletion of default tags
    if (DEFAULT_TAGS.some(t => t.id === tagId)) {
      throw new Error('Cannot delete default tags');
    }

    const tags = await getTags();
    const customTags = tags.filter(t => !DEFAULT_TAGS.some(dt => dt.id === t.id));
    const filteredTags = customTags.filter(t => t.id !== tagId);

    const key = getUserTagsKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(filteredTags));
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

