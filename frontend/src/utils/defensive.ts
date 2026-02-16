/**
 * Frontend Defensive Programming Utilities
 * Protects against crashes from unexpected data
 */

// Get current currency from settings
export const getCurrentCurrency = (): string => {
  try {
    const stored = localStorage.getItem('budget_app_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.currency || 'RSD';
    }
  } catch {
    // Fall through to default
  }
  return 'RSD';
};

// Constants for validation
export const VALIDATION_LIMITS = {
  MAX_AMOUNT: 999999999.99,
  MIN_AMOUNT: 0,
  MAX_MERCHANT_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_CATEGORY_NAME_LENGTH: 100,
};

// Safe type guards
export const isString = (value: unknown): value is string => 
  typeof value === 'string';

export const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value) && isFinite(value);

export const isBoolean = (value: unknown): value is boolean => 
  typeof value === 'boolean';

export const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isArray = <T>(value: unknown): value is T[] => 
  Array.isArray(value);

export const isDate = (value: unknown): value is Date => 
  value instanceof Date && !isNaN(value.getTime());

// Safe coercion functions
export const safeString = (value: unknown, maxLength: number = 1000): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.slice(0, maxLength);
};

export const safeNumber = (
  value: unknown, 
  min: number = -Infinity, 
  max: number = Infinity
): number | null => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < min || num > max) return null;
  return num;
};

export const safeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
};

export const safeDate = (value: unknown): Date | null => {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

// HTML sanitization
export const sanitizeHTML = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export const stripHTML = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

// Deep clone to prevent mutation
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  
  const cloned = {} as T;
  for (const key of Object.keys(obj)) {
    (cloned as any)[key] = deepClone((obj as any)[key]);
  }
  return cloned;
};

// Safe property access
export const get = <T>(obj: any, path: string, defaultValue: T): T => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) return defaultValue;
      result = result[key];
    }
    return result === undefined ? defaultValue : result;
  } catch {
    return defaultValue;
  }
};

// Safe array methods
export const safeMap = <T, R>(
  array: T[] | null | undefined,
  mapper: (item: T, index: number) => R
): R[] => {
  if (!Array.isArray(array)) return [];
  return array.map(mapper);
};

export const safeFilter = <T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T[] => {
  if (!Array.isArray(array)) return [];
  return array.filter(predicate);
};

export const safeFind = <T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T | undefined => {
  if (!Array.isArray(array)) return undefined;
  return array.find(predicate);
};

export const safeReduce = <T, R>(
  array: T[] | null | undefined,
  reducer: (acc: R, item: T, index: number) => R,
  initialValue: R
): R => {
  if (!Array.isArray(array)) return initialValue;
  return array.reduce(reducer, initialValue);
};

// Safe localStorage
export const safeLocalStorage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  },
  
  set: (key: string, value: unknown): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

// Debounce with cleanup
export const createDebouncer = (wait: number = 300) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return {
    debounce: <T extends (...args: any[]) => void>(fn: T) => {
      return (...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), wait);
      };
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
};

// Validate transaction input
export const validateTransaction = (data: unknown): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!isObject(data)) {
    return { valid: false, errors: ['Invalid transaction data'] };
  }
  
  // Validate type
  if (data.type !== 'income' && data.type !== 'expense') {
    errors.push('Type must be income or expense');
  }
  
  // Validate amount
  const amount = safeNumber(data.amount, VALIDATION_LIMITS.MIN_AMOUNT, VALIDATION_LIMITS.MAX_AMOUNT);
  if (amount === null) {
    errors.push(`Amount must be between ${VALIDATION_LIMITS.MIN_AMOUNT} and ${VALIDATION_LIMITS.MAX_AMOUNT}`);
  }
  
  // Validate date
  if (!data.date || !safeDate(data.date)) {
    errors.push('Valid date is required');
  }
  
  // Validate strings
  if (data.merchant && String(data.merchant).length > VALIDATION_LIMITS.MAX_MERCHANT_LENGTH) {
    errors.push(`Merchant must be less than ${VALIDATION_LIMITS.MAX_MERCHANT_LENGTH} characters`);
  }
  
  if (data.description && String(data.description).length > VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be less than ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`);
  }
  
  return { valid: errors.length === 0, errors };
};

// Format currency safely
export const formatCurrency = (
  amount: unknown,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  const num = safeNumber(amount);
  if (num === null) return '—';
  
  try {
    // Use Serbian locale for RSD currency to get proper formatting
    const effectiveLocale = currency === 'RSD' ? 'sr-RS' : locale;
    
    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency,
    }).format(num);
  } catch {
    // Fallback to basic formatting
    if (currency === 'RSD') {
      return `${num.toFixed(2)} din`;
    }
    return `$${num.toFixed(2)}`;
  }
};

// Format amount in Serbian format (1.234,56)
export const formatSerbianAmount = (amount: unknown): string => {
  const num = safeNumber(amount);
  if (num === null) return '—';
  
  // Serbian format: dots for thousands, comma for decimals
  const parts = num.toFixed(2).split('.');
  const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  
  return `${wholePart},${decimalPart}`;
};

// Format date safely
export const formatDate = (
  date: unknown,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = safeDate(date);
  if (!d) return '—';
  
  try {
    return d.toLocaleDateString(undefined, options);
  } catch {
    return d.toISOString().split('T')[0];
  }
};

// Retry with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
};

// Circuit breaker pattern
export const createCircuitBreaker = (
  failureThreshold: number = 5,
  resetTimeout: number = 30000
) => {
  let failures = 0;
  let lastFailureTime: number | null = null;
  let state: 'closed' | 'open' | 'half-open' = 'closed';
  
  return {
    execute: async <T>(fn: () => Promise<T>): Promise<T> => {
      if (state === 'open') {
        if (lastFailureTime && Date.now() - lastFailureTime >= resetTimeout) {
          state = 'half-open';
        } else {
          throw new Error('Circuit breaker is open');
        }
      }
      
      try {
        const result = await fn();
        
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          state = 'open';
        }
        
        throw error;
      }
    },
    getState: () => state,
    reset: () => {
      state = 'closed';
      failures = 0;
      lastFailureTime = null;
    },
  };
};

// Rate limiter for UI actions
export const createRateLimiter = (maxCalls: number = 1, windowMs: number = 1000) => {
  let calls: number[] = [];
  
  return {
    canExecute: (): boolean => {
      const now = Date.now();
      calls = calls.filter(time => now - time < windowMs);
      
      if (calls.length < maxCalls) {
        calls.push(now);
        return true;
      }
      
      return false;
    },
    getRemainingTime: (): number => {
      if (calls.length < maxCalls) return 0;
      const now = Date.now();
      return windowMs - (now - calls[0]);
    },
  };
};
