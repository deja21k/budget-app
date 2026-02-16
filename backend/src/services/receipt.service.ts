import { getDatabase } from '../config/database';
import {
  Receipt,
  CreateReceiptInput,
  UpdateReceiptInput,
  ReceiptFilters,
} from '../models/receipt.model';

export class ReceiptService {
  private db = getDatabase();

  create(input: CreateReceiptInput): Receipt {
    const stmt = this.db.prepare(`
      INSERT INTO receipts (
        transaction_id, image_path, ocr_text, ocr_confidence,
        extracted_merchant, extracted_amount, extracted_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.transaction_id || null,
      input.image_path,
      input.ocr_text || null,
      input.ocr_confidence || null,
      input.extracted_merchant || null,
      input.extracted_amount || null,
      input.extracted_date || null,
      input.status || 'processing'
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): Receipt | null {
    const stmt = this.db.prepare('SELECT * FROM receipts WHERE id = ?');
    return stmt.get(id) as Receipt | null;
  }

  findAll(filters: ReceiptFilters = {}): Receipt[] {
    let query = 'SELECT * FROM receipts WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.has_transaction !== undefined) {
      if (filters.has_transaction) {
        query += ' AND transaction_id IS NOT NULL';
      } else {
        query += ' AND transaction_id IS NULL';
      }
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Receipt[];
  }

  update(id: number, input: UpdateReceiptInput): Receipt | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.transaction_id !== undefined) {
      updates.push('transaction_id = ?');
      values.push(input.transaction_id);
    }
    if (input.ocr_text !== undefined) {
      updates.push('ocr_text = ?');
      values.push(input.ocr_text);
    }
    if (input.ocr_confidence !== undefined) {
      updates.push('ocr_confidence = ?');
      values.push(input.ocr_confidence);
    }
    if (input.extracted_merchant !== undefined) {
      updates.push('extracted_merchant = ?');
      values.push(input.extracted_merchant);
    }
    if (input.extracted_amount !== undefined) {
      updates.push('extracted_amount = ?');
      values.push(input.extracted_amount);
    }
    if (input.extracted_date !== undefined) {
      updates.push('extracted_date = ?');
      values.push(input.extracted_date);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (updates.length === 0) return existing;

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE receipts SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM receipts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  linkToTransaction(receiptId: number, transactionId: number): Receipt | null {
    return this.update(receiptId, { transaction_id: transactionId });
  }

  unlinkFromTransaction(receiptId: number): Receipt | null {
    return this.update(receiptId, { transaction_id: null });
  }
}