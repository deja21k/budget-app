"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const RECEIPTS_DIR = path.join(__dirname, '../../data/receipts');
// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'];
// Create receipts directory if it doesn't exist
try {
    if (!fs.existsSync(RECEIPTS_DIR)) {
        fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
    }
}
catch (error) {
    console.error('Failed to create receipts directory:', error);
    throw new Error('Failed to initialize file storage');
}
/**
 * Validate filename to prevent path traversal
 */
function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return { valid: false, error: 'Invalid filename' };
    }
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return { valid: false, error: 'Path traversal detected' };
    }
    // Check filename length
    if (filename.length > 255) {
        return { valid: false, error: 'Filename too long' };
    }
    // Validate extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Invalid file extension' };
    }
    return { valid: true };
}
/**
 * Resolve and validate full path
 */
function resolvePath(filename) {
    const validation = validateFilename(filename);
    if (!validation.valid) {
        return { valid: false, error: validation.error };
    }
    const filepath = path.join(RECEIPTS_DIR, filename);
    const resolvedPath = path.resolve(filepath);
    const resolvedReceiptsDir = path.resolve(RECEIPTS_DIR);
    // Ensure resolved path is within receipts directory
    if (!resolvedPath.startsWith(resolvedReceiptsDir)) {
        return { valid: false, error: 'Access denied' };
    }
    return { valid: true, filepath };
}
class FileStorage {
    /**
     * Save a receipt file with security validation
     */
    static saveReceipt(file) {
        // Validate file exists
        if (!file || !file.buffer) {
            throw new Error('Invalid file: missing buffer');
        }
        // Validate file size
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            throw new Error(`File too large: ${file.size} bytes exceeds maximum of ${MAX_SIZE} bytes`);
        }
        if (file.size === 0) {
            throw new Error('Empty file');
        }
        // Get safe extension
        let extension = path.extname(file.originalname || '').toLowerCase();
        if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
            // Default to .jpg if invalid extension
            extension = '.jpg';
        }
        // Generate safe filename
        const filename = `${(0, uuid_1.v4)()}${extension}`;
        const filepath = path.join(RECEIPTS_DIR, filename);
        // Verify path is within receipts directory
        const resolvedPath = path.resolve(filepath);
        const resolvedReceiptsDir = path.resolve(RECEIPTS_DIR);
        if (!resolvedPath.startsWith(resolvedReceiptsDir)) {
            throw new Error('Path validation failed');
        }
        // Write file with error handling
        try {
            fs.writeFileSync(filepath, file.buffer, { flag: 'wx' }); // Fail if exists
        }
        catch (error) {
            if (error.code === 'EEXIST') {
                // Extremely unlikely with UUID, but handle it
                throw new Error('File already exists');
            }
            throw error;
        }
        return {
            filename,
            path: filepath,
            size: file.size,
        };
    }
    /**
     * Get safe receipt path
     */
    static getReceiptPath(filename) {
        const result = resolvePath(filename);
        return result.valid ? result.filepath : null;
    }
    /**
     * Safely delete a receipt file
     */
    static deleteReceipt(filename) {
        const result = resolvePath(filename);
        if (!result.valid || !result.filepath) {
            console.warn(`Invalid filename attempted for deletion: ${filename}`);
            return false;
        }
        try {
            if (fs.existsSync(result.filepath)) {
                fs.unlinkSync(result.filepath);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }
    /**
     * Check if file exists
     */
    static fileExists(filename) {
        const result = resolvePath(filename);
        if (!result.valid || !result.filepath) {
            return false;
        }
        return fs.existsSync(result.filepath);
    }
    /**
     * Get receipt URL (safe for client-side use)
     */
    static getReceiptUrl(filename) {
        const validation = validateFilename(filename);
        if (!validation.valid) {
            return null;
        }
        return `/api/receipts/file/${filename}`;
    }
    /**
     * Read file buffer (for serving)
     */
    static readFile(filename) {
        const result = resolvePath(filename);
        if (!result.valid || !result.filepath) {
            return null;
        }
        try {
            if (fs.existsSync(result.filepath)) {
                return fs.readFileSync(result.filepath);
            }
            return null;
        }
        catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    }
    /**
     * Get file stats
     */
    static getFileStats(filename) {
        const result = resolvePath(filename);
        if (!result.valid || !result.filepath) {
            return null;
        }
        try {
            return fs.statSync(result.filepath);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Cleanup old files (for maintenance)
     */
    static cleanupOldFiles(maxAgeMs) {
        const now = Date.now();
        let deleted = 0;
        let errors = 0;
        try {
            const files = fs.readdirSync(RECEIPTS_DIR);
            for (const filename of files) {
                try {
                    const result = resolvePath(filename);
                    if (!result.valid || !result.filepath)
                        continue;
                    const stats = fs.statSync(result.filepath);
                    if (now - stats.mtime.getTime() > maxAgeMs) {
                        fs.unlinkSync(result.filepath);
                        deleted++;
                    }
                }
                catch (error) {
                    errors++;
                    console.error(`Error cleaning up file ${filename}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error during cleanup:', error);
        }
        return { deleted, errors };
    }
}
exports.FileStorage = FileStorage;
//# sourceMappingURL=file-storage.js.map