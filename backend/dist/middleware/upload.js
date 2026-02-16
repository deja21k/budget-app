"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventConcurrentOCR = exports.ocrTimeout = exports.handleUploadError = exports.validateImageDimensions = exports.validateFilename = exports.sanitizeFilename = exports.uploadConfig = exports.validateFileSize = exports.validateFileType = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp',
];
// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// File type validation
const validateFileType = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
};
exports.validateFileType = validateFileType;
// File size validation middleware
const validateFileSize = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_FILE_SIZE) {
        return res.status(413).json({
            error: 'File too large',
            message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            maxSize: MAX_FILE_SIZE,
        });
    }
    next();
};
exports.validateFileSize = validateFileSize;
// Configure multer with security restrictions
exports.uploadConfig = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Only allow single file upload
        fields: 5, // Limit number of non-file fields
        fieldSize: 1024, // Limit field value size to 1KB
    },
    fileFilter: exports.validateFileType,
});
// Path traversal prevention
const sanitizeFilename = (filename) => {
    if (!filename || typeof filename !== 'string') {
        return 'unnamed';
    }
    // Remove path traversal attempts
    const sanitized = filename
        .replace(/\.\./g, '') // Remove ..
        .replace(/\\/g, '') // Remove backslashes
        .replace(/\//g, '') // Remove forward slashes
        .replace(/^\.+/, '') // Remove leading dots
        .replace(/[<>:"|?*]/g, '') // Remove invalid Windows characters
        .trim();
    // Ensure we have at least a filename
    if (!sanitized) {
        return 'unnamed';
    }
    return sanitized;
};
exports.sanitizeFilename = sanitizeFilename;
// Validate filename parameter
const validateFilename = (req, res, next) => {
    const { filename } = req.params;
    if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
    }
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    // Check filename length
    if (filename.length > 255) {
        return res.status(400).json({ error: 'Filename too long' });
    }
    // Validate file extension
    const ext = path_1.default.extname(filename).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'];
    if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({
            error: 'Invalid file extension',
            allowed: allowedExtensions,
        });
    }
    next();
};
exports.validateFilename = validateFilename;
// Image dimension validation (basic check)
const validateImageDimensions = (req, res, next) => {
    const file = req.file;
    if (!file) {
        return next();
    }
    // Check if buffer exists and has reasonable size
    if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ error: 'Empty file uploaded' });
    }
    // Check for minimum file size (at least 1KB for valid images)
    if (file.buffer.length < 1024) {
        return res.status(400).json({ error: 'File too small to be a valid image' });
    }
    // Maximum dimensions check could be added here with sharp library
    // For now, we rely on file size limits
    next();
};
exports.validateImageDimensions = validateImageDimensions;
// Upload error handler
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(413).json({
                    error: 'File too large',
                    message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Unexpected file field',
                    message: 'Only "image" field is allowed for file upload',
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Too many files',
                    message: 'Only one file can be uploaded at a time',
                });
            case 'LIMIT_FIELD_KEY':
            case 'LIMIT_FIELD_VALUE':
            case 'LIMIT_FIELD_COUNT':
                return res.status(400).json({
                    error: 'Field limit exceeded',
                    message: 'Too many form fields or field values too large',
                });
            default:
                return res.status(400).json({
                    error: 'Upload error',
                    message: err.message,
                });
        }
    }
    if (err) {
        return res.status(400).json({
            error: 'Upload failed',
            message: err.message,
        });
    }
    next();
};
exports.handleUploadError = handleUploadError;
// OCR-specific timeout and resource protection
const ocrTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
        // Set a timeout for OCR processing
        res.setTimeout(timeoutMs, () => {
            res.status(408).json({
                error: 'OCR processing timeout',
                message: 'Image processing took too long. Try a smaller image.',
            });
        });
        next();
    };
};
exports.ocrTimeout = ocrTimeout;
// Prevent concurrent OCR requests from same client
const ocrProcessingClients = new Set();
const preventConcurrentOCR = (req, res, next) => {
    const clientId = req.ip || 'unknown';
    if (ocrProcessingClients.has(clientId)) {
        return res.status(429).json({
            error: 'OCR already in progress',
            message: 'Please wait for the current OCR request to complete',
        });
    }
    ocrProcessingClients.add(clientId);
    // Remove client from processing set when response is sent
    res.on('finish', () => {
        ocrProcessingClients.delete(clientId);
    });
    res.on('close', () => {
        ocrProcessingClients.delete(clientId);
    });
    next();
};
exports.preventConcurrentOCR = preventConcurrentOCR;
//# sourceMappingURL=upload.js.map