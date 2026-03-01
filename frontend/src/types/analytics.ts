/**
 * Analytics Types for Dashboard
 * Comprehensive type definitions for analytics data visualization
 */

import type { Transaction } from './index';

// Date range filter options
export type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'custom';

// Analytics filter state
export interface AnalyticsFilters {
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
  categories?: number[];
  merchants?: string[];
  transactionType?: 'all' | 'income' | 'expense';
}

// Spending by category for charts
export interface SpendingByCategory {
  name: string;
  value: number;
  color: string;
  percentage: number;
  transactionCount: number;
}

// Daily/weekly spending trend data
export interface TrendDataPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

// Monthly income vs expense comparison
export interface MonthlyComparison {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
}

// Category comparison for horizontal bar chart
export interface CategoryComparison {
  name: string;
  amount: number;
  budget?: number;
  percentageOfBudget: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

// Premium metrics insights
export interface PremiumMetrics {
  topMerchant: {
    name: string;
    amount: number;
    transactionCount: number;
  } | null;
  mostExpensiveDay: {
    date: string;
    amount: number;
    transactions: number;
  } | null;
  averageDailySpend: number;
  budgetUtilization: BudgetUtilization[];
  savingsRate: number;
  projectedMonthlyExpense: number;
  spendingVelocity: number; // Daily average compared to last period
}

// Budget usage per category
export interface BudgetUtilization {
  categoryId: number;
  categoryName: string;
  spent: number;
  budget: number;
  percentage: number;
  color: string;
  status: 'under' | 'near' | 'over';
}

// Analytics summary stats
export interface AnalyticsSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  averageTransactionAmount: number;
  topCategory: SpendingByCategory | null;
  periodChange: {
    income: number; // percentage change
    expense: number;
    net: number;
  };
}

// Drill-down detail for chart interactions
export interface DrillDownData {
  category?: string;
  dateRange?: { start: string; end: string };
  merchant?: string;
  transactions: Transaction[];
  totalAmount: number;
}

// Chart animation config
export interface ChartAnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

// Tooltip data for charts
export interface ChartTooltipData {
  name: string;
  value: number;
  percentage?: number;
  additionalInfo?: Record<string, string | number>;
}

// Time series data for line/area charts
export interface TimeSeriesData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
    type: 'line' | 'bar' | 'area';
  }[];
}

// Complete analytics data package
export interface AnalyticsData {
  summary: AnalyticsSummary;
  spendingByCategory: SpendingByCategory[];
  trendData: TrendDataPoint[];
  monthlyComparison: MonthlyComparison[];
  categoryComparison: CategoryComparison[];
  premiumMetrics: PremiumMetrics;
  transactions: Transaction[];
  dateRange: {
    start: string;
    end: string;
  };
}
