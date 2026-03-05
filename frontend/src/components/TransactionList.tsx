import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Receipt,
  X,
  ChevronDown,
  AlertCircle,
  Download,
  Wallet
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import type { Transaction, Category } from '../types';
import { formatCurrency, getCurrentCurrency } from '../utils/defensive';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  initialSearch?: string;
}

interface Filters {
  search: string;
  type: 'all' | 'income' | 'expense';
  category_id: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
}

const DEBOUNCE_DELAY = 300;

const TransactionList = ({ transactions, categories, onEdit, onDelete, initialSearch = '' }: TransactionListProps) => {
  const currency = getCurrentCurrency();
  const [filters, setFilters] = useState<Filters>({
    search: initialSearch,
    type: 'all',
    category_id: '',
    dateRange: 'all',
    startDate: '',
    endDate: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousTransactionsRef = useRef<Transaction[]>([]);
  const isMountedRef = useRef(true);
  const gsapContextRef = useRef<gsap.Context | null>(null);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedSearch(filters.search.toLowerCase().trim());
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMountedRef.current) return;
      
      const target = event.target as Node;
      
      if (menuButtonRef.current?.contains(target)) {
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMountedRef.current) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Cleanup GSAP context on unmount
  useEffect(() => {
    return () => {
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
        gsapContextRef.current = null;
      }
    };
  }, []);

  // Apply filters with debounced search
  const filteredTransactions = transactions.filter((transaction) => {
    if (debouncedSearch) {
      const searchLower = debouncedSearch;
      const matchesSearch = 
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.merchant?.toLowerCase().includes(searchLower) ||
        transaction.category_name?.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.type !== 'all' && transaction.type !== filters.type) return false;

    if (filters.category_id) {
      const categoryId = parseInt(filters.category_id);
      if (isNaN(categoryId) || transaction.category_id !== categoryId) return false;
    }

    if (filters.dateRange !== 'all') {
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (filters.dateRange) {
        case 'today': {
          if (transactionDate.getTime() !== today.getTime()) return false;
          break;
        }
        case 'week': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (transactionDate < weekAgo) return false;
          break;
        }
        case 'month': {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          if (transactionDate < monthAgo) return false;
          break;
        }
        case 'custom':
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (transactionDate < startDate) return false;
          }
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (transactionDate > endDate) return false;
          }
          break;
      }
    }

    return true;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      comparison = dateA - dateB;
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Animate items only when transactions actually change
  useEffect(() => {
    if (!isMountedRef.current) return;

    const hasChanged = 
      previousTransactionsRef.current.length !== transactions.length ||
      transactions.some((t, i) => t.id !== previousTransactionsRef.current[i]?.id);
    
    if (hasChanged && listRef.current) {
      const items = listRef.current.querySelectorAll('.transaction-item');
      
      if (items.length > 0) {
        // Create a GSAP context for proper cleanup
        const ctx = gsap.context(() => {
          gsap.fromTo(
            items,
            { opacity: 0, y: 20 },
            { 
              opacity: 1, 
              y: 0, 
              duration: 0.3, 
              stagger: 0.05, 
              ease: 'power2.out',
              overwrite: true
            }
          );
        }, listRef);
        
        gsapContextRef.current = ctx;
      }
    }
    
    previousTransactionsRef.current = transactions;
  }, [transactions]);

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category_id: '',
      dateRange: 'all',
      startDate: '',
      endDate: '',
    });
    setDebouncedSearch('');
  };

  // Calculate active filter count
  const activeFilterCount = [
    filters.search.trim() !== '',
    filters.type !== 'all',
    filters.category_id !== '',
    filters.dateRange !== 'all'
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      
      if (compareDate.getTime() === today.getTime()) {
        return 'Today';
      } else if (compareDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
    } catch {
      return 'Invalid date';
    }
  };

  const handleDelete = async (id: number) => {
    if (isDeleting !== null || !isMountedRef.current) return;
    
    setIsDeleting(id);
    try {
      await onDelete(id);
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(null);
        setActiveMenu(null);
      }
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setActiveMenu(null);
    onEdit(transaction);
  };

  const toggleMenu = (transactionId: number) => {
    setActiveMenu(activeMenu === transactionId ? null : transactionId);
  };

  return (
    <Card variant="premium" padding="none">
      {/* Filters Header */}
      <div className="p-6 border-b border-slate-100 space-y-5">
        {/* Search and Filter Toggle */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="transaction-search"
              name="transactionSearch"
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="
                w-full pl-11 pr-10 py-2.5 rounded-xl
                bg-slate-50 border border-slate-200
                text-sm text-slate-900 placeholder:text-slate-400
                focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                transition-all duration-200
                hover:border-slate-300
              "
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50/80 rounded-2xl">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <select
                id="filter-type"
                name="filterType"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as Filters['type'] })}
                className="
                  w-full px-4 py-2.5 rounded-xl
                  bg-white border border-slate-200
                  text-sm text-slate-900
                  focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                  transition-all duration-200
                "
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                id="filter-category"
                name="filterCategory"
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                className="
                  w-full px-4 py-2.5 rounded-xl
                  bg-white border border-slate-200
                  text-sm text-slate-900
                  focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                  transition-all duration-200
                "
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
              <select
                id="filter-date-range"
                name="filterDateRange"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as Filters['dateRange'] })}
                className="
                  w-full px-4 py-2.5 rounded-xl
                  bg-white border border-slate-200
                  text-sm text-slate-900
                  focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                  transition-all duration-200
                "
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="w-full"
                disabled={!hasActiveFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                  <input
                    id="filter-start-date"
                    name="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    max={filters.endDate || new Date().toISOString().split('T')[0]}
                    className="
                      w-full px-4 py-2.5 rounded-xl
                      bg-white border border-slate-200
                      text-sm text-slate-900
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                      transition-all duration-200
                    "
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <input
                    id="filter-end-date"
                    name="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    min={filters.startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="
                      w-full px-4 py-2.5 rounded-xl
                      bg-white border border-slate-200
                      text-sm text-slate-900
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                      transition-all duration-200
                    "
                  />
                </div>
                {filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate) && (
                  <div className="col-span-2 text-sm text-danger-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Start date cannot be after end date
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Showing <strong className="text-slate-900">{sortedTransactions.length}</strong> of <strong className="text-slate-900">{transactions.length}</strong> transactions
          </span>
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleSort('date')}
              className={`
                flex items-center gap-2 text-sm font-medium
                transition-colors duration-200
                ${sortField === 'date' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Calendar className="w-4 h-4" />
              Date
              {sortField === 'date' && (
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
              )}
            </button>
            <button
              onClick={() => handleSort('amount')}
              className={`
                flex items-center gap-2 text-sm font-medium
                transition-colors duration-200
                ${sortField === 'amount' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <ArrowUpDown className="w-4 h-4" />
              Amount
              {sortField === 'amount' && (
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div ref={listRef} className="divide-y divide-slate-100">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">No transactions found</h4>
            <p className="text-slate-500 mb-6">
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more results' 
                : 'Start by adding your first transaction'}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              data-transaction-id={transaction.id}
              className="
                transaction-item p-5
                hover:bg-slate-50
                transition-colors duration-200
                group relative
              "
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${transaction.type === 'income'
                      ? 'bg-success-100 text-success-600 group-hover:scale-105'
                      : 'bg-danger-100 text-danger-600 group-hover:scale-105'
                    }
                  `}>
                    {transaction.receipt_image_path ? (
                      <Receipt className="w-5 h-5" strokeWidth={2.5} />
                    ) : (
                      <span className="text-lg font-bold">
                        {transaction.type === 'income' ? '+' : '-'}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">
                        {transaction.description || transaction.merchant || 'Unknown'}
                      </p>
                      {transaction.category_name && (
                        <span 
                          className="px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0"
                          style={{ 
                            backgroundColor: `${transaction.category_color}20`,
                            color: transaction.category_color 
                          }}
                        >
                          {transaction.category_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatDate(transaction.date)}
                      {transaction.merchant && (
                        <>
                          <span className="mx-2 text-slate-300">•</span>
                          {transaction.merchant}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center gap-4">
                  <span className={`
                    font-bold text-lg
                    ${transaction.type === 'income' ? 'text-success-600' : 'text-slate-900'}
                  `}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount, currency)}
                  </span>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button
                      ref={menuButtonRef}
                      onClick={() => toggleMenu(transaction.id)}
                      disabled={isDeleting === transaction.id}
                      className="
                        p-2 rounded-xl
                        text-slate-400 hover:text-slate-600 hover:bg-slate-100
                        transition-colors duration-200
                        opacity-0 group-hover:opacity-100 focus:opacity-100
                        disabled:opacity-50
                      "
                    >
                      {isDeleting === transaction.id ? (
                        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </button>

                    {activeMenu === transaction.id && (
                      <div 
                        ref={menuRef}
                        className="
                          absolute right-0 top-full mt-2 w-44
                          bg-white rounded-xl shadow-lg border border-slate-100
                          py-2 z-50
                        "
                      >
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="
                            w-full flex items-center gap-3 px-4 py-2.5
                            text-sm text-slate-700 hover:bg-slate-50
                            transition-colors duration-200
                          "
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          disabled={isDeleting !== null}
                          className="
                            w-full flex items-center gap-3 px-4 py-2.5
                            text-sm text-danger-600 hover:bg-danger-50
                            transition-colors duration-200
                            disabled:opacity-50
                          "
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting === transaction.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default TransactionList;
