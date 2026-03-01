"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const database_1 = require("../config/database");
const defensive_1 = require("../utils/defensive");
// Constants for validation
const MAX_AMOUNT = 999999999.99;
const MIN_AMOUNT = 0;
const MAX_MERCHANT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ITEM_NAME_LENGTH = 200;
const MAX_ITEMS_PER_TRANSACTION = 100;
class TransactionService {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    /**
     * Validate and sanitize create input
     */
    validateCreateInput(input) {
        // Validate type
        if (!input.type || !['income', 'expense'].includes(input.type)) {
            return { valid: false, error: 'Type must be either income or expense' };
        }
        // Validate amount
        const amount = (0, defensive_1.safeNumber)(input.amount, MIN_AMOUNT, MAX_AMOUNT);
        if (amount === null) {
            return { valid: false, error: `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}` };
        }
        // Validate date
        if (!input.date) {
            return { valid: false, error: 'Date is required' };
        }
        const date = (0, defensive_1.safeDate)(input.date);
        if (!date) {
            return { valid: false, error: 'Invalid date format' };
        }
        // Check if date is reasonable (not too far in future or past)
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
        if (date > oneYearFromNow || date < tenYearsAgo) {
            return { valid: false, error: 'Date must be within reasonable range (last 10 years to 1 year in future)' };
        }
        // Validate recurring frequency if is_recurring is set
        if (input.is_recurring && input.recurring_frequency) {
            const validFrequencies = ['weekly', 'monthly', 'yearly'];
            if (!validFrequencies.includes(input.recurring_frequency)) {
                return { valid: false, error: 'Invalid recurring frequency' };
            }
        }
        // Validate items if provided
        let sanitizedItems;
        if (input.items && Array.isArray(input.items)) {
            if (input.items.length > MAX_ITEMS_PER_TRANSACTION) {
                return { valid: false, error: `Cannot have more than ${MAX_ITEMS_PER_TRANSACTION} items` };
            }
            sanitizedItems = [];
            for (const item of input.items) {
                if (!item.name || typeof item.name !== 'string') {
                    return { valid: false, error: 'Each item must have a name' };
                }
                const itemName = (0, defensive_1.safeString)(item.name, MAX_ITEM_NAME_LENGTH);
                if (!itemName) {
                    return { valid: false, error: 'Item name is required' };
                }
                const unitPrice = (0, defensive_1.safeNumber)(item.unit_price, MIN_AMOUNT, MAX_AMOUNT);
                if (unitPrice === null) {
                    return { valid: false, error: 'Each item must have a valid unit price' };
                }
                const quantity = (0, defensive_1.safeNumber)(item.quantity ?? 1, 0.001, 99999) ?? 1;
                const totalPrice = (0, defensive_1.safeNumber)(item.total_price ?? (unitPrice * quantity), MIN_AMOUNT, MAX_AMOUNT);
                sanitizedItems.push({
                    name: itemName,
                    quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice ?? unitPrice * quantity,
                });
            }
        }
        // Sanitize string fields
        const sanitized = {
            type: input.type,
            amount,
            date: input.date,
            category_id: (0, defensive_1.safeNumber)(input.category_id, 1) ?? undefined,
            description: (0, defensive_1.safeString)(input.description, MAX_DESCRIPTION_LENGTH) ?? undefined,
            merchant: (0, defensive_1.safeString)(input.merchant, MAX_MERCHANT_LENGTH) ?? undefined,
            receipt_image_path: (0, defensive_1.safeString)(input.receipt_image_path, 500) ?? undefined,
            ocr_confidence: (0, defensive_1.safeNumber)(input.ocr_confidence, 0, 100) ?? undefined,
            is_recurring: (0, defensive_1.safeBoolean)(input.is_recurring),
            recurring_frequency: input.recurring_frequency && ['weekly', 'monthly', 'yearly'].includes(input.recurring_frequency)
                ? input.recurring_frequency
                : undefined,
            regret_flag: (0, defensive_1.validateEnum)(input.regret_flag, ['yes', 'neutral', 'regret'], 'neutral'),
            payment_method: (0, defensive_1.validateEnum)(input.payment_method, ['cash', 'card', 'bank_transfer', 'digital_wallet', 'other'], 'card'),
            items: sanitizedItems,
        };
        return { valid: true, sanitized };
    }
    /**
     * Create transaction items
     */
    createItems(db, transactionId, items) {
        const stmt = db.prepare(`
      INSERT INTO transaction_items (transaction_id, name, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?)
    `);
        for (const item of items) {
            const totalPrice = item.total_price ?? (item.unit_price * (item.quantity ?? 1));
            stmt.run(transactionId, item.name, item.quantity ?? 1, item.unit_price, totalPrice);
        }
    }
    /**
     * Get items for a transaction
     */
    getItems(transactionId) {
        const stmt = this.db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?');
        return stmt.all(transactionId);
    }
    /**
     * Delete all items for a transaction
     */
    deleteItems(db, transactionId) {
        const stmt = db.prepare('DELETE FROM transaction_items WHERE transaction_id = ?');
        stmt.run(transactionId);
    }
    /**
     * Create a new transaction with validation
     */
    create(input) {
        const validation = this.validateCreateInput(input);
        if (!validation.valid || !validation.sanitized) {
            throw new Error(validation.error || 'Invalid input');
        }
        const sanitized = validation.sanitized;
        return (0, defensive_1.withTransaction)((db) => {
            const stmt = db.prepare(`
        INSERT INTO transactions (
          type, amount, category_id, description, merchant, 
          date, receipt_image_path, ocr_confidence, is_recurring, recurring_frequency, regret_flag, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const result = stmt.run(sanitized.type, sanitized.amount, sanitized.category_id ?? null, sanitized.description ?? null, sanitized.merchant ?? null, sanitized.date, sanitized.receipt_image_path ?? null, sanitized.ocr_confidence ?? null, sanitized.is_recurring ? 1 : 0, sanitized.recurring_frequency ?? null, sanitized.regret_flag, sanitized.payment_method);
            const newTransactionId = result.lastInsertRowid;
            // Create items if provided
            if (sanitized.items && sanitized.items.length > 0) {
                this.createItems(db, newTransactionId, sanitized.items);
            }
            const newTransaction = this.findById(newTransactionId);
            if (!newTransaction) {
                throw new Error('Failed to create transaction');
            }
            return newTransaction;
        });
    }
    /**
      * Find transaction by ID with validation
      */
    findById(id) {
        const validatedId = (0, defensive_1.validateId)(id, 'Transaction');
        const stmt = this.db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `);
        const transaction = stmt.get(validatedId);
        if (transaction) {
            transaction.items = this.getItems(validatedId);
        }
        return transaction;
    }
    /**
     * Find all transactions with filters
     */
    findAll(filters = {}) {
        let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
        const params = [];
        // Validate and apply filters
        if (filters.type) {
            if (!['income', 'expense'].includes(filters.type)) {
                throw new Error('Invalid type filter');
            }
            query += ' AND t.type = ?';
            params.push(filters.type);
        }
        if (filters.category_id !== undefined) {
            const categoryId = (0, defensive_1.validateId)(filters.category_id, 'Category');
            query += ' AND t.category_id = ?';
            params.push(categoryId);
        }
        if (filters.start_date) {
            const startDate = (0, defensive_1.safeDate)(filters.start_date);
            if (!startDate) {
                throw new Error('Invalid start_date filter');
            }
            query += ' AND t.date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            const endDate = (0, defensive_1.safeDate)(filters.end_date);
            if (!endDate) {
                throw new Error('Invalid end_date filter');
            }
            query += ' AND t.date <= ?';
            params.push(filters.end_date);
        }
        if (filters.merchant) {
            const merchant = (0, defensive_1.safeString)(filters.merchant, MAX_MERCHANT_LENGTH);
            if (merchant) {
                query += ' AND t.merchant LIKE ?';
                params.push(`%${merchant}%`);
            }
        }
        query += ' ORDER BY t.date DESC, t.created_at DESC';
        if (filters.limit !== undefined) {
            const limit = (0, defensive_1.safeNumber)(filters.limit, 1, 1000);
            if (limit !== null) {
                query += ' LIMIT ?';
                params.push(limit);
                if (filters.offset !== undefined) {
                    const offset = (0, defensive_1.safeNumber)(filters.offset, 0);
                    if (offset !== null) {
                        query += ' OFFSET ?';
                        params.push(offset);
                    }
                }
            }
        }
        const stmt = this.db.prepare(query);
        const transactions = stmt.all(...params);
        // Load items for each transaction
        for (const transaction of transactions) {
            transaction.items = this.getItems(transaction.id);
        }
        return transactions;
    }
    /**
     * Update transaction with validation
     */
    update(id, input) {
        const validatedId = (0, defensive_1.validateId)(id, 'Transaction');
        return (0, defensive_1.withTransaction)((db) => {
            const existing = this.findById(validatedId);
            if (!existing)
                return null;
            const updates = [];
            const values = [];
            if (input.type !== undefined) {
                if (!['income', 'expense'].includes(input.type)) {
                    throw new Error('Invalid type');
                }
                updates.push('type = ?');
                values.push(input.type);
            }
            if (input.amount !== undefined) {
                const amount = (0, defensive_1.safeNumber)(input.amount, MIN_AMOUNT, MAX_AMOUNT);
                if (amount === null) {
                    throw new Error(`Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
                }
                updates.push('amount = ?');
                values.push(amount);
            }
            if (input.category_id !== undefined) {
                const categoryId = (0, defensive_1.safeNumber)(input.category_id, 1);
                updates.push('category_id = ?');
                values.push(categoryId);
            }
            if (input.description !== undefined) {
                const description = (0, defensive_1.safeString)(input.description, MAX_DESCRIPTION_LENGTH);
                updates.push('description = ?');
                values.push(description);
            }
            if (input.merchant !== undefined) {
                const merchant = (0, defensive_1.safeString)(input.merchant, MAX_MERCHANT_LENGTH);
                updates.push('merchant = ?');
                values.push(merchant);
            }
            if (input.date !== undefined) {
                const date = (0, defensive_1.safeDate)(input.date);
                if (!date) {
                    throw new Error('Invalid date format');
                }
                updates.push('date = ?');
                values.push(input.date);
            }
            if (input.receipt_image_path !== undefined) {
                const path = (0, defensive_1.safeString)(input.receipt_image_path, 500);
                updates.push('receipt_image_path = ?');
                values.push(path);
            }
            if (input.ocr_confidence !== undefined) {
                const confidence = (0, defensive_1.safeNumber)(input.ocr_confidence, 0, 100);
                updates.push('ocr_confidence = ?');
                values.push(confidence);
            }
            if (input.is_recurring !== undefined) {
                updates.push('is_recurring = ?');
                values.push((0, defensive_1.safeBoolean)(input.is_recurring) ? 1 : 0);
            }
            if (input.recurring_frequency !== undefined) {
                if (input.recurring_frequency === null) {
                    updates.push('recurring_frequency = ?');
                    values.push(null);
                }
                else if (['weekly', 'monthly', 'yearly'].includes(input.recurring_frequency)) {
                    updates.push('recurring_frequency = ?');
                    values.push(input.recurring_frequency);
                }
            }
            if (input.regret_flag !== undefined) {
                const flag = (0, defensive_1.validateEnum)(input.regret_flag, ['yes', 'neutral', 'regret'], 'neutral');
                updates.push('regret_flag = ?');
                values.push(flag);
            }
            if (input.payment_method !== undefined) {
                if (input.payment_method === null) {
                    updates.push('payment_method = ?');
                    values.push(null);
                }
                else {
                    const method = (0, defensive_1.validateEnum)(input.payment_method, ['cash', 'card', 'bank_transfer', 'digital_wallet', 'other'], 'card');
                    updates.push('payment_method = ?');
                    values.push(method);
                }
            }
            // Handle items update
            if (input.items !== undefined) {
                // Delete existing items and insert new ones
                this.deleteItems(db, validatedId);
                if (input.items && input.items.length > 0) {
                    // Validate items
                    const sanitizedItems = [];
                    for (const item of input.items) {
                        if (!item.name || typeof item.name !== 'string') {
                            throw new Error('Each item must have a name');
                        }
                        const itemName = (0, defensive_1.safeString)(item.name, MAX_ITEM_NAME_LENGTH);
                        if (!itemName) {
                            throw new Error('Item name is required');
                        }
                        const unitPrice = (0, defensive_1.safeNumber)(item.unit_price, MIN_AMOUNT, MAX_AMOUNT);
                        if (unitPrice === null) {
                            throw new Error('Each item must have a valid unit price');
                        }
                        const quantity = (0, defensive_1.safeNumber)(item.quantity ?? 1, 0.001, 99999) ?? 1;
                        const totalPrice = (0, defensive_1.safeNumber)(item.total_price ?? (unitPrice * quantity), MIN_AMOUNT, MAX_AMOUNT);
                        sanitizedItems.push({
                            name: itemName,
                            quantity,
                            unit_price: unitPrice,
                            total_price: totalPrice ?? unitPrice * quantity,
                        });
                    }
                    this.createItems(db, validatedId, sanitizedItems);
                }
            }
            if (updates.length === 0)
                return existing;
            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(validatedId);
            const stmt = db.prepare(`
        UPDATE transactions SET ${updates.join(', ')} WHERE id = ?
      `);
            stmt.run(...values);
            const updated = this.findById(validatedId);
            if (!updated) {
                throw new Error('Failed to retrieve updated transaction');
            }
            return updated;
        });
    }
    /**
     * Delete transaction with validation
     */
    delete(id) {
        const validatedId = (0, defensive_1.validateId)(id, 'Transaction');
        return (0, defensive_1.withTransaction)((db) => {
            // Check if transaction exists first
            const existing = this.findById(validatedId);
            if (!existing)
                return false;
            const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
            const result = stmt.run(validatedId);
            return result.changes > 0;
        });
    }
    /**
     * Get transaction summary with filters
     */
    getSummary(filters = {}) {
        let incomeQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ?';
        let expenseQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ?';
        let countQuery = 'SELECT COUNT(*) as count FROM transactions WHERE 1=1';
        const params = [];
        if (filters.start_date) {
            const startDate = (0, defensive_1.safeDate)(filters.start_date);
            if (!startDate) {
                throw new Error('Invalid start_date filter');
            }
            incomeQuery += ' AND date >= ?';
            expenseQuery += ' AND date >= ?';
            countQuery += ' AND date >= ?';
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            const endDate = (0, defensive_1.safeDate)(filters.end_date);
            if (!endDate) {
                throw new Error('Invalid end_date filter');
            }
            incomeQuery += ' AND date <= ?';
            expenseQuery += ' AND date <= ?';
            countQuery += ' AND date <= ?';
            params.push(filters.end_date);
        }
        const incomeStmt = this.db.prepare(incomeQuery);
        const expenseStmt = this.db.prepare(expenseQuery);
        const countStmt = this.db.prepare(countQuery);
        const incomeResult = incomeStmt.get('income', ...params);
        const expenseResult = expenseStmt.get('expense', ...params);
        const countResult = countStmt.get(...params);
        // Defensive: handle null/undefined results
        const totalIncome = incomeResult?.total ?? 0;
        const totalExpense = expenseResult?.total ?? 0;
        return {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_amount: totalIncome - totalExpense,
            transaction_count: countResult?.count ?? 0,
        };
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transaction.service.js.map