/**
 * Premium Metrics Cards Component
 * Shows top merchant, most expensive day, average daily spend, and budget usage
 */

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { 
  Store, 
  Calendar, 
  TrendingUp, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  AlertCircle
} from 'lucide-react';
import type { PremiumMetrics } from '../../types/analytics';
import Card from '../ui/Card';
import { formatCurrency, getCurrentCurrency } from '../../utils/defensive';

interface PremiumMetricsCardsProps {
  metrics: PremiumMetrics;
  isLoading?: boolean;
}

// Animated counter hook
const useAnimatedCounter = (value: number, duration: number = 1000) => {
  const [displayValue, setDisplayValue] = useState(0);
  const valueRef = useRef(value);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.kill();
    }

    const obj = { value: valueRef.current };
    animationRef.current = gsap.to(obj, {
      value,
      duration: duration / 1000,
      ease: 'power2.out',
      onUpdate: () => setDisplayValue(obj.value),
    });

    valueRef.current = value;

    return () => {
      animationRef.current?.kill();
    };
  }, [value, duration]);

  return displayValue;
};

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'primary' | 'success' | 'danger' | 'warning' | 'accent';
  isLoading?: boolean;
  delay?: number;
}

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  color,
  isLoading,
  delay = 0 
}: MetricCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current && !isLoading) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay, ease: 'power2.out' }
      );
    }
  }, [isLoading, delay]);

  const colorClasses = {
    primary: 'from-primary-500 to-accent-500 bg-primary-50 text-primary-600',
    success: 'from-success-500 to-emerald-400 bg-success-50 text-success-600',
    danger: 'from-danger-500 to-rose-400 bg-danger-50 text-danger-600',
    warning: 'from-warning-500 to-amber-400 bg-warning-50 text-warning-600',
    accent: 'from-accent-500 to-violet-400 bg-accent-50 text-accent-600',
  };

  if (isLoading) {
    return (
      <Card className="h-full" padding="lg">
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-8 bg-slate-200 rounded w-32" />
            </div>
            <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      ref={cardRef}
      className="h-full opacity-0 group" 
      padding="lg"
      hover
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
            {trend && trend !== 'neutral' && (
              <span className={`flex items-center text-xs font-semibold ${
                trend === 'up' ? 'text-success-600' : 'text-danger-600'
              }`}>
                {trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
          bg-gradient-to-br ${colorClasses[color].split(' ').slice(1, 2)}
          group-hover:scale-110 transition-transform duration-300
        `}>
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            bg-gradient-to-br ${colorClasses[color].split(' ')[0] + ' ' + colorClasses[color].split(' ')[1]}
            shadow-lg
          `}>
            <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </Card>
  );
};

export const PremiumMetricsCards = ({ metrics, isLoading }: PremiumMetricsCardsProps) => {
  const currency = getCurrentCurrency();
  const animatedAvgDaily = useAnimatedCounter(metrics.averageDailySpend);
  const animatedSavingsRate = useAnimatedCounter(metrics.savingsRate);
  const animatedProjected = useAnimatedCounter(metrics.projectedMonthlyExpense);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <MetricCard
            key={i}
            title="Loading..."
            value="—"
            icon={TrendingUp}
            color="primary"
            isLoading={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Top Merchant */}
      <MetricCard
        title="Top Merchant"
        value={metrics.topMerchant ? metrics.topMerchant.name : 'No data'}
        subtitle={metrics.topMerchant 
          ? `${formatCurrency(metrics.topMerchant.amount, currency)} • ${metrics.topMerchant.transactionCount} visits`
          : 'Add transactions to see'
        }
        icon={Store}
        color="primary"
        delay={0}
      />

      {/* Most Expensive Day */}
      <MetricCard
        title="Highest Spend Day"
        value={metrics.mostExpensiveDay 
          ? new Date(metrics.mostExpensiveDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'No data'
        }
        subtitle={metrics.mostExpensiveDay
          ? `${formatCurrency(metrics.mostExpensiveDay.amount, currency)} • ${metrics.mostExpensiveDay.transactions} transactions`
          : 'Add transactions to see'
        }
        icon={Calendar}
        color="danger"
        delay={0.1}
      />

      {/* Average Daily Spend */}
      <MetricCard
        title="Daily Average"
        value={formatCurrency(animatedAvgDaily, currency)}
        subtitle={metrics.spendingVelocity !== 0 
          ? `${Math.abs(metrics.spendingVelocity).toFixed(1)}% ${metrics.spendingVelocity > 0 ? 'more' : 'less'} than last period`
          : 'No comparison data'
        }
        icon={TrendingUp}
        trend={metrics.spendingVelocity > 0 ? 'up' : metrics.spendingVelocity < 0 ? 'down' : 'neutral'}
        trendValue={`${Math.abs(metrics.spendingVelocity).toFixed(0)}%`}
        color="warning"
        delay={0.2}
      />

      {/* Savings Rate */}
      <MetricCard
        title="Savings Rate"
        value={`${animatedSavingsRate.toFixed(1)}%`}
        subtitle={metrics.projectedMonthlyExpense > 0
          ? `Projected: ${formatCurrency(animatedProjected, currency)}/mo`
          : 'Add income and expenses'
        }
        icon={PieChart}
        trend={metrics.savingsRate > 20 ? 'up' : metrics.savingsRate > 0 ? 'neutral' : 'down'}
        trendValue={`${metrics.savingsRate.toFixed(0)}%`}
        color="success"
        delay={0.3}
      />
    </div>
  );
};

// Budget Usage Bars Component
interface BudgetUsageBarsProps {
  budgetData: PremiumMetrics['budgetUtilization'];
  isLoading?: boolean;
}

export const BudgetUsageBars = ({ budgetData, isLoading }: BudgetUsageBarsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currency = getCurrentCurrency();

  useEffect(() => {
    if (containerRef.current && !isLoading) {
      const bars = containerRef.current.querySelectorAll('.budget-bar');
      gsap.fromTo(
        bars,
        { scaleX: 0 },
        { 
          scaleX: 1, 
          duration: 0.8, 
          stagger: 0.05, 
          ease: 'power2.out',
          delay: 0.2 
        }
      );
    }
  }, [isLoading, budgetData]);

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-2 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!budgetData || budgetData.length === 0) {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No budget data</p>
          <p className="text-sm text-slate-400 mt-1">Set budgets for categories to track usage</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="h-full">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-slate-900">Budget Usage</h3>
      </div>
      
      <div ref={containerRef} className="space-y-4">
        {budgetData.map((budget) => (
          <div key={budget.categoryId} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: budget.color }}
                />
                <span className="text-sm font-medium text-slate-700">{budget.categoryName}</span>
                {budget.status === 'over' && (
                  <AlertCircle className="w-4 h-4 text-danger-500" />
                )}
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${
                  budget.status === 'over' ? 'text-danger-600' : 
                  budget.status === 'near' ? 'text-warning-600' : 
                  'text-slate-900'
                }`}>
                  {budget.percentage.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-400 ml-1">
                  ({formatCurrency(budget.spent, currency)}/{formatCurrency(budget.budget, currency)})
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`budget-bar h-full rounded-full transition-all duration-500 origin-left ${
                  budget.status === 'over' 
                    ? 'bg-gradient-to-r from-danger-400 to-danger-500' 
                    : budget.status === 'near'
                    ? 'bg-gradient-to-r from-warning-400 to-warning-500'
                    : 'bg-gradient-to-r from-success-400 to-success-500'
                }`}
                style={{ 
                  width: `${Math.min(budget.percentage, 100)}%`,
                }}
              />
            </div>
            {budget.status === 'over' && (
              <p className="text-xs text-danger-600 mt-1">
                Over budget by {formatCurrency(budget.spent - budget.budget, currency)}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PremiumMetricsCards;
