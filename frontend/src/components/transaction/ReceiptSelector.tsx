import { Link, X, Receipt, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import type { Receipt as ReceiptType } from '../../types';
import { formatCurrency, getCurrentCurrency } from '../../utils/validation';

interface ReceiptSelectorProps {
  selectedReceipt: ReceiptType | null;
  onSelect: (receipt: ReceiptType) => void;
  onClear: () => void;
  onOpenSelector: () => void;
  disabled?: boolean;
}

export const ReceiptSelector = ({
  selectedReceipt,
  onSelect,
  onClear,
  onOpenSelector,
  disabled = false,
}: ReceiptSelectorProps) => {
  const currency = getCurrentCurrency();

  if (selectedReceipt) {
    return (
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Receipt className="w-6 h-6 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {selectedReceipt.extracted_merchant || 'Receipt'}
          </p>
          <p className="text-xs text-slate-500">
            {selectedReceipt.extracted_amount
              ? formatCurrency(selectedReceipt.extracted_amount, currency)
              : 'No amount extracted'}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={disabled}
          className="!p-2 flex-shrink-0"
          aria-label="Remove receipt"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={onOpenSelector}
      disabled={disabled}
      leftIcon={<Link className="w-4 h-4" />}
      className="w-full justify-center"
    >
      Link Existing Receipt
    </Button>
  );
};

interface ReceiptListProps {
  receipts: ReceiptType[];
  onSelect: (receipt: ReceiptType) => void;
  emptyMessage?: string;
}

export const ReceiptList = ({
  receipts,
  onSelect,
  emptyMessage = 'No unlinked receipts found',
}: ReceiptListProps) => {
  const currency = getCurrentCurrency();

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-16 h-16 mx-auto mb-4 text-slate-200" />
        <p className="text-slate-500 font-medium">{emptyMessage}</p>
        <p className="text-sm text-slate-400 mt-1">
          Scan a receipt first to link it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {receipts.map((receipt) => (
        <button
          key={receipt.id}
          onClick={() => onSelect(receipt)}
          className="
            w-full flex items-center gap-4 p-4 rounded-xl
            bg-slate-50 hover:bg-slate-100
            transition-colors duration-200
            text-left
            border border-transparent hover:border-slate-200
          "
        >
          <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {receipt.image_url ? (
              <img
                src={`http://localhost:3000${receipt.image_url}`}
                alt="Receipt thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Receipt className="w-6 h-6 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {receipt.extracted_merchant || 'Unknown Store'}
            </p>
            <p className="text-sm text-slate-500">
              {receipt.extracted_date ||
                new Date(receipt.created_at).toLocaleDateString()}
            </p>
          </div>

          {receipt.extracted_amount && (
            <span className="font-bold text-slate-900">
              {formatCurrency(receipt.extracted_amount, currency)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ReceiptSelector;
