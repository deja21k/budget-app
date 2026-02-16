import { getDatabase } from '../config/database';
/**
 * Execute database operations within a transaction
 * Automatically rolls back on error, commits on success
 */
export declare function withTransaction<T>(operations: (db: ReturnType<typeof getDatabase>) => T): T;
/**
 * Retry an operation with exponential backoff
 * Useful for handling transient database locks
 */
export declare function withRetry<T>(operation: () => T, maxRetries?: number, baseDelay?: number): Promise<T>;
/**
 * Safe query execution with timeout
 */
export declare function withTimeout<T>(operation: () => T, timeoutMs?: number): Promise<T>;
/**
 * Validate ID exists before operation
 */
export declare function validateId(id: number | string, entityName?: string): number;
/**
 * Safe string coercion
 */
export declare function safeString(value: unknown, maxLength?: number): string | null;
/**
 * Safe number coercion
 */
export declare function safeNumber(value: unknown, min?: number, max?: number): number | null;
/**
 * Safe boolean coercion
 */
export declare function safeBoolean(value: unknown): boolean;
/**
 * Safe date coercion
 */
export declare function safeDate(value: unknown): Date | null;
/**
 * Validate enum value
 */
export declare function validateEnum<T extends string>(value: unknown, allowedValues: readonly T[], defaultValue: T): T;
/**
 * Check if value is defined and not null
 */
export declare function isDefined<T>(value: T | null | undefined): value is T;
/**
 * Deep clone an object to prevent mutation
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Sanitize SQL LIKE pattern to prevent injection
 */
export declare function sanitizeLikePattern(pattern: string): string;
/**
 * Defensive array access
 */
export declare function safeGet<T>(array: T[], index: number): T | undefined;
//# sourceMappingURL=defensive.d.ts.map