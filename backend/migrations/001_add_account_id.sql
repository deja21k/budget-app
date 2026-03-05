-- Migration: 001_add_account_id.sql
-- Description: Add multi-account support to transaction_items table
-- Date: 2026-03-05

-- Add account_id column to transaction_items (not breaking - uses default)
ALTER TABLE transaction_items ADD COLUMN account_id INTEGER DEFAULT 1 REFERENCES accounts(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transaction_items_account ON transaction_items(account_id);
