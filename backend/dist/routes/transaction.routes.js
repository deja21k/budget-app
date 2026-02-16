"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_controller_1 = require("../controllers/transaction.controller");
const router = (0, express_1.Router)();
const controller = new transaction_controller_1.TransactionController();
router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/summary', controller.getSummary);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map