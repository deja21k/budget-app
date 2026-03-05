import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt as ReceiptIcon, 
  ArrowRight, 
  Plus,
  Sparkles,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import { transactionService, receiptService, settingsService } from '../services/api';
import type { Transaction, Receipt as ReceiptType } from '../types';
import { formatCurrency, getCurrentCurrency } from '../utils/defensive';

const Dashboard = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_amount: 0,
    transaction_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    income: 0,
    expense: 0,
    change: { income: 0, expense: 0 },
  });
  
  const settings = settingsService.getSettings();
  const monthlyBudget = settings.monthlyBudget || 5000;

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Cancel any pending requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        transactionsData,
        receiptsData,
        summaryData,
        thisMonthSummary,
        lastMonthSummary,
      ] = await Promise.all([
        transactionService.getTransactions({ limit: 5 }),
        receiptService.getReceipts(),
        transactionService.getSummary(),
        transactionService.getSummary(startOfMonth.toISOString().split('T')[0]),
        transactionService.getSummary(
          startOfLastMonth.toISOString().split('T')[0],
          endOfLastMonth.toISOString().split('T')[0]
        ),
      ]);

      if (!isMountedRef.current) return;

      setTransactions(transactionsData);
      setReceipts(receiptsData);
      setSummary(summaryData);

      // Calculate monthly stats and changes
      const thisMonthIncome = thisMonthSummary.total_income;
      const thisMonthExpense = thisMonthSummary.total_expense;
      const lastMonthIncome = lastMonthSummary.total_income;
      const lastMonthExpense = lastMonthSummary.total_expense;

      setMonthlyStats({
        income: thisMonthIncome,
        expense: thisMonthExpense,
        change: {
          income: lastMonthIncome > 0 
            ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 
            : 0,
          expense: lastMonthExpense > 0 
            ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 
            : 0,
        },
      });
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Failed to load dashboard data:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Get current currency
  const currency = getCurrentCurrency();

  // Premium stats cards data
  const stats = [
    {
      title: 'Total Balance',
      amount: formatCurrency(summary.net_amount, currency),
      change: `${monthlyStats.change.income >= 0 ? '+' : ''}${monthlyStats.change.income.toFixed(1)}%`,
      isPositive: monthlyStats.change.income >= 0,
      icon: Wallet,
      gradient: 'from-primary-500 to-accent-500',
      bgGradient: 'from-primary-50 to-accent-50',
    },
    {
      title: 'This Month Income',
      amount: formatCurrency(monthlyStats.income, currency),
      change: `${monthlyStats.change.income >= 0 ? '+' : ''}${monthlyStats.change.income.toFixed(1)}%`,
      isPositive: monthlyStats.change.income >= 0,
      icon: TrendingUp,
      gradient: 'from-success-500 to-emerald-400',
      bgGradient: 'from-success-50 to-emerald-50',
    },
    {
      title: 'This Month Expenses',
      amount: formatCurrency(monthlyStats.expense, currency),
      change: `${monthlyStats.change.expense >= 0 ? '+' : ''}${monthlyStats.change.expense.toFixed(1)}%`,
      isPositive: monthlyStats.change.expense < 0,
      icon: TrendingDown,
      gradient: 'from-danger-500 to-rose-400',
      bgGradient: 'from-danger-50 to-rose-50',
    },
    {
      title: 'Pending Receipts',
      amount: receipts.filter(r => r.status === 'processing').length.toString(),
      change: `${receipts.length} total`,
      isPositive: true,
      icon: ReceiptIcon,
      gradient: 'from-warning-500 to-amber-400',
      bgGradient: 'from-warning-50 to-amber-50',
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <PageTransition>
      <div className="page-container pb-24 lg:pb-8">
        {/* Premium Welcome Section */}
        <div className="mb-10 animate-item">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-primary-600">Welcome back</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                Dashboard
              </h1>
              <p className="text-slate-500">
                Here's what's happening with your finances today.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate('/transactions')}
                leftIcon={<Plus className="w-4 h-4" />}
                data-testid="add-transaction-btn"
              >
                Add Transaction
              </Button>
              <Button
                onClick={() => navigate('/receipts')}
                leftIcon={<ReceiptIcon className="w-4 h-4" />}
                data-testid="scan-receipt-btn"
              >
                Scan Receipt
              </Button>
            </div>
          </div>
        </div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="stat-card group cursor-pointer"
                hover
                hoverScale
                onClick={() => navigate('/transactions')}
                data-testid={index === 0 ? 'dashboard-balance' : undefined}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-2">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mb-2" data-testid={index === 0 ? 'balance-amount' : undefined}>
                      {isLoading ? (
                        <span className="inline-block w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
                      ) : (
                        stat.amount
                      )}
                    </p>
                    {!isLoading && (
                      <div className="flex items-center gap-2">
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                          ${stat.isPositive 
                            ? 'bg-success-100 text-success-700' 
                            : 'bg-danger-100 text-danger-700'
                          }
                        `}>
                          {stat.change}
                        </span>
                        <span className="text-xs text-slate-400">from last month</span>
                      </div>
                    )}
                  </div>
                  <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center
                    bg-gradient-to-br ${stat.bgGradient}
                    group-hover:scale-110 transition-transform duration-300
                  `}>
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      bg-gradient-to-br ${stat.gradient}
                      shadow-lg
                    `}>
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Premium Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 animate-item">
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Your latest financial activity">Recent Transactions</CardTitle>}
                action={
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/transactions')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    View All
                  </Button>
                }
              />

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/3" />
                        <div className="h-3 bg-slate-200 rounded w-1/4" />
                      </div>
                      <div className="h-5 bg-slate-200 rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    No transactions yet
                  </h4>
                  <p className="text-slate-500 mb-6">
                    Start tracking your finances by adding your first transaction
                  </p>
                  <Button onClick={() => navigate('/transactions')}>
                    Add Transaction
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="
                        flex items-center justify-between p-4 rounded-xl
                        bg-slate-50/50 hover:bg-slate-100 
                        transition-all duration-300 ease-premium
                        cursor-pointer group
                        border border-transparent hover:border-slate-200
                      "
                      onClick={() => navigate('/transactions')}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          ${transaction.type === 'income'
                            ? 'bg-success-100 text-success-600'
                            : 'bg-danger-100 text-danger-600'
                          }
                          group-hover:scale-110 transition-transform duration-300
                        `}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
                          ) : (
                            <TrendingDown className="w-5 h-5" strokeWidth={2.5} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {transaction.description || transaction.merchant || 'Unknown'}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-2">
                            {transaction.category_name && (
                              <>
                                <span 
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{ backgroundColor: transaction.category_color }}
                                />
                                {transaction.category_name}
                                <span className="text-slate-300">•</span>
                              </>
                            )}
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`
                          font-bold text-lg
                          ${transaction.type === 'income' ? 'text-success-600' : 'text-slate-900'}
                        `}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount, currency)}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Premium Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="animate-item" variant="premium" padding="lg">
              <CardHeader title={<CardTitle>Quick Actions</CardTitle>} />
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  leftIcon={<ReceiptIcon className="w-4 h-4" />}
                  onClick={() => navigate('/receipts')}
                >
                  Scan Receipt
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start" 
                  leftIcon={<TrendingUp className="w-4 h-4" />}
                  onClick={() => navigate('/transactions')}
                >
                  Add Income
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start" 
                  leftIcon={<TrendingDown className="w-4 h-4" />}
                  onClick={() => navigate('/transactions')}
                >
                  Add Expense
                </Button>
              </div>
            </Card>

            {/* Monthly Budget */}
            <Card className="animate-item" variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Track your spending progress">Monthly Budget</CardTitle>}
              />
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-slate-600">Spent</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(monthlyStats.expense, currency)} <span className="text-slate-400 font-normal">/ {formatCurrency(monthlyBudget, currency)}</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-premium"
                      style={{ 
                        width: `${Math.min((monthlyStats.expense / monthlyBudget) * 100, 100)}%`,
                        background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-slate-500">
                      {((monthlyStats.expense / monthlyBudget) * 100).toFixed(1)}% of monthly budget
                    </p>
                    <span className={`
                      text-xs font-semibold px-2 py-1 rounded-full
                      ${monthlyStats.expense > monthlyBudget * 0.8 
                        ? 'bg-warning-100 text-warning-700' 
                        : 'bg-success-100 text-success-700'
                      }
                    `}>
                      {monthlyStats.expense > monthlyBudget * 0.8 ? 'Getting Close' : 'On Track'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Remaining</span>
                    <span className="font-bold text-2xl text-slate-900">
                      {formatCurrency(Math.max(monthlyBudget - monthlyStats.expense, 0), currency)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recent Receipts */}
            <Card className="animate-item" variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle>Recent Scans</CardTitle>}
                action={
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/receipts')}
                  >
                    View All
                  </Button>
                }
              />
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-2/3" />
                        <div className="h-2 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-8">
                  <ReceiptIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No receipts scanned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.slice(0, 3).map((receipt) => (
                    <div 
                      key={receipt.id}
                      className="
                        flex items-center gap-4 p-3 rounded-xl
                        bg-slate-50 hover:bg-slate-100 
                        transition-all duration-300 ease-premium
                        cursor-pointer group
                      "
                      onClick={() => navigate('/receipts')}
                    >
                      <div className="
                        w-12 h-12 rounded-xl 
                        bg-gradient-to-br from-slate-100 to-slate-50
                        flex items-center justify-center
                        border border-slate-200
                        group-hover:scale-110 transition-transform duration-300
                      ">
                        <ReceiptIcon className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {receipt.extracted_merchant || 'Unknown Store'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(receipt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {receipt.extracted_amount && (
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(receipt.extracted_amount, currency)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
