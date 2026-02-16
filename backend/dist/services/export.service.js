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
exports.ExportService = void 0;
const database_1 = require("../config/database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ExportService {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    /**
     * Export all data as JSON
     */
    exportToJSON() {
        const categories = this.db.prepare('SELECT * FROM categories ORDER BY created_at DESC').all();
        const transactions = this.db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
        const receipts = this.db.prepare('SELECT * FROM receipts ORDER BY created_at DESC').all();
        return {
            exported_at: new Date().toISOString(),
            version: '1.0.0',
            categories,
            transactions,
            receipts,
        };
    }
    /**
     * Export transactions as CSV
     */
    exportTransactionsToCSV() {
        const transactions = this.db.prepare(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.date,
        t.merchant,
        t.description,
        c.name as category,
        t.regret_flag,
        t.is_recurring,
        t.created_at
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC
    `).all();
        if (transactions.length === 0) {
            return 'No transactions found';
        }
        // CSV header
        const headers = ['ID', 'Type', 'Amount', 'Date', 'Merchant', 'Description', 'Category', 'Regret Flag', 'Recurring', 'Created At'];
        // CSV rows
        const rows = transactions.map((t) => [
            t.id,
            t.type,
            t.amount,
            t.date,
            t.merchant || '',
            t.description || '',
            t.category || 'Uncategorized',
            t.regret_flag || 'neutral',
            t.is_recurring ? 'Yes' : 'No',
            t.created_at,
        ]);
        // Escape values and create CSV
        const escapeCSV = (value) => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCSV).join(',')),
        ].join('\n');
        return csvContent;
    }
    /**
     * Export summary as CSV
     */
    exportSummaryToCSV() {
        const summary = this.db.prepare(`
      SELECT 
        c.name as category,
        c.type as category_type,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN t.regret_flag = 'regret' THEN t.amount ELSE 0 END) as total_regretted
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id
      ORDER BY total_expenses DESC
    `).all();
        const headers = ['Category', 'Type', 'Transaction Count', 'Total Income', 'Total Expenses', 'Total Regretted'];
        const rows = summary.map((s) => [
            s.category,
            s.category_type,
            s.transaction_count,
            s.total_income || 0,
            s.total_expenses || 0,
            s.total_regretted || 0,
        ]);
        const escapeCSV = (value) => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        return [
            headers.join(','),
            ...rows.map(row => row.map(escapeCSV).join(',')),
        ].join('\n');
    }
    /**
     * Import data from JSON
     */
    importFromJSON(data) {
        const errors = [];
        let importedCategories = 0;
        let importedTransactions = 0;
        let importedReceipts = 0;
        try {
            // Import categories first
            if (data.categories && Array.isArray(data.categories)) {
                const insertCategory = this.db.prepare(`
          INSERT OR IGNORE INTO categories (id, name, type, color, is_fixed, budget_limit, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
                for (const cat of data.categories) {
                    try {
                        insertCategory.run(cat.id, cat.name, cat.type, cat.color || '#3B82F6', cat.is_fixed || 0, cat.budget_limit || null, cat.created_at);
                        importedCategories++;
                    }
                    catch (e) {
                        errors.push(`Failed to import category ${cat.name}: ${e}`);
                    }
                }
            }
            // Import transactions
            if (data.transactions && Array.isArray(data.transactions)) {
                const insertTransaction = this.db.prepare(`
          INSERT OR IGNORE INTO transactions 
          (id, type, amount, category_id, description, merchant, date, receipt_image_path, ocr_confidence, is_recurring, regret_flag, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
                for (const t of data.transactions) {
                    try {
                        insertTransaction.run(t.id, t.type, t.amount, t.category_id, t.description, t.merchant, t.date, t.receipt_image_path, t.ocr_confidence, t.is_recurring || 0, t.regret_flag || 'neutral', t.created_at, t.updated_at);
                        importedTransactions++;
                    }
                    catch (e) {
                        errors.push(`Failed to import transaction ${t.id}: ${e}`);
                    }
                }
            }
            // Import receipts
            if (data.receipts && Array.isArray(data.receipts)) {
                const insertReceipt = this.db.prepare(`
          INSERT OR IGNORE INTO receipts 
          (id, transaction_id, image_path, ocr_text, ocr_confidence, extracted_merchant, extracted_amount, extracted_date, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
                for (const r of data.receipts) {
                    try {
                        insertReceipt.run(r.id, r.transaction_id, r.image_path, r.ocr_text, r.ocr_confidence, r.extracted_merchant, r.extracted_amount, r.extracted_date, r.status, r.created_at);
                        importedReceipts++;
                    }
                    catch (e) {
                        errors.push(`Failed to import receipt ${r.id}: ${e}`);
                    }
                }
            }
            return {
                success: errors.length === 0,
                imported: {
                    categories: importedCategories,
                    transactions: importedTransactions,
                    receipts: importedReceipts,
                },
                errors,
            };
        }
        catch (error) {
            return {
                success: false,
                imported: { categories: importedCategories, transactions: importedTransactions, receipts: importedReceipts },
                errors: [...errors, `Import failed: ${error}`],
            };
        }
    }
    /**
     * Reset all data
     */
    resetAllData() {
        try {
            // Delete in correct order to respect foreign keys
            this.db.prepare('DELETE FROM receipts').run();
            this.db.prepare('DELETE FROM transactions').run();
            this.db.prepare('DELETE FROM categories').run();
            return { success: true, message: 'All data has been reset successfully' };
        }
        catch (error) {
            return { success: false, message: `Failed to reset data: ${error}` };
        }
    }
    /**
     * Get database stats
     */
    getDatabaseStats() {
        const categories = this.db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
        const transactions = this.db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
        const receipts = this.db.prepare('SELECT COUNT(*) as count FROM receipts').get().count;
        const totalIncome = this.db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'").get().total;
        const totalExpenses = this.db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'").get().total;
        // Get database file size
        const dbPath = path.join(__dirname, '../../data/database.sqlite');
        let databaseSize = 'Unknown';
        try {
            const stats = fs.statSync(dbPath);
            const sizeInMB = stats.size / (1024 * 1024);
            databaseSize = `${sizeInMB.toFixed(2)} MB`;
        }
        catch {
            // File might not exist or be accessible
        }
        return {
            categories,
            transactions,
            receipts,
            totalIncome,
            totalExpenses,
            databaseSize,
        };
    }
}
exports.ExportService = ExportService;
//# sourceMappingURL=export.service.js.map