"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shoppingListService = exports.ShoppingListService = void 0;
const database_1 = require("../config/database");
class ShoppingListService {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    async getAll() {
        const stmt = this.db.prepare(`
      SELECT * FROM shopping_list 
      ORDER BY 
        is_completed ASC,
        CASE importance 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        created_at DESC
    `);
        return stmt.all();
    }
    async getById(id) {
        const stmt = this.db.prepare('SELECT * FROM shopping_list WHERE id = ?');
        return stmt.get(id);
    }
    async create(input) {
        const stmt = this.db.prepare(`
      INSERT INTO shopping_list (name, price, quantity, importance, category, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(input.name, input.price, input.quantity || 1, input.importance || 'medium', input.category || null, input.notes || null);
        return this.getById(result.lastInsertRowid);
    }
    async update(id, input) {
        const existing = await this.getById(id);
        if (!existing)
            return null;
        const updates = [];
        const values = [];
        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.price !== undefined) {
            updates.push('price = ?');
            values.push(input.price);
        }
        if (input.quantity !== undefined) {
            updates.push('quantity = ?');
            values.push(input.quantity);
        }
        if (input.actual_price !== undefined) {
            updates.push('actual_price = ?');
            values.push(input.actual_price);
        }
        if (input.is_completed !== undefined) {
            updates.push('is_completed = ?');
            values.push(input.is_completed ? 1 : 0);
        }
        if (input.importance !== undefined) {
            updates.push('importance = ?');
            values.push(input.importance);
        }
        if (input.category !== undefined) {
            updates.push('category = ?');
            values.push(input.category);
        }
        if (input.notes !== undefined) {
            updates.push('notes = ?');
            values.push(input.notes);
        }
        if (updates.length === 0)
            return existing;
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = this.db.prepare(`
      UPDATE shopping_list SET ${updates.join(', ')} WHERE id = ?
    `);
        stmt.run(...values);
        return this.getById(id);
    }
    async delete(id) {
        const stmt = this.db.prepare('DELETE FROM shopping_list WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
    async toggleComplete(id) {
        const existing = await this.getById(id);
        if (!existing)
            return null;
        return this.update(id, { is_completed: !existing.is_completed });
    }
    async getSummary() {
        const items = await this.getAll();
        const totalItems = items.length;
        const completedItems = items.filter(i => i.is_completed).length;
        const pendingItems = totalItems - completedItems;
        const totalPrice = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const completedPrice = items.filter(i => i.is_completed).reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const pendingPrice = totalPrice - completedPrice;
        const byImportance = {
            high: {
                count: items.filter(i => i.importance === 'high').length,
                price: items.filter(i => i.importance === 'high').reduce((sum, i) => sum + (i.price * i.quantity), 0)
            },
            medium: {
                count: items.filter(i => i.importance === 'medium').length,
                price: items.filter(i => i.importance === 'medium').reduce((sum, i) => sum + (i.price * i.quantity), 0)
            },
            low: {
                count: items.filter(i => i.importance === 'low').length,
                price: items.filter(i => i.importance === 'low').reduce((sum, i) => sum + (i.price * i.quantity), 0)
            }
        };
        return {
            total_items: totalItems,
            completed_items: completedItems,
            pending_items: pendingItems,
            total_price: totalPrice,
            completed_price: completedPrice,
            pending_price: pendingPrice,
            by_importance: byImportance
        };
    }
    async getSpendingPrediction(monthlyBudget = 1000) {
        const summary = await this.getSummary();
        const pendingHighImportance = summary.by_importance.high.price;
        const pendingMediumImportance = summary.by_importance.medium.price;
        const pendingLowImportance = summary.by_importance.low.price;
        const estimatedTotal = summary.pending_price;
        const predictedCompletedTotal = pendingHighImportance + (pendingMediumImportance * 0.7);
        const budgetRemaining = monthlyBudget - predictedCompletedTotal;
        const isOverBudget = predictedCompletedTotal > monthlyBudget;
        let recommendation = '';
        if (isOverBudget) {
            recommendation = `Warning: Your predicted spending ($${predictedCompletedTotal.toFixed(2)}) exceeds your budget ($${monthlyBudget}). Consider deferring low-priority items.`;
        }
        else if (budgetRemaining > monthlyBudget * 0.3) {
            recommendation = `You're in good shape! You have $${budgetRemaining.toFixed(2)} remaining after essential purchases.`;
        }
        else {
            recommendation = `You're within budget but with limited margin. Monitor your spending on medium-priority items.`;
        }
        return {
            estimated_total: estimatedTotal,
            predicted_completed_total: predictedCompletedTotal,
            budget_remaining: budgetRemaining,
            is_over_budget: isOverBudget,
            recommendation
        };
    }
    async clearCompleted() {
        const stmt = this.db.prepare('DELETE FROM shopping_list WHERE is_completed = 1');
        const result = stmt.run();
        return result.changes;
    }
}
exports.ShoppingListService = ShoppingListService;
exports.shoppingListService = new ShoppingListService();
//# sourceMappingURL=shopping-list.service.js.map