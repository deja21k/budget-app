import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, RefreshCw, AlertCircle, Check } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { 
  formatCurrency, 
  getCurrentCurrency, 
  calculateItemsTotal, 
  amountsMatch,
  type TransactionItemInput,
  VALIDATION 
} from '../utils/validation';

interface TransactionItemsProps {
  items: TransactionItemInput[];
  onChange: (items: TransactionItemInput[]) => void;
  transactionAmount?: number;
  onSyncToAmount?: () => void;
  disabled?: boolean;
}

interface ItemErrors {
  name?: string;
  quantity?: string;
  unit_price?: string;
}

export const TransactionItems = ({
  items,
  onChange,
  transactionAmount,
  onSyncToAmount,
  disabled = false,
}: TransactionItemsProps) => {
  const [isExpanded, setIsExpanded] = useState(items.length > 0);
  const [errors, setErrors] = useState<Record<number, ItemErrors>>({});
  const currency = getCurrentCurrency();

  const itemsTotal = useMemo(() => calculateItemsTotal(items), [items]);
  const isSynced = useMemo(() => {
    if (transactionAmount === undefined || items.length === 0) return true;
    return amountsMatch(transactionAmount, itemsTotal);
  }, [transactionAmount, itemsTotal, items.length]);

  const validateItem = (item: TransactionItemInput): ItemErrors => {
    const errs: ItemErrors = {};

    if (!item.name || item.name.trim() === '') {
      errs.name = 'Required';
    } else if (item.name.length > VALIDATION.MAX_ITEM_NAME_LENGTH) {
      errs.name = 'Too long';
    }

    if (item.quantity !== undefined && (isNaN(item.quantity) || item.quantity <= 0)) {
      errs.quantity = 'Invalid';
    }

    if (item.unit_price === undefined || isNaN(item.unit_price) || item.unit_price < 0) {
      errs.unit_price = 'Invalid';
    }

    return errs;
  };

  const addItem = () => {
    if (items.length >= VALIDATION.MAX_ITEMS_PER_TRANSACTION) return;

    const newItems = [...items, { name: '', quantity: 1, unit_price: 0 }];
    onChange(newItems);
    setErrors((prev) => ({ ...prev, [newItems.length - 1]: {} }));
    if (!isExpanded) setIsExpanded(true);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);

    const newErrors: Record<number, ItemErrors> = {};
    Object.entries(errors).forEach(([key, value]) => {
      const keyNum = parseInt(key, 10);
      if (keyNum < index) {
        newErrors[keyNum] = value;
      } else if (keyNum > index) {
        newErrors[keyNum - 1] = value;
      }
    });
    setErrors(newErrors);
  };

  const updateItem = (
    index: number,
    field: keyof TransactionItemInput,
    value: string | number
  ) => {
    const newItems = [...items];

    if (field === 'name') {
      newItems[index] = { ...newItems[index], name: String(value) };
    } else if (field === 'quantity') {
      const qty = parseFloat(String(value)) || 0;
      newItems[index] = { ...newItems[index], quantity: qty };
    } else if (field === 'unit_price') {
      const price = parseFloat(String(value)) || 0;
      newItems[index] = { ...newItems[index], unit_price: price };
    }

    onChange(newItems);

    const itemErrors = validateItem(newItems[index]);
    setErrors((prev) => ({ ...prev, [index]: itemErrors }));
  };

  const calculateItemTotal = (item: TransactionItemInput): number => {
    const qty = item.quantity ?? 1;
    const price = item.unit_price ?? 0;
    return Number((qty * price).toFixed(2));
  };

  const formatNumberInput = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    return String(value);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            Itemized Purchase
          </span>
          {items.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          )}
          {!isSynced && transactionAmount !== undefined && items.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Differs from amount
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-sm font-semibold text-slate-700">
              {formatCurrency(itemsTotal, currency)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  disabled={disabled}
                  error={errors[index]?.name}
                  className="text-sm bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    min="0.001"
                    step="0.001"
                    value={formatNumberInput(item.quantity)}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    disabled={disabled}
                    error={errors[index]?.quantity}
                    className="text-sm bg-white"
                  />
                  <Input
                    type="number"
                    placeholder="Unit price"
                    min="0"
                    step="0.01"
                    value={formatNumberInput(item.unit_price)}
                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                    disabled={disabled}
                    error={errors[index]?.unit_price}
                    className="text-sm bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-semibold text-slate-700 min-w-[80px] text-right">
                  {formatCurrency(calculateItemTotal(item), currency)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={disabled}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add item button */}
          {items.length < VALIDATION.MAX_ITEMS_PER_TRANSACTION && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addItem}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Add Item
            </Button>
          )}

          {/* Items summary */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Items Total</span>
                {isSynced && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-slate-700">
                  {formatCurrency(itemsTotal, currency)}
                </span>
                {onSyncToAmount && !isSynced && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onSyncToAmount}
                    disabled={disabled}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Sync to Amount
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionItems;
