import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import type { LucideIcon } from 'lucide-react';
import { 
  TrendingUp, AlertTriangle, Lightbulb, CheckCircle, Info, Calendar, Loader2, RefreshCw,
  Coffee, Zap, Repeat, ThumbsDown, ThumbsUp,
  ArrowUpRight, ArrowDownRight, DollarSign, Clock, CalendarDays,
  Sparkles
} from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import { insightsService } from '../services/api';
import type { SpendingAnalysis, SpendingInsight, TimePattern } from '../types';
import { formatCurrency, getCurrentCurrency } from '../utils/defensive';

const Insights = () => {
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currency = getCurrentCurrency();
  
  const headerRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const habitsRef = useRef<HTMLDivElement>(null);
  const regretRef = useRef<HTMLDivElement>(null);
  const weekendRef = useRef<HTMLDivElement>(null);
  const leaksRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const gsapContextRef = useRef<gsap.Context | null>(null);

  const fetchInsights = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    
    try {
      const data = await insightsService.getAnalysis();
      if (!isMountedRef.current) return;
      setAnalysis(data);
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch insights:', err);
        setError('Failed to load spending insights. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
        gsapContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    if (!loading && analysis && isMountedRef.current) {
      // Clean up previous GSAP context
      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
      }

      const ctx = gsap.context(() => {
        const sections = [
          headerRef.current,
          overviewRef.current,
          habitsRef.current,
          regretRef.current,
          weekendRef.current,
          leaksRef.current,
          insightsRef.current,
        ].filter(Boolean);

        gsap.fromTo(
          sections,
          { opacity: 0, y: 40, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.12,
            ease: 'power3.out',
          }
        );

        const insightCards = document.querySelectorAll('.insight-card');
        if (insightCards.length > 0) {
          gsap.fromTo(
            insightCards,
            { opacity: 0, x: -30 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              stagger: 0.06,
              ease: 'power2.out',
              delay: 0.4,
            }
          );
        }

        const habitBars = document.querySelectorAll('.habit-bar');
        if (habitBars.length > 0) {
          gsap.fromTo(
            habitBars,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.8,
              stagger: 0.08,
              ease: 'power2.out',
              delay: 0.3,
            }
          );
        }
      });

      gsapContextRef.current = ctx;
    }
  }, [loading, analysis]);

  const getInsightIcon = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'tip': return Lightbulb;
      case 'success': return CheckCircle;
      case 'info': return Info;
      default: return Info;
    }
  };

  const getInsightColor = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning': return { text: 'text-danger-600', bg: 'bg-danger-50', border: 'border-danger-200', icon: 'text-danger-500' };
      case 'tip': return { text: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', icon: 'text-primary-500' };
      case 'success': return { text: 'text-success-600', bg: 'bg-success-50', border: 'border-success-200', icon: 'text-success-500' };
      case 'info': return { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500' };
      default: return { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500' };
    }
  };

  const getSeverityBadge = (severity: SpendingInsight['severity']) => {
    const colors = {
      high: 'bg-danger-100 text-danger-700 border-danger-200',
      medium: 'bg-warning-100 text-warning-700 border-warning-200',
      low: 'bg-success-100 text-success-700 border-success-200',
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${colors[severity]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const calculateWeekendComparison = (timePatterns: TimePattern[]) => {
    const weekend = timePatterns.filter(t => t.day_of_week === 0 || t.day_of_week === 6);
    const weekday = timePatterns.filter(t => t.day_of_week >= 1 && t.day_of_week <= 5);
    
    const weekendTotal = weekend.reduce((sum, t) => sum + t.total_spent, 0);
    const weekdayTotal = weekday.reduce((sum, t) => sum + t.total_spent, 0);
    const weekendAvg = weekend.length > 0 ? weekendTotal / 2 : 0;
    const weekdayAvg = weekday.length > 0 ? weekdayTotal / 5 : 0;
    
    return {
      weekendTotal,
      weekdayTotal,
      weekendAvg,
      weekdayAvg,
      weekendCount: weekend.reduce((sum, t) => sum + t.transaction_count, 0),
      weekdayCount: weekday.reduce((sum, t) => sum + t.transaction_count, 0),
      difference: weekendAvg - weekdayAvg,
      percentHigher: weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : 0,
    };
  };

  const identifyMoneyLeaks = (analysis: SpendingAnalysis) => {
    const leaks: Array<{
      type: string;
      title: string;
      description: string;
      amount: number;
      severity: 'high' | 'medium' | 'low';
      icon: LucideIcon;
    }> = [];

    if (analysis.regret_analysis.percentage_regretted > 10) {
      leaks.push({
        type: 'regret',
        title: 'Impulse Purchases',
        description: `${analysis.regret_analysis.percentage_regretted.toFixed(1)}% of spending marked as regretted`,
        amount: analysis.regret_analysis.total_regretted,
        severity: 'high',
        icon: ThumbsDown,
      });
    }

    const smallRepeats = analysis.repeated_expenses.filter(r => r.is_small_repeat);
    const subscriptionTotal = smallRepeats.reduce((sum, r) => sum + r.estimated_monthly_cost, 0);
    if (subscriptionTotal > 100) {
      leaks.push({
        type: 'subscriptions',
        title: 'Subscription Creep',
        description: `${smallRepeats.length} small recurring charges adding up`,
        amount: subscriptionTotal,
        severity: subscriptionTotal > 200 ? 'high' : 'medium',
        icon: Repeat,
      });
    }

    const weekendData = calculateWeekendComparison(analysis.time_patterns);
    if (weekendData.percentHigher > 50) {
      leaks.push({
        type: 'weekend',
        title: 'Weekend Overspending',
        description: `Spending ${weekendData.percentHigher.toFixed(0)}% more on weekends`,
        amount: weekendData.weekendTotal,
        severity: weekendData.percentHigher > 100 ? 'high' : 'medium',
        icon: CalendarDays,
      });
    }

    const highFreq = analysis.repeated_expenses
      .filter(r => r.frequency === 'weekly' && r.count >= 4)
      .sort((a, b) => b.estimated_monthly_cost - a.estimated_monthly_cost)[0];
    
    if (highFreq && highFreq.estimated_monthly_cost > 100) {
      leaks.push({
        type: 'frequency',
        title: `Frequent ${highFreq.merchant} Visits`,
        description: `${highFreq.count} visits averaging ${formatCurrency(highFreq.avg_amount, currency)} each`,
        amount: highFreq.total_amount,
        severity: highFreq.estimated_monthly_cost > 300 ? 'high' : 'medium',
        icon: Coffee,
      });
    }

    const overBudgetCats = analysis.category_spending.filter(c => c.is_over_budget);
    if (overBudgetCats.length > 0) {
      const worst = overBudgetCats.sort((a, b) => 
        (b.total_amount - (b.budget_limit || 0)) - (a.total_amount - (a.budget_limit || 0))
      )[0];
      const overBy = worst.total_amount - (worst.budget_limit || 0);
      leaks.push({
        type: 'budget',
        title: `${worst.category_name} Budget Overrun`,
        description: `Exceeded budget by ${formatCurrency(overBy, currency)}`,
        amount: overBy,
        severity: overBy > (worst.budget_limit || 0) * 0.5 ? 'high' : 'medium',
        icon: AlertTriangle,
      });
    }

    return leaks.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  };

  const calculateRegretRates = (analysis: SpendingAnalysis) => {
    if (!analysis || !analysis.category_spending) return [];
    
    return analysis.regret_analysis.top_regretted_categories.slice(0, 5).map(cat => {
      const catSpending = analysis.category_spending.find(c => c.category_name === cat.category_name);
      const totalCategory = catSpending?.total_amount || 1;
      return {
        category_name: cat.category_name,
        color: catSpending?.category_color || '#6B7280',
        regretted_amount: cat.amount,
        regret_rate: (cat.amount / totalCategory) * 100,
        transaction_count: cat.count,
      };
    });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
            <p className="text-slate-600 font-medium">Analyzing your spending patterns...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md" variant="premium" padding="xl">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-danger-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Insights</h3>
              <p className="text-slate-500 mb-6">{error}</p>
              <Button onClick={fetchInsights} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!analysis) return null;

  const { insights, total_income, total_expenses, net_amount, regret_analysis, time_patterns, repeated_expenses } = analysis;
  const weekendData = calculateWeekendComparison(time_patterns);
  const moneyLeaks = identifyMoneyLeaks(analysis);
  const regretRates = calculateRegretRates(analysis);

  const warnings = insights.filter(i => i.type === 'warning');
  const tips = insights.filter(i => i.type === 'tip');
  const successes = insights.filter(i => i.type === 'success');

  return (
    <PageTransition>
      <div className="page-container pb-24 lg:pb-8 space-y-10">
        {/* Premium Header */}
        <div ref={headerRef} className="opacity-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-primary-600">AI Insights</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                Insights Dashboard
              </h1>
              <p className="text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {analysis.period_start} to {analysis.period_end}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={fetchInsights}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Premium Financial Overview Cards */}
        <div ref={overviewRef} className="opacity-0 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="premium" hover className="group">
            <div className="flex items-center gap-5">
              <div className="
                w-14 h-14 rounded-2xl 
                bg-gradient-to-br from-success-500 to-emerald-400
                flex items-center justify-center
                shadow-lg shadow-success-500/25
                group-hover:scale-110 transition-transform duration-300
              ">
                <TrendingUp className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(total_income, currency)}</p>
              </div>
            </div>
          </Card>
          
          <Card variant="premium" hover className="group">
            <div className="flex items-center gap-5">
              <div className="
                w-14 h-14 rounded-2xl 
                bg-gradient-to-br from-danger-500 to-rose-400
                flex items-center justify-center
                shadow-lg shadow-danger-500/25
                group-hover:scale-110 transition-transform duration-300
              ">
                <TrendingUp className="w-7 h-7 text-white rotate-180" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(total_expenses, currency)}</p>
              </div>
            </div>
          </Card>
          
          <Card variant="premium" hover className="group">
            <div className="flex items-center gap-5">
              <div className={`
                w-14 h-14 rounded-2xl 
                ${net_amount >= 0 
                  ? 'bg-gradient-to-br from-success-500 to-emerald-400 shadow-success-500/25' 
                  : 'bg-gradient-to-br from-danger-500 to-rose-400 shadow-danger-500/25'
                }
                flex items-center justify-center
                shadow-lg
                group-hover:scale-110 transition-transform duration-300
              `}>
                {net_amount >= 0 ? (
                  <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-white" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Net Balance</p>
                <p className={`text-2xl font-bold ${net_amount >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {formatCurrency(net_amount, currency)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Premium Monthly Cost Per Habit */}
        <div ref={habitsRef} className="opacity-0">
          <Card variant="premium" padding="lg">
            <CardHeader 
              title={<CardTitle subtitle="Recurring spending patterns detected">Monthly Cost Per Habit</CardTitle>}
              action={
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <Repeat className="w-6 h-6 text-primary-600" />
                </div>
              }
            />
            
            {repeated_expenses.length === 0 ? (
              <div className="text-center py-12">
                <Coffee className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-500 font-medium">No recurring habits detected yet</p>
                <p className="text-sm text-slate-400 mt-1">Add more transactions to see your spending patterns</p>
              </div>
            ) : (
              <div className="space-y-5">
                {repeated_expenses.slice(0, 6).map((habit) => {
                  const maxMonthly = Math.max(...repeated_expenses.map(h => h.estimated_monthly_cost), 1);
                  const percentage = (habit.estimated_monthly_cost / maxMonthly) * 100;
                  const isHigh = habit.estimated_monthly_cost > 200;
                  
                  return (
                    <div key={habit.merchant} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold
                            ${isHigh 
                              ? 'bg-danger-100 text-danger-700' 
                              : 'bg-primary-50 text-primary-700'
                            }
                            group-hover:scale-110 transition-transform duration-300
                          `}>
                            {habit.merchant.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{habit.merchant}</p>
                            <p className="text-xs text-slate-500">
                              {habit.frequency} • {habit.count} times • {habit.category_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${isHigh ? 'text-danger-600' : 'text-slate-900'}`}>
                            {formatCurrency(habit.estimated_monthly_cost, currency)}/mo
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatCurrency(habit.avg_amount, currency)} avg
                          </p>
                        </div>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`habit-bar h-full rounded-full transition-all duration-700 ease-premium ${
                            isHigh 
                              ? 'bg-gradient-to-r from-danger-400 to-danger-500' 
                              : 'bg-gradient-to-r from-primary-400 to-primary-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                
                {/* Total estimated monthly habits cost */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Estimated Monthly Habit Cost</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {formatCurrency(repeated_expenses.reduce((sum, h) => sum + h.estimated_monthly_cost, 0), currency)}
                    </span>
                  </div>
                  {repeated_expenses.reduce((sum, h) => sum + h.estimated_monthly_cost, 0) > total_income * 0.2 && (
                    <div className="flex items-center gap-2 mt-3 text-warning-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Habits consume over 20% of your income</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Continue with Regret Rate and other sections... */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Regret Rate Section */}
          <div ref={regretRef} className="opacity-0">
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="Where you're second-guessing purchases">Regret Rate by Category</CardTitle>}
                action={
                  <div className="w-12 h-12 rounded-2xl bg-danger-50 flex items-center justify-center">
                    <ThumbsDown className="w-6 h-6 text-danger-600" />
                  </div>
                }
              />

              {regret_analysis.total_regretted === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-4">
                    <ThumbsUp className="w-8 h-8 text-success-500" />
                  </div>
                  <p className="text-slate-600 font-medium">No regrets yet!</p>
                  <p className="text-sm text-slate-400 mt-1">Mark purchases as regretted to see patterns</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {regretRates.map((cat) => (
                    <div key={cat.category_name} className="insight-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-semibold text-slate-900">{cat.category_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">
                            {formatCurrency(cat.regretted_amount, currency)} regretted
                          </span>
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            cat.regret_rate > 30 ? 'bg-danger-100 text-danger-700' :
                            cat.regret_rate > 15 ? 'bg-warning-100 text-warning-700' :
                            'bg-success-100 text-success-700'
                          }`}>
                            {cat.regret_rate.toFixed(0)}% regret
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(cat.regret_rate, 100)}%`,
                            backgroundColor: cat.regret_rate > 30 ? '#EF4444' : 
                                            cat.regret_rate > 15 ? '#F59E0B' : '#22C55E'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Weekend vs Weekday */}
          <div ref={weekendRef} className="opacity-0">
            <Card variant="premium" padding="lg">
              <CardHeader 
                title={<CardTitle subtitle="How your spending patterns shift">Weekend vs Weekday</CardTitle>}
                action={
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-primary-600" />
                  </div>
                }
              />

              <div className="grid grid-cols-2 gap-5">
                {/* Weekday */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Weekdays</p>
                      <p className="text-xs text-slate-500">Mon - Fri</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Daily Avg</span>
                      <span className="font-bold text-slate-900">{formatCurrency(weekendData.weekdayAvg, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Total</span>
                      <span className="font-bold text-slate-900">{formatCurrency(weekendData.weekdayTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Transactions</span>
                      <span className="font-medium text-slate-900">{weekendData.weekdayCount}</span>
                    </div>
                  </div>
                </div>

                {/* Weekend */}
                <div className={`p-5 rounded-2xl border ${
                  weekendData.percentHigher > 50 
                    ? 'bg-danger-50 border-danger-100' 
                    : 'bg-success-50 border-success-100'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      weekendData.percentHigher > 50 ? 'bg-danger-100' : 'bg-success-100'
                    }`}>
                      <CalendarDays className={`w-5 h-5 ${
                        weekendData.percentHigher > 50 ? 'text-danger-600' : 'text-success-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Weekends</p>
                      <p className="text-xs text-slate-500">Sat - Sun</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Daily Avg</span>
                      <span className="font-bold text-slate-900">{formatCurrency(weekendData.weekendAvg, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Total</span>
                      <span className="font-bold text-slate-900">{formatCurrency(weekendData.weekendTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Transactions</span>
                      <span className="font-medium text-slate-900">{weekendData.weekendCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {weekendData.percentHigher > 0 ? (
                      <ArrowUpRight className={`w-6 h-6 ${
                        weekendData.percentHigher > 50 ? 'text-danger-500' : 'text-success-500'
                      }`} />
                    ) : (
                      <ArrowDownRight className="w-6 h-6 text-success-500" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">
                        Weekend spending is {Math.abs(weekendData.percentHigher).toFixed(0)}% 
                        {weekendData.percentHigher > 0 ? 'higher' : 'lower'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {weekendData.percentHigher > 50 
                          ? 'Consider setting a weekend spending limit' 
                          : weekendData.percentHigher > 0 
                            ? 'Moderate weekend increase'
                            : 'Great weekend discipline!'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(Math.abs(weekendData.difference), currency)}
                    </p>
                    <p className="text-xs text-slate-500">per day difference</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Money Leaks */}
        <div ref={leaksRef} className="opacity-0">
          <Card variant="premium" padding="lg">
            <CardHeader 
              title={<CardTitle subtitle="Areas where money might be slipping away">Top Money Leaks</CardTitle>}
              action={
                <div className="w-12 h-12 rounded-2xl bg-warning-50 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-warning-600" />
                </div>
              }
            />

            {moneyLeaks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-success-500" />
                </div>
                <p className="text-slate-600 font-semibold">No major money leaks detected!</p>
                <p className="text-sm text-slate-400 mt-1">Your spending looks well controlled</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {moneyLeaks.slice(0, 4).map((leak, index) => {
                  const Icon = leak.icon;
                  const severityColors = {
                    high: 'bg-danger-50 border-danger-200',
                    medium: 'bg-warning-50 border-warning-200',
                    low: 'bg-success-50 border-success-200',
                  };
                  
                  return (
                    <div 
                      key={index} 
                      className={`insight-card flex items-start gap-4 p-5 rounded-2xl border-2 ${severityColors[leak.severity]}`}
                    >
                      <div className={`p-3 rounded-xl ${
                        leak.severity === 'high' ? 'bg-danger-100' :
                        leak.severity === 'medium' ? 'bg-warning-100' :
                        'bg-success-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          leak.severity === 'high' ? 'text-danger-600' :
                          leak.severity === 'medium' ? 'text-warning-600' :
                          'text-success-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-900">{leak.title}</h4>
                          <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${
                            leak.severity === 'high' ? 'bg-danger-200 text-danger-800' :
                            leak.severity === 'medium' ? 'bg-warning-200 text-warning-800' :
                            'bg-success-200 text-success-800'
                          }`}>
                            {leak.severity}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{leak.description}</p>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-900">{formatCurrency(leak.amount, currency)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Smart Insights */}
        <div ref={insightsRef} className="opacity-0">
          <CardHeader 
            title={<CardTitle>Smart Insights ({insights.length})</CardTitle>}
          />

          {insights.length === 0 ? (
            <Card variant="premium" padding="xl">
              <div className="text-center py-12">
                <Info className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No insights available for this period</p>
                <p className="text-sm text-slate-400 mt-1">Add more transactions to get personalized insights</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Warnings */}
              {warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-danger-500" />
                    Warnings ({warnings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {warnings.map((insight, index) => {
                      const Icon = getInsightIcon(insight.type);
                      const colors = getInsightColor(insight.type);
                      return (
                        <Card 
                          key={`warning-${index}`} 
                          className={`insight-card border-l-4 ${colors.border} hover:shadow-soft-lg transition-shadow`}
                          variant="premium"
                          padding="md"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                              <Icon className={`w-5 h-5 ${colors.icon}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-bold ${colors.text}`}>
                                  {insight.title}
                                </h4>
                                {getSeverityBadge(insight.severity)}
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{insight.message}</p>
                              {insight.suggestedAction && (
                                <div className="flex items-start gap-2 text-sm text-primary-600 bg-primary-50 px-3 py-2 rounded-xl">
                                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  {insight.suggestedAction}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tips */}
              {tips.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary-500" />
                    Savings Opportunities ({tips.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tips.map((insight, index) => {
                      const Icon = getInsightIcon(insight.type);
                      const colors = getInsightColor(insight.type);
                      return (
                        <Card 
                          key={`tip-${index}`} 
                          className={`insight-card border-l-4 ${colors.border} hover:shadow-soft-lg transition-shadow`}
                          variant="premium"
                          padding="md"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                              <Icon className={`w-5 h-5 ${colors.icon}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-sm ${colors.text} mb-1`}>
                                {insight.title}
                              </h4>
                              <p className="text-xs text-slate-600 mb-1">{insight.message}</p>
                              {insight.suggestedAction && (
                                <p className="text-xs text-primary-600">
                                  → {insight.suggestedAction}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Successes */}
              {successes.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success-500" />
                    Wins ({successes.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {successes.map((insight, index) => {
                      const Icon = getInsightIcon(insight.type);
                      const colors = getInsightColor(insight.type);
                      return (
                        <Card 
                          key={`success-${index}`} 
                          className={`insight-card border-l-4 ${colors.border} hover:shadow-soft-lg transition-shadow`}
                          variant="premium"
                          padding="md"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                              <Icon className={`w-5 h-5 ${colors.icon}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-sm ${colors.text} mb-1`}>
                                {insight.title}
                              </h4>
                              <p className="text-xs text-slate-600">{insight.message}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Insights;
