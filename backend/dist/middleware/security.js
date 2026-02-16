"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = exports.sanitizeBody = exports.sanitizeObjectKeys = exports.jsonErrorHandler = exports.validateRequestSize = exports.destructiveRateLimiter = exports.rateLimiter = exports.handleValidationErrors = exports.validateFilters = exports.validateId = exports.validateBoolean = exports.validateRegretFlag = exports.validateDescription = exports.validateMerchant = exports.validateCategoryName = exports.validateDate = exports.validateAmount = exports.validateTransactionType = exports.sanitizeString = void 0;
const express_validator_1 = require("express-validator");
// Sanitize string input to prevent injection
const sanitizeString = (value) => {
    if (!value || typeof value !== 'string')
        return '';
    return value
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
};
exports.sanitizeString = sanitizeString;
// Validate transaction type
exports.validateTransactionType = (0, express_validator_1.body)('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense');
// Validate amount
exports.validateAmount = (0, express_validator_1.body)('amount')
    .optional()
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage('Amount must be between 0 and 999,999,999.99');
// Validate date format
exports.validateDate = (0, express_validator_1.body)('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date');
// Validate category name
exports.validateCategoryName = (0, express_validator_1.body)('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .customSanitizer(exports.sanitizeString);
// Validate merchant name
exports.validateMerchant = (0, express_validator_1.body)('merchant')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Merchant must be between 1 and 200 characters')
    .customSanitizer(exports.sanitizeString);
// Validate description
exports.validateDescription = (0, express_validator_1.body)('description')
    .optional()
    .isString()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .customSanitizer(exports.sanitizeString);
// Validate regret flag
exports.validateRegretFlag = (0, express_validator_1.body)('regret_flag')
    .optional()
    .isIn(['yes', 'no', 'neutral'])
    .withMessage('Regret flag must be yes, no, or neutral');
// Validate boolean fields
const validateBoolean = (field) => {
    return (0, express_validator_1.body)(field)
        .optional()
        .isBoolean()
        .withMessage(`${field} must be a boolean`);
};
exports.validateBoolean = validateBoolean;
// Validate ID parameter
exports.validateId = (0, express_validator_1.param)('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer');
// Validate query filters
exports.validateFilters = [
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type filter must be income or expense'),
    (0, express_validator_1.query)('category_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),
    (0, express_validator_1.query)('start_date')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('end_date')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('merchant')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Merchant filter must be between 1 and 200 characters')
        .customSanitizer(exports.sanitizeString),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Limit must be between 1 and 1000'),
    (0, express_validator_1.query)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
];
// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg,
            })),
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
// Rate limit tracking (simple in-memory)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute
// Rate limiting middleware
const rateLimiter = (req, res, next) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const clientData = requestCounts.get(clientId);
    if (!clientData || now > clientData.resetTime) {
        // Reset or create new entry
        requestCounts.set(clientId, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW,
        });
        return next();
    }
    if (clientData.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        });
    }
    clientData.count++;
    next();
};
exports.rateLimiter = rateLimiter;
// Stricter rate limiting for destructive operations
const destructiveRequestCounts = new Map();
const DESTRUCTIVE_RATE_LIMIT_WINDOW = 60000; // 1 minute
const DESTRUCTIVE_RATE_LIMIT_MAX = 10; // 10 destructive requests per minute
const destructiveRateLimiter = (req, res, next) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const clientData = destructiveRequestCounts.get(clientId);
    if (!clientData || now > clientData.resetTime) {
        destructiveRequestCounts.set(clientId, {
            count: 1,
            resetTime: now + DESTRUCTIVE_RATE_LIMIT_WINDOW,
        });
        return next();
    }
    if (clientData.count >= DESTRUCTIVE_RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: 'Destructive operation rate limit exceeded',
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        });
    }
    clientData.count++;
    next();
};
exports.destructiveRateLimiter = destructiveRateLimiter;
// Request size validation
const validateRequestSize = (maxSize = 10 * 1024 * 1024) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > maxSize) {
            return res.status(413).json({
                error: 'Request entity too large',
                maxSize: `${maxSize / 1024 / 1024}MB`,
            });
        }
        next();
    };
};
exports.validateRequestSize = validateRequestSize;
// JSON parsing error handler
const jsonErrorHandler = (err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'The request body contains malformed JSON',
        });
    }
    next(err);
};
exports.jsonErrorHandler = jsonErrorHandler;
// Prevent NoSQL injection by sanitizing object keys
const sanitizeObjectKeys = (obj) => {
    if (typeof obj !== 'object' || obj === null)
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(exports.sanitizeObjectKeys);
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Remove keys that start with $ (MongoDB operators)
        if (key.startsWith('$'))
            continue;
        // Remove keys containing dots (potential injection)
        const safeKey = key.replace(/\./g, '_');
        sanitized[safeKey] = (0, exports.sanitizeObjectKeys)(value);
    }
    return sanitized;
};
exports.sanitizeObjectKeys = sanitizeObjectKeys;
// Middleware to sanitize request body
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = (0, exports.sanitizeObjectKeys)(req.body);
    }
    next();
};
exports.sanitizeBody = sanitizeBody;
// CSP Header middleware
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Restrict referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};
exports.securityHeaders = securityHeaders;
//# sourceMappingURL=security.js.map