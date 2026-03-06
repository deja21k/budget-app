-- Migration: 002_add_account_id_to_shopping_list.sql
-- Description: Add multi-account support to shopping_list table
-- Date: 2026-03-05

ALTER TABLE shopping_list ADD COLUMN account_id INTEGER DEFAULT 1 REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_account ON shopping_list(account_id);
