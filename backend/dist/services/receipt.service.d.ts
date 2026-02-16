import { Receipt, CreateReceiptInput, UpdateReceiptInput, ReceiptFilters } from '../models/receipt.model';
export declare class ReceiptService {
    private db;
    create(input: CreateReceiptInput): Receipt;
    findById(id: number): Receipt | null;
    findAll(filters?: ReceiptFilters): Receipt[];
    update(id: number, input: UpdateReceiptInput): Receipt | null;
    delete(id: number): boolean;
    linkToTransaction(receiptId: number, transactionId: number): Receipt | null;
    unlinkFromTransaction(receiptId: number): Receipt | null;
}
//# sourceMappingURL=receipt.service.d.ts.map