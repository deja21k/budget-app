import { getDatabase } from '../config/database';
import { 
  ShoppingListItem, 
  CreateShoppingListItemInput, 
  UpdateShoppingListItemInput,
  ShoppingListSummary,
  SpendingPrediction
} from '../models/shopping-list.model';

export class ShoppingListService {
  private db = getDatabase();

  async getAll(accountId: string | number): Promise<ShoppingListItem[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM shopping_list 
      WHERE account_id = ?
      ORDER BY 
        is_completed ASC,
        CASE importance 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        created_at DESC
    `);
    return stmt.all(accountId) as ShoppingListItem[];
  }

  async getById(id: number, accountId: string | number): Promise<ShoppingListItem | null> {
    const stmt = this.db.prepare('SELECT * FROM shopping_list WHERE id = ? AND account_id = ?');
    return stmt.get(id, accountId) as ShoppingListItem | null;
  }

  async create(input: CreateShoppingListItemInput, accountId: string | number): Promise<ShoppingListItem> {
    const stmt = this.db.prepare(`
      INSERT INTO shopping_list (account_id, name, price, quantity, importance, category, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      accountId,
      input.name,
      input.price,
      input.quantity || 1,
      input.importance || 'medium',
      input.category || null,
      input.notes || null
    );
    
    return this.getById(result.lastInsertRowid as number, accountId) as Promise<ShoppingListItem>;
  }

  async update(id: number, input: UpdateShoppingListItemInput, accountId: string | number): Promise<ShoppingListItem | null> {
    const existing = await this.getById(id, accountId);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

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

    if (updates.length === 0) return existing;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    values.push(accountId);

    const stmt = this.db.prepare(`
      UPDATE shopping_list SET ${updates.join(', ')} WHERE id = ? AND account_id = ?
    `);
    stmt.run(...values);

    return this.getById(id, accountId);
  }

  async delete(id: number, accountId: string | number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM shopping_list WHERE id = ? AND account_id = ?');
    const result = stmt.run(id, accountId);
    return result.changes > 0;
  }

  async toggleComplete(id: number, accountId: string | number): Promise<ShoppingListItem | null> {
    const existing = await this.getById(id, accountId);
    if (!existing) return null;
    
    return this.update(id, { is_completed: !existing.is_completed }, accountId);
  }

  async getSummary(accountId: string | number): Promise<ShoppingListSummary> {
    const items = await this.getAll(accountId);
    
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

  async getSpendingPrediction(monthlyBudget: number = 1000, accountId: string | number): Promise<SpendingPrediction> {
    const summary = await this.getSummary(accountId);
    
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
    } else if (budgetRemaining > monthlyBudget * 0.3) {
      recommendation = `You're in good shape! You have $${budgetRemaining.toFixed(2)} remaining after essential purchases.`;
    } else {
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

  async clearCompleted(accountId: string | number): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM shopping_list WHERE is_completed = 1 AND account_id = ?');
    const result = stmt.run(accountId);
    return result.changes;
  }
}

export const shoppingListService = new ShoppingListService();
