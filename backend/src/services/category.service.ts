import { getDatabase } from '../config/database';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../models/category.model';

export class CategoryService {
  private db = getDatabase();

  create(input: CreateCategoryInput): Category {
    const stmt = this.db.prepare(`
      INSERT INTO categories (name, type, color, is_fixed, budget_limit)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name,
      input.type,
      input.color || '#3B82F6',
      input.is_fixed ? 1 : 0,
      input.budget_limit || null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): Category | null {
    const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
    return stmt.get(id) as Category | null;
  }

  findAll(type?: 'income' | 'expense'): Category[] {
    let query = 'SELECT * FROM categories';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Category[];
  }

  update(id: number, input: UpdateCategoryInput): Category | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      values.push(input.color);
    }
    if (input.is_fixed !== undefined) {
      updates.push('is_fixed = ?');
      values.push(input.is_fixed ? 1 : 0);
    }
    if (input.budget_limit !== undefined) {
      updates.push('budget_limit = ?');
      values.push(input.budget_limit);
    }

    if (updates.length === 0) return existing;

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE categories SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}