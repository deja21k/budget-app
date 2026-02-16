import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  Store, 
  Check, 
  AlertCircle,
  Sparkles,
  Mic,
} from 'lucide-react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { TransactionItems } from './TransactionItems';
import { VoiceExpenseWizard } from './VoiceExpenseWizard';
import {
  TransactionTypeSelector,
  CategorySelect,
  RecurringToggle,
  RegretFlagSelector,
  ReceiptSelector,
  ReceiptList,
  FormSection,
} from './transaction';
import { 
  transactionService, 
  categoryService, 
  receiptService 
} from '../services/api';
import type { 
  Category, 
  Receipt as ReceiptType, 
  Transaction, 
  CreateTransactionItemInput 
} from '../types';
import type { VoiceExpenseData } from '../utils/voiceExpenseTypes';
import { 
  validateAmount,
  validateDate,
  validateCategory,
  validateMerchant,
  validateDescription,
  validateItems,
  calculateItemsTotal,
  type TransactionType,
  type RegretFlag,
  type RecurringFrequency,
} from '../utils/validation';

// Constants
const RECENT_CATEGORIES_KEY = 'recent_categories';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
  linkedReceipt?: ReceiptType | null;
}

interface FormData {
  type: TransactionType;
  amount: string;
  description: string;
  merchant: string;
  date: string;
  category_id: string;
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency;
  regret_flag: RegretFlag;
  items: CreateTransactionItemInput[];
}

interface FormErrors {
  amount?: string;
  date?: string;
  category_id?: string;
  merchant?: string;
  description?: string;
  items?: string;
  submit?: string;
}

const initialFormData: FormData = {
  type: 'expense',
  amount: '',
  description: '',
  merchant: '',
  date: new Date().toISOString().split('T')[0],
  category_id: '',
  is_recurring: false,
  recurring_frequency: 'monthly',
  regret_flag: 'neutral',
  items: [],
};

