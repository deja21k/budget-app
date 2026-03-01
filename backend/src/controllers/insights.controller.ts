import { Request, Response } from 'express';
import { InsightsService } from '../services/insights.service';

const insightsService = new InsightsService();

function parseMonthParam(month?: string): { startDate?: string; endDate?: string } {
  if (!month) return {};
  
  const monthRegex = /^(\d{4})-(\d{2})$/;
  const match = month.match(monthRegex);
  
  if (!match) return {};
  
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

export class InsightsController {
  /**
   * Get comprehensive spending analysis
   * GET /api/insights/analysis
   */
  getAnalysis(req: Request, res: Response) {
    try {
      const { start_date, end_date, month } = req.query;
      
      const monthDates = parseMonthParam(month as string);
      const start = start_date as string || monthDates.startDate;
      const end = end_date as string || monthDates.endDate;
      
      const analysis = insightsService.analyzeSpending(start, end);

      res.json(analysis);
    } catch (error) {
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
  getSummary(req: Request, res: Response) {
    try {
      const { start_date, end_date, month } = req.query;
      
      const monthDates = parseMonthParam(month as string);
      const start = start_date as string || monthDates.startDate;
      const end = end_date as string || monthDates.endDate;
      
      const analysis = insightsService.analyzeSpending(start, end);

      res.json({
        summary_text: analysis.summary_text,
        period_start: analysis.period_start,
        period_end: analysis.period_end,
        total_income: analysis.total_income,
        total_expenses: analysis.total_expenses,
        net_amount: analysis.net_amount,
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      res.status(500).json({ 
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
