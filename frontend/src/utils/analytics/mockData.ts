/**
 * Mock Analytics Data Generator
 * Generates realistic mock data for testing the Analytics Dashboard
 */

import type {
  AnalyticsData,
  SpendingByCategory,
  TrendDataPoint,
  MonthlyComparison,
  CategoryComparison,
  PremiumMetrics,
  BudgetUtilization,
  AnalyticsSummary,
} from '../../types/analytics';
import type { Transaction } from '../../types';

// Category definitions with colors
const CATEGORIES = [
  { name: 'Food & Dining', color: '#f43f5e', budget: 15000 },
  { name: 'Transportation', color: '#f59e0b', budget: 8000 },
  { name: 'Shopping', color: '#8b5cf6', budget: 12000 },
  { name: 'Bills & Utilities', color: '#3b82f6', budget: 20000 },
  { name: 'Entertainment', color: '#ec4899', budget: 5000 },
  { name: 'Healthcare', color: '#10b981', budget: 6000 },
  { name: 'Education', color: '#6366f1', budget: 10000 },
  { name: 'Other', color: '#64748b', budget: 3000 },
];

// Generate random transactions
const generateMockTransactions = (count: number, startDate: Date, endDate: Date): Transaction[] => {
  const transactions: Transaction[] = [];
  const merchants = [
    'Maxi', 'Univerexport', 'Lidl', 'Shell', 'OMV', 'Usce Shopping Center',
    'Telekom Srbija', 'Netflix', 'Spotify', 'DM', 'Benu Apoteka',
    'Stark Arena', 'Walter', 'Kafana Question Mark', 'KFC', 'McDonald\'s',
    'Super Maxi', 'Gomex', 'Aman', 'Roda', 'IDEA', 'Tempo'
  ];

  for (let i = 0; i < count; i++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const isExpense = Math.random() > 0.3; // 70% expenses, 30% income
    
    transactions.push({
      id: i + 1,
      type: isExpense ? 'expense' : 'income',
      amount: isExpense 
        ? Math.round(Math.random() * 5000 + 500) // Expenses: 500-5500
        : Math.round(Math.random() * 50000 + 10000), // Income: 10000-60000
      category_id: CATEGORIES.indexOf(category) + 1,
      category_name: category.name,
      category_color: category.color,
      description: isExpense 
        ? `Purchase at ${merchants[Math.floor(Math.random() * merchants.length)]}` 
        : 'Salary/Income',
      merchant: isExpense ? merchants[Math.floor(Math.random() * merchants.length)] : null,
      date: randomDate.toISOString().split('T')[0],
      receipt_image_path: null,
      ocr_confidence: null,
      is_recurring: Math.random() > 0.9 ? 1 : 0,
      recurring_frequency: null,
      regret_flag: Math.random() > 0.85 ? 'regret' : Math.random() > 0.7 ? 'neutral' : 'yes',
      payment_method: ['cash', 'card', 'digital_wallet'][Math.floor(Math.random() * 3)] as any,
      created_at: randomDate.toISOString(),
    });
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Generate spending by category
const generateSpendingByCategory = (transactions: Transaction[]): SpendingByCategory[] => {
  const categoryMap = new Map<string, { value: number; count: number; color: string }>();

  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const catName = t.category_name || 'Other';
      const existing = categoryMap.get(catName) || { value: 0, count: 0, color: t.category_color || '#64748b' };
      existing.value += t.amount;
      existing.count += 1;
      categoryMap.set(catName, existing);
    });

  const totalExpense = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.value, 0);

  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      value: data.value,
      color: data.color,
      percentage: totalExpense > 0 ? (data.value / totalExpense) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.value - a.value);
};

// Generate trend data
const generateTrendData = (transactions: Transaction[], days: number): TrendDataPoint[] => {
  const endDate = new Date();
  const data: TrendDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    data.push({
      date: dateStr,
      label,
      income,
      expense,
      net: income - expense,
    });
  }

  return data;
};

// Generate monthly comparison
const generateMonthlyComparison = (transactions: Transaction[]): MonthlyComparison[] => {
  const monthlyMap = new Map<string, { income: number; expense: number; label: string }>();

  transactions.forEach(t => {
    const date = new Date(t.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    const existing = monthlyMap.get(key) || { income: 0, expense: 0, label: label };
    if (t.type === 'income') {
      existing.income += t.amount;
    } else {
      existing.expense += t.amount;
    }
    monthlyMap.set(key, existing);
  });

  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6) // Last 6 months
    .map(([key, data]) => {
      const savings = data.income - data.expense;
      return {
        month: key,
        label: data.label,
        income: data.income,
        expense: data.expense,
        savings,
        savingsRate: data.income > 0 ? (savings / data.income) * 100 : 0,
      };
    });
};

