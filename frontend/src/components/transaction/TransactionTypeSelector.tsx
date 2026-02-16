import { DollarSign, Wallet } from 'lucide-react';
import type { TransactionType } from '../../utils/validation';

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  disabled?: boolean;
}

export const TransactionTypeSelector = ({
  value,
  onChange,
  disabled = false,
}: TransactionTypeSelectorProps) => {
  const options: { type: TransactionType; label: string; icon: typeof DollarSign }[] = [
    { type: 'expense', label: 'Expense', icon: DollarSign },
    { type: 'income', label: 'Income', icon: Wallet },
  ];

  return (
    <div className="flex gap-3">
      {options.map(({ type, label, icon: Icon }) => {
        const isSelected = value === type;
        const isIncome = type === 'income';

        return (
          <button
            key={type}
            type="button"
            onClick={() => !disabled && onChange(type)}
            disabled={disabled}
            className={`
              flex-1 py-3.5 px-4 rounded-xl font-semibold capitalize
              transition-all duration-200 ease-out
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2.5
              ${isSelected
                ? isIncome
                  ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 shadow-sm'
                  : 'bg-rose-100 text-rose-800 ring-2 ring-rose-500 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            <Icon className={`w-5 h-5 ${isSelected ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TransactionTypeSelector;
