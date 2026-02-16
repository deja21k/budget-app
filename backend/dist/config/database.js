"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.initializeDatabase = initializeDatabase;
exports.closeDatabase = closeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const DB_PATH = path.join(__dirname, '../../data/database.sqlite');
let db = null;
function getDatabase() {
    if (!db) {
        db = new better_sqlite3_1.default(DB_PATH);
        db.pragma('journal_mode = WAL');
    }
    return db;
}
function initializeDatabase() {
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
        const tableInfo = database.prepare(`PRAGMA table_info(transactions)`).all();
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
    }
    catch (error) {
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
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}
//# sourceMappingURL=database.js.map