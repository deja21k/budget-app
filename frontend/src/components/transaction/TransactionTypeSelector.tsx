import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { TransactionType } from '../../utils/validation';

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  disabled?: boolean;
}

/**
 * Transaction Type Selector with clear visual distinction
 * - Expense: Red/Rose theme with downward arrow
 * - Income: Green/Emerald theme with upward arrow
 * 
 * Provides clear visual feedback and uses icons to reinforce the concept
 */
export const TransactionTypeSelector = ({
  value,
  onChange,
  disabled = false,
}: TransactionTypeSelectorProps) => {
  const options: {
    type: TransactionType;
    label: string;
    description: string;
    icon: typeof ArrowDownLeft;
  }[] = [
    {
      type: 'expense',
      label: 'Expense',
      description: 'Money going out',
      icon: ArrowDownLeft,
    },
    {
      type: 'income',
      label: 'Income',
      description: 'Money coming in',
      icon: ArrowUpRight,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(({ type, label, description, icon: Icon }) => {
        const isSelected = value === type;
        const isIncome = type === 'income';

        return (
          <button
            key={type}
            type="button"
            onClick={() => !disabled && onChange(type)}
            disabled={disabled}
            className={`
              relative py-4 px-4 rounded-xl font-semibold text-left
              transition-all duration-200 ease-out
              disabled:opacity-50 disabled:cursor-not-allowed
              flex flex-col gap-1.5
              border-2
              ${isSelected
                ? isIncome
                  ? 'bg-emerald-50 border-emerald-500 shadow-md'
                  : 'bg-rose-50 border-rose-500 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div
                className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            )}

            <div className="flex items-center gap-2">
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${isSelected
                    ? isIncome
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-500'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`
                  text-base
                  ${isSelected
                    ? isIncome
                      ? 'text-emerald-900'
                      : 'text-rose-900'
                    : 'text-slate-700'
                  }
                `}
              >
                {label}
              </span>
            </div>

            <p
              className={`
                text-xs pl-10
                ${isSelected
                  ? isIncome
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                  : 'text-slate-400'
                }
              `}
            >
              {description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default TransactionTypeSelector;
