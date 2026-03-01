/**
 * Analytics Dashboard Page
 * Comprehensive analytics view with charts, filters, and insights
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  Target,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import { 
  SpendingDonutChart,
  TrendLineChart,
  IncomeExpenseBarChart,
  CategoryHorizontalBarChart,
  DateRangeSelector,
  PremiumMetricsCards,
  BudgetUsageBars,
} from '../components/analytics';
import { useAnalytics, getTrendColor, formatTrend } from '../utils/analytics';
import type { DateRange, SpendingByCategory, CategoryComparison } from '../types/analytics';
import { formatCurrency, getCurrentCurrency } from '../utils/defensive';

const Analytics = () => {
  const navigate = useNavigate();
  const currency = getCurrentCurrency();
  const { data, isLoading, error, filters, setFilters, refresh } = useAnalytics('month');
  
  // Refs for animation
  const headerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const gsapContextRef = useRef<gsap.Context | null>(null);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange, startDate?: string, endDate?: string) => {
    setFilters((prev: { dateRange: DateRange; startDate?: string; endDate?: string }) => ({
      ...prev,
      dateRange: range,
      startDate: startDate || prev.startDate,
      endDate: endDate || prev.endDate,
    }));
  };

  // Handle chart click - drill down
  const handleCategoryClick = (category: SpendingByCategory | CategoryComparison) => {
    // Navigate to transactions with category filter
    const categoryName = category.name;
    navigate(`/transactions?category=${encodeURIComponent(categoryName)}`);
  };

  // Page load animation
  useEffect(() => {
    if (!isLoading && data) {
      // Clean up previous GSAP context
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
      }

      const ctx = gsap.context(() => {
        const sections = [
          headerRef.current,
          summaryRef.current,
          chartsRef.current,
          metricsRef.current,
        ].filter(Boolean);

        gsap.fromTo(
          sections,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
          }
        );
      });

      gsapContextRef.current = ctx;
    }

    return () => {
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
      }
    };
  }, [isLoading, data]);

  if (error) {
    return (
      <PageTransition>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md" variant="premium" padding="xl">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-danger-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Analytics</h3>
              <p className="text-slate-500 mb-6">{error}</p>
              <Button onClick={refresh} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const summary = data?.summary;

  return (
    <PageTransition>
      <div className="page-container pb-24 lg:pb-8 space-y-8">
        {/* Premium Header */}
        <div ref={headerRef} className="opacity-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-primary-600">Analytics</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                Financial Dashboard
              </h1>
              <p className="text-slate-500">
                Track your spending patterns, income trends, and financial health.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <DateRangeSelector
                value={filters.dateRange}
                onChange={handleDateRangeChange}
                customStartDate={filters.startDate}
                customEndDate={filters.endDate}
              />
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
                onClick={refresh}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div ref={summaryRef} className="opacity-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Income */}
            <Card hover padding="lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Income</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {isLoading ? (
                      <span className="inline-block w-24 h-8 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      formatCurrency(summary?.totalIncome || 0, currency)
                    )}
                  </p>
                  {!isLoading && summary && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(summary.periodChange.income, 'income')}`}>
                      {summary.periodChange.income >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span className="font-semibold">{formatTrend(summary.periodChange.income)}</span>
                      <span className="text-slate-400 font-normal">vs last period</span>
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success-600" />
                </div>
              </div>
            </Card>

            {/* Total Expense */}
            <Card hover padding="lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {isLoading ? (
                      <span className="inline-block w-24 h-8 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      formatCurrency(summary?.totalExpense || 0, currency)
                    )}
                  </p>
                  {!isLoading && summary && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(-summary.periodChange.expense, 'expense')}`}>
                      {summary.periodChange.expense <= 0 ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      <span className="font-semibold">{formatTrend(summary.periodChange.expense)}</span>
                      <span className="text-slate-400 font-normal">vs last period</span>
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-danger-50 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-danger-600" />
                </div>
              </div>
            </Card>

            {/* Net Balance */}
            <Card hover padding="lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Net Balance</p>
                  <p className={`text-2xl font-bold ${summary && summary.netAmount >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {isLoading ? (
                      <span className="inline-block w-24 h-8 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      formatCurrency(summary?.netAmount || 0, currency)
                    )}
                  </p>
                  {!isLoading && summary && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(summary.periodChange.net)}`}>
                      {summary.periodChange.net >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span className="font-semibold">{formatTrend(summary.periodChange.net)}</span>
                      <span className="text-slate-400 font-normal">vs last period</span>
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </Card>

            {/* Top Category */}
            <Card hover padding="lg">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 mb-1">Top Category</p>
                  {isLoading ? (
                    <span className="inline-block w-24 h-8 bg-slate-200 rounded animate-pulse" />
                  ) : summary?.topCategory ? (
                    <>
                      <p className="text-lg font-bold text-slate-900 truncate">
                        {summary.topCategory.name}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {summary.topCategory.percentage.toFixed(1)}% of spending
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-slate-900">No data</p>
                  )}
                </div>
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: summary?.topCategory ? `${summary.topCategory.color}20` : '#f1f5f9' }}
                >
                  <PieChart 
                    className="w-6 h-6" 
                    style={{ color: summary?.topCategory?.color || '#64748b' }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Premium Metrics */}
        <div ref={metricsRef} className="opacity-0">
          <PremiumMetricsCards 
            metrics={data?.premiumMetrics || {
              topMerchant: null,
              mostExpensiveDay: null,
              averageDailySpend: 0,
              budgetUtilization: [],
              savingsRate: 0,
              projectedMonthlyExpense: 0,
              spendingVelocity: 0,
            }} 
            isLoading={isLoading}
          />
        </div>

        {/* Charts Grid */}
        <div ref={chartsRef} className="opacity-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Distribution - Donut Chart */}
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Breakdown by category">Spending Distribution</CardTitle>}
                action={
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-primary-600" />
                  </div>
                }
              />
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-slate-100 border-t-primary-500 animate-spin" />
                </div>
              ) : data?.spendingByCategory && data.spendingByCategory.length > 0 ? (
                <SpendingDonutChart 
                  data={data.spendingByCategory}
                  onSliceClick={handleCategoryClick}
                  height={300}
                />
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center">
                  <PieChart className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No spending data</p>
                  <p className="text-sm text-slate-400 mt-1">Add expenses to see your distribution</p>
                </div>
              )}
              
              {/* Category Legend */}
              {!isLoading && data?.spendingByCategory && data.spendingByCategory.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {data.spendingByCategory.slice(0, 4).map((category: SpendingByCategory) => (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryClick(category)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{category.name}</p>
                        <p className="text-xs text-slate-400">{category.percentage.toFixed(1)}%</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Spending Trend - Line Chart */}
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Income vs Expenses over time">Spending Trend</CardTitle>}
                action={
                  <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-success-600" />
                  </div>
                }
              />
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-48 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ) : data?.trendData && data.trendData.length > 0 ? (
                <TrendLineChart 
                  data={data.trendData}
                  showIncome={true}
                  showExpense={true}
                  showNet={false}
                  height={300}
                  showArea={true}
                />
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center">
                  <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No trend data</p>
                  <p className="text-sm text-slate-400 mt-1">Add transactions to see trends</p>
                </div>
              )}
            </Card>

            {/* Income vs Expense - Bar Chart */}
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Monthly comparison">Income vs Expense</CardTitle>}
                action={
                  <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent-600" />
                  </div>
                }
              />
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-full h-48 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ) : data?.monthlyComparison && data.monthlyComparison.length > 0 ? (
                <IncomeExpenseBarChart 
                  data={data.monthlyComparison}
                  height={300}
                  showLegend={true}
                />
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center">
                  <Target className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No monthly data</p>
                  <p className="text-sm text-slate-400 mt-1">Add transactions to compare months</p>
                </div>
              )}
            </Card>

            {/* Category Comparison - Horizontal Bar Chart */}
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Spending by category">Category Breakdown</CardTitle>}
                action={
                  <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center">
                    <Filter className="w-5 h-5 text-warning-600" />
                  </div>
                }
              />
              {isLoading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <div className="w-full h-64 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ) : data?.categoryComparison && data.categoryComparison.length > 0 ? (
                <CategoryHorizontalBarChart 
                  data={data.categoryComparison}
                  showBudget={true}
                  height={350}
                  onBarClick={handleCategoryClick}
                />
              ) : (
                <div className="h-[350px] flex flex-col items-center justify-center text-center">
                  <Filter className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No category data</p>
                  <p className="text-sm text-slate-400 mt-1">Categorize your transactions</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Budget Usage Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Track your progress against budgets">Budget Utilization</CardTitle>}
                action={
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/settings')}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Manage Budgets
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <BudgetUsageBars 
                  budgetData={data?.premiumMetrics?.budgetUtilization || []}
                  isLoading={isLoading}
                />
                
                {/* Quick insights */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500" />
                    Period Summary
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Transactions</span>
                      <span className="font-semibold text-slate-900">
                        {isLoading ? '—' : summary?.transactionCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Avg Transaction</span>
                      <span className="font-semibold text-slate-900">
                        {isLoading ? '—' : formatCurrency(summary?.averageTransactionAmount || 0, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Savings Rate</span>
                      <span className={`font-semibold ${
                        (data?.premiumMetrics?.savingsRate || 0) >= 20 ? 'text-success-600' : 
                        (data?.premiumMetrics?.savingsRate || 0) >= 0 ? 'text-primary-600' : 
                        'text-danger-600'
                      }`}>
                        {isLoading ? '—' : `${(data?.premiumMetrics?.savingsRate || 0).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600">Projected Monthly</span>
                      <span className="font-semibold text-slate-900">
                        {isLoading ? '—' : formatCurrency(data?.premiumMetrics?.projectedMonthlyExpense || 0, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card variant="premium" padding="lg">
            <CardHeader 
              title={<CardTitle>Quick Actions</CardTitle>}
            />
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                leftIcon={<TrendingUp className="w-4 h-4" />}
                onClick={() => navigate('/transactions', { state: { type: 'income' } })}
              >
                Add Income
              </Button>
              <Button 
                variant="secondary"
                className="w-full justify-start" 
                leftIcon={<TrendingDown className="w-4 h-4" />}
                onClick={() => navigate('/transactions', { state: { type: 'expense' } })}
              >
                Add Expense
              </Button>
              <Button 
                variant="secondary"
                className="w-full justify-start" 
                leftIcon={<BarChart3 className="w-4 h-4" />}
                onClick={() => navigate('/insights')}
              >
                View Insights
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="font-semibold text-slate-900 mb-3">Tips</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <span>Review your top spending categories weekly</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success-500 mt-2 flex-shrink-0" />
                  <span>Aim for a 20%+ savings rate</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning-500 mt-2 flex-shrink-0" />
                  <span>Watch for budget overruns</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default Analytics;
