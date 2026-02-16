"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const category_service_1 = require("../services/category.service");
class CategoryController {
    constructor() {
        this.service = new category_service_1.CategoryService();
        this.create = (req, res) => {
            try {
                const input = req.body;
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
            }
            catch (error) {
                if (error.message?.includes('UNIQUE constraint failed')) {
                    res.status(409).json({ error: 'Category with this name already exists' });
                    return;
                }
                console.error('Error creating category:', error);
                res.status(500).json({ error: 'Failed to create category' });
            }
        };
        this.findAll = (req, res) => {
            try {
                const type = req.query.type;
                const categories = this.service.findAll(type);
                res.json(categories);
            }
            catch (error) {
                console.error('Error fetching categories:', error);
                res.status(500).json({ error: 'Failed to fetch categories' });
            }
        };
        this.findById = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const category = this.service.findById(id);
                if (!category) {
                    res.status(404).json({ error: 'Category not found' });
                    return;
                }
                res.json(category);
            }
            catch (error) {
                console.error('Error fetching category:', error);
                res.status(500).json({ error: 'Failed to fetch category' });
            }
        };
        this.update = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const input = req.body;
                const category = this.service.update(id, input);
                if (!category) {
                    res.status(404).json({ error: 'Category not found' });
                    return;
                }
                res.json(category);
            }
            catch (error) {
                if (error.message?.includes('UNIQUE constraint failed')) {
                    res.status(409).json({ error: 'Category with this name already exists' });
                    return;
                }
                console.error('Error updating category:', error);
                res.status(500).json({ error: 'Failed to update category' });
            }
        };
        this.delete = (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const deleted = this.service.delete(id);
                if (!deleted) {
                    res.status(404).json({ error: 'Category not found' });
                    return;
                }
                res.status(204).send();
            }
            catch (error) {
                console.error('Error deleting category:', error);
                res.status(500).json({ error: 'Failed to delete category' });
            }
        };
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=category.controller.js.map