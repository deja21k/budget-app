"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shopping_list_controller_1 = require("../controllers/shopping-list.controller");
const router = (0, express_1.Router)();
router.get('/', shopping_list_controller_1.shoppingListController.getAll);
router.get('/summary', shopping_list_controller_1.shoppingListController.getSummary);
router.get('/prediction', shopping_list_controller_1.shoppingListController.getPrediction);
router.get('/price-prediction', shopping_list_controller_1.shoppingListController.predictPrice);
router.get('/:id', shopping_list_controller_1.shoppingListController.getById);
router.post('/', shopping_list_controller_1.shoppingListController.create);
router.put('/:id', shopping_list_controller_1.shoppingListController.update);
router.patch('/:id/toggle', shopping_list_controller_1.shoppingListController.toggleComplete);
router.delete('/:id', shopping_list_controller_1.shoppingListController.delete);
router.delete('/completed/clear', shopping_list_controller_1.shoppingListController.clearCompleted);
exports.default = router;
//# sourceMappingURL=shopping-list.routes.js.map