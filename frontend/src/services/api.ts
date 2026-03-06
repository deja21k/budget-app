import type { OCRResult, Receipt, Transaction, CreateTransactionInput, Category, SpendingAnalysis, AppSettings, DatabaseStats, ExportData } from '../types';
import { 
  safeString, 
  safeNumber, 
  withRetry, 
  createCircuitBreaker,
  isArray,
  isObject,
} from '../utils/defensive';

const API_BASE_URL = 'http://localhost:3000/api';

const isOnline = (): boolean => typeof navigator !== 'undefined' ? navigator.onLine : true;

const getAccountId = (): string => {
  try {
    const stored = localStorage.getItem('account_state');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.currentAccountId) return state.currentAccountId;
    }
  } catch {
    // Ignore errors
  }
  return 'default';
};

const DB_CACHE_KEYS = {
  transactions: 'cache_transactions',
  categories: 'cache_categories',
  receipts: 'cache_receipts',
  summary: 'cache_summary',
};

function getCachedData<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      const CACHE_TTL = 5 * 60 * 1000;
      if (Date.now() - timestamp < CACHE_TTL) {
        return data as T;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Failed to cache data:', e);
  }
}

// Circuit breakers for different API endpoints
const circuitBreakers = {
  transactions: createCircuitBreaker(5, 30000),
  receipts: createCircuitBreaker(3, 30000),
  categories: createCircuitBreaker(5, 30000),
  ocr: createCircuitBreaker(3, 60000),
  insights: createCircuitBreaker(5, 30000),
  export: createCircuitBreaker(3, 30000),
};

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category_id?: number;
  start_date?: string;
  end_date?: string;
  merchant?: string;
  limit?: number;
  offset?: number;
}

// Safe API response handler
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Response body is not JSON
    }
    
    throw new Error(errorMessage);
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }
  
  const text = await response.text();
  if (!text) return {} as T;
  
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response from server');
  }
};

// Safe fetch wrapper with timeout
const safeFetch = async <T>(
  url: string, 
  options?: RequestInit,
  timeout: number = 10000
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const accountId = getAccountId();
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options?.headers,
        'x-account-id': accountId,
      },
    });
    
    clearTimeout(timeoutId);
    return handleResponse<T>(response);
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
};

