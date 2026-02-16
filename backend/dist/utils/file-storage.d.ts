import * as fs from 'fs';
export interface FileStorageResult {
    filename: string;
    path: string;
    size: number;
}
export declare class FileStorage {
    /**
     * Save a receipt file with security validation
     */
    static saveReceipt(file: Express.Multer.File): FileStorageResult;
    /**
     * Get safe receipt path
     */
    static getReceiptPath(filename: string): string | null;
    /**
     * Safely delete a receipt file
     */
    static deleteReceipt(filename: string): boolean;
    /**
     * Check if file exists
     */
    static fileExists(filename: string): boolean;
    /**
     * Get receipt URL (safe for client-side use)
     */
    static getReceiptUrl(filename: string): string | null;
    /**
     * Read file buffer (for serving)
     */
    static readFile(filename: string): Buffer | null;
    /**
     * Get file stats
     */
    static getFileStats(filename: string): fs.Stats | null;
    /**
     * Cleanup old files (for maintenance)
     */
    static cleanupOldFiles(maxAgeMs: number): {
        deleted: number;
        errors: number;
    };
}
//# sourceMappingURL=file-storage.d.ts.map