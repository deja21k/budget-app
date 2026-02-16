"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = withTransaction;
exports.withRetry = withRetry;
exports.withTimeout = withTimeout;
exports.validateId = validateId;
exports.safeString = safeString;
exports.safeNumber = safeNumber;
exports.safeBoolean = safeBoolean;
exports.safeDate = safeDate;
exports.validateEnum = validateEnum;
exports.isDefined = isDefined;
exports.deepClone = deepClone;
exports.sanitizeLikePattern = sanitizeLikePattern;
exports.safeGet = safeGet;
const database_1 = require("../config/database");
/**
 * Execute database operations within a transaction
 * Automatically rolls back on error, commits on success
 */
function withTransaction(operations) {
    const db = (0, database_1.getDatabase)();
    try {
        // Begin transaction
        db.exec('BEGIN TRANSACTION');
        // Execute operations
        const result = operations(db);
        // Commit transaction
        db.exec('COMMIT');
        return result;
    }
    catch (error) {
        // Rollback on any error
        try {
            db.exec('ROLLBACK');
        }
        catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
        throw error;
    }
}
/**
 * Retry an operation with exponential backoff
 * Useful for handling transient database locks
 */
async function withRetry(operation, maxRetries = 3, baseDelay = 100) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Check if error is retryable (SQLite busy/locked errors)
            const errorMessage = lastError.message.toLowerCase();
            const isRetryable = errorMessage.includes('busy') ||
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
function withTimeout(operation, timeoutMs = 5000) {
    return Promise.race([
        Promise.resolve(operation()),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        }),
    ]);
}
/**
 * Validate ID exists before operation
 */
function validateId(id, entityName = 'Entity') {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numId) || numId < 1) {
        throw new Error(`${entityName} ID must be a positive integer`);
    }
    return numId;
}
/**
 * Safe string coercion
 */
function safeString(value, maxLength = 1000) {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== 'string')
        return String(value).slice(0, maxLength);
    return value.slice(0, maxLength);
}
/**
 * Safe number coercion
 */
function safeNumber(value, min = -Infinity, max = Infinity) {
    if (value === null || value === undefined)
        return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num))
        return null;
    if (num < min || num > max)
        return null;
    return num;
}
/**
 * Safe boolean coercion
 */
function safeBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return false;
}
/**
 * Safe date coercion
 */
function safeDate(value) {
    if (value instanceof Date)
        return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
}
/**
 * Validate enum value
 */
function validateEnum(value, allowedValues, defaultValue) {
    if (typeof value === 'string' && allowedValues.includes(value)) {
        return value;
    }
    return defaultValue;
}
/**
 * Check if value is defined and not null
 */
function isDefined(value) {
    return value !== null && value !== undefined;
}
/**
 * Deep clone an object to prevent mutation
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (Array.isArray(obj))
        return obj.map(deepClone);
    const cloned = {};
    for (const key of Object.keys(obj)) {
        cloned[key] = deepClone(obj[key]);
    }
    return cloned;
}
/**
 * Sanitize SQL LIKE pattern to prevent injection
 */
function sanitizeLikePattern(pattern) {
    return pattern
        .replace(/%/g, '\\%') // Escape %
        .replace(/_/g, '\\_') // Escape _
        .replace(/\\/g, '\\\\'); // Escape backslash
}
/**
 * Defensive array access
 */
function safeGet(array, index) {
    if (!Array.isArray(array))
        return undefined;
    if (index < 0 || index >= array.length)
        return undefined;
    return array[index];
}
//# sourceMappingURL=defensive.js.map