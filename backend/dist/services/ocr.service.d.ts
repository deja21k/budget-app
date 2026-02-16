export interface OCRResult {
    success: boolean;
    text: string;
    confidence: number;
    error?: string;
    processingTime: number;
}
declare const OCR_CONFIG: {
    language: string;
    timeout: number;
    maxImageSize: number;
    minConfidence: number;
    tessdataPath: string;
};
export declare class OCRService {
    /**
     * Validate image buffer before processing
     */
    private validateImage;
    /**
     * Perform OCR with timeout and error handling
     * Optimized for Serbian Cyrillic fiscal receipts
     */
    recognize(imageBuffer: Buffer): Promise<OCRResult>;
    /**
     * Quick image validation without full OCR
     */
    validateImageOnly(imageBuffer: Buffer): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Get OCR service health status
     */
    getHealth(): {
        status: string;
        config: typeof OCR_CONFIG;
    };
}
export {};
//# sourceMappingURL=ocr.service.d.ts.map