export const receiptService = {
  async scanReceipt(file: File): Promise<OCRResult> {
    // Validate file before upload
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file');
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, TIFF, BMP');
    }

    return withRetry(() =>
      circuitBreakers.ocr.execute(async () => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/ocr/scan`, {
          method: 'POST',
          body: formData,
        });

        return handleResponse<OCRResult>(response);
      }),
      3,
      2000
    );
  },

  async getReceipts(filters?: { status?: string; has_transaction?: boolean }): Promise<Receipt[]> {
    return withRetry(async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.has_transaction !== undefined) {
        params.append('has_transaction', String(filters.has_transaction));
      }
      
      const result = await safeFetch<Receipt[]>(
        `${API_BASE_URL}/receipts?${params}`,
        undefined,
        5000
      );
      
      return isArray<Receipt>(result) ? result : [];
    });
  },

  async getReceiptById(id: number): Promise<Receipt | null> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid receipt ID');
    
    return withRetry(async () => {
      try {
        const result = await safeFetch<Receipt>(
          `${API_BASE_URL}/receipts/${safeId}`,
          undefined,
          5000
        );
        return isObject(result) ? result : null;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
        throw error;
      }
    });
  },

  async linkReceiptToTransaction(receiptId: number, transactionId: number): Promise<Receipt> {
    const safeReceiptId = safeNumber(receiptId, 1);
    const safeTransactionId = safeNumber(transactionId, 1);
    
    if (!safeReceiptId || !safeTransactionId) {
      throw new Error('Invalid IDs');
    }

    return withRetry(() =>
      safeFetch<Receipt>(`${API_BASE_URL}/receipts/${safeReceiptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: safeTransactionId }),
      })
    );
  },

  async confirmReceipt(
    receiptId: number, 
    transactionData: Partial<CreateTransactionInput>
  ): Promise<{ transaction: Transaction; receipt: Receipt }> {
    const safeReceiptId = safeNumber(receiptId, 1);
    if (!safeReceiptId) throw new Error('Invalid receipt ID');

    return withRetry(() =>
      safeFetch<{ transaction: Transaction; receipt: Receipt }>(
        `${API_BASE_URL}/receipts/${safeReceiptId}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_data: transactionData }),
        }
      )
    );
  },

  async deleteReceipt(id: number): Promise<void> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid receipt ID');

    return withRetry(() =>
      safeFetch<void>(`${API_BASE_URL}/receipts/${safeId}`, {
        method: 'DELETE',
      })
    );
  },
};

export const categoryService = {
  async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    if (!isOnline()) {
      const cached = getCachedData<Category[]>(DB_CACHE_KEYS.categories);
      if (cached) return cached;
    }
    
    return withRetry(async () => {
      const params = type ? `?type=${type}` : '';
      const result = await safeFetch<Category[]>(
        `${API_BASE_URL}/categories${params}`,
        undefined,
        5000
      );
      const categories = isArray<Category>(result) ? result : [];
      setCachedData(DB_CACHE_KEYS.categories, categories);
      return categories;
    });
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    if (!isOnline()) {
      throw new Error('offline');
    }
    
    return withRetry(() =>
      safeFetch<Category>(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid category ID');

    return withRetry(() =>
      safeFetch<Category>(`${API_BASE_URL}/categories/${safeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async deleteCategory(id: number): Promise<void> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid category ID');

    return withRetry(() =>
      safeFetch<void>(`${API_BASE_URL}/categories/${safeId}`, {
        method: 'DELETE',
      })
    );
  },

  // Auto-categorization based on merchant name (safe version)
  getSuggestedCategory(merchant: string, categories: Category[]): Category | null {
    const safeMerchant = safeString(merchant, 200);
    if (!safeMerchant || !isArray(categories)) return null;
    
    const merchantLower = safeMerchant.toLowerCase();
    
    const rules: { [key: string]: string[] } = {
      // International merchants
      'Groceries': [
        'whole foods', 'trader joe', 'walmart', 'kroger', 'safeway', 'grocery', 'market', 'supermarket',
        // Serbian grocery chains (Latin)
        'maxi', 'univerexport', 'lidl', 'tempo', 'dis', 'mercator', 'roda', 'ideja', 'idea', 
        's-m', 'sas', 'gomex', 'aman', 'mega maxi', 'euro', 'trafika',
        // Serbian grocery chains (Cyrillic)
        'макси', 'универекспорт', 'лидл', 'темпо', 'дис', 'меркатор', 'рода', 'идеја',
        'аман', 'гомекс', 'трафика',
      ],
      'Dining Out': [
        'restaurant', 'cafe', 'coffee', 'mcdonald', 'starbucks', 'chipotle', 'pizza', 'sushi',
        // Serbian dining (Latin)
        'restoran', 'kafana', 'kafic', 'cafe', 'pekara', 'picerija', 'grill', 'rostilj',
        'kfc', 'burger king', 'dunkin', 'carls jr', 'walter', 'riblja corba',
        // Serbian dining (Cyrillic)
        'ресторан', 'кафана', 'кафић', 'пекара', 'пицерија', 'грил', 'роштиљ',
      ],
      'Transportation': [
        'uber', 'lyft', 'shell', 'exxon', 'chevron', 'gas', 'parking', 'metro', 'transit',
        // Serbian transport (Latin)
        'nafs', 'mol', 'omv', 'lukoil', 'gazprom', 'parking', 'garaza', 'beograd',
        'srbija voz', 'red voznje', 'autobus', 'prevoz', 'taxi', 'cargo', 'cargox', 'pink taxi',
        // Serbian transport (Cyrillic)
        'нафс', 'паркинг', 'гаража', 'бEOГРAД', 'аутобус', 'превоз', 'такси',
      ],
      'Entertainment': [
        'netflix', 'spotify', 'movie', 'theater', 'cinema', 'game', 'ticket',
        // Serbian entertainment (Latin)
        'bioskop', 'cineplexx', 'cinestar', 'tuckwood', 'sava centar', 'dom sindikata',
        'stark arena', 'beogradska arena', 'klub', 'diskoteka', 'sportski centar',
        // Serbian entertainment (Cyrillic)
        'биоскоп', 'клуб', 'дискотека', 'спортски центар',
      ],
      'Shopping': [
        'amazon', 'target', 'walmart', 'costco', 'best buy', 'shopping', 'mall',
        // Serbian shopping (Latin)
        'usce', 'usce shopping', 'delta city', 'rajiceva', 'big', 'big fashion', 
        'immocentar', 'immocentar', 'tc', 'trzni centar', 'robot', 'tehno mag', 'win win',
        'jumbo', 'dzumbo', 'hm', 'zara', 'reserved', 'house', 'cropp', 'mohito',
        // Serbian shopping (Cyrillic)
        'ушће', 'дельта сити', 'тржни центар', 'робот',
      ],
      'Healthcare': [
        'pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'medical', 'dental',
        // Serbian healthcare (Latin)
        'apoteka', 'zegin', 'benu', 'dm', 'lilly', 'super apoteka', 'galenika',
        'ordinacija', 'stomatolog', 'dentist', 'bolnica', 'kbc', 'dom zdravlja',
        // Serbian healthcare (Cyrillic)
        'апотека', 'ординација', 'стоматолог', 'болница', 'дом здравља',
      ],
      'Utilities': [
        'electric', 'water', 'gas bill', 'internet', 'phone', 'utility',
        // Serbian utilities (Latin)
        'eps', 'beograd gas', 'srbijagas', 'telekom', 'mts', 'telenor', 'yettel', 
        'sbb', 'supernova', 'orion', 'pošta', 'posta', 'vodovod', 'toplana',
        // Serbian utilities (Cyrillic)
        'електропривреда', 'телеком', 'пошта', 'водовод', 'топлана',
      ],
    };

    for (const [categoryName, keywords] of Object.entries(rules)) {
      if (keywords.some(keyword => merchantLower.includes(keyword))) {
        return categories.find(c => c.name === categoryName && c.type === 'expense') || null;
      }
    }

    return null;
  },
};

export const transactionService = {
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    if (!isOnline()) {
      const cached = getCachedData<Transaction[]>(DB_CACHE_KEYS.transactions);
      if (cached) return cached;
    }
    
    return withRetry(async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      
      const result = await safeFetch<Transaction[]>(
        `${API_BASE_URL}/transactions?${params}`,
        undefined,
        10000
      );
      
      const transactions = isArray<Transaction>(result) ? result : [];
      setCachedData(DB_CACHE_KEYS.transactions, transactions);
      return transactions;
    });
  },

  async getTransactionById(id: number): Promise<Transaction | null> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid transaction ID');

    return withRetry(async () => {
      try {
        const result = await safeFetch<Transaction>(
          `${API_BASE_URL}/transactions/${safeId}`,
          undefined,
          5000
        );
        return isObject(result) ? result : null;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
        throw error;
      }
    });
  },

  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    if (!isOnline()) {
      throw new Error('offline');
    }
    
    return withRetry(() =>
      circuitBreakers.transactions.execute(() =>
        safeFetch<Transaction>(`${API_BASE_URL}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      ),
      3,
      1000
    );
  },

  async updateTransaction(id: number, data: Partial<CreateTransactionInput>): Promise<Transaction> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid transaction ID');

    return withRetry(() =>
      safeFetch<Transaction>(`${API_BASE_URL}/transactions/${safeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async deleteTransaction(id: number): Promise<void> {
    const safeId = safeNumber(id, 1);
    if (!safeId) throw new Error('Invalid transaction ID');

    return withRetry(() =>
      safeFetch<void>(`${API_BASE_URL}/transactions/${safeId}`, {
        method: 'DELETE',
      })
    );
  },

  async getSummary(startDate?: string, endDate?: string): Promise<{
    total_income: number;
    total_expense: number;
    net_amount: number;
    transaction_count: number;
  }> {
    if (!isOnline()) {
      const cached = getCachedData<{
        total_income: number;
        total_expense: number;
        net_amount: number;
        transaction_count: number;
      }>(DB_CACHE_KEYS.summary);
      if (cached) return cached;
    }
    
    return withRetry(async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const result = await safeFetch<{
        total_income: number;
        total_expense: number;
        net_amount: number;
        transaction_count: number;
      }>(`${API_BASE_URL}/transactions/summary?${params}`, undefined, 5000);
      
      const summary = {
        total_income: safeNumber(result.total_income, 0) ?? 0,
        total_expense: safeNumber(result.total_expense, 0) ?? 0,
        net_amount: safeNumber(result.net_amount) ?? 0,
        transaction_count: safeNumber(result.transaction_count, 0) ?? 0,
      };
      
      setCachedData(DB_CACHE_KEYS.summary, summary);
      return summary;
    });
  },
};

export const insightsService = {
  async getAnalysis(startDate?: string, endDate?: string): Promise<SpendingAnalysis> {
    return withRetry(async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const result = await safeFetch<SpendingAnalysis>(
        `${API_BASE_URL}/insights/analysis?${params}`,
        undefined,
        10000
      );
      
      return isObject(result) ? result : {} as SpendingAnalysis;
    });
  },

  async getSummary(startDate?: string, endDate?: string): Promise<{
    summary_text: string;
    period_start: string;
    period_end: string;
    total_income: number;
    total_expenses: number;
    net_amount: number;
  }> {
    return withRetry(async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const result = await safeFetch<{
        summary_text: string;
        period_start: string;
        period_end: string;
        total_income: number;
        total_expenses: number;
        net_amount: number;
      }>(`${API_BASE_URL}/insights/summary?${params}`, undefined, 10000);
      
      return {
        summary_text: safeString(result.summary_text) ?? '',
        period_start: safeString(result.period_start) ?? '',
        period_end: safeString(result.period_end) ?? '',
        total_income: safeNumber(result.total_income, 0) ?? 0,
        total_expenses: safeNumber(result.total_expenses, 0) ?? 0,
        net_amount: safeNumber(result.net_amount) ?? 0,
      };
    });
  },
};

