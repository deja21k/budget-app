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
}

export interface OCRResult {
  success: boolean;
  receipt_id?: number;
  image_url?: string;
  extracted_data?: {
    store_name: string | null;
    date: string | null;
    total: number | null;
    subtotal: number | null;
    tax: number | null;
    line_items: Array<{
      description: string;
      price: number | null;
    }>;
    currency: string | null;
    fiscal_code: string | null;
    pib: string | null;
  };
  confidence?: number;
  processing_time?: number;
  warnings?: string[];
  raw_text_preview?: string;
  error?: string;
}

export interface Receipt {
  id: number;
  transaction_id: number | null;
  image_path: string;
  ocr_text: string | null;
  ocr_confidence: number | null;
  extracted_merchant: string | null;
  extracted_amount: number | null;
  extracted_date: string | null;
  status: 'processing' | 'processed' | 'failed';
  created_at: string;
  image_url?: string;
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
  recurring_frequency?: 'weekly' | 'monthly' | 'yearly' | null;
  regret_flag: 'yes' | 'neutral' | 'regret';
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other' | null;
  created_at: string;
  updated_at?: string;
  items?: TransactionItem[];
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export interface SpendingInsight {
  type: 'warning' | 'tip' | 'success' | 'info';
  category: string;
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction?: string;
  data?: Record<string, unknown>;
}

export interface CategorySpending {
  category_id: number;
  category_name: string;
  category_color: string;
  total_amount: number;
  transaction_count: number;
  percentage_of_income: number;
  percentage_of_expenses: number;
  avg_transaction_amount: number;
  budget_limit?: number;
  is_over_budget: boolean;
}

export interface TimePattern {
  day_of_week: number;
  day_name: string;
  total_spent: number;
  transaction_count: number;
  avg_amount: number;
}

export interface RepeatedExpense {
  merchant: string;
  category_name: string;
  count: number;
  total_amount: number;
  avg_amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  last_date: string;
  estimated_monthly_cost: number;
  is_small_repeat: boolean;
}

export interface RegretAnalysis {
  total_regretted: number;
  total_yes: number;
  total_neutral: number;
  percentage_regretted: number;
  top_regretted_categories: Array<{
    category_name: string;
    amount: number;
    count: number;
  }>;
  top_regretted_merchants: Array<{
    merchant: string;
    amount: number;
    count: number;
  }>;
}

export interface SpendingAnalysis {
  period_start: string;
  period_end: string;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  category_spending: CategorySpending[];
  time_patterns: TimePattern[];
  repeated_expenses: RepeatedExpense[];
  regret_analysis: RegretAnalysis;
  insights: SpendingInsight[];
  summary_text: string;
}

export interface AppSettings {
  currency: string;
  timezone: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  monthlyBudget: number;
  notifications: {
    budgetAlerts: boolean;
    weeklySummary: boolean;
    recurringReminders: boolean;
    featureUpdates: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    autoBackup: boolean;
  };
}

export interface DatabaseStats {
  categories: number;
  transactions: number;
  receipts: number;
  totalIncome: number;
  totalExpenses: number;
  databaseSize: string;
}

export interface ExportData {
  exported_at: string;
  version: string;
  categories: Category[];
  transactions: Transaction[];
  receipts: Receipt[];
}

export interface Account {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  isActive: boolean;
}

export interface AccountsState {
  accounts: Account[];
  currentAccountId: string | null;
}

export interface ShoppingListItem {
  id: number;
  name: string;
  price: number;
  actual_price?: number | null;
  quantity: number;
  is_completed: number;
  importance: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateShoppingListItemInput {
  name: string;
  price: number;
  quantity?: number;
  importance?: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
}

export interface ShoppingListSummary {
  total_items: number;
  completed_items: number;
  pending_items: number;
  total_price: number;
  completed_price: number;
  pending_price: number;
  by_importance: {
    high: { count: number; price: number };
    medium: { count: number; price: number };
    low: { count: number; price: number };
  };
}

export interface SpendingPrediction {
  estimated_total: number;
  predicted_completed_total: number;
  budget_remaining: number;
  is_over_budget: boolean;
  recommendation: string;
}