// Generate category comparison
const generateCategoryComparison = (transactions: Transaction[]): CategoryComparison[] => {
  const categoryMap = new Map<string, { amount: number; budget: number; color: string }>();

  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const catName = t.category_name || 'Other';
      const catDef = CATEGORIES.find(c => c.name === catName) || CATEGORIES[7];
      const existing = categoryMap.get(catName) || { amount: 0, budget: catDef.budget, color: catDef.color };
      existing.amount += t.amount;
      categoryMap.set(catName, existing);
    });

  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      budget: data.budget,
      percentageOfBudget: data.budget > 0 ? (data.amount / data.budget) * 100 : 0,
      color: data.color,
      trend: (Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      trendPercentage: Math.random() * 20,
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Generate premium metrics
const generatePremiumMetrics = (transactions: Transaction[]): PremiumMetrics => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');

  // Top merchant
  const merchantMap = new Map<string, { amount: number; count: number }>();
  expenses.forEach(t => {
    if (t.merchant) {
      const existing = merchantMap.get(t.merchant) || { amount: 0, count: 0 };
      existing.amount += t.amount;
      existing.count += 1;
      merchantMap.set(t.merchant, existing);
    }
  });
  const topMerchantEntry = Array.from(merchantMap.entries()).sort((a, b) => b[1].amount - a[1].amount)[0];

  // Most expensive day
  const dayMap = new Map<string, { amount: number; transactions: number }>();
  expenses.forEach(t => {
    const existing = dayMap.get(t.date) || { amount: 0, transactions: 0 };
    existing.amount += t.amount;
    existing.transactions += 1;
    dayMap.set(t.date, existing);
  });
  const mostExpensiveDayEntry = Array.from(dayMap.entries()).sort((a, b) => b[1].amount - a[1].amount)[0];

  // Average daily spend
  const uniqueDays = new Set(expenses.map(t => t.date)).size;
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const avgDailySpend = uniqueDays > 0 ? totalExpense / uniqueDays : 0;

  // Budget utilization
  const budgetUtilization: BudgetUtilization[] = CATEGORIES.map((cat, index) => {
    const spent = expenses
      .filter(t => t.category_name === cat.name)
      .reduce((sum, t) => sum + t.amount, 0);
    const percentage = cat.budget > 0 ? (spent / cat.budget) * 100 : 0;
    
    return {
      categoryId: index + 1,
      categoryName: cat.name,
      spent,
      budget: cat.budget,
      percentage,
      color: cat.color,
      status: (percentage > 100 ? 'over' : percentage > 80 ? 'near' : 'under') as 'under' | 'near' | 'over',
    };
  }).filter(b => b.spent > 0);

  // Savings rate
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Projected monthly expense (simple projection based on daily average)
  const projectedMonthlyExpense = avgDailySpend * 30;

  // Spending velocity (randomized for demo)
  const spendingVelocity = (Math.random() - 0.5) * 40;

  return {
    topMerchant: topMerchantEntry ? {
      name: topMerchantEntry[0],
      amount: topMerchantEntry[1].amount,
      transactionCount: topMerchantEntry[1].count,
    } : null,
    mostExpensiveDay: mostExpensiveDayEntry ? {
      date: mostExpensiveDayEntry[0],
      amount: mostExpensiveDayEntry[1].amount,
      transactions: mostExpensiveDayEntry[1].transactions,
    } : null,
    averageDailySpend: avgDailySpend,
    budgetUtilization,
    savingsRate,
    projectedMonthlyExpense,
    spendingVelocity,
  };
};

// Generate analytics summary
const generateAnalyticsSummary = (transactions: Transaction[], previousPeriodTransactions: Transaction[]): AnalyticsSummary => {
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const prevIncome = previousPeriodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const prevExpense = previousPeriodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const spendingByCategory = generateSpendingByCategory(transactions);

  return {
    totalIncome: income,
    totalExpense: expense,
    netAmount: income - expense,
    transactionCount: transactions.length,
    averageTransactionAmount: transactions.length > 0 
      ? (income + expense) / transactions.length 
      : 0,
    topCategory: spendingByCategory[0] || null,
    periodChange: {
      income: prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0,
      expense: prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0,
      net: (prevIncome - prevExpense) !== 0 
        ? (((income - expense) - (prevIncome - prevExpense)) / Math.abs(prevIncome - prevExpense)) * 100 
        : 0,
    },
  };
};

// Main function to generate complete mock analytics data
export const generateMockAnalyticsData = (dateRange: { start: string; end: string }): AnalyticsData => {
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate transactions
  const transactionCount = Math.min(Math.max(daysDiff * 3, 50), 500);
  const transactions = generateMockTransactions(transactionCount, startDate, endDate);

  // Generate previous period data for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const previousPeriodTransactions = generateMockTransactions(Math.floor(transactionCount * 0.9), prevStartDate, prevEndDate);

  return {
    summary: generateAnalyticsSummary(transactions, previousPeriodTransactions),
    spendingByCategory: generateSpendingByCategory(transactions),
    trendData: generateTrendData(transactions, Math.min(daysDiff, 30)),
    monthlyComparison: generateMonthlyComparison(transactions),
    categoryComparison: generateCategoryComparison(transactions),
    premiumMetrics: generatePremiumMetrics(transactions),
    transactions,
    dateRange,
  };
};

// Generate date range based on preset
export const getDateRangeForPreset = (preset: 'week' | 'month' | 'quarter' | 'year'): { start: string; end: string } => {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setDate(end.getDate() - 30);
      break;
    case 'quarter':
      start.setDate(end.getDate() - 90);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export default generateMockAnalyticsData;
