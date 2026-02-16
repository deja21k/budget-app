import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const RECEIPTS_DIR = path.join(__dirname, '../../data/receipts');

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'];

// Create receipts directory if it doesn't exist
try {
  if (!fs.existsSync(RECEIPTS_DIR)) {
    fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create receipts directory:', error);
  throw new Error('Failed to initialize file storage');
}

export interface FileStorageResult {
  filename: string;
  path: string;
  size: number;
}

/**
 * Validate filename to prevent path traversal
 */
function validateFilename(filename: string): { valid: boolean; error?: string } {
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
function resolvePath(filename: string): { valid: boolean; filepath?: string; error?: string } {
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

export class FileStorage {
  /**
   * Save a receipt file with security validation
   */
  static saveReceipt(file: Express.Multer.File): FileStorageResult {
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
    const filename = `${uuidv4()}${extension}`;
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
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
  static getReceiptPath(filename: string): string | null {
    const result = resolvePath(filename);
    return result.valid ? result.filepath! : null;
  }

  /**
   * Safely delete a receipt file
   */
  static deleteReceipt(filename: string): boolean {
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
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Check if file exists
   */
  static fileExists(filename: string): boolean {
    const result = resolvePath(filename);
    if (!result.valid || !result.filepath) {
      return false;
    }
    return fs.existsSync(result.filepath);
  }

  /**
   * Get receipt URL (safe for client-side use)
   */
  static getReceiptUrl(filename: string): string | null {
    const validation = validateFilename(filename);
    if (!validation.valid) {
      return null;
    }
    return `/api/receipts/file/${filename}`;
  }
  
  /**
   * Read file buffer (for serving)
   */
  static readFile(filename: string): Buffer | null {
    const result = resolvePath(filename);
    if (!result.valid || !result.filepath) {
      return null;
    }
    
    try {
      if (fs.existsSync(result.filepath)) {
        return fs.readFileSync(result.filepath);
      }
      return null;
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }
  
  /**
   * Get file stats
   */
  static getFileStats(filename: string): fs.Stats | null {
    const result = resolvePath(filename);
    if (!result.valid || !result.filepath) {
      return null;
    }
    
    try {
      return fs.statSync(result.filepath);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Cleanup old files (for maintenance)
   */
  static cleanupOldFiles(maxAgeMs: number): { deleted: number; errors: number } {
    const now = Date.now();
    let deleted = 0;
    let errors = 0;
    
    try {
      const files = fs.readdirSync(RECEIPTS_DIR);
      
      for (const filename of files) {
        try {
          const result = resolvePath(filename);
          if (!result.valid || !result.filepath) continue;
          
          const stats = fs.statSync(result.filepath);
          if (now - stats.mtime.getTime() > maxAgeMs) {
            fs.unlinkSync(result.filepath);
            deleted++;
          }
        } catch (error) {
          errors++;
          console.error(`Error cleaning up file ${filename}:`, error);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    
    return { deleted, errors };
  }
}
