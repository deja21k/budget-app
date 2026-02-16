export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  is_fixed: number;
  budget_limit: number | null;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  is_fixed?: boolean;
  budget_limit?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: 'income' | 'expense';
  color?: string;
  is_fixed?: boolean;
  budget_limit?: number;
}