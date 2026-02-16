export interface Receipt {
    id: number;
    transaction_id: number | null;
    image_path: string;
    ocr_text: string | null;
    ocr_confidence: number | null;
    extracted_merchant: string | null;
    extracted_amount: number | null;
    extracted_date: string | null;
    status: 'processing' | 'processed' | 'failed';
    created_at: string;
}
export interface CreateReceiptInput {
    image_path: string;
    transaction_id?: number;
    ocr_text?: string;
    ocr_confidence?: number;
    extracted_merchant?: string;
    extracted_amount?: number;
    extracted_date?: string;
    status?: 'processing' | 'processed' | 'failed';
}
export interface UpdateReceiptInput {
    transaction_id?: number | null;
    ocr_text?: string;
    ocr_confidence?: number;
    extracted_merchant?: string;
    extracted_amount?: number;
    extracted_date?: string;
    status?: 'processing' | 'processed' | 'failed';
}
export interface ReceiptFilters {
    status?: 'processing' | 'processed' | 'failed';
    has_transaction?: boolean;
    limit?: number;
    offset?: number;
}
//# sourceMappingURL=receipt.model.d.ts.map