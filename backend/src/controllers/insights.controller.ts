import { Request, Response } from 'express';
import { InsightsService } from '../services/insights.service';

const insightsService = new InsightsService();

export class InsightsController {
  /**
   * Get comprehensive spending analysis
   * GET /api/insights/analysis
   */
  getAnalysis(req: Request, res: Response) {
    try {
      const { start_date, end_date } = req.query;
      
      const analysis = insightsService.analyzeSpending(
        start_date as string | undefined,
        end_date as string | undefined
      );

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
      const { start_date, end_date } = req.query;
      
      const analysis = insightsService.analyzeSpending(
        start_date as string | undefined,
        end_date as string | undefined
      );

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
