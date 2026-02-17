import { useMemo } from 'react';
import { Coins } from 'lucide-react';
import Input from '../ui/Input';
import { getCurrentCurrency, CURRENCY } from '../../utils/validation';

interface AmountFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  success?: boolean;
  required?: boolean;
  placeholder?: string;
}

/**
 * Amount input field with dynamic currency display
 * Shows the currency symbol from settings (RSD, USD, EUR, etc.)
 */
export const AmountField = ({
  label = 'Amount',
  value,
  onChange,
  onBlur,
  disabled = false,
  error,
  success = false,
  required = false,
  placeholder = '0.00',
}: AmountFieldProps) => {
  const currency = useMemo(() => getCurrentCurrency(), []);
  const currencySymbol = CURRENCY.SYMBOLS[currency] || currency;

  return (
    <Input
      label={label}
      type="number"
      step="0.01"
      min="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      error={error}
      success={success}
      leftIcon={<Coins className="w-4 h-4 text-slate-400" />}
      rightIcon={
        <span className="text-sm font-medium text-slate-400 px-2">
          {currencySymbol}
        </span>
      }
      placeholder={placeholder}
      required={required}
    />
  );
};

export default AmountField;
