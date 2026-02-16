import { Router } from 'express';
import { InsightsController } from '../controllers/insights.controller';

const router = Router();
const controller = new InsightsController();

// GET /api/insights/analysis - Full spending analysis
router.get('/analysis', controller.getAnalysis.bind(controller));

// GET /api/insights/summary - Summary text only
router.get('/summary', controller.getSummary.bind(controller));

export default router;
