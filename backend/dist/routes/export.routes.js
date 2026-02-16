"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("../controllers/export.controller");
const router = (0, express_1.Router)();
const controller = new export_controller_1.ExportController();
// GET /api/export/json - Export all data as JSON
router.get('/json', controller.exportJSON.bind(controller));
// GET /api/export/csv/transactions - Export transactions as CSV
router.get('/csv/transactions', controller.exportTransactionsCSV.bind(controller));
// GET /api/export/csv/summary - Export summary as CSV
router.get('/csv/summary', controller.exportSummaryCSV.bind(controller));
// GET /api/export/stats - Get database stats
router.get('/stats', controller.getStats.bind(controller));
// POST /api/export/import - Import data from JSON
router.post('/import', controller.importJSON.bind(controller));
// POST /api/export/reset - Reset all data
router.post('/reset', controller.resetData.bind(controller));
exports.default = router;
//# sourceMappingURL=export.routes.js.map