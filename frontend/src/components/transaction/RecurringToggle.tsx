import { Repeat } from 'lucide-react';
import { RECURRING_FREQUENCIES, type RecurringFrequency } from '../../utils/validation';

interface RecurringToggleProps {
  isRecurring: boolean;
  frequency: RecurringFrequency;
  onToggle: (isRecurring: boolean) => void;
  onFrequencyChange: (frequency: RecurringFrequency) => void;
  disabled?: boolean;
}

export const RecurringToggle = ({
  isRecurring,
  frequency,
  onToggle,
  onFrequencyChange,
  disabled = false,
}: RecurringToggleProps) => {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              isRecurring
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-700">Recurring Expense</p>
            <p className="text-sm text-slate-500">
              {isRecurring ? 'This repeats regularly' : 'One-time expense'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => onToggle(!isRecurring)}
          disabled={disabled}
          className={`
            relative w-12 h-6 rounded-full transition-colors duration-200
            ${isRecurring ? 'bg-blue-500' : 'bg-slate-300'}
            disabled:opacity-50
          `}
          aria-pressed={isRecurring}
          aria-label="Toggle recurring expense"
        >
          <span
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
              ${isRecurring ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>

      {/* Frequency selection */}
      {isRecurring && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            How often does this repeat?
          </label>
          <div className="flex gap-2">
            {RECURRING_FREQUENCIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onFrequencyChange(value)}
                disabled={disabled}
                className={`
                  flex-1 py-2.5 px-3 rounded-lg text-sm font-medium capitalize
                  transition-all duration-200
                  disabled:opacity-50
                  ${frequency === value
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringToggle;
