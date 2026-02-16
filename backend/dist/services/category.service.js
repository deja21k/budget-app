"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const database_1 = require("../config/database");
class CategoryService {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    create(input) {
        const stmt = this.db.prepare(`
      INSERT INTO categories (name, type, color, is_fixed, budget_limit)
      VALUES (?, ?, ?, ?, ?)
    `);
        const result = stmt.run(input.name, input.type, input.color || '#3B82F6', input.is_fixed ? 1 : 0, input.budget_limit || null);
        return this.findById(result.lastInsertRowid);
    }
    findById(id) {
        const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
        return stmt.get(id);
    }
    findAll(type) {
        let query = 'SELECT * FROM categories';
        const params = [];
        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }
        query += ' ORDER BY name';
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }
    update(id, input) {
        const existing = this.findById(id);
        if (!existing)
            return null;
        const updates = [];
        const values = [];
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
        if (updates.length === 0)
            return existing;
        values.push(id);
        const stmt = this.db.prepare(`
      UPDATE categories SET ${updates.join(', ')} WHERE id = ?
    `);
        stmt.run(...values);
        return this.findById(id);
    }
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
}
exports.CategoryService = CategoryService;
//# sourceMappingURL=category.service.js.map