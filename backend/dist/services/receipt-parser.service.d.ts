export interface LineItem {
    description: string;
    price: number | null;
    quantity?: number;
}
export interface ParsedReceipt {
    storeName: string | null;
    date: string | null;
    total: number | null;
    subtotal: number | null;
    tax: number | null;
    lineItems: LineItem[];
    rawText: string;
    confidence: number;
    warnings: string[];
    currency: string | null;
    fiscalCode: string | null;
    pib: string | null;
}
export declare class ReceiptParser {
    private warnings;
    parse(text: string, confidence: number): ParsedReceipt;
    private isSerbianFiscalReceipt;
    private extractStoreName;
    private extractSerbianStoreName;
    private extractGenericStoreName;
    private isLikelyNoise;
    private extractDate;
    private extractPIB;
    private detectCurrency;
    private extractFiscalCode;
    private extractAmounts;
    private parseSerbianAmount;
    private extractLineItems;
}
//# sourceMappingURL=receipt-parser.service.d.ts.map