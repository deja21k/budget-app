import { Request, Response } from 'express';
import { OCRService } from '../services/ocr.service';
import { ReceiptParser } from '../services/receipt-parser.service';
import { ReceiptService } from '../services/receipt.service';
import { FileStorage } from '../utils/file-storage';
import * as path from 'path';

export class OCRController {
  private ocrService = new OCRService();
  private receiptParser = new ReceiptParser();
  private receiptService = new ReceiptService();

  scanReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided',
        });
        return;
      }

      console.log(`Processing receipt image: ${req.file.originalname} (${req.file.size} bytes)`);

      const fileResult = FileStorage.saveReceipt(req.file);
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
          image_url: FileStorage.getReceiptUrl(path.basename(fileResult.path)),
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
        image_url: FileStorage.getReceiptUrl(path.basename(fileResult.path)),
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

    } catch (error) {
      console.error('Receipt scanning error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process receipt',
      });
    }
  };

  parseText = async (req: Request, res: Response): Promise<void> => {
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

    } catch (error) {
      console.error('Text parsing error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse text',
      });
    }
  };
}