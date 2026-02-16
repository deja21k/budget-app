import { Router } from 'express';
import { OCRController } from '../controllers/ocr.controller';
import { 
  uploadConfig, 
  validateFileSize, 
  validateImageDimensions,
  ocrTimeout,
  preventConcurrentOCR,
  handleUploadError,
} from '../middleware/upload';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/security';

const router = Router();
const controller = new OCRController();

// OCR scan route with multiple security layers
router.post(
  '/scan',
  preventConcurrentOCR, // Prevent concurrent OCR from same client
  validateFileSize, // Validate request size
  uploadConfig.single('image'), // Secure multer config
  validateImageDimensions, // Validate image dimensions
  ocrTimeout(30000), // 30 second timeout for OCR
  handleUploadError, // Handle upload errors
  controller.scanReceipt
);

// Parse text route with validation
router.post(
  '/parse',
  body('text')
    .exists()
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50000 characters'),
  body('merchant')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Merchant must be between 1 and 200 characters'),
  handleValidationErrors,
  controller.parseText
);

export default router;