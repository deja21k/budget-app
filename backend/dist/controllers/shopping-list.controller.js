"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shoppingListController = exports.ShoppingListController = void 0;
const shopping_list_service_1 = require("../services/shopping-list.service");
class ShoppingListController {
    async getAll(req, res) {
        try {
            const items = await shopping_list_service_1.shoppingListService.getAll();
            res.json(items);
        }
        catch (error) {
            console.error('Error fetching shopping list:', error);
            res.status(500).json({ error: 'Failed to fetch shopping list' });
        }
    }
    async getById(req, res) {
        try {
            const id = parseInt(req.params.id);
            const item = await shopping_list_service_1.shoppingListService.getById(id);
            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json(item);
        }
        catch (error) {
            console.error('Error fetching shopping list item:', error);
            res.status(500).json({ error: 'Failed to fetch item' });
        }
    }
    async create(req, res) {
        try {
            const input = req.body;
            if (!input.name || input.price === undefined) {
                return res.status(400).json({ error: 'Name and price are required' });
            }
            const item = await shopping_list_service_1.shoppingListService.create(input);
            res.status(201).json(item);
        }
        catch (error) {
            console.error('Error creating shopping list item:', error);
            res.status(500).json({ error: 'Failed to create item' });
        }
    }
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            const input = req.body;
            const item = await shopping_list_service_1.shoppingListService.update(id, input);
            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json(item);
        }
        catch (error) {
            console.error('Error updating shopping list item:', error);
            res.status(500).json({ error: 'Failed to update item' });
        }
    }
    async delete(req, res) {
        try {
            const id = parseInt(req.params.id);
            const deleted = await shopping_list_service_1.shoppingListService.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error deleting shopping list item:', error);
            res.status(500).json({ error: 'Failed to delete item' });
        }
    }
    async toggleComplete(req, res) {
        try {
            const id = parseInt(req.params.id);
            const item = await shopping_list_service_1.shoppingListService.toggleComplete(id);
            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json(item);
        }
        catch (error) {
            console.error('Error toggling item completion:', error);
            res.status(500).json({ error: 'Failed to toggle item' });
        }
    }
    async getSummary(req, res) {
        try {
            const summary = await shopping_list_service_1.shoppingListService.getSummary();
            res.json(summary);
        }
        catch (error) {
            console.error('Error fetching shopping list summary:', error);
            res.status(500).json({ error: 'Failed to fetch summary' });
        }
    }
    async getPrediction(req, res) {
        try {
            const monthlyBudget = parseFloat(req.query.budget) || 1000;
            const prediction = await shopping_list_service_1.shoppingListService.getSpendingPrediction(monthlyBudget);
            res.json(prediction);
        }
        catch (error) {
            console.error('Error fetching spending prediction:', error);
            res.status(500).json({ error: 'Failed to fetch prediction' });
        }
    }
    async clearCompleted(req, res) {
        try {
            const count = await shopping_list_service_1.shoppingListService.clearCompleted();
            res.json({ success: true, deleted: count });
        }
        catch (error) {
            console.error('Error clearing completed items:', error);
            res.status(500).json({ error: 'Failed to clear completed items' });
        }
    }
}
exports.ShoppingListController = ShoppingListController;
exports.shoppingListController = new ShoppingListController();
//# sourceMappingURL=shopping-list.controller.js.map