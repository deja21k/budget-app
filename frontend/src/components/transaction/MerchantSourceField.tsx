import { Store, Briefcase, Mic, Sparkles } from 'lucide-react';
import Input from '../ui/Input';
import type { TransactionType } from '../../utils/validation';

interface MerchantSourceFieldProps {
  type: TransactionType;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  isAutoCategorized?: boolean;
  onVoiceInput?: () => void;
  showVoiceButton?: boolean;
}

/**
 * Dynamic field that shows "Merchant / Store" for expenses
 * and "Income Source" for income transactions.
 * 
 * This provides clear visual distinction between transaction types
 * and uses appropriate terminology for each.
 */
export const MerchantSourceField = ({
  type,
  value,
  onChange,
  onBlur,
  disabled = false,
  error,
  touched = false,
  isAutoCategorized = false,
  onVoiceInput,
  showVoiceButton = true,
}: MerchantSourceFieldProps) => {
  const isExpense = type === 'expense';
  
  // Configuration based on transaction type
  const config = isExpense
    ? {
        label: 'Merchant / Store',
        placeholder: 'e.g., Whole Foods Market, Maxi, Amazon',
        icon: Store,
        autoCategorizeText: 'Auto-categorized based on merchant',
      }
    : {
        label: 'Income Source',
        placeholder: 'e.g., Employer, Client, Investment Platform',
        icon: Briefcase,
        autoCategorizeText: 'Auto-categorized based on source',
      };

  const Icon = config.icon;
  const hasError = error && touched;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Input
            label={config.label}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            error={hasError ? error : undefined}
            leftIcon={<Icon className="w-4 h-4" />}
            placeholder={config.placeholder}
            maxLength={100}
            showCharCount
          />
        </div>
        
        {showVoiceButton && onVoiceInput && (
          <div className="pt-[34px]">
            <button
              type="button"
              onClick={onVoiceInput}
              disabled={disabled}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 disabled:opacity-50"
              title="Voice input"
              aria-label="Use voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Auto-categorization indicator */}
      {isAutoCategorized && isExpense && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">
          <Sparkles className="w-3.5 h-3.5" />
          {config.autoCategorizeText}
        </div>
      )}
    </div>
  );
};

export default MerchantSourceField;