export const exportService = {
  async exportJSON(): Promise<Blob> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/export/json`);
      if (!response.ok) throw new Error('Failed to export data');
      return response.blob();
    });
  },

  async exportTransactionsCSV(): Promise<Blob> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/export/csv/transactions`);
      if (!response.ok) throw new Error('Failed to export transactions');
      return response.blob();
    });
  },

  async exportSummaryCSV(): Promise<Blob> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/export/csv/summary`);
      if (!response.ok) throw new Error('Failed to export summary');
      return response.blob();
    });
  },

  async getStats(): Promise<DatabaseStats> {
    return withRetry(async () => {
      const result = await safeFetch<DatabaseStats>(
        `${API_BASE_URL}/export/stats`,
        undefined,
        5000
      );
      return isObject(result) ? result : {} as DatabaseStats;
    });
  },

  async importJSON(data: ExportData): Promise<{ success: boolean; imported: { categories: number; transactions: number; receipts: number }; errors: string[] }> {
    return withRetry(() =>
      safeFetch<{ success: boolean; imported: { categories: number; transactions: number; receipts: number }; errors: string[] }>(
        `${API_BASE_URL}/export/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
    );
  },

  async resetData(): Promise<{ success: boolean; message: string }> {
    return withRetry(() =>
      safeFetch<{ success: boolean; message: string }>(
        `${API_BASE_URL}/export/reset`,
        { method: 'POST' }
      )
    );
  },
};

const SETTINGS_KEY = 'budget_app_settings';

export const settingsService = {
  getSettings(): AppSettings {
    const defaultSettings: AppSettings = {
      currency: 'RSD',
      timezone: 'Europe/Belgrade',
      dateFormat: 'DD/MM/YYYY',
      theme: 'system',
      monthlyBudget: 100000,
      notifications: {
        budgetAlerts: true,
        weeklySummary: true,
        recurringReminders: false,
        featureUpdates: true,
      },
      privacy: {
        shareAnalytics: false,
        autoBackup: false,
      },
    };

    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        return { ...defaultSettings, ...parsed };
      }
    } catch {
      // Invalid stored data - will return defaults
    }

    return defaultSettings;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    this.saveSettings(updated);
    return updated;
  },

  resetSettings(): AppSettings {
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
    return this.getSettings();
  },
};

export const offlineUtils = {
  isOnline,
  getCachedData,
  setCachedData,
  clearCache: () => {
    Object.values(DB_CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};
