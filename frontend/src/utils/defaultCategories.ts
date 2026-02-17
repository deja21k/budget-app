import type { Category } from '../types';

/**
 * Default expense categories with Serbian and international focus
 * Used as fallback when no categories exist in the database
 */
export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Groceries', type: 'expense', color: '#22c55e' },
  { name: 'Dining Out', type: 'expense', color: '#f97316' },
  { name: 'Transportation', type: 'expense', color: '#3b82f6' },
  { name: 'Shopping', type: 'expense', color: '#a855f7' },
  { name: 'Entertainment', type: 'expense', color: '#ec4899' },
  { name: 'Healthcare', type: 'expense', color: '#ef4444' },
  { name: 'Utilities', type: 'expense', color: '#eab308' },
  { name: 'Housing', type: 'expense', color: '#6366f1' },
  { name: 'Insurance', type: 'expense', color: '#14b8a6' },
  { name: 'Personal Care', type: 'expense', color: '#f43f5e' },
  { name: 'Education', type: 'expense', color: '#8b5cf6' },
  { name: 'Gifts & Donations', type: 'expense', color: '#06b6d4' },
  { name: 'Travel', type: 'expense', color: '#84cc16' },
  { name: 'Subscriptions', type: 'expense', color: '#f59e0b' },
  { name: 'Other', type: 'expense', color: '#64748b' },
];

/**
 * Default income categories
 * Used as fallback when no categories exist in the database
 */
export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salary', type: 'income', color: '#22c55e' },
  { name: 'Bonus', type: 'income', color: '#10b981' },
  { name: 'Freelance', type: 'income', color: '#3b82f6' },
  { name: 'Investments', type: 'income', color: '#8b5cf6' },
  { name: 'Rental Income', type: 'income', color: '#a855f7' },
  { name: 'Refund', type: 'income', color: '#06b6d4' },
  { name: 'Gift Received', type: 'income', color: '#ec4899' },
  { name: 'Side Business', type: 'income', color: '#f97316' },
  { name: 'Interest', type: 'income', color: '#eab308' },
  { name: 'Other', type: 'income', color: '#64748b' },
];

/**
 * Get all default categories (both income and expense)
 */
export const getAllDefaultCategories = (): Omit<Category, 'id'>[] => [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

/**
 * Get default categories by type
 */
export const getDefaultCategoriesByType = (
  type: 'income' | 'expense'
): Omit<Category, 'id'>[] => {
  return type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
};

/**
 * Check if categories array is empty or undefined and return defaults if needed
 * This ensures users always have categories available even on first use
 */
export const ensureCategories = (
  categories: Category[] | undefined | null,
  type?: 'income' | 'expense'
): Category[] => {
  // If categories exist and have items, return them
  if (categories && categories.length > 0) {
    // If type is specified, filter by type
    if (type) {
      return categories.filter((c) => c.type === type);
    }
    return categories;
  }

  // Return default categories with temporary IDs (negative to indicate they're defaults)
  const defaults = type
    ? getDefaultCategoriesByType(type)
    : getAllDefaultCategories();

  return defaults.map((cat, index) => ({
    ...cat,
    id: -(index + 1), // Negative IDs indicate default/uncreated categories
  })) as Category[];
};

/**
 * Check if a category ID represents a default category (not yet in database)
 */
export const isDefaultCategoryId = (id: number): boolean => {
  return id < 0;
};
