import { Router } from 'express';
import { shoppingListController } from '../controllers/shopping-list.controller';

const router = Router();

router.get('/', shoppingListController.getAll);
router.get('/summary', shoppingListController.getSummary);
router.get('/prediction', shoppingListController.getPrediction);
router.get('/price-prediction', shoppingListController.predictPrice);
router.get('/:id', shoppingListController.getById);
router.post('/', shoppingListController.create);
router.put('/:id', shoppingListController.update);
router.patch('/:id/toggle', shoppingListController.toggleComplete);
router.delete('/:id', shoppingListController.delete);
router.delete('/completed/clear', shoppingListController.clearCompleted);

export default router;
