/**
 * Income vs Expense Bar Chart Component
 * Compares income and expenses side by side per month
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { MonthlyComparison } from '../../types/analytics';
import { formatCurrency, getCurrentCurrency } from '../../utils/defensive';

interface IncomeExpenseBarChartProps {
  data: MonthlyComparison[];
  height?: number;
  showLegend?: boolean;
  animationDuration?: number;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyComparison;
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft-lg border border-slate-100 dark:border-slate-700 min-w-[220px]">
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{label}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">Income</span>
            </div>
            <span className="text-sm font-semibold text-emerald-600">
              {formatCurrency(data.income, getCurrentCurrency())}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">Expense</span>
            </div>
            <span className="text-sm font-semibold text-rose-600">
              {formatCurrency(data.expense, getCurrentCurrency())}
            </span>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">Savings</span>
              <span className={`text-sm font-bold ${data.savings >= 0 ? 'text-primary-600' : 'text-danger-600'}`}>
                {formatCurrency(data.savings, getCurrentCurrency())}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-1">
              <span className="text-xs text-slate-400 dark:text-slate-500">Rate</span>
              <span className={`text-xs font-semibold ${data.savingsRate >= 20 ? 'text-success-600' : data.savingsRate >= 0 ? 'text-primary-600' : 'text-danger-600'}`}>
                {data.savingsRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const IncomeExpenseBarChart = ({
  data,
  height = 300,
  showLegend = true,
  animationDuration = 1200,
}: IncomeExpenseBarChartProps) => {
  const currency = getCurrentCurrency();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="label" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(value) => formatCurrency(value, currency).split('.')[0]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
        {showLegend && (
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
        )}
        <Bar 
          dataKey="income" 
          name="Income" 
          fill="#10b981" 
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
          maxBarSize={50}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-income-${index}`} fill="#10b981" />
          ))}
        </Bar>
        <Bar 
          dataKey="expense" 
          name="Expense" 
          fill="#f43f5e" 
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
          maxBarSize={50}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-expense-${index}`} fill="#f43f5e" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseBarChart;
