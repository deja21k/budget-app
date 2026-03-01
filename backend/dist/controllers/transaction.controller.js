"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const transaction_service_1 = require("../services/transaction.service");
const VALID_PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'digital_wallet', 'other'];
const VALID_REGRET_FLAGS = ['yes', 'neutral', 'regret'];
function sanitizeInput(str) {
    if (!str)
        return undefined;
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
class TransactionController {
    constructor() {
        this.service = new transaction_service_1.TransactionService();
        this.create = (req, res) => {
            try {
                const input = req.body;
                if (!input.type || !input.date) {
                    res.status(400).json({ error: 'Missing required fields: type, amount, date' });
                    return;
                }
                if (!input.amount || typeof input.amount !== 'number' || input.amount <= 0) {
                    res.status(400).json({ error: 'Amount must be a positive number' });
                    return;
                }
                if (!['income', 'expense'].includes(input.type)) {
                    res.status(400).json({ error: 'Type must be income or expense' });
                    return;
                }
                if (input.payment_method && !VALID_PAYMENT_METHODS.includes(input.payment_method)) {
                    res.status(400).json({ error: 'Invalid payment method. Allowed: cash, card, bank_transfer, digital_wallet, other' });
                    return;
                }
                if (input.regret_flag && !VALID_REGRET_FLAGS.includes(input.regret_flag)) {
                    res.status(400).json({ error: 'Invalid regret_flag. Allowed: yes, neutral, regret' });
                    return;
                }
                if (input.is_recurring && input.recurring_frequency) {
                    const validFrequencies = ['weekly', 'monthly', 'yearly'];
                    if (!validFrequencies.includes(input.recurring_frequency)) {
                        res.status(400).json({ error: 'Invalid recurring frequency' });
                        return;
                    }
                }
                const sanitizedInput = {
                    ...input,
                    description: sanitizeInput(input.description),
                    merchant: sanitizeInput(input.merchant),
                };
                const transaction = this.service.create(sanitizedInput);
                res.status(201).json(transaction);
            }
            catch (error) {
                console.error('Error creating transaction:', error);
                const message = error instanceof Error ? error.message : 'Failed to create transaction';
                res.status(500).json({ error: message });
            }
        };
        this.findAll = (req, res) => {
            try {
                const filters = {
                    type: req.query.type,
                    category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
                    start_date: req.query.start_date,
                    end_date: req.query.end_date,
                    merchant: req.query.merchant,
                    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                    offset: req.query.offset ? parseInt(req.query.offset) : undefined,
                };
                const transactions = this.service.findAll(filters);
                res.json(transactions);
            }
            catch (error) {
                console.error('Error fetching transactions:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
                res.status(500).json({ error: message });
            }
        };
        this.findById = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const transaction = this.service.findById(id);
                if (!transaction) {
                    res.status(404).json({ error: 'Transaction not found' });
                    return;
                }
                res.json(transaction);
            }
            catch (error) {
                console.error('Error fetching transaction:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch transaction';
                res.status(500).json({ error: message });
            }
        };
        this.update = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id) || id <= 0) {
                    res.status(400).json({ error: 'Invalid transaction ID' });
                    return;
                }
                const input = req.body;
                if (input.type && !['income', 'expense'].includes(input.type)) {
                    res.status(400).json({ error: 'Type must be income or expense' });
                    return;
                }
                if (input.amount !== undefined && (typeof input.amount !== 'number' || input.amount <= 0)) {
                    res.status(400).json({ error: 'Amount must be a positive number' });
                    return;
                }
                if (input.payment_method && !VALID_PAYMENT_METHODS.includes(input.payment_method)) {
                    res.status(400).json({ error: 'Invalid payment method. Allowed: cash, card, bank_transfer, digital_wallet, other' });
                    return;
                }
                if (input.regret_flag && !VALID_REGRET_FLAGS.includes(input.regret_flag)) {
                    res.status(400).json({ error: 'Invalid regret_flag. Allowed: yes, neutral, regret' });
                    return;
                }
                if (input.recurring_frequency !== undefined && input.recurring_frequency !== null) {
                    const validFrequencies = ['weekly', 'monthly', 'yearly'];
                    if (!validFrequencies.includes(input.recurring_frequency)) {
                        res.status(400).json({ error: 'Invalid recurring frequency' });
                        return;
                    }
                }
                const sanitizedInput = {
                    ...input,
                    description: sanitizeInput(input.description),
                    merchant: sanitizeInput(input.merchant),
                };
                const transaction = this.service.update(id, sanitizedInput);
                if (!transaction) {
                    res.status(404).json({ error: 'Transaction not found' });
                    return;
                }
                res.json(transaction);
            }
            catch (error) {
                console.error('Error updating transaction:', error);
                const message = error instanceof Error ? error.message : 'Failed to update transaction';
                res.status(500).json({ error: message });
            }
        };
        this.delete = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id) || id <= 0) {
                    res.status(400).json({ error: 'Invalid transaction ID' });
                    return;
                }
                const deleted = this.service.delete(id);
                if (!deleted) {
                    res.status(404).json({ error: 'Transaction not found' });
                    return;
                }
                res.status(204).send();
            }
            catch (error) {
                console.error('Error deleting transaction:', error);
                const message = error instanceof Error ? error.message : 'Failed to delete transaction';
                res.status(500).json({ error: message });
            }
        };
        this.getSummary = (req, res) => {
            try {
                const filters = {
                    start_date: req.query.start_date,
                    end_date: req.query.end_date,
                };
                const summary = this.service.getSummary(filters);
                res.json(summary);
            }
            catch (error) {
                console.error('Error fetching summary:', error);
                const message = error instanceof Error ? error.message : 'Failed to fetch summary';
                res.status(500).json({ error: message });
            }
        };
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map