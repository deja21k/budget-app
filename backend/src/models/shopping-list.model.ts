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
  updated_at: string;
}

export interface CreateShoppingListItemInput {
  name: string;
  price: number;
  quantity?: number;
  importance?: 'high' | 'medium' | 'low';
  category?: string;
  notes?: string;
}

export interface UpdateShoppingListItemInput {
  name?: string;
  price?: number;
  actual_price?: number | null;
  quantity?: number;
  is_completed?: boolean;
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
