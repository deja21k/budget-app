import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';

const router = Router();
const controller = new CategoryController();

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;