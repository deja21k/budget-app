import { Request, Response } from 'express';
export declare class ExportController {
    /**
     * Export all data as JSON
     * GET /api/export/json
     */
    exportJSON(req: Request, res: Response): void;
    /**
     * Export transactions as CSV
     * GET /api/export/csv/transactions
     */
    exportTransactionsCSV(req: Request, res: Response): void;
    /**
     * Export summary as CSV
     * GET /api/export/csv/summary
     */
    exportSummaryCSV(req: Request, res: Response): void;
    /**
     * Import data from JSON
     * POST /api/export/import
     */
    importJSON(req: Request, res: Response): void;
    /**
     * Reset all data
     * POST /api/export/reset
     */
    resetData(req: Request, res: Response): void;
    /**
     * Get database stats
     * GET /api/export/stats
     */
    getStats(req: Request, res: Response): void;
}
//# sourceMappingURL=export.controller.d.ts.map