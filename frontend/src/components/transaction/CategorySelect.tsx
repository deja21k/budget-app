import { useMemo } from 'react';
import { Tag, AlertCircle, History } from 'lucide-react';
import type { Category } from '../../types';

interface CategorySelectProps {
  categories: Category[];
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string;
  touched?: boolean;
  recentCategoryIds?: number[];
  type?: 'income' | 'expense';
}

export const CategorySelect = ({
  categories,
  value,
  onChange,
  onBlur,
  disabled = false,
  isLoading = false,
  error,
  touched = false,
  recentCategoryIds = [],
  type,
}: CategorySelectProps) => {
  const filteredCategories = useMemo(() => {
    if (!type) return categories;
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const sortedCategories = useMemo(() => {
    const recentSet = new Set(recentCategoryIds);
    return [...filteredCategories].sort((a, b) => {
      const aRecent = recentSet.has(a.id);
      const bRecent = recentSet.has(b.id);
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredCategories, recentCategoryIds]);

  const selectedCategory = useMemo(() => {
    const id = typeof value === 'string' ? parseInt(value, 10) : value;
    return categories.find(c => c.id === id);
  }, [categories, value]);

  const hasError = error && touched;
  const isSuccess = touched && !error && value;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        <span className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Category <span className="text-rose-500">*</span>
        </span>
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled || isLoading}
          className={`
            w-full rounded-xl border bg-white px-4 py-3 pr-12 text-slate-900
            transition-all duration-200 outline-none appearance-none
            disabled:bg-slate-50 disabled:text-slate-500
            ${hasError
              ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
              : isSuccess
                ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }
            hover:border-slate-300
          `}
        >
          <option value="">
            {isLoading ? 'Loading categories...' : 'Select a category'}
          </option>

          {sortedCategories.length === 0 && !isLoading && (
            <option value="" disabled>
              No categories available
            </option>
          )}

          {sortedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {recentCategoryIds.includes(category.id) ? '★ ' : ''}{category.name}
            </option>
          ))}
        </select>

        {/* Color indicator */}
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: selectedCategory?.color || '#cbd5e1' }}
        />

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Recent categories hint */}
      {recentCategoryIds.length > 0 && sortedCategories.some(c => recentCategoryIds.includes(c.id)) && (
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <History className="w-3 h-3" />
          Starred (★) categories are recently used
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <p className="mt-2 text-sm text-rose-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Empty state warning */}
      {sortedCategories.length === 0 && !isLoading && (
        <p className="mt-2 text-sm text-amber-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          No categories available. Please create one first.
        </p>
      )}
    </div>
  );
};

export default CategorySelect;
