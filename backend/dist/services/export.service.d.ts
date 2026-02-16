export interface ExportData {
    exported_at: string;
    version: string;
    categories: any[];
    transactions: any[];
    receipts: any[];
}
export declare class ExportService {
    private db;
    /**
     * Export all data as JSON
     */
    exportToJSON(): ExportData;
    /**
     * Export transactions as CSV
     */
    exportTransactionsToCSV(): string;
    /**
     * Export summary as CSV
     */
    exportSummaryToCSV(): string;
    /**
     * Import data from JSON
     */
    importFromJSON(data: ExportData): {
        success: boolean;
        imported: {
            categories: number;
            transactions: number;
            receipts: number;
        };
        errors: string[];
    };
    /**
     * Reset all data
     */
    resetAllData(): {
        success: boolean;
        message: string;
    };
    /**
     * Get database stats
     */
    getDatabaseStats(): {
        categories: number;
        transactions: number;
        receipts: number;
        totalIncome: number;
        totalExpenses: number;
        databaseSize: string;
    };
}
//# sourceMappingURL=export.service.d.ts.map