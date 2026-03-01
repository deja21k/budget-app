import { Request, Response } from 'express';
import { shoppingListService } from '../services/shopping-list.service';
import { CreateShoppingListItemInput, UpdateShoppingListItemInput } from '../models/shopping-list.model';

export class ShoppingListController {
  async getAll(req: Request, res: Response) {
    try {
      const items = await shoppingListService.getAll();
      res.json(items);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      res.status(500).json({ error: 'Failed to fetch shopping list' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const item = await shoppingListService.getById(id);
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error fetching shopping list item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const input: CreateShoppingListItemInput = req.body;
      
      if (!input.name || input.price === undefined) {
        return res.status(400).json({ error: 'Name and price are required' });
      }
      
      const item = await shoppingListService.create(input);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating shopping list item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const input: UpdateShoppingListItemInput = req.body;
      
      const item = await shoppingListService.update(id, input);
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error updating shopping list item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await shoppingListService.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting shopping list item:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }

  async toggleComplete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const item = await shoppingListService.toggleComplete(id);
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error toggling item completion:', error);
      res.status(500).json({ error: 'Failed to toggle item' });
    }
  }

  async getSummary(req: Request, res: Response) {
    try {
      const summary = await shoppingListService.getSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error fetching shopping list summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  }

  async getPrediction(req: Request, res: Response) {
    try {
      const monthlyBudget = parseFloat(req.query.budget as string) || 1000;
      const prediction = await shoppingListService.getSpendingPrediction(monthlyBudget);
      res.json(prediction);
    } catch (error) {
      console.error('Error fetching spending prediction:', error);
      res.status(500).json({ error: 'Failed to fetch prediction' });
    }
  }

  async clearCompleted(req: Request, res: Response) {
    try {
      const count = await shoppingListService.clearCompleted();
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error('Error clearing completed items:', error);
      res.status(500).json({ error: 'Failed to clear completed items' });
    }
  }
}

export const shoppingListController = new ShoppingListController();
