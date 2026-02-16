import { Router } from 'express';
import multer from 'multer';
import { ReceiptController } from '../controllers/receipt.controller';

const router = Router();
const controller = new ReceiptController();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), controller.create);
router.get('/', controller.findAll);
router.get('/file/:filename', controller.serveFile);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.post('/:id/confirm', controller.confirm);
router.delete('/:id', controller.delete);

export default router;