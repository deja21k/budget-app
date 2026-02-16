import { Request, Response } from 'express';
import { ReceiptService } from '../services/receipt.service';
import { TransactionService } from '../services/transaction.service';
import { FileStorage } from '../utils/file-storage';
import { CreateReceiptInput, UpdateReceiptInput, ReceiptFilters } from '../models/receipt.model';
import * as path from 'path';
import * as fs from 'fs';

export class ReceiptController {
  private service = new ReceiptService();
  private transactionService = new TransactionService();

  create = (req: Request, res: Response): void => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      const fileResult = FileStorage.saveReceipt(req.file);
      
      const input: CreateReceiptInput = {
        image_path: fileResult.path,
        status: 'processing',
        ...req.body,
      };

      const receipt = this.service.create(input);
      
      res.status(201).json({
        ...receipt,
        image_url: FileStorage.getReceiptUrl(path.basename(fileResult.path)),
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      res.status(500).json({ error: 'Failed to create receipt' });
    }
  };

  findAll = (req: Request, res: Response): void => {
    try {
      const filters: ReceiptFilters = {
        status: req.query.status as 'processing' | 'processed' | 'failed',
        has_transaction: req.query.has_transaction === 'true' ? true : 
                        req.query.has_transaction === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const receipts = this.service.findAll(filters);
      
      const receiptsWithUrls = receipts.map(receipt => ({
        ...receipt,
        image_url: receipt.image_path ? FileStorage.getReceiptUrl(path.basename(receipt.image_path)) : null,
      }));

      res.json(receiptsWithUrls);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ error: 'Failed to fetch receipts' });
    }
  };

  findById = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const receipt = this.service.findById(id);

      if (!receipt) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.json({
        ...receipt,
        image_url: receipt.image_path ? FileStorage.getReceiptUrl(path.basename(receipt.image_path)) : null,
      });
    } catch (error) {
      console.error('Error fetching receipt:', error);
      res.status(500).json({ error: 'Failed to fetch receipt' });
    }
  };

  update = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const input: UpdateReceiptInput = req.body;

      const receipt = this.service.update(id, input);

      if (!receipt) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.json({
        ...receipt,
        image_url: receipt.image_path ? FileStorage.getReceiptUrl(path.basename(receipt.image_path)) : null,
      });
    } catch (error) {
      console.error('Error updating receipt:', error);
      res.status(500).json({ error: 'Failed to update receipt' });
    }
  };

  delete = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const receipt = this.service.findById(id);

      if (!receipt) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      if (receipt.image_path) {
        FileStorage.deleteReceipt(path.basename(receipt.image_path));
      }

      const deleted = this.service.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      res.status(500).json({ error: 'Failed to delete receipt' });
    }
  };

  confirm = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const { transaction_data } = req.body;

      const receipt = this.service.findById(id);
      if (!receipt) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      const transaction = this.transactionService.create({
        type: transaction_data.type || 'expense',
        amount: transaction_data.amount || receipt.extracted_amount || 0,
        category_id: transaction_data.category_id,
        description: transaction_data.description || `Receipt from ${receipt.extracted_merchant || 'Unknown'}`,
        merchant: transaction_data.merchant || receipt.extracted_merchant,
        date: transaction_data.date || receipt.extracted_date || new Date().toISOString().split('T')[0],
        receipt_image_path: receipt.image_path,
        ocr_confidence: receipt.ocr_confidence || undefined,
      });

      this.service.update(id, {
        transaction_id: transaction.id,
        status: 'processed',
      });

      res.json({
        transaction,
        receipt: {
          ...receipt,
          transaction_id: transaction.id,
          status: 'processed',
        },
      });
    } catch (error) {
      console.error('Error confirming receipt:', error);
      res.status(500).json({ error: 'Failed to confirm receipt' });
    }
  };

  serveFile = (req: Request, res: Response): void => {
    try {
      const filename = req.params.filename;
      const filepath = FileStorage.getReceiptPath(filename);

      if (!filepath || !fs.existsSync(filepath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.sendFile(filepath);
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  };
}