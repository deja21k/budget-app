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
exports.ReceiptController = void 0;
const receipt_service_1 = require("../services/receipt.service");
const transaction_service_1 = require("../services/transaction.service");
const file_storage_1 = require("../utils/file-storage");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ReceiptController {
    constructor() {
        this.service = new receipt_service_1.ReceiptService();
        this.transactionService = new transaction_service_1.TransactionService();
        this.create = (req, res) => {
            try {
                if (!req.file) {
                    res.status(400).json({ error: 'No image file provided' });
                    return;
                }
                const fileResult = file_storage_1.FileStorage.saveReceipt(req.file);
                const input = {
                    image_path: fileResult.path,
                    status: 'processing',
                    ...req.body,
                };
                const receipt = this.service.create(input);
                res.status(201).json({
                    ...receipt,
                    image_url: file_storage_1.FileStorage.getReceiptUrl(path.basename(fileResult.path)),
                });
            }
            catch (error) {
                console.error('Error creating receipt:', error);
                res.status(500).json({ error: 'Failed to create receipt' });
            }
        };
        this.findAll = (req, res) => {
            try {
                const filters = {
                    status: req.query.status,
                    has_transaction: req.query.has_transaction === 'true' ? true :
                        req.query.has_transaction === 'false' ? false : undefined,
                    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                    offset: req.query.offset ? parseInt(req.query.offset) : undefined,
                };
                const receipts = this.service.findAll(filters);
                const receiptsWithUrls = receipts.map(receipt => ({
                    ...receipt,
                    image_url: receipt.image_path ? file_storage_1.FileStorage.getReceiptUrl(path.basename(receipt.image_path)) : null,
                }));
                res.json(receiptsWithUrls);
            }
            catch (error) {
                console.error('Error fetching receipts:', error);
                res.status(500).json({ error: 'Failed to fetch receipts' });
            }
        };
        this.findById = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const receipt = this.service.findById(id);
                if (!receipt) {
                    res.status(404).json({ error: 'Receipt not found' });
                    return;
                }
                res.json({
                    ...receipt,
                    image_url: receipt.image_path ? file_storage_1.FileStorage.getReceiptUrl(path.basename(receipt.image_path)) : null,
                });
            }
            catch (error) {
                console.error('Error fetching receipt:', error);
                res.status(500).json({ error: 'Failed to fetch receipt' });
            }
        };
        this.update = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const input = req.body;
                const receipt = this.service.update(id, input);
                if (!receipt) {
                    res.status(404).json({ error: 'Receipt not found' });
                    return;
                }
                res.json({
                    ...receipt,
                    image_url: receipt.image_path ? file_storage_1.FileStorage.getReceiptUrl(path.basename(receipt.image_path)) : null,
                });
            }
            catch (error) {
                console.error('Error updating receipt:', error);
                res.status(500).json({ error: 'Failed to update receipt' });
            }
        };
        this.delete = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const receipt = this.service.findById(id);
                if (!receipt) {
                    res.status(404).json({ error: 'Receipt not found' });
                    return;
                }
                if (receipt.image_path) {
                    file_storage_1.FileStorage.deleteReceipt(path.basename(receipt.image_path));
                }
                const deleted = this.service.delete(id);
                if (!deleted) {
                    res.status(404).json({ error: 'Receipt not found' });
                    return;
                }
                res.status(204).send();
            }
            catch (error) {
                console.error('Error deleting receipt:', error);
                res.status(500).json({ error: 'Failed to delete receipt' });
            }
        };
        this.confirm = (req, res) => {
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
            }
            catch (error) {
                console.error('Error confirming receipt:', error);
                res.status(500).json({ error: 'Failed to confirm receipt' });
            }
        };
        this.serveFile = (req, res) => {
            try {
                const filename = req.params.filename;
                const filepath = file_storage_1.FileStorage.getReceiptPath(filename);
                if (!filepath || !fs.existsSync(filepath)) {
                    res.status(404).json({ error: 'File not found' });
                    return;
                }
                res.sendFile(filepath);
            }
            catch (error) {
                console.error('Error serving file:', error);
                res.status(500).json({ error: 'Failed to serve file' });
            }
        };
    }
}
exports.ReceiptController = ReceiptController;
//# sourceMappingURL=receipt.controller.js.map