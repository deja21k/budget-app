import { Request, Response, NextFunction } from 'express';
import { validationResult, body, query, param, ValidationChain } from 'express-validator';

// Sanitize string input to prevent injection
export const sanitizeString = (value: string): string => {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate transaction type
export const validateTransactionType = body('type')
  .optional()
  .isIn(['income', 'expense'])
  .withMessage('Type must be either income or expense');

// Validate amount
export const validateAmount = body('amount')
  .optional()
  .isFloat({ min: 0, max: 999999999.99 })
  .withMessage('Amount must be between 0 and 999,999,999.99');

// Validate date format
export const validateDate = body('date')
  .optional()
  .isISO8601()
  .withMessage('Date must be a valid ISO 8601 date');

// Validate category name
export const validateCategoryName = body('name')
  .optional()
  .isString()
  .isLength({ min: 1, max: 100 })
  .withMessage('Name must be between 1 and 100 characters')
  .customSanitizer(sanitizeString);

// Validate merchant name
export const validateMerchant = body('merchant')
  .optional()
  .isString()
  .isLength({ min: 1, max: 200 })
  .withMessage('Merchant must be between 1 and 200 characters')
  .customSanitizer(sanitizeString);

// Validate description
export const validateDescription = body('description')
  .optional()
  .isString()
  .isLength({ min: 0, max: 1000 })
  .withMessage('Description must be less than 1000 characters')
  .customSanitizer(sanitizeString);

// Validate regret flag
export const validateRegretFlag = body('regret_flag')
  .optional()
  .isIn(['yes', 'no', 'neutral'])
  .withMessage('Regret flag must be yes, no, or neutral');

// Validate boolean fields
export const validateBoolean = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean`);
};

// Validate ID parameter
export const validateId = param('id')
  .isInt({ min: 1 })
  .withMessage('ID must be a positive integer');

// Validate query filters
export const validateFilters = [
  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type filter must be income or expense'),
  query('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('merchant')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Merchant filter must be between 1 and 200 characters')
    .customSanitizer(sanitizeString),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

// Handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
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

// Rate limit tracking (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

// Rate limiting middleware
export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

// Stricter rate limiting for destructive operations
const destructiveRequestCounts = new Map<string, { count: number; resetTime: number }>();
const DESTRUCTIVE_RATE_LIMIT_WINDOW = 60000; // 1 minute
const DESTRUCTIVE_RATE_LIMIT_MAX = 10; // 10 destructive requests per minute

export const destructiveRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

// Request size validation
export const validateRequestSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

// JSON parsing error handler
export const jsonErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request body contains malformed JSON',
    });
  }
  next(err);
};

// Prevent NoSQL injection by sanitizing object keys
export const sanitizeObjectKeys = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectKeys);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove keys that start with $ (MongoDB operators)
    if (key.startsWith('$')) continue;
    
    // Remove keys containing dots (potential injection)
    const safeKey = key.replace(/\./g, '_');
    
    sanitized[safeKey] = sanitizeObjectKeys(value);
  }
  
  return sanitized;
};

// Middleware to sanitize request body
export const sanitizeBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObjectKeys(req.body);
  }
  next();
};

// CSP Header middleware
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
