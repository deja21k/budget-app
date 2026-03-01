/**
 * Spending Donut Chart Component
 * Shows spending distribution by category with interactive tooltips
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SpendingByCategory } from '../../types/analytics';
import { formatCurrency, getCurrentCurrency } from '../../utils/defensive';

interface SpendingDonutChartProps {
  data: SpendingByCategory[];
  onSliceClick?: (category: SpendingByCategory) => void;
  height?: number;
  showCenterLabel?: boolean;
  animationDuration?: number;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as SpendingByCategory;
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-soft-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-slate-900 dark:text-white">{data.name}</span>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {formatCurrency(data.value, getCurrentCurrency())}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data.percentage.toFixed(1)}% of total spending
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {data.transactionCount} transactions
        </p>
      </div>
    );
  }
  return null;
};

export const SpendingDonutChart = ({
  data,
  onSliceClick,
  height = 300,
  showCenterLabel = true,
  animationDuration = 1000,
}: SpendingDonutChartProps) => {
  const currency = getCurrentCurrency();

  // Calculate total for center label
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const handleClick = (_: any, index: number) => {
    if (onSliceClick && data[index]) {
      onSliceClick(data[index]);
    }
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            onClick={handleClick}
            animationBegin={0}
            animationDuration={animationDuration}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="none"
                className="transition-all duration-300 cursor-pointer hover:opacity-80"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Label */}
      {showCenterLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(total, currency)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SpendingDonutChart;
