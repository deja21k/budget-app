"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insights_controller_1 = require("../controllers/insights.controller");
const router = (0, express_1.Router)();
const controller = new insights_controller_1.InsightsController();
// GET /api/insights/analysis - Full spending analysis
router.get('/analysis', controller.getAnalysis.bind(controller));
// GET /api/insights/summary - Summary text only
router.get('/summary', controller.getSummary.bind(controller));
exports.default = router;
//# sourceMappingURL=insights.routes.js.map