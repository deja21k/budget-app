/**
 * Transaction form validation constants and utilities
 */

export const VALIDATION = {
  MAX_AMOUNT: 999999999.99,
  MIN_AMOUNT: 0.01,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_MERCHANT_LENGTH: 100,
  MAX_ITEM_NAME_LENGTH: 200,
  MAX_ITEMS_PER_TRANSACTION: 100,
  MAX_FUTURE_DAYS: 365,
  MAX_PAST_YEARS: 10,
} as const;

export const CURRENCY = {
  DEFAULT: 'RSD',
  SYMBOLS: {
    RSD: 'RSD',
    USD: '$',
    EUR: '€',
    GBP: '£',
  } as Record<string, string>,
} as const;

export const REGRET_OPTIONS = [
  { value: 'yes' as const, label: 'Worth it', color: 'success' },
  { value: 'neutral' as const, label: 'Neutral', color: 'gray' },
  { value: 'regret' as const, label: 'Regret', color: 'danger' },
] as const;

export const RECURRING_FREQUENCIES = [
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
] as const;

export type RegretFlag = typeof REGRET_OPTIONS[number]['value'];
export type RecurringFrequency = typeof RECURRING_FREQUENCIES[number]['value'];
export type TransactionType = 'income' | 'expense';

/**
 * Validate transaction amount
 */
export function validateAmount(value: string | number): string | undefined {
  if (value === '' || value === null || value === undefined) {
    return 'Amount is required';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return 'Amount must be a valid number';
  }

  if (num <= 0) {
    return 'Amount must be greater than 0';
  }

  if (num > VALIDATION.MAX_AMOUNT) {
    return `Amount cannot exceed ${VALIDATION.MAX_AMOUNT.toLocaleString()}`;
  }

  // Check decimal places
  if (typeof value === 'string' && value.includes('.')) {
    const decimals = value.split('.')[1];
    if (decimals && decimals.length > 2) {
      return 'Amount cannot have more than 2 decimal places';
    }
  }

  return undefined;
}

/**
 * Validate date
 */
export function validateDate(value: string): string | undefined {
  if (!value) {
    return 'Date is required';
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Invalid date format';
  }

  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());

  if (date > oneYearFromNow) {
    return 'Date cannot be more than 1 year in the future';
  }

  if (date < tenYearsAgo) {
    return 'Date cannot be more than 10 years in the past';
  }

  return undefined;
}

/**
 * Validate category selection
 */
export function validateCategory(value: string | number, availableCategories: { id: number }[]): string | undefined {
  if (!value && value !== 0) {
    return 'Category is required';
  }

  const categoryId = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(categoryId)) {
    return 'Invalid category';
  }

  const exists = availableCategories.some(c => c.id === categoryId);
  if (!exists) {
    return 'Selected category does not exist';
  }

  return undefined;
}

/**
 * Validate merchant name
 */
export function validateMerchant(value: string): string | undefined {
  if (!value) {
    return undefined; // Merchant is optional
  }

  if (value.length > VALIDATION.MAX_MERCHANT_LENGTH) {
    return `Merchant name cannot exceed ${VALIDATION.MAX_MERCHANT_LENGTH} characters`;
  }

  // Check for invalid characters (basic XSS prevention)
  if (/[<>"']/.test(value)) {
    return 'Merchant name contains invalid characters';
  }

  return undefined;
}

/**
 * Validate description
 */
export function validateDescription(value: string): string | undefined {
  if (!value) {
    return undefined; // Description is optional
  }

  if (value.length > VALIDATION.MAX_DESCRIPTION_LENGTH) {
    return `Description cannot exceed ${VALIDATION.MAX_DESCRIPTION_LENGTH} characters`;
  }

  return undefined;
}

/**
 * Validate transaction item
 */
export interface TransactionItemInput {
  name: string;
  quantity?: number;
  unit_price: number;
}

export function validateItem(item: TransactionItemInput, index: number): string | undefined {
  if (!item.name || item.name.trim() === '') {
    return `Item ${index + 1}: Name is required`;
  }

  if (item.name.length > VALIDATION.MAX_ITEM_NAME_LENGTH) {
    return `Item ${index + 1}: Name is too long`;
  }

  if (item.unit_price === undefined || item.unit_price === null) {
    return `Item ${index + 1}: Price is required`;
  }

  if (isNaN(item.unit_price) || item.unit_price < 0) {
    return `Item ${index + 1}: Price must be a positive number`;
  }

  if (item.quantity !== undefined && (isNaN(item.quantity) || item.quantity <= 0)) {
    return `Item ${index + 1}: Quantity must be greater than 0`;
  }

  return undefined;
}

/**
 * Validate all items
 */
export function validateItems(items: TransactionItemInput[]): string | undefined {
  if (!items || items.length === 0) {
    return undefined; // Items are optional
  }

  if (items.length > VALIDATION.MAX_ITEMS_PER_TRANSACTION) {
    return `Cannot have more than ${VALIDATION.MAX_ITEMS_PER_TRANSACTION} items`;
  }

  for (let i = 0; i < items.length; i++) {
    const error = validateItem(items[i], i);
    if (error) return error;
  }

  return undefined;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = CURRENCY.DEFAULT): string {
  const symbol = CURRENCY.SYMBOLS[currency] || currency;
  
  if (currency === 'RSD') {
    return `${value.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  }
  
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get currency from settings
 */
export function getCurrentCurrency(): string {
  try {
    const settings = localStorage.getItem('budget_app_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.currency || CURRENCY.DEFAULT;
    }
  } catch {
    // Ignore parsing errors
  }
  return CURRENCY.DEFAULT;
}

/**
 * Calculate items total
 */
export function calculateItemsTotal(items: TransactionItemInput[]): number {
  if (!items || items.length === 0) return 0;
  
  return items.reduce((sum, item) => {
    const qty = item.quantity ?? 1;
    const price = item.unit_price ?? 0;
    return sum + (qty * price);
  }, 0);
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string, maxLength: number): string {
  return value.slice(0, maxLength).trim();
}

/**
 * Check if amount matches items total (within small rounding tolerance)
 */
export function amountsMatch(amount: number, itemsTotal: number): boolean {
  const tolerance = 0.01;
  return Math.abs(amount - itemsTotal) < tolerance;
}
