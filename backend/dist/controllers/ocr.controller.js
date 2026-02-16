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
exports.OCRController = void 0;
const ocr_service_1 = require("../services/ocr.service");
const receipt_parser_service_1 = require("../services/receipt-parser.service");
const receipt_service_1 = require("../services/receipt.service");
const file_storage_1 = require("../utils/file-storage");
const path = __importStar(require("path"));
class OCRController {
    constructor() {
        this.ocrService = new ocr_service_1.OCRService();
        this.receiptParser = new receipt_parser_service_1.ReceiptParser();
        this.receiptService = new receipt_service_1.ReceiptService();
        this.scanReceipt = async (req, res) => {
            try {
                if (!req.file) {
                    res.status(400).json({
                        success: false,
                        error: 'No image file provided',
                    });
                    return;
                }
                console.log(`Processing receipt image: ${req.file.originalname} (${req.file.size} bytes)`);
                const fileResult = file_storage_1.FileStorage.saveReceipt(req.file);
                console.log(`File saved: ${fileResult.path}`);
                const ocrResult = await this.ocrService.recognize(req.file.buffer);
                if (!ocrResult.success) {
                    const receipt = this.receiptService.create({
                        image_path: fileResult.path,
                        status: 'failed',
                        ocr_text: '',
                        ocr_confidence: 0,
                    });
                    res.status(422).json({
                        success: false,
                        error: ocrResult.error || 'OCR failed',
                        receipt_id: receipt.id,
                        image_url: file_storage_1.FileStorage.getReceiptUrl(path.basename(fileResult.path)),
                        processing_time: ocrResult.processingTime,
                    });
                    return;
                }
                console.log(`OCR completed in ${ocrResult.processingTime}ms with confidence: ${ocrResult.confidence}`);
                const parsed = this.receiptParser.parse(ocrResult.text, ocrResult.confidence);
                const receipt = this.receiptService.create({
                    image_path: fileResult.path,
                    status: 'processed',
                    ocr_text: ocrResult.text,
                    ocr_confidence: ocrResult.confidence,
                    extracted_merchant: parsed.storeName || undefined,
                    extracted_amount: parsed.total || undefined,
                    extracted_date: parsed.date || undefined,
                });
                const response = {
                    success: true,
                    receipt_id: receipt.id,
                    image_url: file_storage_1.FileStorage.getReceiptUrl(path.basename(fileResult.path)),
                    extracted_data: {
                        store_name: parsed.storeName,
                        date: parsed.date,
                        total: parsed.total,
                        subtotal: parsed.subtotal,
                        tax: parsed.tax,
                        line_items: parsed.lineItems,
                        currency: parsed.currency,
                        fiscal_code: parsed.fiscalCode,
                        pib: parsed.pib,
                    },
                    confidence: ocrResult.confidence,
                    processing_time: ocrResult.processingTime,
                    warnings: parsed.warnings,
                    raw_text_preview: ocrResult.text.substring(0, 500) + (ocrResult.text.length > 500 ? '...' : ''),
                };
                res.json(response);
            }
            catch (error) {
                console.error('Receipt scanning error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to process receipt',
                });
            }
        };
        this.parseText = async (req, res) => {
            try {
                const { text, confidence = 80 } = req.body;
                if (!text || typeof text !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'Text is required',
                    });
                    return;
                }
                const parsed = this.receiptParser.parse(text, confidence);
                res.json({
                    success: true,
                    extracted_data: {
                        store_name: parsed.storeName,
                        date: parsed.date,
                        total: parsed.total,
                        subtotal: parsed.subtotal,
                        tax: parsed.tax,
                        line_items: parsed.lineItems,
                        currency: parsed.currency,
                        fiscal_code: parsed.fiscalCode,
                        pib: parsed.pib,
                    },
                    warnings: parsed.warnings,
                    raw_text: text,
                });
            }
            catch (error) {
                console.error('Text parsing error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to parse text',
                });
            }
        };
    }
}
exports.OCRController = OCRController;
//# sourceMappingURL=ocr.controller.js.map