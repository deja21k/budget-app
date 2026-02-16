import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { REGRET_OPTIONS, type RegretFlag } from '../../utils/validation';

interface RegretFlagSelectorProps {
  value: RegretFlag;
  onChange: (value: RegretFlag) => void;
  disabled?: boolean;
}

export const RegretFlagSelector = ({
  value,
  onChange,
  disabled = false,
}: RegretFlagSelectorProps) => {
  const getIcon = (flagValue: RegretFlag) => {
    switch (flagValue) {
      case 'yes':
        return ThumbsUp;
      case 'regret':
        return ThumbsDown;
      default:
        return Minus;
    }
  };

  const getStyles = (flagValue: RegretFlag, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
    }

    switch (flagValue) {
      case 'yes':
        return 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 shadow-sm';
      case 'regret':
        return 'bg-rose-100 text-rose-700 ring-2 ring-rose-500 shadow-sm';
      default:
        return 'bg-slate-200 text-slate-700 ring-2 ring-slate-400';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-3">
        How do you feel about this purchase?
      </label>

      <div className="flex gap-3">
        {REGRET_OPTIONS.map((option) => {
          const Icon = getIcon(option.value);
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium text-sm
                transition-all duration-200 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                ${getStyles(option.value, isSelected)}
              `}
              aria-pressed={isSelected}
            >
              <Icon className="w-4 h-4" strokeWidth={2.5} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Tracking this helps identify spending patterns
      </p>
    </div>
  );
};

export default RegretFlagSelector;
