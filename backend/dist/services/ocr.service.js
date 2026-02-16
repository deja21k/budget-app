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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRService = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// OCR Configuration - Multi-language support for Serbian fiscal receipts
const OCR_CONFIG = {
    // English + Serbian Cyrillic (prioritized for Serbian receipts)
    // 'srp' = Serbian Cyrillic script (most common for fiscal receipts)
    // 'eng' = English (for mixed content)
    language: 'srp+eng',
    timeout: 30000, // 30 seconds
    maxImageSize: 10 * 1024 * 1024, // 10MB
    minConfidence: 25, // Lower threshold for Cyrillic text
    // Path to local tessdata directory
    tessdataPath: path.resolve(__dirname, '../../tessdata'),
};
class OCRService {
    /**
     * Validate image buffer before processing
     */
    validateImage(imageBuffer) {
        if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
            return { valid: false, error: 'Invalid image buffer' };
        }
        if (imageBuffer.length === 0) {
            return { valid: false, error: 'Empty image buffer' };
        }
        if (imageBuffer.length > OCR_CONFIG.maxImageSize) {
            return {
                valid: false,
                error: `Image too large: ${imageBuffer.length} bytes exceeds maximum of ${OCR_CONFIG.maxImageSize} bytes`
            };
        }
        // Check for valid image headers
        const isJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
        const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
        const isTIFF = (imageBuffer[0] === 0x49 && imageBuffer[1] === 0x49) ||
            (imageBuffer[0] === 0x4D && imageBuffer[1] === 0x4D);
        const isBMP = imageBuffer[0] === 0x42 && imageBuffer[1] === 0x4D;
        const isWEBP = imageBuffer.slice(8, 12).toString('ascii') === 'WEBP';
        if (!isJPEG && !isPNG && !isTIFF && !isBMP && !isWEBP) {
            return { valid: false, error: 'Invalid image format' };
        }
        return { valid: true };
    }
    /**
     * Perform OCR with timeout and error handling
     * Optimized for Serbian Cyrillic fiscal receipts
     */
    async recognize(imageBuffer) {
        const startTime = Date.now();
        // Validate image first
        const validation = this.validateImage(imageBuffer);
        if (!validation.valid) {
            return {
                success: false,
                text: '',
                confidence: 0,
                error: validation.error,
                processingTime: Date.now() - startTime,
            };
        }
        // Check if local tessdata exists
        const localTessdataExists = fs.existsSync(OCR_CONFIG.tessdataPath);
        console.log(`Tessdata path: ${OCR_CONFIG.tessdataPath}, exists: ${localTessdataExists}`);
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, OCR_CONFIG.timeout);
            // Use local tessdata if available
            const tesseractOptions = {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
                    }
                },
                errorHandler: (err) => {
                    console.error('Tesseract error:', err);
                },
            };
            if (localTessdataExists) {
                tesseractOptions.langPath = OCR_CONFIG.tessdataPath;
                console.log('Using local tessdata for better performance');
            }
            const result = await tesseract_js_1.default.recognize(imageBuffer, OCR_CONFIG.language, tesseractOptions);
            clearTimeout(timeoutId);
            const processingTime = Date.now() - startTime;
            // Validate result
            if (!result || !result.data) {
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    error: 'OCR returned invalid result',
                    processingTime,
                };
            }
            if (!result.data.text || result.data.text.trim().length === 0) {
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    error: 'No text detected in image',
                    processingTime,
                };
            }
            // Clean up the text - fix common OCR issues with Cyrillic
            let cleanedText = result.data.text.trim();
            // Log raw text for debugging
            console.log('Raw OCR text preview (first 200 chars):', cleanedText.substring(0, 200));
            // Check confidence threshold
            const confidence = result.data.confidence || 0;
            if (confidence < OCR_CONFIG.minConfidence) {
                return {
                    success: true,
                    text: cleanedText,
                    confidence,
                    error: `Low confidence (${confidence.toFixed(1)}%). Results may be inaccurate.`,
                    processingTime,
                };
            }
            return {
                success: true,
                text: cleanedText,
                confidence,
                processingTime,
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('OCR Error:', error);
            // Handle specific error types
            let errorMessage = 'Unknown OCR error';
            if (error instanceof Error) {
                if (error.name === 'AbortError' || error.message.includes('aborted')) {
                    errorMessage = 'OCR processing timed out';
                }
                else if (error.message.includes('memory')) {
                    errorMessage = 'Insufficient memory to process image';
                }
                else if (error.message.includes('language')) {
                    errorMessage = `Language pack not available. Check if tessdata files exist in: ${OCR_CONFIG.tessdataPath}`;
                }
                else {
                    errorMessage = error.message;
                }
            }
            return {
                success: false,
                text: '',
                confidence: 0,
                error: errorMessage,
                processingTime,
            };
        }
    }
    /**
     * Quick image validation without full OCR
     */
    async validateImageOnly(imageBuffer) {
        return this.validateImage(imageBuffer);
    }
    /**
     * Get OCR service health status
     */
    getHealth() {
        return {
            status: 'ready',
            config: { ...OCR_CONFIG },
        };
    }
}
exports.OCRService = OCRService;
//# sourceMappingURL=ocr.service.js.map