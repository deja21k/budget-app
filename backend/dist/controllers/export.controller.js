"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const export_service_1 = require("../services/export.service");
const exportService = new export_service_1.ExportService();
class ExportController {
    /**
     * Export all data as JSON
     * GET /api/export/json
     */
    exportJSON(req, res) {
        try {
            const data = exportService.exportToJSON();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="budget-export-${new Date().toISOString().split('T')[0]}.json"`);
            res.json(data);
        }
        catch (error) {
            console.error('Error exporting JSON:', error);
            res.status(500).json({
                error: 'Failed to export data',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Export transactions as CSV
     * GET /api/export/csv/transactions
     */
    exportTransactionsCSV(req, res) {
        try {
            const csv = exportService.exportTransactionsToCSV();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        }
        catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({
                error: 'Failed to export CSV',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Export summary as CSV
     * GET /api/export/csv/summary
     */
    exportSummaryCSV(req, res) {
        try {
            const csv = exportService.exportSummaryToCSV();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="summary-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        }
        catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({
                error: 'Failed to export CSV',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Import data from JSON
     * POST /api/export/import
     */
    importJSON(req, res) {
        try {
            const data = req.body;
            if (!data || typeof data !== 'object') {
                res.status(400).json({ error: 'Invalid data format' });
                return;
            }
            const result = exportService.importFromJSON(data);
            res.json(result);
        }
        catch (error) {
            console.error('Error importing data:', error);
            res.status(500).json({
                error: 'Failed to import data',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Reset all data
     * POST /api/export/reset
     */
    resetData(req, res) {
        try {
            const result = exportService.resetAllData();
            res.json(result);
        }
        catch (error) {
            console.error('Error resetting data:', error);
            res.status(500).json({
                error: 'Failed to reset data',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get database stats
     * GET /api/export/stats
     */
    getStats(req, res) {
        try {
            const stats = exportService.getDatabaseStats();
            res.json(stats);
        }
        catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({
                error: 'Failed to get stats',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.ExportController = ExportController;
//# sourceMappingURL=export.controller.js.map