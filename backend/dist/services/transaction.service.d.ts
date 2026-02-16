import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilters, TransactionSummary } from '../models/transaction.model';
export declare class TransactionService {
    private db;
    /**
     * Validate and sanitize create input
     */
    private validateCreateInput;
    /**
     * Create transaction items
     */
    private createItems;
    /**
     * Get items for a transaction
     */
    private getItems;
    /**
     * Delete all items for a transaction
     */
    private deleteItems;
    /**
     * Create a new transaction with validation
     */
    create(input: CreateTransactionInput): Transaction;
    /**
      * Find transaction by ID with validation
      */
    findById(id: number): Transaction | null;
    /**
     * Find all transactions with filters
     */
    findAll(filters?: TransactionFilters): Transaction[];
    /**
     * Update transaction with validation
     */
    update(id: number, input: UpdateTransactionInput): Transaction | null;
    /**
     * Delete transaction with validation
     */
    delete(id: number): boolean;
    /**
     * Get transaction summary with filters
     */
    getSummary(filters?: Omit<TransactionFilters, 'limit' | 'offset'>): TransactionSummary;
}
//# sourceMappingURL=transaction.service.d.ts.map