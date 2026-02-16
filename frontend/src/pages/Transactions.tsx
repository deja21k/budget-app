import { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, TrendingUp, TrendingDown, DollarSign, Calendar, Wallet } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import PageTransition from '../components/layout/PageTransition';
import { transactionService, categoryService } from '../services/api';
import type { Transaction, Category } from '../types';
import { formatCurrency, getCurrentCurrency } from '../utils/defensive';

const Transactions = () => {
  const currency = getCurrentCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_amount: 0,
    transaction_count: 0,
  });

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    if (isMountedRef.current) setIsLoading(true);
    try {
      const [transactionsData, categoriesData, summaryData] = await Promise.all([
        transactionService.getTransactions(),
        categoryService.getCategories(),
        transactionService.getSummary(),
      ]);

      if (!isMountedRef.current) return;

      setTransactions(transactionsData);
      setCategories(categoriesData);
      setSummary(summaryData);
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Failed to load data:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const element = document.querySelector(`[data-transaction-id="${id}"]`);
    
    try {
      await transactionService.deleteTransaction(id);
      
      // Animate removal only if element exists and component is mounted
      if (element && isMountedRef.current) {
        gsap.to(element, {
          opacity: 0,
          x: -50,
          duration: 0.3,
          onComplete: () => {
            if (isMountedRef.current) {
              loadData();
            }
          },
        });
      } else if (isMountedRef.current) {
        loadData();
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Failed to delete transaction:', error);
        alert('Failed to delete transaction. Please try again.');
      }
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadData();
  };

  // Calculate this month's stats
  const thisMonthStats = (() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = transactions.filter(
      t => new Date(t.date) >= startOfMonth
    );

    return {
      income: thisMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expense: thisMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  })();

  // Stats cards data
  const stats = [
    {
      title: 'Total Balance',
      amount: summary.net_amount,
      icon: DollarSign,
      gradient: 'from-primary-500 to-accent-500',
      bgGradient: 'from-primary-50 to-accent-50',
      color: 'text-slate-900',
    },
    {
      title: 'This Month Income',
      amount: thisMonthStats.income,
      icon: TrendingUp,
      gradient: 'from-success-500 to-emerald-400',
      bgGradient: 'from-success-50 to-emerald-50',
      color: 'text-success-600',
      prefix: '+',
    },
    {
      title: 'This Month Expenses',
      amount: thisMonthStats.expense,
      icon: TrendingDown,
      gradient: 'from-danger-500 to-rose-400',
      bgGradient: 'from-danger-50 to-rose-50',
      color: 'text-danger-600',
      prefix: '-',
    },
    {
      title: 'Total Transactions',
      amount: summary.transaction_count,
      icon: Calendar,
      gradient: 'from-slate-500 to-slate-400',
      bgGradient: 'from-slate-100 to-slate-50',
      color: 'text-slate-900',
      isCount: true,
    },
  ];

  return (
    <PageTransition>
      <div className="page-container pb-24 lg:pb-8">
        {/* Premium Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10 animate-item">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary-500" />
              <span className="text-sm font-medium text-primary-600">Finance Management</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Transactions</h1>
            <p className="text-slate-500">
              Manage your income and expenses
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={loadData}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Button
              onClick={handleAddNew}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="animate-item group"
                variant="premium"
                hover
                hoverScale
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.prefix && stat.prefix}
                      {stat.isCount ? (
                        stat.amount
                      ) : (
                        formatCurrency(stat.amount, currency)
                      )}
                    </p>
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

        {/* Premium Transaction List */}
        <div className="animate-item">
          {isLoading ? (
            <Card variant="premium" padding="lg">
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                    </div>
                    <div className="h-5 bg-slate-200 rounded w-20" />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <TransactionList
              transactions={transactions}
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Premium Transaction Form Modal */}
        <TransactionForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
          onSuccess={handleFormSuccess}
          transaction={editingTransaction}
        />
      </div>
    </PageTransition>
  );
};

export default Transactions;
