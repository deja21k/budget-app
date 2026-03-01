/**
 * Date Range Selector Component
 * Allows users to select preset or custom date ranges
 */

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import type { DateRange } from '../../types/analytics';
import Button from '../ui/Button';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange, startDate?: string, endDate?: string) => void;
  customStartDate?: string;
  customEndDate?: string;
}

const PRESET_RANGES: { value: DateRange; label: string; days: number }[] = [
  { value: 'week', label: 'This Week', days: 7 },
  { value: 'month', label: 'This Month', days: 30 },
  { value: 'quarter', label: '3 Months', days: 90 },
  { value: 'year', label: 'This Year', days: 365 },
];

export const DateRangeSelector = ({
  value,
  onChange,
  customStartDate,
  customEndDate,
}: DateRangeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value === 'custom');

  const handlePresetSelect = (range: DateRange) => {
    onChange(range);
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomSelect = () => {
    setShowCustom(true);
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onChange('custom', customStartDate, customEndDate);
    }
  };

  const selectedLabel = PRESET_RANGES.find(r => r.value === value)?.label || 'Custom';

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Calendar className="w-4 h-4" />}
        rightIcon={<ChevronDown className="w-4 h-4" />}
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[140px]"
      >
        {selectedLabel}
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
            <div className="p-2 space-y-1">
              {PRESET_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handlePresetSelect(range.value)}
                  className={`
                    w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors
                    ${value === range.value 
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{range.label}</span>
                    <span className="text-xs text-slate-400">{range.days}d</span>
                  </div>
                </button>
              ))}
              
              <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                <button
                  onClick={handleCustomSelect}
                  className={`
                    w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors
                    ${value === 'custom' 
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  Custom Range
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Date Range Modal */}
      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-soft-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Select Date Range
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate || ''}
                  onChange={(e) => onChange('custom', e.target.value, customEndDate)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate || ''}
                  onChange={(e) => onChange('custom', customStartDate, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => {
                  setShowCustom(false);
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  handleCustomDateChange();
                  setShowCustom(false);
                  setIsOpen(false);
                }}
                disabled={!customStartDate || !customEndDate}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeSelector;
