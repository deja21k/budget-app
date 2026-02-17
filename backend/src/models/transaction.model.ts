export interface TransactionItem {
  id: number;
  transaction_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CreateTransactionItemInput {
  name: string;
  quantity?: number;
  unit_price: number;
  total_price?: number;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  description: string | null;
  merchant: string | null;
  date: string;
  receipt_image_path: string | null;
  ocr_confidence: number | null;
  is_recurring: number;
  recurring_frequency: 'weekly' | 'monthly' | 'yearly' | null;
  regret_flag: 'yes' | 'neutral' | 'regret';
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other' | null;
  created_at: string;
  updated_at: string;
  items?: TransactionItem[];
}

export interface CreateTransactionInput {
  type: 'income' | 'expense';
  amount: number;
  category_id?: number;
  description?: string;
  merchant?: string;
  date: string;
  receipt_image_path?: string;
  ocr_confidence?: number;
  is_recurring?: boolean;
  recurring_frequency?: 'weekly' | 'monthly' | 'yearly';
  regret_flag?: 'yes' | 'neutral' | 'regret';
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other';
  items?: CreateTransactionItemInput[];
}

export interface UpdateTransactionInput {
  type?: 'income' | 'expense';
  amount?: number;
  category_id?: number | null;
  description?: string;
  merchant?: string;
  date?: string;
  receipt_image_path?: string;
  ocr_confidence?: number;
  is_recurring?: boolean;
  recurring_frequency?: 'weekly' | 'monthly' | 'yearly' | null;
  regret_flag?: 'yes' | 'neutral' | 'regret';
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other' | null;
  items?: CreateTransactionItemInput[];
}

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category_id?: number;
  start_date?: string;
  end_date?: string;
  merchant?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  net_amount: number;
  transaction_count: number;
}