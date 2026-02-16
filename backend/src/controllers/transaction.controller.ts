import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionInput, UpdateTransactionInput, TransactionFilters } from '../models/transaction.model';

export class TransactionController {
  private service = new TransactionService();

  create = (req: Request, res: Response): void => {
    try {
      const input: CreateTransactionInput = req.body;
      
      if (!input.type || !input.amount || !input.date) {
        res.status(400).json({ error: 'Missing required fields: type, amount, date' });
        return;
      }

      if (!['income', 'expense'].includes(input.type)) {
        res.status(400).json({ error: 'Type must be income or expense' });
        return;
      }

      if (typeof input.amount !== 'number' || input.amount <= 0) {
        res.status(400).json({ error: 'Amount must be a positive number' });
        return;
      }

      if (input.is_recurring && input.recurring_frequency) {
        const validFrequencies = ['weekly', 'monthly', 'yearly'];
        if (!validFrequencies.includes(input.recurring_frequency)) {
          res.status(400).json({ error: 'Invalid recurring frequency' });
          return;
        }
      }

      const transaction = this.service.create(input);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      const message = error instanceof Error ? error.message : 'Failed to create transaction';
      res.status(500).json({ error: message });
    }
  };

  findAll = (req: Request, res: Response): void => {
    try {
      const filters: TransactionFilters = {
        type: req.query.type as 'income' | 'expense',
        category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        merchant: req.query.merchant as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const transactions = this.service.findAll(filters);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
      res.status(500).json({ error: message });
    }
  };

  findById = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const transaction = this.service.findById(id);

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch transaction';
      res.status(500).json({ error: message });
    }
  };

  update = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid transaction ID' });
        return;
      }

      const input: UpdateTransactionInput = req.body;

      if (input.type && !['income', 'expense'].includes(input.type)) {
        res.status(400).json({ error: 'Type must be income or expense' });
        return;
      }

      if (input.amount !== undefined && (typeof input.amount !== 'number' || input.amount <= 0)) {
        res.status(400).json({ error: 'Amount must be a positive number' });
        return;
      }

      if (input.recurring_frequency !== undefined && input.recurring_frequency !== null) {
        const validFrequencies = ['weekly', 'monthly', 'yearly'];
        if (!validFrequencies.includes(input.recurring_frequency)) {
          res.status(400).json({ error: 'Invalid recurring frequency' });
          return;
        }
      }

      const transaction = this.service.update(id, input);

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      const message = error instanceof Error ? error.message : 'Failed to update transaction';
      res.status(500).json({ error: message });
    }
  };

  delete = (req: Request, res: Response): void => {
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
    } catch (error) {
      console.error('Error deleting transaction:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete transaction';
      res.status(500).json({ error: message });
    }
  };

  getSummary = (req: Request, res: Response): void => {
    try {
      const filters = {
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
      };

      const summary = this.service.getSummary(filters);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch summary';
      res.status(500).json({ error: message });
    }
  };
}