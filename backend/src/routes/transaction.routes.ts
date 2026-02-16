import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';

const router = Router();
const controller = new TransactionController();

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/summary', controller.getSummary);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;