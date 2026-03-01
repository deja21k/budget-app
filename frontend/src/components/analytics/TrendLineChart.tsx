/**
 * Trend Line Chart Component
 * Shows spending/income trends over time with smooth animations
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { TrendDataPoint } from '../../types/analytics';
import { formatCurrency, getCurrentCurrency } from '../../utils/defensive';

interface TrendLineChartProps {
  data: TrendDataPoint[];
  showIncome?: boolean;
  showExpense?: boolean;
  showNet?: boolean;
  height?: number;
  showArea?: boolean;
  animationDuration?: number;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft-lg border border-slate-100 dark:border-slate-700 min-w-[200px]">
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCurrency(entry.value, getCurrentCurrency())}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const TrendLineChart = ({
  data,
  showIncome = true,
  showExpense = true,
  showNet = false,
  height = 300,
  showArea = true,
  animationDuration = 1500,
}: TrendLineChartProps) => {
  const currency = getCurrentCurrency();

  return (
    <ResponsiveContainer width="100%" height={height}>
      {showArea ? (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {showIncome && (
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            )}
            {showExpense && (
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            )}
            {showNet && (
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
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
          <Tooltip content={<CustomTooltip />} />
          {showIncome && (
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#incomeGradient)"
              animationDuration={animationDuration}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          )}
          {showExpense && (
            <Area
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="#f43f5e"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#expenseGradient)"
              animationDuration={animationDuration}
              dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          )}
          {showNet && (
            <Area
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#netGradient)"
              animationDuration={animationDuration}
              dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          <Tooltip content={<CustomTooltip />} />
          {showIncome && (
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#10b981"
              strokeWidth={3}
              animationDuration={animationDuration}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          )}
          {showExpense && (
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="#f43f5e"
              strokeWidth={3}
              animationDuration={animationDuration}
              dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          )}
          {showNet && (
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#6366f1"
              strokeWidth={3}
              animationDuration={animationDuration}
              dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          )}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};

export default TrendLineChart;
