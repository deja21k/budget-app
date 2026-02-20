import { Store, Briefcase, Sparkles } from 'lucide-react';
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
}

export const MerchantSourceField = ({
  type,
  value,
  onChange,
  onBlur,
  disabled = false,
  error,
  touched = false,
  isAutoCategorized = false,
}: MerchantSourceFieldProps) => {
  const isExpense = type === 'expense';
  
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
