/**
 * Category Horizontal Bar Chart Component
 * Shows category spending in horizontal bars
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { CategoryComparison } from '../../types/analytics';
import { formatCurrency, getCurrentCurrency } from '../../utils/defensive';

interface CategoryHorizontalBarChartProps {
  data: CategoryComparison[];
  showBudget?: boolean;
  height?: number;
  animationDuration?: number;
  onBarClick?: (category: CategoryComparison) => void;
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CategoryComparison;
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft-lg border border-slate-100 dark:border-slate-700 min-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-slate-900 dark:text-white">{data.name}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">Spent</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatCurrency(data.amount, getCurrentCurrency())}
            </span>
          </div>
          {data.budget && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-300">Budget</span>
                <span className="text-sm text-slate-900 dark:text-white">
                  {formatCurrency(data.budget, getCurrentCurrency())}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-500 dark:text-slate-400">Used</span>
                <span className={`text-sm font-bold ${
                  data.percentageOfBudget > 100 ? 'text-danger-600' : 
                  data.percentageOfBudget > 80 ? 'text-warning-600' : 
                  'text-success-600'
                }`}>
                  {data.percentageOfBudget.toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const CategoryHorizontalBarChart = ({
  data,
  showBudget = true,
  height = 350,
  animationDuration = 1200,
  onBarClick,
}: CategoryHorizontalBarChartProps) => {
  const currency = getCurrentCurrency();

  // Sort by amount descending
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  const handleClick = (_: any, index: number) => {
    if (onBarClick && sortedData[index]) {
      onBarClick(sortedData[index]);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
        <XAxis 
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickFormatter={(value) => formatCurrency(value, currency).split('.')[0]}
        />
        <YAxis 
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
        <Bar 
          dataKey="amount" 
          radius={[0, 4, 4, 0]}
          animationDuration={animationDuration}
          onClick={handleClick}
          className="cursor-pointer"
        >
          {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                className="transition-opacity duration-300 hover:opacity-80 cursor-pointer"
              />
          ))}
        </Bar>
        {showBudget && sortedData.some(d => d.budget) && (
          <ReferenceLine x={0} stroke="#e2e8f0" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CategoryHorizontalBarChart;
