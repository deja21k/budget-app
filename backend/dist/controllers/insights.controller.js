"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController = void 0;
const insights_service_1 = require("../services/insights.service");
const insightsService = new insights_service_1.InsightsService();
function parseMonthParam(month) {
    if (!month)
        return {};
    const monthRegex = /^(\d{4})-(\d{2})$/;
    const match = month.match(monthRegex);
    if (!match)
        return {};
    const year = parseInt(match[1]);
    const monthNum = parseInt(match[2]);
    if (year < 2000 || year > 2100 || monthNum < 1 || monthNum > 12) {
        return {};
    }
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`;
    return { startDate, endDate };
}
class InsightsController {
    /**
     * Get comprehensive spending analysis
     * GET /api/insights/analysis
     */
    getAnalysis(req, res) {
        try {
            const { start_date, end_date, month } = req.query;
            const monthDates = parseMonthParam(month);
            const start = start_date || monthDates.startDate;
            const end = end_date || monthDates.endDate;
            const analysis = insightsService.analyzeSpending(start, end);
            res.json(analysis);
        }
        catch (error) {
            console.error('Error generating insights:', error);
            res.status(500).json({
                error: 'Failed to generate spending insights',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get spending summary text only
     * GET /api/insights/summary
     */
    getSummary(req, res) {
        try {
            const { start_date, end_date, month } = req.query;
            const monthDates = parseMonthParam(month);
            const start = start_date || monthDates.startDate;
            const end = end_date || monthDates.endDate;
            const analysis = insightsService.analyzeSpending(start, end);
            res.json({
                summary_text: analysis.summary_text,
                period_start: analysis.period_start,
                period_end: analysis.period_end,
                total_income: analysis.total_income,
                total_expenses: analysis.total_expenses,
                net_amount: analysis.net_amount,
            });
        }
        catch (error) {
            console.error('Error generating summary:', error);
            res.status(500).json({
                error: 'Failed to generate summary',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.InsightsController = InsightsController;
//# sourceMappingURL=insights.controller.js.map