export const TransactionForm = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  linkedReceipt,
}: TransactionFormProps) => {
  // State
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentCategoryIds, setRecentCategoryIds] = useState<number[]>([]);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoCategorized, setIsAutoCategorized] = useState(false);
  const [showReceiptSelector, setShowReceiptSelector] = useState(false);
  const [showVoiceWizard, setShowVoiceWizard] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Refs
  const isMountedRef = useRef(true);

  // Effects
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setTouched({});
      setShowSuccessMessage(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isMountedRef.current) return;

    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const [cats, rcpts] = await Promise.all([
          categoryService.getCategories(),
          receiptService.getReceipts({ has_transaction: false }),
        ]);
        
        if (!isMountedRef.current) return;
        
        setCategories(cats);
        setReceipts(rcpts);
        loadRecentCategories();

        if (transaction) {
          setFormData({
            type: transaction.type,
            amount: transaction.amount.toString(),
            description: transaction.description || '',
            merchant: transaction.merchant || '',
            date: transaction.date,
            category_id: transaction.category_id?.toString() || '',
            is_recurring: transaction.is_recurring === 1,
            recurring_frequency: transaction.recurring_frequency || 'monthly',
            regret_flag: transaction.regret_flag || 'neutral',
            items: transaction.items?.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })) || [],
          });
          setIsAutoCategorized(false);
        } else {
          setFormData(initialFormData);
          setSelectedReceipt(linkedReceipt || null);
          setIsAutoCategorized(false);
        }
        
        setErrors({});
        setTouched({});
      } catch (error) {
        console.error('Failed to load form data:', error);
        setErrors({ submit: 'Failed to load required data. Please try again.' });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [isOpen, transaction?.id, linkedReceipt?.id]);

  // Auto-categorization effect
  useEffect(() => {
    if (
      formData.merchant &&
      !transaction &&
      !isAutoCategorized &&
      categories.length > 0 &&
      isMountedRef.current &&
      formData.type === 'expense'
    ) {
      const suggested = categoryService.getSuggestedCategory(formData.merchant, categories);
      if (suggested) {
        setFormData(prev => ({ ...prev, category_id: suggested.id.toString() }));
        setIsAutoCategorized(true);
      }
    }
  }, [formData.merchant, categories, transaction, isAutoCategorized, formData.type]);

  // Helpers
  const loadRecentCategories = () => {
    try {
      const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentCategoryIds(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore parsing errors
    }
  };

  const saveRecentCategory = (categoryId: number) => {
    try {
      const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
      let recent: number[] = stored ? JSON.parse(stored) : [];
      recent = [categoryId, ...recent.filter(id => id !== categoryId)].slice(0, 5);
      localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(recent));
      setRecentCategoryIds(recent);
    } catch {
      // Ignore storage errors
    }
  };

  // Validation
  const validateField = useCallback((name: keyof FormData, value: unknown): string | undefined => {
    switch (name) {
      case 'amount':
        return validateAmount(value as string);
      case 'date':
        return validateDate(value as string);
      case 'category_id':
        return validateCategory(value as string, categories);
      case 'merchant':
        return validateMerchant(value as string);
      case 'description':
        return validateDescription(value as string);
      case 'items':
        return validateItems(value as CreateTransactionItemInput[]);
      default:
        return undefined;
    }
  }, [categories]);

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    const fields: (keyof FormData)[] = ['amount', 'date', 'category_id', 'merchant', 'description', 'items'];
    
    fields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  // Handlers
  const handleFieldChange = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'merchant' && isAutoCategorized) {
      setIsAutoCategorized(false);
    }

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error, submit: undefined }));
    }
  }, [touched, isAutoCategorized, validateField]);

  const handleFieldBlur = useCallback((field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [formData, validateField]);

  const handleTypeChange = useCallback((type: TransactionType) => {
    setFormData(prev => ({ ...prev, type, category_id: '' }));
    setIsAutoCategorized(false);
    if (errors.category_id) {
      setErrors(prev => ({ ...prev, category_id: undefined }));
    }
  }, [errors.category_id]);

  const handleItemsChange = useCallback((items: CreateTransactionItemInput[]) => {
    setFormData(prev => ({ ...prev, items }));
    if (touched.items) {
      const error = validateItems(items);
      setErrors(prev => ({ ...prev, items: error }));
    }
  }, [touched.items]);

  const handleSyncItemsToAmount = useCallback(() => {
    const itemsTotal = calculateItemsTotal(formData.items);
    if (itemsTotal > 0) {
      setFormData(prev => ({ ...prev, amount: itemsTotal.toFixed(2) }));
      if (touched.amount) {
        setErrors(prev => ({ ...prev, amount: undefined }));
      }
    }
  }, [formData.items, touched.amount]);

  const handleReceiptSelect = useCallback((receipt: ReceiptType) => {
    setSelectedReceipt(receipt);
    setShowReceiptSelector(false);

    if (receipt.extracted_merchant) {
      setFormData(prev => ({ ...prev, merchant: receipt.extracted_merchant! }));
      setIsAutoCategorized(false);
    }
    if (receipt.extracted_amount) {
      setFormData(prev => ({ ...prev, amount: receipt.extracted_amount!.toString() }));
    }
    if (receipt.extracted_date) {
      const extractedDate = new Date(receipt.extracted_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (!isNaN(extractedDate.getTime()) && extractedDate <= today) {
        setFormData(prev => ({ ...prev, date: receipt.extracted_date! }));
      }
    }
  }, []);

  const handleVoiceExpense = useCallback((data: VoiceExpenseData) => {
    if (data.merchant) {
      setFormData(prev => ({ ...prev, merchant: data.merchant }));
      setIsAutoCategorized(false);
    }

    if (data.totalAmount !== null && data.totalAmount !== undefined) {
      setFormData(prev => ({ ...prev, amount: String(data.totalAmount) }));
    }

    if (data.category && categories.length > 0) {
      const voiceCategoryName = data.category.toLowerCase();
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === voiceCategoryName && c.type === 'expense'
      );

      if (matchedCategory) {
        setFormData(prev => ({ ...prev, category_id: matchedCategory.id.toString() }));
      } else if (data.merchant) {
        const suggestedCategory = categoryService.getSuggestedCategory(data.merchant, categories);
        if (suggestedCategory) {
          setFormData(prev => ({ ...prev, category_id: suggestedCategory.id.toString() }));
        }
      }
    } else if (data.merchant && categories.length > 0) {
      const suggestedCategory = categoryService.getSuggestedCategory(data.merchant, categories);
      if (suggestedCategory) {
        setFormData(prev => ({ ...prev, category_id: suggestedCategory.id.toString() }));
      }
    }

    if (data.items && data.items.length > 0) {
      const items: CreateTransactionItemInput[] = data.items.map(item => ({
        name: item.name,
        quantity: 1,
        unit_price: item.amount || 0,
      }));
      setFormData(prev => ({ ...prev, items }));
    }

    setTouched({
      amount: true,
      date: true,
      category_id: true,
      merchant: true,
    });

    if (!data.totalAmount) {
      setErrors(prev => ({ ...prev, amount: 'Please enter an amount' }));
    }
    if (!data.merchant) {
      setErrors(prev => ({ ...prev, merchant: 'Please enter a merchant' }));
    }

    setShowVoiceWizard(false);
  }, [categories]);

  const handleSubmit = async () => {
    if (!isMountedRef.current) return;

    setTouched({
      amount: true,
      date: true,
      category_id: true,
      merchant: true,
      description: true,
      items: true,
    });

    if (!validateAll() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const categoryId = parseInt(formData.category_id, 10);
      if (!isNaN(categoryId)) {
        saveRecentCategory(categoryId);
      }

      const data = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || undefined,
        merchant: formData.merchant.trim() || undefined,
        date: formData.date,
        category_id: !isNaN(categoryId) ? categoryId : undefined,
        receipt_image_path: selectedReceipt?.image_path,
        is_recurring: formData.type === 'expense' ? formData.is_recurring : undefined,
        recurring_frequency: formData.type === 'expense' && formData.is_recurring 
          ? formData.recurring_frequency 
          : undefined,
        regret_flag: formData.type === 'expense' ? formData.regret_flag : undefined,
        items: formData.items.length > 0 ? formData.items : undefined,
      };

      if (transaction) {
        await transactionService.updateTransaction(transaction.id, data);
      } else {
        const newTransaction = await transactionService.createTransaction(data);

        if (selectedReceipt && newTransaction.id) {
          try {
            await receiptService.linkReceiptToTransaction(selectedReceipt.id, newTransaction.id);
          } catch (linkError) {
            console.error('Failed to link receipt:', linkError);
          }
        }
      }

      if (!isMountedRef.current) return;

      setShowSuccessMessage(true);

      setTimeout(() => {
        if (isMountedRef.current) {
          onSuccess();
          onClose();
        }
      }, 800);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      console.error('Failed to save transaction:', error);

      let errorMessage = 'Failed to save transaction. Please try again.';

      if (error instanceof Error) {
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message?.includes('unique') || error.message?.includes('already exists')) {
          errorMessage = 'A transaction with these details already exists.';
        }
      }

      setErrors({ submit: errorMessage });
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <>
      <Modal
        isOpen={isOpen && !showReceiptSelector}
        onClose={handleClose}
        title={transaction ? 'Edit Transaction' : 'Add Transaction'}
        description={transaction ? 'Update transaction details' : 'Create a new transaction'}
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting || isLoading}
              leftIcon={!isSubmitting ? <Check className="w-4 h-4" /> : undefined}
              className="order-1 sm:order-2"
            >
              {transaction ? 'Update' : 'Save'} Transaction
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Success message */}
          {showSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-emerald-800 font-medium">
                Transaction {transaction ? 'updated' : 'created'} successfully!
              </span>
            </div>
          )}

          {/* Section 1: Type & Amount */}
          <FormSection title="Transaction Type">
            <TransactionTypeSelector
              value={formData.type}
              onChange={handleTypeChange}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleFieldChange('amount', e.target.value)}
                onBlur={() => handleFieldBlur('amount')}
                disabled={isSubmitting}
                error={touched.amount ? errors.amount : undefined}
                success={touched.amount && !errors.amount && formData.amount !== ''}
                leftIcon={<DollarSign className="w-4 h-4" />}
                placeholder="0.00"
                required
              />

              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                onBlur={() => handleFieldBlur('date')}
                disabled={isSubmitting}
                error={touched.date ? errors.date : undefined}
                success={touched.date && !errors.date}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
              />
            </div>
          </FormSection>

          {/* Section 2: Details */}
          <FormSection title="Details">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  label="Merchant / Store"
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => handleFieldChange('merchant', e.target.value)}
                  onBlur={() => handleFieldBlur('merchant')}
                  disabled={isSubmitting}
                  error={touched.merchant ? errors.merchant : undefined}
                  leftIcon={<Store className="w-4 h-4" />}
                  placeholder="e.g., Whole Foods Market"
                  maxLength={100}
                  showCharCount
                />
              </div>
              <div className="pt-[34px]">
                <button
                  type="button"
                  onClick={() => setShowVoiceWizard(true)}
                  disabled={isSubmitting}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 disabled:opacity-50"
                  title="Voice input"
                  aria-label="Use voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isAutoCategorized && formData.category_id && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">
                <Sparkles className="w-3.5 h-3.5" />
                Auto-categorized based on merchant
              </div>
            )}

            <CategorySelect
              categories={filteredCategories}
              value={formData.category_id}
              onChange={(value) => handleFieldChange('category_id', value)}
              onBlur={() => handleFieldBlur('category_id')}
              disabled={isSubmitting}
              isLoading={isLoading}
              error={errors.category_id}
              touched={touched.category_id}
              recentCategoryIds={recentCategoryIds}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                onBlur={() => handleFieldBlur('description')}
                disabled={isSubmitting}
                maxLength={500}
                className={`
                  w-full rounded-xl border bg-white px-4 py-3 text-slate-900
                  transition-all duration-200 outline-none
                  placeholder:text-slate-400
                  min-h-[80px] resize-none
                  ${errors.description && touched.description
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }
                  hover:border-slate-300
                  disabled:bg-slate-50 disabled:text-slate-500
                `}
                placeholder="Add any additional details..."
                rows={2}
              />
              <div className="flex items-center justify-end mt-1.5">
                <span className="text-xs text-slate-400">
                  {formData.description.length}/500
                </span>
              </div>
            </div>
          </FormSection>

          {/* Section 3: Items (Expense only) */}
          {formData.type === 'expense' && (
            <FormSection title="Items">
              <TransactionItems
                items={formData.items}
                onChange={handleItemsChange}
                transactionAmount={parseFloat(formData.amount) || undefined}
                onSyncToAmount={handleSyncItemsToAmount}
                disabled={isSubmitting}
              />
              {errors.items && touched.items && (
                <p className="text-sm text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.items}
                </p>
              )}
            </FormSection>
          )}

          {/* Section 4: Behavior (Expense only) */}
          {formData.type === 'expense' && (
            <FormSection title="Behavior" description="Track recurring expenses and how you feel about purchases">
              <RecurringToggle
                isRecurring={formData.is_recurring}
                frequency={formData.recurring_frequency}
                onToggle={(isRecurring) => handleFieldChange('is_recurring', isRecurring)}
                onFrequencyChange={(freq) => handleFieldChange('recurring_frequency', freq)}
                disabled={isSubmitting}
              />

              <RegretFlagSelector
                value={formData.regret_flag}
                onChange={(value) => handleFieldChange('regret_flag', value)}
                disabled={isSubmitting}
              />
            </FormSection>
          )}

          {/* Section 5: Receipt */}
          {!transaction && (
            <FormSection title="Receipt">
              <ReceiptSelector
                selectedReceipt={selectedReceipt}
                onSelect={handleReceiptSelect}
                onClear={() => setSelectedReceipt(null)}
                onOpenSelector={() => setShowReceiptSelector(true)}
                disabled={isSubmitting}
              />
            </FormSection>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errors.submit}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt Selector Modal */}
      <Modal
        isOpen={showReceiptSelector}
        onClose={() => setShowReceiptSelector(false)}
        title="Select Receipt"
        description="Choose a receipt to link to this transaction"
        size="md"
      >
        <ReceiptList
          receipts={receipts}
          onSelect={handleReceiptSelect}
        />
      </Modal>

      {/* Voice Wizard */}
      {showVoiceWizard && (
        <VoiceExpenseWizard
          onComplete={handleVoiceExpense}
          onCancel={() => setShowVoiceWizard(false)}
        />
      )}
    </>
  );
};

export default TransactionForm;
