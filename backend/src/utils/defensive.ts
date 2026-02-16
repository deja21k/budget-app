import { getDatabase } from '../config/database';

/**
 * Execute database operations within a transaction
 * Automatically rolls back on error, commits on success
 */
export function withTransaction<T>(
  operations: (db: ReturnType<typeof getDatabase>) => T
): T {
  const db = getDatabase();
  
  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    // Execute operations
    const result = operations(db);
    
    // Commit transaction
    db.exec('COMMIT');
    
    return result;
  } catch (error) {
    // Rollback on any error
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    
    throw error;
  }
}

/**
 * Retry an operation with exponential backoff
 * Useful for handling transient database locks
 */
export async function withRetry<T>(
  operation: () => T,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable (SQLite busy/locked errors)
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable = 
        errorMessage.includes('busy') ||
        errorMessage.includes('locked') ||
        errorMessage.includes('timeout');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Safe query execution with timeout
 */
export function withTimeout<T>(
  operation: () => T,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    Promise.resolve(operation()),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Validate ID exists before operation
 */
export function validateId(id: number | string, entityName: string = 'Entity'): number {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (isNaN(numId) || numId < 1) {
    throw new Error(`${entityName} ID must be a positive integer`);
  }
  
  return numId;
}

/**
 * Safe string coercion
 */
export function safeString(value: unknown, maxLength: number = 1000): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return String(value).slice(0, maxLength);
  return value.slice(0, maxLength);
}

/**
 * Safe number coercion
 */
export function safeNumber(value: unknown, min: number = -Infinity, max: number = Infinity): number | null {
  if (value === null || value === undefined) return null;
  
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  
  return num;
}

/**
 * Safe boolean coercion
 */
export function safeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

/**
 * Safe date coercion
 */
export function safeDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  if (typeof value === 'string' && allowedValues.includes(value as T)) {
    return value as T;
  }
  return defaultValue;
}

/**
 * Check if value is defined and not null
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Deep clone an object to prevent mutation
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  
  const cloned = {} as T;
  for (const key of Object.keys(obj)) {
    (cloned as any)[key] = deepClone((obj as any)[key]);
  }
  return cloned;
}

/**
 * Sanitize SQL LIKE pattern to prevent injection
 */
export function sanitizeLikePattern(pattern: string): string {
  return pattern
    .replace(/%/g, '\\%') // Escape %
    .replace(/_/g, '\\_') // Escape _
    .replace(/\\/g, '\\\\'); // Escape backslash
}

/**
 * Defensive array access
 */
export function safeGet<T>(array: T[], index: number): T | undefined {
  if (!Array.isArray(array)) return undefined;
  if (index < 0 || index >= array.length) return undefined;
  return array[index];
}
