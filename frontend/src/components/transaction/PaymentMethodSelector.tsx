import { Wallet, CreditCard, Banknote, Smartphone, HelpCircle } from 'lucide-react';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon: typeof Wallet;
  description: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'card',
    label: 'Card',
    icon: CreditCard,
    description: 'Credit or debit card',
  },
  {
    value: 'cash',
    label: 'Cash',
    icon: Banknote,
    description: 'Physical cash payment',
  },
  {
    value: 'digital_wallet',
    label: 'Digital Wallet',
    icon: Smartphone,
    description: 'Apple Pay, Google Pay, PayPal, etc.',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    icon: Wallet,
    description: 'Direct bank transfer',
  },
  {
    value: 'other',
    label: 'Other',
    icon: HelpCircle,
    description: 'Other payment method',
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled?: boolean;
}

/**
 * Payment Method Selector for expense transactions
 * Shows common payment options with icons for quick selection
 */
export const PaymentMethodSelector = ({
  value,
  onChange,
  disabled = false,
}: PaymentMethodSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Payment Method
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PAYMENT_METHODS.map(({ value: methodValue, label, icon: Icon, description }) => {
          const isSelected = value === methodValue;

          return (
            <button
              key={methodValue}
              type="button"
              onClick={() => !disabled && onChange(methodValue)}
              disabled={disabled}
              title={description}
              className={`
                relative p-3 rounded-xl border text-left
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                />
                <span className="text-sm font-medium">{label}</span>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
