import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { CreateCategoryInput, UpdateCategoryInput } from '../models/category.model';

export class CategoryController {
  private service = new CategoryService();

  create = (req: Request, res: Response): void => {
    try {
      const input: CreateCategoryInput = req.body;
      
      if (!input.name || !input.type) {
        res.status(400).json({ error: 'Missing required fields: name, type' });
        return;
      }

      if (!['income', 'expense'].includes(input.type)) {
        res.status(400).json({ error: 'Type must be income or expense' });
        return;
      }

      const category = this.service.create(input);
      res.status(201).json(category);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Category with this name already exists' });
        return;
      }
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  };

  findAll = (req: Request, res: Response): void => {
    try {
      const type = req.query.type as 'income' | 'expense' | undefined;
      const categories = this.service.findAll(type);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  };

  findById = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const category = this.service.findById(id);

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ error: 'Failed to fetch category' });
    }
  };

  update = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const input: UpdateCategoryInput = req.body;

      const category = this.service.update(id, input);

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json(category);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Category with this name already exists' });
        return;
      }
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  };

  delete = (req: Request, res: Response): void => {
    try {
      const id = parseInt(req.params.id);
      const deleted = this.service.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  };
}