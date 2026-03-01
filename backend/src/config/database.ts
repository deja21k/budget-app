import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/database.sqlite');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();

  // Create base tables without indexes first
  database.exec(`
    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      is_fixed INTEGER DEFAULT 0,
      budget_limit REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      description TEXT,
      merchant TEXT,
      date DATE NOT NULL,
      receipt_image_path TEXT,
      ocr_confidence REAL,
      is_recurring INTEGER DEFAULT 0,
      regret_flag TEXT CHECK(regret_flag IN ('yes', 'neutral', 'regret')) DEFAULT 'neutral',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Receipts table (raw OCR data)
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      image_path TEXT NOT NULL,
      ocr_text TEXT,
      ocr_confidence REAL,
      extracted_merchant TEXT,
      extracted_amount REAL,
      extracted_date TEXT,
      status TEXT CHECK(status IN ('processing', 'processed', 'failed')) DEFAULT 'processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add regret_flag column if it doesn't exist
  try {
    const tableInfo = database.prepare(`PRAGMA table_info(transactions)`).all() as Array<{ name: string }>;
    const hasRegretFlag = tableInfo.some(col => col.name === 'regret_flag');
    if (!hasRegretFlag) {
      database.exec(`ALTER TABLE transactions ADD COLUMN regret_flag TEXT CHECK(regret_flag IN ('yes', 'neutral', 'regret')) DEFAULT 'neutral'`);
      console.log('Migration: Added regret_flag column to transactions table');
    }

    // Migration: Add recurring_frequency column if it doesn't exist
    const hasRecurringFrequency = tableInfo.some(col => col.name === 'recurring_frequency');
    if (!hasRecurringFrequency) {
      database.exec(`ALTER TABLE transactions ADD COLUMN recurring_frequency TEXT CHECK(recurring_frequency IN ('weekly', 'monthly', 'yearly'))`);
      console.log('Migration: Added recurring_frequency column to transactions table');
    }

    // Migration: Add payment_method column if it doesn't exist
    const hasPaymentMethod = tableInfo.some(col => col.name === 'payment_method');
    if (!hasPaymentMethod) {
      database.exec(`ALTER TABLE transactions ADD COLUMN payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'digital_wallet', 'other')) DEFAULT 'card'`);
      console.log('Migration: Added payment_method column to transactions table');
    }
  } catch (error) {
    console.warn('Migration check for regret_flag failed:', error);
  }

  // Create transaction_items table
  database.exec(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
  `);

  // Shopping List table
  database.exec(`
    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      actual_price REAL,
      quantity INTEGER DEFAULT 1,
      is_completed INTEGER DEFAULT 0,
      importance TEXT CHECK(importance IN ('high', 'medium', 'low')) DEFAULT 'medium',
      category TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_shopping_list_completed ON shopping_list(is_completed);
    CREATE INDEX IF NOT EXISTS idx_shopping_list_importance ON shopping_list(importance);
  `);

  // Create indexes after tables are ready
  database.exec(`
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
    CREATE INDEX IF NOT EXISTS idx_transactions_regret ON transactions(regret_flag);
    CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date);
    CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
    CREATE INDEX IF NOT EXISTS idx_receipts_transaction ON receipts(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_merchant ON receipts(extracted_merchant);
  `);

  console.log('Database initialized successfully');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}